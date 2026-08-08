// Vercel serverless function — the assigned reader replies to a writer's
// question about a delivered report.
//
//   POST /api/answer-question   { q: "<answer_token>", answer: "..." }
//
// Public: the unguessable per-question token IS the authorization — the reader
// follows the link from their email and never signs in, matching how the writer
// reaches the report and the ask form.
//
// Stores the reply, then emails it to the writer (cc the Scene One inbox).
// Answering is one-shot: a question that already has an answer is rejected, so
// a forwarded link can't be used to overwrite what was sent.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

const NOTIFY_FROM = "Scene One <no-reply@sceneone.info>";
const NOTIFY_TO = "sceneone.info@gmail.com";
const SITE_URL = process.env.SITE_URL || "https://sceneone.info";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ANSWER = 5000;

function svc() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

function escapeHtml(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function nl2br(v) {
  return escapeHtml(v).replace(/\r?\n/g, "<br>");
}

// Email to the writer: their question quoted back, then the reader's reply.
function answerEmail(sub, question, answer, link) {
  var esc = escapeHtml;
  var title = sub.title_ar || sub.title_en || "";
  var name = (sub.writer || "").toString().trim();
  var bodyStyle = "margin:0 auto;max-width:460px;font-size:15px;line-height:1.9;color:#4a453f;";

  return "" +
    '<div style="background:#f5f1e9;padding:34px 14px;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;"><tr><td align="center">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;">' +
          '<tr><td style="padding:46px 44px;text-align:center;">' +

            '<div style="font-weight:700;letter-spacing:5px;font-size:20px;color:#15110f;margin:0 0 30px;">SCENE&nbsp;<span style="color:#cd2e07;">ONE</span></div>' +

            '<h1 style="margin:0 0 14px;font-size:24px;line-height:1.4;color:#15110f;font-weight:700;">وصلك ردّ على استفسارك</h1>' +

            (title
              ? '<p style="margin:0 0 24px;color:#8a8178;font-size:13px;">العنوان: ' +
                '<strong style="color:#15110f;">' + esc(title) + "</strong></p>"
              : "") +

            '<p dir="rtl" style="' + bodyStyle + 'margin-bottom:20px;">' +
              (name ? "مرحبًا " + esc(name) + "،" : "مرحبًا،") +
              "<br>ردّ القارئ على استفسارك حول التقرير." +
            "</p>" +

            '<div dir="rtl" style="text-align:right;background:#f3efe8;border-radius:12px;padding:18px 20px;margin:0 auto 12px;max-width:460px;">' +
              '<div style="font-size:10px;letter-spacing:.06em;color:#6f665e;font-weight:700;margin-bottom:8px;">استفسارك</div>' +
              '<div style="font-size:14px;line-height:1.8;color:#4a453f;">' + nl2br(question) + "</div>" +
            "</div>" +

            '<div dir="rtl" style="text-align:right;border:1px solid #e7e2da;border-radius:12px;padding:18px 20px;margin:0 auto;max-width:460px;">' +
              '<div style="font-size:10px;letter-spacing:.06em;color:#cd2e07;font-weight:700;margin-bottom:8px;">ردّ القارئ</div>' +
              '<div style="font-size:14px;line-height:1.8;color:#15110f;">' + nl2br(answer) + "</div>" +
            "</div>" +

            (link
              ? '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 0;"><tr>' +
                  '<td style="border-radius:12px;background:#111111;">' +
                    '<a href="' + esc(link) + '" style="display:inline-block;padding:16px 40px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:12px;">عرض التقرير</a>' +
                  "</td></tr></table>"
              : "") +

            '<p style="margin:30px 0 0;color:#a49b90;font-size:12.5px;">The Scene One team</p>' +

          "</td></tr>" +
        "</table>" +
      "</td></tr></table>" +
    "</div>";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }
  const { url, key } = svc();
  if (!url || !key) {
    console.error("Supabase env vars are not configured");
    return res.status(500).json({ message: "الخادم غير مهيأ" });
  }

  const b = req.body || {};
  const token = (b.q || "").toString().trim();
  const answer = (b.answer || "").toString().trim();

  if (!UUID_RE.test(token)) return res.status(404).json({ message: "الرابط غير صالح" });
  if (!answer) return res.status(400).json({ message: "الرجاء كتابة الرد" });
  if (answer.length > MAX_ANSWER) return res.status(400).json({ message: "الرد طويل جدًا" });

  const headers = { apikey: key, Authorization: "Bearer " + key };

  const qResp = await fetch(
    url + "/rest/v1/report_questions?answer_token=eq." + encodeURIComponent(token) +
    "&select=id,question,answer,submission_id",
    { headers }
  );
  const rows = qResp.ok ? await qResp.json() : [];
  if (!rows.length) return res.status(404).json({ message: "الرابط غير صالح" });
  const row = rows[0];
  if (row.answer) {
    return res.status(409).json({ message: "تم إرسال الرد على هذا الاستفسار مسبقًا" });
  }

  const subResp = await fetch(
    url + "/rest/v1/submissions?id=eq." + encodeURIComponent(row.submission_id) +
    "&select=title_ar,title_en,writer,email,report_token",
    { headers }
  );
  const subs = subResp.ok ? await subResp.json() : [];
  if (!subs.length) return res.status(404).json({ message: "الرابط غير صالح" });
  const sub = subs[0];

  // Store first, and only where the answer is still empty — so two tabs (or a
  // double submit) can't both go through and send the writer two replies.
  const patch = await fetch(
    url + "/rest/v1/report_questions?id=eq." + encodeURIComponent(row.id) + "&answer=is.null",
    {
      method: "PATCH",
      headers: Object.assign({}, headers, {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      }),
      body: JSON.stringify({ answer: answer, answered_at: new Date().toISOString() }),
    }
  );
  if (!patch.ok) {
    console.error("answer-question patch failed:", patch.status, await patch.text());
    return res.status(502).json({ message: "تعذّر حفظ الرد، حاول مرة أخرى" });
  }
  const patched = await patch.json();
  if (!patched.length) {
    return res.status(409).json({ message: "تم إرسال الرد على هذا الاستفسار مسبقًا" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !sub.email) {
    return res.status(200).json({ ok: true, emailed: false });
  }

  const title = sub.title_ar || sub.title_en || "";
  const reportLink = sub.report_token
    ? SITE_URL + "/report?t=" + encodeURIComponent(sub.report_token)
    : "";

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [sub.email],
        cc: [NOTIFY_TO],
        reply_to: NOTIFY_TO,
        subject: "ردّ على استفسارك حول التقرير" + (title ? " — " + title : ""),
        html: answerEmail(sub, row.question, answer, reportLink),
      }),
    });
    if (!r.ok) {
      console.error("Resend answer-question send failed:", r.status, await r.text());
      return res.status(200).json({ ok: true, emailed: false });
    }
  } catch (err) {
    console.error("answer-question email error:", err);
    return res.status(200).json({ ok: true, emailed: false });
  }

  return res.status(200).json({ ok: true, emailed: true });
};
