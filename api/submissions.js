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

const FALLBACK_TO = "sceneone.info@gmail.com";
const NOTIFY_FROM = "Scene One <onboarding@resend.dev>";

// --- Allowlists & limits (server is the source of truth; never trust client) ---
const GENRES = ["drama", "comedy", "thriller", "horror", "action", "documentary", "other"];
const FILM_TYPES = ["feature", "short"];
const DRAFTS = ["first", "revised", "final"];
const ALLOWED_EXT = ["pdf", "fdx", "fountain", "docx", "txt"];
const MAX = { title: 200, email: 254, writer: 120, duration: 60, logline: 1000, vision: 5000, path: 300, fileName: 255 };

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

// Fetch every admin's email so new submissions are announced to all of them.
async function getAdminEmails() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const resp = await fetch(url + "/rest/v1/admins?select=email", {
      headers: { apikey: key, Authorization: "Bearer " + key },
    });
    if (!resp.ok) return [];
    const rows = await resp.json();
    return rows.map(function (r) { return r.email; }).filter(Boolean);
  } catch (err) {
    console.error("Could not load admin emails:", err);
    return [];
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendNotification(row) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // notifications are optional

  const adminEmails = await getAdminEmails();
  const recipients = adminEmails.length ? adminEmails : [FALLBACK_TO];

  const rows = [
    ["العنوان (عربي)", row.title_ar],
    ["العنوان (إنجليزي)", row.title_en],
    ["البريد الإلكتروني", row.email],
    ["الكاتب", row.writer],
    ["النوع", row.genre],
    ["نوع الفيلم", row.film_type],
    ["المسودة", row.draft],
    ["المدة", row.duration || "—"],
    ["Logline", row.logline || "—"],
    ["رؤية الكاتب", row.vision],
    ["الحقوق مسجّلة", row.ip_registered ? "نعم" : "لا"],
    ["الملف", row.file_name || "—"],
  ];

  const html =
    '<div dir="rtl" style="font-family: Arial, sans-serif; font-size: 15px; color: #1a1a1a;">' +
    '<h2 style="margin: 0 0 16px;">نص جديد مقدَّم - Scene One</h2>' +
    '<table style="border-collapse: collapse; width: 100%; max-width: 640px;">' +
    rows
      .map(function (r) {
        return (
          "<tr>" +
          '<td style="padding: 8px 12px; border: 1px solid #e2e2e2; background: #f7f7f7; font-weight: bold; white-space: nowrap;">' +
          r[0] +
          "</td>" +
          '<td style="padding: 8px 12px; border: 1px solid #e2e2e2;">' +
          escapeHtml(r[1]) +
          "</td>" +
          "</tr>"
        );
      })
      .join("") +
    "</table></div>";

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
    logline: (b.logline || "").toString().trim(),
    vision: (b.vision || "").toString().trim(),
    ip_registered: b.ip === "yes" || b.ip === true,
    file_path: (b.filePath || "").toString().trim() || null,
    file_name: (b.fileName || "").toString().trim() || null,
    status: "new",
  };

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

  // Fire the notification email (non-blocking failure).
  await sendNotification(row);

  return res.status(201).json({ ok: true });
};
