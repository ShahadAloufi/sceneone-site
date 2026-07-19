// Vercel serverless function — handles the "Script Submission" form.
//
// Flow: the browser first uploads the script file directly to Supabase
// Storage (the `scripts` bucket), then POSTs the form fields + the resulting
// file path to this endpoint as JSON. This function validates the data and
// inserts a row into the `submissions` table using the Supabase service-role
// key, which is server-side only (never exposed to the browser).
//
// Optionally, if RESEND_API_KEY is set, it also emails a notification.
//
// Required environment variables (set in Vercel project settings):
//   SUPABASE_URL                — e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   — the "service_role" secret key
// Optional:
//   RESEND_API_KEY              — reuse the existing Resend key for email alerts

// All submission notifications go to this shared inbox.
const NOTIFY_TO = "sceneone.info@gmail.com";
// Sender must be on a domain you've VERIFIED in Resend (Domains → Add Domain).
const NOTIFY_FROM = "Scene One <no-reply@sceneone.info>";
// Used for the dashboard link in the team notification email.
const SITE_URL = process.env.SITE_URL || "https://sceneone.info";

// --- Allowlists & limits (server is the source of truth; never trust client) ---
const GENRES = ["drama", "comedy", "thriller", "horror", "action", "documentary", "other"];
const FILM_TYPES = ["feature", "short"];
const DRAFTS = ["first", "revised", "final"];
const ALLOWED_EXT = ["pdf", "fdx", "fountain", "docx", "txt"];
const MAX = { title: 200, email: 254, writer: 120, duration: 60, theme: 200, logline: 1000, vision: 5000, path: 300, fileName: 255 };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Object path produced by the client: "<digits>-<base36>/<sanitized-name>".
// Reject anything else (path traversal, absolute paths, other buckets, etc.).
const PATH_RE = /^[A-Za-z0-9]+-[A-Za-z0-9]+\/[A-Za-z0-9._-]+$/;

function fileExt(name) {
  const i = String(name).lastIndexOf(".");
  return i >= 0 ? String(name).slice(i + 1).toLowerCase() : "";
}

