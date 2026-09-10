// Vercel serverless function — post-delivery Q&A between the writer and the
// reader who covered their script.
//
//   GET  /api/questions?q=<answer_token>        → read one thread (reader's page)
//   POST /api/questions  { t, question }        → writer asks
//   POST /api/questions  { q, answer }          → reader replies
//
// All three are public: the unguessable token IS the authorization, exactly like
// /api/report — neither side signs in. Which POST branch runs is decided by the
// token field present (`t` = report token from the writer's email, `q` = answer
// token from the reader's email); sending both is rejected rather than guessed.
//
// **Deliberately one function, not three.** Vercel's Hobby plan caps a
// deployment at 12 Serverless Functions and the project was at 10 — splitting
// these out again will fail the build. Keep them here unless the plan changes.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

const { brandHeader, emailDocument } = require("../lib/email-brand");

const NOTIFY_FROM = "Scene One <no-reply@sceneone.info>";
const NOTIFY_TO = "sceneone.info@gmail.com";
const SITE_URL = process.env.SITE_URL || "https://sceneone.info";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUESTION = 2000;
const MAX_ANSWER = 5000;
// Guard against a leaked report link being used to flood a reader's inbox.
// Generous enough that a genuine back-and-forth never hits it.
const MAX_PER_SUBMISSION = 10;

// The reader may attach ONE file to their reply. 10MB matches ATTACH_MAX_BYTES
// in js/coverage.js — the same reader attaching the same kind of thing.
const ATTACH_BUCKET = "attachments";
const ATTACH_MAX_BYTES = 10 * 1024 * 1024;
// Extension allowlist, not a MIME check: the browser's reported type is a hint
// the client controls, while the extension is what Storage derives the served
// content type from and what the writer's OS opens the file with.
const ATTACH_EXT = ["pdf", "doc", "docx", "txt", "rtf", "fdx", "png", "jpg", "jpeg", "webp"];

function svc() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

function escapeHtml(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Keep the author's line breaks in the HTML email.
function nl2br(v) {
  return escapeHtml(v).replace(/\r?\n/g, "<br>");
}

const BRAND_OPEN =
  '<div style="background:#f5f1e9;padding:34px 14px;font-family:Arial,Helvetica,sans-serif;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;"><tr><td align="center">' +
      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;">' +
        '<tr><td style="padding:46px 44px;text-align:center;">' +
          brandHeader(30);

function brandClose(trailer) {
  return "" +
          '<p style="margin:30px 0 0;color:#a49b90;font-size:12.5px;">The Scene One team</p>' +
        "</td></tr>" +
      "</table>" +
      (trailer || "") +
    "</td></tr></table>" +
  "</div>";
}

function titleLine(sub) {
  var t = sub.title_ar || sub.title_en || "";
  return t
    ? '<p style="margin:0 0 24px;color:#8a8178;font-size:13px;">العنوان: ' +
      '<strong style="color:#15110f;">' + escapeHtml(t) + "</strong></p>"
    : "";
}

// Quoted block, used for the question in both directions.
function quote(label, text, accent) {
  return '<div dir="rtl" style="text-align:right;' +
    (accent
      ? "border:1px solid #e7e2da;"
      : "background:#f3efe8;") +
    'border-radius:12px;padding:18px 20px;margin:0 auto 12px;max-width:460px;">' +
    '<div style="font-size:10px;letter-spacing:.06em;color:' + (accent ? "#cd2e07" : "#6f665e") +
      ';font-weight:700;margin-bottom:8px;">' + escapeHtml(label) + "</div>" +
    '<div style="font-size:14px;line-height:1.8;color:' + (accent ? "#15110f" : "#4a453f") + ';">' +
      nl2br(text) +
    "</div></div>";
}

// → the reader: the writer's question, plus a button into the reply form.
function questionEmail(sub, question, link) {
  var bodyStyle = "margin:0 auto;max-width:460px;font-size:15px;line-height:1.9;color:#4a453f;";
  return BRAND_OPEN +
    '<h1 style="margin:0 0 14px;font-size:24px;line-height:1.4;color:#15110f;font-weight:700;">استفسار من الكاتب حول التقرير</h1>' +
    titleLine(sub) +
    '<p dir="rtl" style="' + bodyStyle + 'margin-bottom:18px;">' +
      "وصلك استفسار من الكاتب حول التقرير الذي أعددته. يمكنك كتابة ردّك من خلال الزر أدناه." +
    "</p>" +
    quote("نص الاستفسار", question, false) +
    '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 0;"><tr>' +
      '<td style="border-radius:12px;background:#111111;">' +
        '<a href="' + escapeHtml(link) + '" style="display:inline-block;padding:16px 40px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:12px;">كتابة الرد</a>' +
      "</td></tr></table>" +
    brandClose(
      '<p dir="ltr" style="max-width:600px;margin:18px auto 0;color:#a49b90;font-size:12px;line-height:1.6;">' +
        "If the button doesn't work, copy this link:<br>" + escapeHtml(link) +
      "</p>"
    );
}

// → the writer: their question quoted back, then the reader's reply.
function answerEmail(sub, question, answer, reportLink, attachmentLink) {
  var name = (sub.writer || "").toString().trim();
  var bodyStyle = "margin:0 auto;max-width:460px;font-size:15px;line-height:1.9;color:#4a453f;";
  return BRAND_OPEN +
    '<h1 style="margin:0 0 14px;font-size:24px;line-height:1.4;color:#15110f;font-weight:700;">وصلك ردّ على استفسارك</h1>' +
    titleLine(sub) +
    '<p dir="rtl" style="' + bodyStyle + 'margin-bottom:20px;">' +
      (name ? "مرحبًا " + escapeHtml(name) + "،" : "مرحبًا،") +
      "<br>ردّ القارئ على استفسارك حول التقرير." +
    "</p>" +
    quote("استفسارك", question, false) +
    quote("ردّ القارئ", answer, true) +
    (attachmentLink
      ? '<p dir="rtl" style="' + bodyStyle + 'margin:18px auto 0;text-align:center;">' +
          '\u{1F4CE} <a href="' + escapeHtml(attachmentLink) + '" style="color:#cd2e07;font-weight:700;text-decoration:none;">تحميل المرفق</a>' +
        "</p>"
      : "") +
    (reportLink
      ? '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 0;"><tr>' +
          '<td style="border-radius:12px;background:#111111;">' +
            '<a href="' + escapeHtml(reportLink) + '" style="display:inline-block;padding:16px 40px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:12px;">عرض التقرير</a>' +
          "</td></tr></table>"
      : "") +
    brandClose("");
}

async function sendEmail(payload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured");
    return false;
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ from: NOTIFY_FROM, reply_to: NOTIFY_TO }, payload)),
    });
    if (!r.ok) {
      console.error("Resend send failed:", r.status, await r.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend send error:", err);
    return false;
  }
}

