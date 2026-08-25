// The writer's "work has started" notice.
//
// Sent once, only to scripts a reader is STILL holding once the assignment
// window has elapsed. Previously the email was scheduled with Resend at claim
// time and cancelled on release — but the cancel was best-effort, so a failed
// cancel (or a reassign followed by a release) still sent the writer a notice
// saying work had begun and the submission could no longer be refunded, for a
// script sitting unclaimed in the pool. Nothing cancels here, so nothing can
// fail to cancel: a released script simply stops qualifying.
//
// Triggered by /api/claim-script on every claim/release/reassign (readers touch
// that constantly, so notices go out within minutes of falling due) and by
// /api/send-notices as a daily backstop. Vercel Hobby caps cron at once per day
// — a more frequent expression fails deployment — which is why the sweep is
// piggybacked on real traffic rather than driven by the cron alone.
//
// Sending late is harmless: the reader's cancellation window only widens, and
// the writer is told work started slightly after it did. Sending EARLY would be
// the damaging case, and cannot happen — the cutoff is checked in the query and
// again in the claiming UPDATE.

const NOTIFY_FROM = "Scene One <no-reply@sceneone.info>";
const NOTIFY_TO = "sceneone.info@gmail.com";

// The notice/lock window: ONE HOUR from the claim (2026-08-25; previously 3h
// real / 2h told). The dashboard copy now states the same number. Keep in sync
// with the enforce_assignment_lock() trigger's interval, api/claim-script.js and
// js/admin.js.
const ASSIGNMENT_WINDOW_MS = 1 * 60 * 60 * 1000;

function escapeHtml(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Arabic only, as supplied. The previous version carried an English half beneath a
// divider; it was removed with the rewrite rather than left to drift out of step
// with the Arabic.
function noticeEmail(sub) {
  var esc = escapeHtml;
  var title = sub.title_ar || sub.title_en || "";
  var titleLine = title
    ? '<p style="margin:0 0 24px;color:#8a8178;font-size:13px;">العنوان: ' +
      '<strong style="color:#15110f;">' + esc(title) + "</strong></p>"
    : "";
  var bodyStyle = "margin:0 auto;max-width:440px;font-size:15px;line-height:1.9;color:#4a453f;";
  var noteStyle = "margin:22px auto 0;max-width:440px;font-size:13.5px;line-height:1.8;color:#15110f;background:#f5f1e9;border-radius:12px;padding:14px 18px;";

  return "" +
    '<div style="background:#f5f1e9;padding:34px 14px;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;"><tr><td align="center">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;">' +
          '<tr><td style="padding:46px 44px;text-align:center;">' +

            '<div style="font-weight:700;letter-spacing:5px;font-size:20px;color:#15110f;margin:0 0 30px;">SCENE&nbsp;<span style="color:#cd2e07;">ONE</span></div>' +

            '<h1 style="margin:0 0 14px;font-size:25px;line-height:1.3;color:#15110f;font-weight:700;">نصك الآن قيد المراجعة</h1>' +

            titleLine +

            '<p dir="rtl" style="' + bodyStyle + '">' +
              "مرحباً،" +
              "<br>تم إسناد نصك إلى أحد قرّائنا، وقد بدأ العمل على تقييمه. سنقوم بإرسال تقرير التقييم إلى بريدك الإلكتروني فور اكتماله واعتماده." +
            "</p>" +
            '<p dir="rtl" style="' + noteStyle + '">' +
              "نظراً لبدء العمل على النص، لا يمكن إلغاء الطلب أو استرداد المبلغ في هذه المرحلة." +
            "</p>" +

            '<p dir="rtl" style="margin:30px 0 0;color:#a49b90;font-size:12.5px;line-height:1.8;">' +
              "مع خالص التحية،<br>فريق Scene One" +
            "</p>" +

          "</td></tr>" +
        "</table>" +
      "</td></tr></table>" +
    "</div>";
}

// Never throws — every caller is doing something else more important, and a
// notice that fails is retried by the next sweep only if it was never stamped.
async function sendNotice(sub) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !sub.email) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [sub.email],
        reply_to: NOTIFY_TO,
        subject: "نصك الآن قيد المراجعة - Scene One",
        html: noticeEmail(sub),
      }),
    });
    if (!r.ok) {
      console.error("assignment-notice send failed:", r.status, await r.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("assignment-notice send error:", err);
    return false;
  }
}

// Notify every script still assigned past its window. Returns how many went out.
//
// Two guards, and the second is the one that matters: the SELECT finds due rows,
// but the UPDATE that claims each one re-checks `assigned_to is not null` and the
// cutoff. So a reader who releases between the two — the exact race that made the
// old cancel-based design leak — loses the row from the update and no email is
// sent. Stamping before sending, not after, is what stops two concurrent sweeps
// double-emailing; the cost is that a Resend failure after a successful stamp
// drops that one notice rather than retrying it, which is the safer way round.
async function sweepAssignmentNotices(url, headers) {
  const cutoff = new Date(Date.now() - ASSIGNMENT_WINDOW_MS).toISOString();
  const q = "?assigned_to=not.is.null" +
            "&writer_notified_at=is.null" +
            "&assigned_at=lte." + encodeURIComponent(cutoff) +
            "&status=eq.in_review" +
            "&select=id,title_ar,title_en,writer,email";

  let due;
  try {
    const look = await fetch(url + "/rest/v1/submissions" + q, { headers: headers });
    if (!look.ok) {
      console.error("assignment-notice sweep lookup failed:", look.status, await look.text());
      return 0;
    }
    due = await look.json();
  } catch (err) {
    console.error("assignment-notice sweep lookup error:", err);
    return 0;
  }
  if (!due || !due.length) return 0;

  let sent = 0;
  for (const row of due) {
    try {
      const claim = await fetch(
        url + "/rest/v1/submissions?id=eq." + encodeURIComponent(row.id) +
        "&writer_notified_at=is.null&assigned_to=not.is.null" +
        "&assigned_at=lte." + encodeURIComponent(cutoff),
        {
          method: "PATCH",
          headers: Object.assign({ Prefer: "return=representation" }, headers),
          body: JSON.stringify({ writer_notified_at: new Date().toISOString() }),
        }
      );
      if (!claim.ok) {
        console.error("assignment-notice claim failed:", claim.status, await claim.text());
        continue;
      }
      const rows = await claim.json();
      if (!rows || !rows.length) continue; // released or already notified — correct
      if (await sendNotice(rows[0])) sent++;
    } catch (err) {
      console.error("assignment-notice claim error:", err);
    }
  }
  return sent;
}

module.exports = { sweepAssignmentNotices, ASSIGNMENT_WINDOW_MS };