// Returns an error string if the payload is invalid, or null if it's clean.
function validate(row) {
  if (!row.title_ar || row.title_ar.length > MAX.title) return "بيانات غير صحيحة";
  if (!row.title_en || row.title_en.length > MAX.title) return "بيانات غير صحيحة";
  if (!row.writer || row.writer.length > MAX.writer) return "بيانات غير صحيحة";
  if (!row.vision || row.vision.length > MAX.vision) return "بيانات غير صحيحة";
  if (row.duration && row.duration.length > MAX.duration) return "بيانات غير صحيحة";
  if (row.theme && row.theme.length > MAX.theme) return "بيانات غير صحيحة";
  if (row.logline && row.logline.length > MAX.logline) return "بيانات غير صحيحة";
  if (!row.email || row.email.length > MAX.email || !EMAIL_RE.test(row.email)) return "بريد إلكتروني غير صحيح";
  if (GENRES.indexOf(row.genre) === -1) return "بيانات غير صحيحة";
  if (FILM_TYPES.indexOf(row.film_type) === -1) return "بيانات غير صحيحة";
  if (DRAFTS.indexOf(row.draft) === -1) return "بيانات غير صحيحة";
  if (!row.file_path || row.file_path.length > MAX.path || !PATH_RE.test(row.file_path)) return "ملف النص مطلوب";
  if (!row.file_name || row.file_name.length > MAX.fileName) return "ملف النص مطلوب";
  if (ALLOWED_EXT.indexOf(fileExt(row.file_name)) === -1) return "صيغة الملف غير مدعومة";
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Internal "new submission" email for the team. Same brand shell as the writer
// emails (background, white card, wordmark) but the body stays a scannable
// key/value table rather than centered prose — this is a working notification,
// so legibility of the fields matters more than styling. Ends with a CTA into
// the dashboard, where the script is actually picked up.
function notificationEmail(row, rows) {
  var esc = escapeHtml;
  var title = row.title_ar || row.title_en || "";
  var keyCell = "padding:9px 12px;border-bottom:1px solid #ece7df;font-size:13px;color:#8a8178;font-weight:700;white-space:nowrap;vertical-align:top;";
  var valCell = "padding:9px 12px;border-bottom:1px solid #ece7df;font-size:13.5px;color:#4a453f;line-height:1.7;";

  var body = rows.map(function (r) {
    var v = (r[1] == null || r[1] === "") ? "—" : r[1];
    return '<tr><td style="' + keyCell + '">' + esc(r[0]) + "</td>" +
           '<td style="' + valCell + '">' + esc(v) + "</td></tr>";
  }).join("");

  return "" +
    '<div style="background:#f5f1e9;padding:34px 14px;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;"><tr><td align="center">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;">' +
          '<tr><td style="padding:40px 36px;">' +

            '<div style="text-align:center;font-weight:700;letter-spacing:5px;font-size:20px;color:#15110f;margin:0 0 26px;">SCENE&nbsp;<span style="color:#cd2e07;">ONE</span></div>' +

            '<h1 style="margin:0 0 6px;font-size:22px;line-height:1.3;color:#15110f;font-weight:700;text-align:center;">نص جديد مقدَّم</h1>' +
            '<p style="margin:0 0 26px;text-align:center;color:#8a8178;font-size:13px;">' +
              (title ? "العنوان: <strong style=\"color:#15110f;\">" + esc(title) + "</strong>" : "&nbsp;") +
            "</p>" +

            '<table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">' +
              body +
            "</table>" +

            '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 0;"><tr>' +
              '<td style="border-radius:12px;background:#111111;">' +
                '<a href="' + esc(SITE_URL) + '/admin" style="display:inline-block;padding:14px 34px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:12px;">فتح لوحة التحكم</a>' +
              "</td></tr></table>" +

          "</td></tr>" +
        "</table>" +
      "</td></tr></table>" +
    "</div>";
}

async function sendNotification(row) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // notifications are optional

  const recipients = [NOTIFY_TO];

  const rows = [
    ["العنوان (عربي)", row.title_ar],
    ["العنوان (إنجليزي)", row.title_en],
    ["البريد الإلكتروني", row.email],
    ["الكاتب", row.writer],
    ["النوع", row.genre],
    ["نوع الفيلم", row.film_type],
    ["المسودة", row.draft],
    ["المدة", row.duration || "—"],
    ["الثيم", row.theme || "—"],
    ["Logline", row.logline || "—"],
    ["رؤية الكاتب", row.vision],
    ["الحقوق مسجّلة", row.ip_registered ? "نعم" : "لا"],
    ["الملف", row.file_name || "—"],
  ];

  const html = notificationEmail(row, rows);

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: recipients,
        reply_to: row.email,
        subject: "New Script Submission - Scene One",
        html: html,
      }),
    });
  } catch (err) {
    // Don't fail the submission if the email fails — the row is already saved.
    console.error("Notification email failed:", err);
  }
}

