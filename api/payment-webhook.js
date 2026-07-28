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
// on non-2xx) touches zero rows and sends no second email.
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
const { sendNotification, sendConfirmation, sendRefundAlert } = require("../lib/submission-emails");

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
    console.error("payment-webhook: payment", payment.id, "is", payment.status,
                  "- expected", expectedStatus, "for", eventType);
    return res.status(200).json({ ok: true, ignored: payment.status });
  }

  // Match the payment to its submission: by the invoice id we stored at
  // submission time, falling back to the metadata we attached to the invoice.
  const invoiceId = payment.invoice_id || claimed.invoice_id || null;
  const metaId = (payment.metadata && payment.metadata.submission_id) ||
                 (claimed.metadata && claimed.metadata.submission_id) || null;

  const query = invoiceId
    ? "payment_invoice_id=eq." + encodeURIComponent(invoiceId)
    : (metaId ? "id=eq." + encodeURIComponent(metaId) : null);

  if (!query) {
    console.error("payment-webhook: payment", payment.id, "has no invoice id or metadata to match on");
    return res.status(200).json({ ok: true, ignored: "unmatched" });
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
    console.error("payment-webhook: no submission matches", query);
    return res.status(200).json({ ok: true, ignored: "unmatched" });
  }

  if (eventType === "payment_refunded") {
    return handleRefunded(res, { supabaseUrl, rest, sub, payment });
  }

  // Guard against a payment for less than we quoted.
  if (sub.payment_amount != null && payment.amount !== sub.payment_amount) {
    console.error("payment-webhook: amount mismatch on", sub.id,
                  "- quoted", sub.payment_amount, "paid", payment.amount);
    return res.status(200).json({ ok: true, ignored: "amount mismatch" });
  }

  // The `status=eq.pending_payment` filter is what makes this idempotent: on a
  // replay the row is already `paid`, so zero rows come back and no second
  // email goes out.
  let updated;
  try {
    const patch = await fetch(
      supabaseUrl + "/rest/v1/submissions?id=eq." + encodeURIComponent(sub.id) +
      "&status=eq.pending_payment",
      {
        method: "PATCH",
        headers: Object.assign({ Prefer: "return=representation" }, rest),
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
    updated = await patch.json();
  } catch (err) {
    console.error("payment-webhook: status update error:", err);
    return res.status(502).json({ message: "Update failed" }); // retryable
  }

  const firstTime = !!(updated && updated.length);

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

  if (!firstTime) {
    // Duplicate delivery: the row was already paid, so no second email.
    return res.status(200).json({ ok: true, duplicate: true });
  }

  // Now that the money has cleared, tell the writer and the team.
  await sendConfirmation(updated[0]);
  await sendNotification(updated[0]);

  return res.status(200).json({ ok: true, submission: updated[0].id });
};

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
