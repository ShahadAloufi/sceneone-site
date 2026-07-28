// Vercel serverless function — receives Moyasar payment webhooks.
//
// This is the only thing that may move a submission from `pending_payment` to
// `paid`. Once a script is `paid` it becomes eligible to enter the reader pool
// (`unassigned`) — that transition belongs to the assignment step, not here.
// It is also the only thing that may mark a submission `refunded`.
//
// Trust model: the request body is an unauthenticated POST, so it is treated as
// a hint, not as truth. We check the shared secret token, then re-read the
// payment from Moyasar's API and act only on what Moyasar itself reports.
//
// Idempotent: the paid UPDATE is filtered on `status = pending_payment` and the
// refund UPDATE on `refunded_at is null`, so a replayed webhook (Moyasar retries
// on non-2xx) touches zero rows.
//
// Emails are gated separately, on `confirmation_sent_at is null` / `refunded_at
// is null`, because "did this write match a row" is not the same question as
// "have we emailed yet". The paid path writes twice — mark paid, then release to
// the pool — and a retry after the second write fails would find the row already
// `paid`, read that as a duplicate, and drop the writer's confirmation for a
// payment that cleared.
//
// Configure in the Moyasar dashboard: Settings → Webhooks → add
//   URL:    https://sceneone.info/api/payment-webhook
//   Events: payment_paid, payment_refunded
//   Secret token: the same value as MOYASAR_WEBHOOK_SECRET
//
// Required environment variables (set in Vercel project settings):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   MOYASAR_SECRET_KEY       — see lib/moyasar.js
//   MOYASAR_WEBHOOK_SECRET   — the secret token configured on the webhook

const crypto = require("crypto");
const { fetchPayment } = require("../lib/moyasar");
const {
  sendNotification, sendConfirmation, sendRefundAlert, sendUnreconciledAlert,
} = require("../lib/submission-emails");

// Statuses a refund may pull out of the pipeline on its own. These are exactly
// the states in which no reader has the script: `unassigned` is the pool, and
// `paid` is the instant between the two writes below. Anything further along
// means someone is (or was) reading it, and per the refund policy the pipeline
// is left alone for a human to sort out — see handleRefunded.
const PULLABLE = ["unassigned", "paid"];