// Bilingual "we received your script" email. Deliberately mirrors the report
// email in api/review-coverage.js — same warm background, centered white card,
// Scene One wordmark, Arabic block then an English block — so the two messages a
// writer gets look like one brand. No CTA button here: there's nothing to open
// yet (the report link only exists once staff approve the coverage).
function confirmationEmail(row) {
  var esc = escapeHtml;
  var title = row.title_ar || row.title_en || "";
  var name = (row.writer || "").toString().trim();

  var arHi = name ? "مرحبًا " + esc(name) + "،" : "مرحبًا،";
  var enHi = name ? "Hello " + esc(name) + "," : "Hello,";

  var titleLine = title
    ? '<p style="margin:0 0 24px;color:#8a8178;font-size:13px;">العنوان: ' +
      '<strong style="color:#15110f;">' + esc(title) + "</strong></p>"
    : "";

  var bodyStyle = "margin:0 auto;max-width:440px;font-size:15px;line-height:1.9;color:#4a453f;";

  return "" +
    '<div style="background:#f5f1e9;padding:34px 14px;font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e9;"><tr><td align="center">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;">' +
          '<tr><td style="padding:46px 44px;text-align:center;">' +

            '<div style="font-weight:700;letter-spacing:5px;font-size:20px;color:#15110f;margin:0 0 30px;">SCENE&nbsp;<span style="color:#cd2e07;">ONE</span></div>' +

            '<h1 style="margin:0 0 14px;font-size:25px;line-height:1.3;color:#15110f;font-weight:700;">تم استلام نصك</h1>' +

            titleLine +

            '<p dir="rtl" style="' + bodyStyle + '">' +
              arHi +
              "<br>شكرًا لتقديم نصك إلى Scene One. لقد استلمنا طلبك، وسيقوم أحد قرّائنا بمراجعته، ثم نرسل إليك تقرير التقييم عبر بريدك الإلكتروني." +
            "</p>" +

            '<hr style="border:0;border-top:1px solid #ece7df;width:78%;margin:26px auto;">' +

            '<p dir="ltr" style="' + bodyStyle + '">' +
              enHi +
              "<br>Thanks for submitting your script to Scene One. We've received it — one of our readers will review it, and we'll email you the coverage report when it's ready." +
            "</p>" +

            '<p style="margin:30px 0 0;color:#a49b90;font-size:12.5px;"> The Scene One team</p>' +

          "</td></tr>" +
        "</table>" +
      "</td></tr></table>" +
    "</div>";
}

// Sends a confirmation email to the writer who submitted the script.
async function sendConfirmation(row) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !row.email) return; // optional; requires a valid recipient

  const html = confirmationEmail(row);

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [row.email],
        reply_to: NOTIFY_TO,
        subject: "تم استلام نصك - Scene One",
        html: html,
      }),
    });
  } catch (err) {
    // Don't fail the submission if the confirmation email fails.
    console.error("Confirmation email failed:", err);
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Supabase env vars are not configured");
    return res.status(500).json({ message: "تعذّر حفظ النص" });
  }

  const b = req.body || {};
  const row = {
    title_ar: (b.titleAr || "").toString().trim(),
    title_en: (b.titleEn || "").toString().trim(),
    email: (b.email || "").toString().trim(),
    writer: (b.writer || "").toString().trim(),
    genre: (b.genre || "").toString().trim(),
    film_type: (b.filmType || "").toString().trim(),
    draft: (b.draft || "").toString().trim(),
    duration: (b.duration || "").toString().trim(),
    theme: (b.theme || "").toString().trim(),
    logline: (b.logline || "").toString().trim(),
    vision: (b.vision || "").toString().trim(),
    ip_registered: b.ip === "yes" || b.ip === true,
    file_path: (b.filePath || "").toString().trim() || null,
    file_name: (b.fileName || "").toString().trim() || null,
    status: "new",
  };

  // Optional PDF page count computed in the browser (title page included).
  const pageCount = Number(b.pages);
  if (Number.isInteger(pageCount) && pageCount > 0 && pageCount <= 3000) {
    row.pages = pageCount;
  }

  // Server-side validation (the server is the source of truth; the client
  // checks are for UX only). Enforces enum allowlists, length caps, the
  // storage object-path format, and the file extension.
  const err = validate(row);
  if (err) return res.status(400).json({ message: err });

  try {
    const resp = await fetch(supabaseUrl + "/rest/v1/submissions", {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Supabase insert failed:", resp.status, detail);
      return res.status(502).json({ message: "تعذّر حفظ النص" });
    }
  } catch (err) {
    console.error("Supabase request error:", err);
    return res.status(500).json({ message: "تعذّر حفظ النص" });
  }

  // Fire the admin notification + writer confirmation (non-blocking failure).
  await sendNotification(row);
  await sendConfirmation(row);

  return res.status(201).json({ ok: true });
};
