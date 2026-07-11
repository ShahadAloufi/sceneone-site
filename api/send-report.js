// Vercel serverless function — emails the completed coverage report to the
// writer. Triggered manually by an admin/reader from the report page.
//
//   POST /api/send-report   { submission_id }
//
// The caller must send their Supabase session access token as
// `Authorization: Bearer <token>`; we verify it maps to a row in `admins`.
// The report is only sent once the coverage is marked "completed". All reads
// use the service-role key (server-side only), and the email goes out through
// the existing Resend integration.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

const NOTIFY_FROM = "Scene One <no-reply@sceneone.info>";
const NOTIFY_TO = "sceneone.info@gmail.com";

// The writer receives the coverage as a PDF attachment; the email body is only
// a short bilingual cover note.
const PDF_FILENAME = "Scene-One-Coverage-Report.pdf";
const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MiB ceiling on the uploaded snapshot

function svc() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

function escapeHtml(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Resolve the caller from their bearer token, then confirm they are an admin.
async function requireAdmin(req) {
  const { url, key } = svc();
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: 401, message: "غير مصرّح" };
  const userResp = await fetch(url + "/auth/v1/user", {
    headers: { apikey: key, Authorization: "Bearer " + token },
  });
  if (!userResp.ok) return { error: 401, message: "جلسة غير صالحة" };
  const user = await userResp.json();
  if (!user || !user.id) return { error: 401, message: "جلسة غير صالحة" };
  const roleResp = await fetch(
    url + "/rest/v1/admins?id=eq." + user.id + "&select=id",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const rows = roleResp.ok ? await roleResp.json() : [];
  if (!rows.length) return { error: 403, message: "غير مصرّح" };
  return { user };
}

// Short bilingual cover note that accompanies the PDF attachment. The full
// coverage lives in the attached PDF, not in the email body.
function coverNote(sub) {
  var title = sub.title_ar || sub.title_en || "";
  var titleLine = title
    ? '<p style="color:#555;margin:0 0 18px;">العنوان / Title: <strong>' + escapeHtml(title) + "</strong></p>"
    : "";
  return '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#1a1a1a;max-width:600px;line-height:1.85;">' +
    '<h2 style="margin:0 0 12px;">تقرير تغطية النص — Scene One</h2>' +
    titleLine +
    '<p style="margin:0 0 14px;color:#3f3a35;">مرحبًا،<br>تجدون تقرير تغطية نصكم مرفقًا بصيغة PDF. شكرًا لثقتكم بنا.</p>' +
    '<hr style="border:0;border-top:1px solid #e7e2da;margin:20px 0;">' +
    '<p dir="ltr" style="margin:0 0 14px;color:#3f3a35;">Hello,<br>Your script coverage report is attached as a PDF. Thank you for trusting Scene One.</p>' +
    '<p style="margin-top:24px;color:#888;">فريق Scene One / The Scene One team</p>' +
    "</div>";
}

// Validate the client-supplied PDF snapshot: a base64 string, within the size
// ceiling, that actually decodes to a PDF (magic bytes "%PDF").
function validatePdf(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  var b64 = raw.replace(/^data:[^,]*,/, "").trim();
  var buf;
  try { buf = Buffer.from(b64, "base64"); } catch (e) { return null; }
  if (!buf.length || buf.length > MAX_PDF_BYTES) return null;
  if (buf.slice(0, 5).toString("latin1") !== "%PDF-") return null;
  return b64;
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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ message: "خدمة البريد غير مهيأة" });

  const gate = await requireAdmin(req);
  if (gate.error) return res.status(gate.error).json({ message: gate.message });

  const b = req.body || {};
  const subId = (b.submission_id || "").toString().trim();
  if (!subId) return res.status(400).json({ message: "معرّف النص مطلوب" });

  const pdfB64 = validatePdf(b.pdf_base64);
  if (!pdfB64) return res.status(400).json({ message: "ملف التقرير غير صالح" });

  // Fetch the submission (writer + email) and its coverage.
  const subResp = await fetch(
    url + "/rest/v1/submissions?id=eq." + encodeURIComponent(subId) + "&select=id,title_ar,title_en,writer,email",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const subs = subResp.ok ? await subResp.json() : [];
  if (!subs.length) return res.status(404).json({ message: "النص غير موجود" });
  const sub = subs[0];
  if (!sub.email) return res.status(400).json({ message: "لا يوجد بريد إلكتروني للكاتب" });

  const covResp = await fetch(
    url + "/rest/v1/coverages?submission_id=eq." + encodeURIComponent(subId) + "&select=status",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const covs = covResp.ok ? await covResp.json() : [];
  if (!covs.length || covs[0].status !== "completed") {
    return res.status(400).json({ message: "التقرير غير مكتمل بعد" });
  }

  const title = sub.title_ar || sub.title_en || "";
  const html = coverNote(sub);

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [sub.email],
        reply_to: NOTIFY_TO,
        subject: "تقرير تغطية نصك — Scene One" + (title ? (" — " + title) : ""),
        html: html,
        attachments: [{ filename: PDF_FILENAME, content: pdfB64 }],
      }),
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error("Resend send-report failed:", r.status, detail);
      return res.status(502).json({ message: "تعذّر إرسال التقرير" });
    }
  } catch (err) {
    console.error("send-report error:", err);
    return res.status(500).json({ message: "تعذّر إرسال التقرير" });
  }

  return res.status(200).json({ ok: true });
};