/* ---------- GET: one thread, for the reader's reply page ---------- */
async function readThread(req, res, headers, url) {
  const token = ((req.query && req.query.q) || "").toString().trim();
  if (!UUID_RE.test(token)) return res.status(404).json({ message: "Not found" });

  const qResp = await fetch(
    url + "/rest/v1/report_questions?answer_token=eq." + encodeURIComponent(token) +
    "&select=question,answer,created_at,answered_at,submission_id",
    { headers }
  );
  const rows = qResp.ok ? await qResp.json() : [];
  if (!rows.length) return res.status(404).json({ message: "Not found" });
  const row = rows[0];

  // Title only, for context at the top of the reply form.
  const subResp = await fetch(
    url + "/rest/v1/submissions?id=eq." + encodeURIComponent(row.submission_id) +
    "&select=title_ar,title_en,writer",
    { headers }
  );
  const subs = subResp.ok ? await subResp.json() : [];
  const sub = subs[0] || {};

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    question: row.question,
    answer: row.answer,
    created_at: row.created_at,
    answered_at: row.answered_at,
    submission: {
      title_ar: sub.title_ar || "",
      title_en: sub.title_en || "",
      writer: sub.writer || "",
    },
  });
}

/* ---------- POST { q, upload }: mint a signed upload URL ----------
   The reader answering is not signed in — they arrive on a tokenised link — so
   they cannot satisfy the `attachments` bucket's admin-only RLS. The service
   role mints a one-shot upload URL instead and the browser PUTs straight to
   Storage, which keeps the file off this function entirely: a 10MB body would
   not survive Vercel's 4.5MB request limit anyway.

   The path is ours, never the client's, and it is namespaced by the question, so
   one reply's attachment can never land on another's. The stem is dropped rather
   than sanitised for the same reason as the coverage attachment: the key travels
   inside signed URLs, and nothing reads meaning from it. */