// Constant-time compare so the token can't be recovered by timing the endpoint.
function secretMatches(received, expected) {
  const a = Buffer.from(String(received || ""));
  const b = Buffer.from(String(expected || ""));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const webhookSecret = process.env.MOYASAR_WEBHOOK_SECRET;
  if (!supabaseUrl || !serviceKey || !webhookSecret) {
    console.error("payment-webhook: env vars are not configured");
    // 500 so Moyasar retries once the config is fixed.
    return res.status(500).json({ message: "Server not configured" });
  }

  const body = req.body || {};

  if (!secretMatches(body.secret_token, webhookSecret)) {
    console.error("payment-webhook: bad secret token");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Two events move state here: a payment clearing, and a payment being
  // refunded. Everything else is acknowledged so Moyasar stops retrying — a
  // failed payment simply leaves the submission at `pending_payment`, where the
  // writer can try again.
  //
  // Case-folded on purpose: the dashboard labels the event PAYMENT_PAID while
  // the payload sends payment_paid, and silently ignoring a real payment is the
  // worst failure this endpoint has.
  //
  // The value each event must see on the re-read payment before it is trusted.
  const EXPECTED = { payment_paid: "paid", payment_refunded: "refunded" };
  const eventType = String(body.type || "").toLowerCase();
  // hasOwnProperty, not a bare lookup: `type: "constructor"` would otherwise
  // read a truthy value off the prototype and sail past this check.
  if (!Object.prototype.hasOwnProperty.call(EXPECTED, eventType)) {
    return res.status(200).json({ ok: true, ignored: body.type || null });
  }
  const expectedStatus = EXPECTED[eventType];

  const claimed = body.data || {};
  if (!claimed.id) {
    console.error("payment-webhook: event carries no payment id");
    return res.status(200).json({ ok: true, ignored: "no payment id" });
  }

  // Re-read the payment from Moyasar — never trust the posted body.
  let payment;
  try {
    payment = await fetchPayment(claimed.id);
  } catch (err) {
    console.error("payment-webhook: payment lookup failed:", err);
    return res.status(502).json({ message: "Lookup failed" }); // let Moyasar retry
  }

  if (String(payment.status || "").toLowerCase() !== expectedStatus) {
    return unreconciled(res, "status_mismatch", {
      eventType: eventType + " (expected " + expectedStatus + ")",
      paymentId: payment.id,
      paymentStatus: payment.status,
      paidAmount: formatAmount(payment.amount),
    });
  }

  // Match the payment to its submission by the invoice id we stored at submission
  // time. The metadata fallback below is near-dead weight for invoice payments:
  // Moyasar does NOT copy invoice metadata onto the payment (verified 2026-07-28 —
  // a real sandbox payment arrived with `metadata: null` while its invoice had
  // `submission_id`). Kept because it costs nothing and would catch a payment
  // created directly rather than through an invoice.
  const invoiceId = payment.invoice_id || claimed.invoice_id || null;
  const metaId = (payment.metadata && payment.metadata.submission_id) ||
                 (claimed.metadata && claimed.metadata.submission_id) || null;

  const query = invoiceId
    ? "payment_invoice_id=eq." + encodeURIComponent(invoiceId)
    : (metaId ? "id=eq." + encodeURIComponent(metaId) : null);

  if (!query) {
    return unreconciled(res, "unmatched", {
      eventType: eventType,
      paymentId: payment.id,
      paymentStatus: payment.status,
      paidAmount: formatAmount(payment.amount),
    });
  }

  const rest = {
    apikey: serviceKey,
    Authorization: "Bearer " + serviceKey,
    "Content-Type": "application/json",
  };

  let sub;
  try {
    const look = await fetch(supabaseUrl + "/rest/v1/submissions?" + query + "&select=*", { headers: rest });
    if (!look.ok) {
      console.error("payment-webhook: submission lookup failed:", look.status, await look.text());
      return res.status(502).json({ message: "Lookup failed" }); // retryable
    }
    const rows = await look.json();
    sub = rows && rows[0];
  } catch (err) {
    console.error("payment-webhook: submission lookup error:", err);
    return res.status(502).json({ message: "Lookup failed" }); // retryable
  }

  if (!sub) {
    // Retrying won't conjure the row; ack so Moyasar stops.
    return unreconciled(res, "unmatched", {
      eventType: eventType,
      paymentId: payment.id,
      paymentStatus: payment.status,
      paidAmount: formatAmount(payment.amount),
      invoiceId: invoiceId,
      submissionId: metaId,
    });
  }

  if (eventType === "payment_refunded") {
    return handleRefunded(res, { supabaseUrl, rest, sub, payment });
  }

  // Guard against a payment for less than we quoted. The script stays behind the
  // gate, so this is the case most likely to strand a writer who believes they
  // have paid — it must reach a human.
  if (sub.payment_amount != null && payment.amount !== sub.payment_amount) {
    return unreconciled(res, "amount_mismatch", {
      eventType: eventType,
      paymentId: payment.id,
      paymentStatus: payment.status,
      paidAmount: formatAmount(payment.amount),
      quotedAmount: formatAmount(sub.payment_amount),
      invoiceId: invoiceId,
      submissionId: sub.id,
    });
  }

  // The `status=eq.pending_payment` filter is what makes this idempotent: on a
  // replay the row is already `paid`, so zero rows come back and nothing is
  // written twice. Note it is NOT what decides whether the emails go out — see
  // the confirmation_sent_at claim below.
  try {
    const patch = await fetch(
      supabaseUrl + "/rest/v1/submissions?id=eq." + encodeURIComponent(sub.id) +
      "&status=eq.pending_payment",
      {
        method: "PATCH",
        headers: Object.assign({ Prefer: "return=minimal" }, rest),
        body: JSON.stringify({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_invoice_id: sub.payment_invoice_id || invoiceId,
        }),
      }
    );

    if (!patch.ok) {
      console.error("payment-webhook: status update failed:", patch.status, await patch.text());
      return res.status(502).json({ message: "Update failed" }); // retryable
    }
  } catch (err) {
    console.error("payment-webhook: status update error:", err);
    return res.status(502).json({ message: "Update failed" }); // retryable
  }

  // Release into the reader pool. Filtered on `status = paid` so it runs exactly
  // once — and so a retry still promotes a row that got stuck at `paid` because
  // this second call failed the first time round.
  try {
    const release = await fetch(
      supabaseUrl + "/rest/v1/submissions?id=eq." + encodeURIComponent(sub.id) +
      "&status=eq.paid",
      {
        method: "PATCH",
        headers: Object.assign({ Prefer: "return=minimal" }, rest),
        body: JSON.stringify({ status: "unassigned" }),
      }
    );
    if (!release.ok) {
      console.error("payment-webhook: release to pool failed:", release.status, await release.text());
      // The payment IS recorded (status `paid`, paid_at set) — a retry will
      // finish the promotion, so ask Moyasar for one.
      return res.status(502).json({ message: "Release failed" });
    }
  } catch (err) {
    console.error("payment-webhook: release to pool error:", err);
    return res.status(502).json({ message: "Release failed" });
  }

  // Claim the emails with their own stamp, filtered on `confirmation_sent_at
  // is.null`. This has to be a separate durable fact rather than "did the
  // pending_payment → paid PATCH above match a row": if the release to the pool
  // fails, Moyasar retries, and on that retry the row is no longer
  // `pending_payment`, so keying the emails off that PATCH would read the retry
  // as a duplicate and drop both emails on a payment that actually cleared.
  // Whichever delivery wins this PATCH is the one that emails; the rest see zero
  // rows. It also returns the row the emails are rendered from.
  let updated;
  try {
    const claim = await fetch(
      supabaseUrl + "/rest/v1/submissions?id=eq." + encodeURIComponent(sub.id) +
      "&confirmation_sent_at=is.null",
      {
        method: "PATCH",
        headers: Object.assign({ Prefer: "return=representation" }, rest),
        body: JSON.stringify({ confirmation_sent_at: new Date().toISOString() }),
      }
    );
    if (!claim.ok) {
      console.error("payment-webhook: confirmation claim failed:", claim.status, await claim.text());
      // Nothing has been emailed yet, and the row is fully paid + released, so a
      // retry re-runs only the two no-op PATCHes and lands here again.
      return res.status(502).json({ message: "Update failed" });
    }
    updated = await claim.json();
  } catch (err) {
    console.error("payment-webhook: confirmation claim error:", err);
    return res.status(502).json({ message: "Update failed" });
  }

  if (!(updated && updated.length)) {
    // Duplicate delivery: this submission's emails already went out.
    return res.status(200).json({ ok: true, duplicate: true });
  }

  // Now that the money has cleared, tell the writer and the team. Neither send
  // throws — both swallow and log their own failures — so a Resend outage can't
  // turn into a 502 that replays the whole webhook.
  await sendConfirmation(updated[0]);
  await sendNotification(updated[0]);

  return res.status(200).json({ ok: true, submission: updated[0].id });
};

// The event cleared the secret check and came from Moyasar, but we can't act on
// it — and no retry would change that, so we answer 200 and Moyasar stops
// re-delivering. That makes this the end of the line: past here, the only record
// that Moyasar moved money our database doesn't reflect is a log line nobody
// reads. So every one of these paths emails the team before it acks.
async function unreconciled(res, reason, info) {
  console.error("payment-webhook: unreconciled (" + reason + "):", JSON.stringify(info));
  await sendUnreconciledAlert(Object.assign({ reason: reason }, info));
  return res.status(200).json({ ok: true, ignored: reason });
}

// Halalas → a human "1200.00 SAR" for the staff alert.
function formatAmount(halalas) {
  if (halalas == null || isNaN(halalas)) return null;
  return (Number(halalas) / 100).toFixed(2) + " SAR";
}

// A refund landed. Policy (chosen deliberately — see CLAUDE.md):
//
//   • Nobody has the script yet (`unassigned`/`paid`) → pull it out of the pool,
//     terminal status `refunded`. It can never be claimed again: /api/claim-script
//     only accepts `unassigned`.
//   • A reader already has it → change NOTHING about the assignment. Yanking a
//     script out from under someone mid-draft loses their work, and a refund on
//     an in-flight script is rare enough to be worth a human's attention. We only
//     stamp `refunded_at` and alert staff, who decide.
//
// Either way `refunded_at` is stamped, so the dashboard can flag the row.
//
// Write order matters: the pull runs BEFORE the stamp, because the stamp is what
// makes this idempotent. Doing it the other way round would let a retry skip a
// pull that failed the first time.
async function handleRefunded(res, ctx) {
  const supabaseUrl = ctx.supabaseUrl;
  const rest = ctx.rest;
  const sub = ctx.sub;
  const payment = ctx.payment;
  const id = encodeURIComponent(sub.id);

  // Filtered on the pullable statuses rather than on what we read a moment ago:
  // if a reader claimed the script in between, this touches zero rows and the
  // claim stands, which is exactly the policy above.
  let pulled = sub.status === "refunded"; // already pulled by an earlier delivery
  try {
    const pull = await fetch(
      supabaseUrl + "/rest/v1/submissions?id=eq." + id +
      "&status=in.(" + PULLABLE.join(",") + ")",
      {
        method: "PATCH",
        headers: Object.assign({ Prefer: "return=representation" }, rest),
        body: JSON.stringify({ status: "refunded" }),
      }
    );
    if (!pull.ok) {
      console.error("payment-webhook: refund pull failed:", pull.status, await pull.text());
      return res.status(502).json({ message: "Refund update failed" }); // retryable
    }
    const rows = await pull.json();
    if (rows && rows.length) pulled = true;
  } catch (err) {
    console.error("payment-webhook: refund pull error:", err);
    return res.status(502).json({ message: "Refund update failed" }); // retryable
  }

  // The `refunded_at=is.null` filter is what makes this idempotent: on a replay
  // zero rows come back and no second alert goes out.
  let updated;
  try {
    const stamp = await fetch(
      supabaseUrl + "/rest/v1/submissions?id=eq." + id + "&refunded_at=is.null",
      {
        method: "PATCH",
        headers: Object.assign({ Prefer: "return=representation" }, rest),
        body: JSON.stringify({ refunded_at: new Date().toISOString() }),
      }
    );
    if (!stamp.ok) {
      console.error("payment-webhook: refund stamp failed:", stamp.status, await stamp.text());
      return res.status(502).json({ message: "Refund update failed" }); // retryable
    }
    updated = await stamp.json();
  } catch (err) {
    console.error("payment-webhook: refund stamp error:", err);
    return res.status(502).json({ message: "Refund update failed" }); // retryable
  }

  if (!(updated && updated.length)) {
    // Duplicate delivery: already stamped, so no second alert.
    return res.status(200).json({ ok: true, duplicate: true });
  }

  if (!pulled) {
    console.error("payment-webhook: refund on", sub.id, "which is", sub.status,
                  "- assignment left untouched, staff alerted");
  }

  await sendRefundAlert(updated[0], {
    pulled: pulled,
    paidAmount: formatAmount(sub.payment_amount != null ? sub.payment_amount : payment.amount),
    // Moyasar reports partial refunds too, so show what actually came back
    // rather than assuming it was the full amount.
    refundedAmount: formatAmount(payment.refunded != null ? payment.refunded : payment.amount),
    paymentId: payment.id,
  });

  return res.status(200).json({ ok: true, submission: sub.id, pulled: pulled });
}
