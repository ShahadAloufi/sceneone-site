// Vercel serverless function — the writer asks the assigned reader a follow-up
// question about their delivered report.
//
//   POST /api/ask-question   { t: "<report_token>", question: "..." }
//
// Public: the unguessable report token IS the authorization, exactly like
// /api/report — the writer never signs in. Gated on the coverage being
// 'approved', so questions are only possible once the report is actually
// visible to them.
//
// Stores the question, then emails the assigned reader (cc the Scene One inbox)
// a token link to /answer?q=<answer_token> where they type the reply.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

const NOTIFY_FROM = "Scene One <no-reply@sceneone.info>";
const NOTIFY_TO = "sceneone.info@gmail.com";
const SITE_URL = process.env.SITE_URL || "https://sceneone.info";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUESTION = 2000;
// Guard against a token being used to flood the reader's inbox. Generous enough
// that a genuine back-and-forth never hits it.
const MAX_PER_SUBMISSION = 10;

function svc() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

function escapeHtml(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Keep the writer's line breaks in the HTML email.
function nl2br(v) {
  return escapeHtml(v).replace(/\r?\n/g, "<br>");
}

// Email to the assigned reader: the question, plus a button into the reply form.
function questionEmail(sub, question, link) {
  var esc = escapeHtml;
  var title = sub.title_ar || sub.title_en || "";
  var bodyStyle = "margin:0 auto;max-width:460px;font-size:15px;line-height:1.9;color:#4a453f;";

  return "" +
    '<div style="background:#f5f1e9;padding:34px 14px;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;"><tr><td align="center">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;">' +
          '<tr><td style="padding:46px 44px;text-align:center;">' +

            '<div style="font-weight:700;letter-spacing:5px;font-size:20px;color:#15110f;margin:0 0 30px;">SCENE&nbsp;<span style="color:#cd2e07;">ONE</span></div>' +

            '<h1 style="margin:0 0 14px;font-size:24px;line-height:1.4;color:#15110f;font-weight:700;">استفسار من الكاتب حول التقرير</h1>' +

            (title
              ? '<p style="margin:0 0 24px;color:#8a8178;font-size:13px;">العنوان: ' +
                '<strong style="color:#15110f;">' + esc(title) + "</strong></p>"
              : "") +

            '<p dir="rtl" style="' + bodyStyle + 'margin-bottom:18px;">' +
              "وصلك استفسار من الكاتب حول التقرير الذي أعددته. يمكنك كتابة ردّك من خلال الزر أدناه." +
            "</p>" +

            '<div dir="rtl" style="text-align:right;background:#f3efe8;border-radius:12px;padding:18px 20px;margin:0 auto 8px;max-width:460px;">' +
              '<div style="font-size:10px;letter-spacing:.06em;color:#6f665e;font-weight:700;margin-bottom:8px;">نص الاستفسار</div>' +
              '<div style="font-size:14px;line-height:1.8;color:#15110f;">' + nl2br(question) + "</div>" +
            "</div>" +

            '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto;"><tr>' +
              '<td style="border-radius:12px;background:#111111;">' +
                '<a href="' + esc(link) + '" style="display:inline-block;padding:16px 40px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:12px;">كتابة الرد</a>' +
              "</td></tr></table>" +

            '<p style="margin:30px 0 0;color:#a49b90;font-size:12.5px;">The Scene One team</p>' +

          "</td></tr>" +
        "</table>" +

        '<p dir="ltr" style="max-width:600px;margin:18px auto 0;color:#a49b90;font-size:12px;line-height:1.6;">' +
          "If the button doesn't work, copy this link:<br>" + esc(link) +
        "</p>" +

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
  const token = (b.t || "").toString().trim();
  const question = (b.question || "").toString().trim();

  if (!UUID_RE.test(token)) return res.status(404).json({ message: "الرابط غير صالح" });
  if (!question) return res.status(400).json({ message: "الرجاء كتابة الاستفسار" });
  if (question.length > MAX_QUESTION) {
    return res.status(400).json({ message: "الاستفسار طويل جدًا" });
  }

  const headers = { apikey: key, Authorization: "Bearer " + key };

  // Resolve the submission from the report token, and find who to route to.
  const subResp = await fetch(
    url + "/rest/v1/submissions?report_token=eq." + encodeURIComponent(token) +
    "&select=id,title_ar,title_en,writer,email,assigned_to,co_reader_id",
    { headers }
  );
  const subs = subResp.ok ? await subResp.json() : [];
  if (!subs.length) return res.status(404).json({ message: "الرابط غير صالح" });
  const sub = subs[0];

  // Same gate as /api/report: only a delivered (approved) report can be asked
  // about — otherwise the writer hasn't seen anything yet.
  const covResp = await fetch(
    url + "/rest/v1/coverages?submission_id=eq." + encodeURIComponent(sub.id) + "&select=status",
    { headers }
  );
  const covs = covResp.ok ? await covResp.json() : [];
  if (!covs.length || covs[0].status !== "approved") {
    return res.status(404).json({ message: "الرابط غير صالح" });
  }

  // Flood guard.
  const countResp = await fetch(
    url + "/rest/v1/report_questions?submission_id=eq." + encodeURIComponent(sub.id) + "&select=id",
    { headers: Object.assign({}, headers, { Prefer: "count=exact", Range: "0-0" }) }
  );
  const contentRange = countResp.headers.get("content-range") || "";
  const total = parseInt(contentRange.split("/")[1], 10);
  if (Number.isFinite(total) && total >= MAX_PER_SUBMISSION) {
    return res.status(429).json({
      message: "وصلت إلى الحد الأقصى للاستفسارات. يرجى التواصل معنا مباشرة على sceneone.info@gmail.com",
    });
  }

  // Look up the reader's email (primary assignee; co-reader is cc'd when set).
  const readerIds = [sub.assigned_to, sub.co_reader_id].filter(Boolean);
  let readerEmails = [];
  if (readerIds.length) {
    const inList = readerIds.map(encodeURIComponent).join(",");
    const adminResp = await fetch(
      url + "/rest/v1/admins?id=in.(" + inList + ")&select=id,email",
      { headers }
    );
    const admins = adminResp.ok ? await adminResp.json() : [];
    readerEmails = admins.map((a) => a.email).filter(Boolean);
  }

  // Store the question first — the reply link in the email depends on the row's
  // answer_token, and a stored question with a failed send can still be chased
  // from the Scene One inbox copy.
  const insertResp = await fetch(url + "/rest/v1/report_questions", {
    method: "POST",
    headers: Object.assign({}, headers, {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify({
      submission_id: sub.id,
      reader_id: sub.assigned_to || null,
      question: question,
    }),
  });
  if (!insertResp.ok) {
    console.error("ask-question insert failed:", insertResp.status, await insertResp.text());
    return res.status(502).json({ message: "تعذّر إرسال الاستفسار، حاول مرة أخرى" });
  }
  const rows = await insertResp.json();
  const row = rows[0];

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured");
    return res.status(200).json({ ok: true, emailed: false });
  }

  const link = SITE_URL + "/answer?q=" + encodeURIComponent(row.answer_token);
  const title = sub.title_ar || sub.title_en || "";
  // Always include the Scene One inbox: it's the fallback route when no reader
  // is assigned, and the paper trail when one is.
  const to = readerEmails.length ? readerEmails.concat([NOTIFY_TO]) : [NOTIFY_TO];

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: to,
        reply_to: NOTIFY_TO,
        subject: "استفسار من الكاتب حول التقرير" + (title ? " — " + title : ""),
        html: questionEmail(sub, question, link),
      }),
    });
    if (!r.ok) {
      console.error("Resend ask-question send failed:", r.status, await r.text());
      return res.status(200).json({ ok: true, emailed: false });
    }
  } catch (err) {
    console.error("ask-question email error:", err);
    return res.status(200).json({ ok: true, emailed: false });
  }

  return res.status(200).json({ ok: true, emailed: true });
};