async function signUpload(req, res, headers, url, token, upload) {
  if (!UUID_RE.test(token)) return res.status(404).json({ message: "الرابط غير صالح" });

  const name = (upload.name || "").toString();
  const size = Number(upload.size) || 0;
  if (!name) return res.status(400).json({ message: "طلب غير صالح" });
  if (size > ATTACH_MAX_BYTES) return res.status(400).json({ message: "حجم الملف يتجاوز 10 ميغابايت" });

  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]+/g, "") : "";
  if (!ext || ATTACH_EXT.indexOf(ext) === -1) {
    return res.status(400).json({ message: "نوع الملف غير مدعوم" });
  }

  // The reply must still be open — no attaching to an answer already sent.
  const qResp = await fetch(
    url + "/rest/v1/report_questions?answer_token=eq." + encodeURIComponent(token) + "&select=id,answer",
    { headers }
  );
  const rows = qResp.ok ? await qResp.json() : [];
  if (!rows.length) return res.status(404).json({ message: "الرابط غير صالح" });
  if (rows[0].answer) return res.status(409).json({ message: "تم إرسال الرد على هذا الاستفسار مسبقًا" });

  const path = "questions/" + rows[0].id + "/" + Date.now().toString(36) + "-attachment." + ext;
  const signResp = await fetch(
    url + "/storage/v1/object/upload/sign/" + ATTACH_BUCKET + "/" + path,
    { method: "POST", headers: Object.assign({}, headers, { "Content-Type": "application/json" }), body: "{}" }
  );
  if (!signResp.ok) {
    console.error("answer attachment sign failed:", signResp.status, await signResp.text());
    return res.status(502).json({ message: "تعذّر رفع الملف، حاول مرة أخرى" });
  }
  const signed = await signResp.json();
  // Supabase returns the path with its own token as a query string.
  return res.status(200).json({
    path: path,
    uploadUrl: url + "/storage/v1" + (signed.url || ""),
  });
}

/* ---------- POST { t, question }: the writer asks ---------- */
async function ask(req, res, headers, url, token, question) {
  if (!UUID_RE.test(token)) return res.status(404).json({ message: "الرابط غير صالح" });
  if (!question) return res.status(400).json({ message: "الرجاء كتابة الاستفسار" });
  if (question.length > MAX_QUESTION) return res.status(400).json({ message: "الاستفسار طويل جدًا" });

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

  const countResp = await fetch(
    url + "/rest/v1/report_questions?submission_id=eq." + encodeURIComponent(sub.id) + "&select=id",
    { headers: Object.assign({}, headers, { Prefer: "count=exact", Range: "0-0" }) }
  );
  const total = parseInt((countResp.headers.get("content-range") || "").split("/")[1], 10);
  if (Number.isFinite(total) && total >= MAX_PER_SUBMISSION) {
    return res.status(429).json({
      message: "وصلت إلى الحد الأقصى للاستفسارات. يرجى التواصل معنا مباشرة على sceneone.info@gmail.com",
    });
  }

  // Primary assignee + co-reader when set.
  const readerIds = [sub.assigned_to, sub.co_reader_id].filter(Boolean);
  let readerEmails = [];
  if (readerIds.length) {
    const adminResp = await fetch(
      url + "/rest/v1/admins?id=in.(" + readerIds.map(encodeURIComponent).join(",") + ")&select=id,email",
      { headers }
    );
    const admins = adminResp.ok ? await adminResp.json() : [];
    readerEmails = admins.map((a) => a.email).filter(Boolean);
  }

  // Store first — the reply link depends on the row's answer_token, and a stored
  // question with a failed send can still be chased from the Scene One copy.
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
    console.error("ask insert failed:", insertResp.status, await insertResp.text());
    return res.status(502).json({ message: "تعذّر إرسال الاستفسار، حاول مرة أخرى" });
  }
  const row = (await insertResp.json())[0];

  const link = SITE_URL + "/answer?q=" + encodeURIComponent(row.answer_token);
  const title = sub.title_ar || sub.title_en || "";
  // Always include the Scene One inbox: it's the fallback route when no reader
  // is assigned, and the paper trail when one is.
  const emailed = await sendEmail({
    to: readerEmails.length ? readerEmails.concat([NOTIFY_TO]) : [NOTIFY_TO],
    subject: "استفسار من الكاتب حول التقرير" + (title ? " · " + title : ""),
    html: emailDocument(questionEmail(sub, question, link)),
  });

  return res.status(200).json({ ok: true, emailed: emailed });
}

/* ---------- POST { q, answer }: the reader replies ---------- */
async function answerQuestion(req, res, headers, url, token, answer, attachment) {
  if (!UUID_RE.test(token)) return res.status(404).json({ message: "الرابط غير صالح" });
  if (!answer) return res.status(400).json({ message: "الرجاء كتابة الرد" });
  if (answer.length > MAX_ANSWER) return res.status(400).json({ message: "الرد طويل جدًا" });

  const qResp = await fetch(
    url + "/rest/v1/report_questions?answer_token=eq." + encodeURIComponent(token) +
    "&select=id,question,answer,submission_id",
    { headers }
  );
  const rows = qResp.ok ? await qResp.json() : [];
  if (!rows.length) return res.status(404).json({ message: "الرابط غير صالح" });
  const row = rows[0];
  if (row.answer) return res.status(409).json({ message: "تم إرسال الرد على هذا الاستفسار مسبقًا" });

  // The client sends back the {name, path} it was given. Trust neither: the path
  // must be one WE minted for THIS question (so a reply cannot claim another
  // one's file, or an arbitrary key in the bucket), and the object must actually
  // be there — a signed URL that was never PUT to leaves a path that resolves to
  // nothing, and storing it would promise the writer a download that 404s.
  let att = null;
  if (attachment && attachment.path) {
    const path = String(attachment.path);
    if (path.indexOf("questions/" + row.id + "/") !== 0) {
      return res.status(400).json({ message: "طلب غير صالح" });
    }
    const head = await fetch(
      url + "/storage/v1/object/info/" + ATTACH_BUCKET + "/" + path,
      { headers }
    );
    if (!head.ok) {
      console.error("answer attachment missing at send:", head.status, path);
      return res.status(400).json({ message: "تعذّر إرفاق الملف، حاول رفعه مرة أخرى" });
    }
    att = { name: String(attachment.name || "attachment").slice(0, 200), path: path };
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
      body: JSON.stringify({
        answer: answer,
        answered_at: new Date().toISOString(),
        answer_attachment: att,
      }),
    }
  );
  if (!patch.ok) {
    console.error("answer patch failed:", patch.status, await patch.text());
    return res.status(502).json({ message: "تعذّر حفظ الرد، حاول مرة أخرى" });
  }
  if (!(await patch.json()).length) {
    return res.status(409).json({ message: "تم إرسال الرد على هذا الاستفسار مسبقًا" });
  }

  if (!sub.email) return res.status(200).json({ ok: true, emailed: false });

  const title = sub.title_ar || sub.title_en || "";
  const reportLink = sub.report_token
    ? SITE_URL + "/report?t=" + encodeURIComponent(sub.report_token)
    : "";
  // The writer has no account, so the file is reached through their REPORT
  // token — the same secret their report link already carries — and streamed by
  // /api/report. The answer_token in this page's URL is the reader's, and must
  // never travel to the writer.
  const attachmentLink = att && sub.report_token
    ? SITE_URL + "/api/report?t=" + encodeURIComponent(sub.report_token) +
      "&file=answer&q=" + encodeURIComponent(row.id)
    : "";
  const emailed = await sendEmail({
    to: [sub.email],
    cc: [NOTIFY_TO],
    subject: "ردّ على استفسارك حول التقرير" + (title ? " · " + title : ""),
    html: emailDocument(answerEmail(sub, row.question, answer, reportLink, attachmentLink)),
  });

  return res.status(200).json({ ok: true, emailed: emailed });
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  }
  const { url, key } = svc();
  if (!url || !key) {
    console.error("Supabase env vars are not configured");
    return res.status(500).json({ message: "الخادم غير مهيأ" });
  }
  const headers = { apikey: key, Authorization: "Bearer " + key };

  if (req.method === "GET") return readThread(req, res, headers, url);

  const b = req.body || {};
  const askToken = (b.t || "").toString().trim();
  const answerToken = (b.q || "").toString().trim();

  // Exactly one token decides the branch — never guess when both are present.
  if (askToken && answerToken) {
    return res.status(400).json({ message: "طلب غير صالح" });
  }
  if (askToken) {
    return ask(req, res, headers, url, askToken, (b.question || "").toString().trim());
  }
  if (answerToken) {
    // Same token, two shapes: `upload` asks for somewhere to put a file, `answer`
    // sends the reply itself. Checked in that order so a request carrying both
    // cannot quietly send a half-formed answer.
    if (b.upload) {
      return signUpload(req, res, headers, url, answerToken, b.upload || {});
    }
    return answerQuestion(
      req, res, headers, url, answerToken,
      (b.answer || "").toString().trim(),
      b.attachment || null
    );
  }
  return res.status(400).json({ message: "طلب غير صالح" });
};
