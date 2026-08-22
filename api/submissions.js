// Vercel serverless function — handles the "Script Submission" form.
//
// Flow: the browser first uploads the script file directly to Supabase
// Storage (the `scripts` bucket), then POSTs the form fields + the resulting
// file path to this endpoint as JSON. This function validates the data and
// inserts a row into the `submissions` table using the Supabase service-role
// key, which is server-side only (never exposed to the browser). The row lands
// as `pending_payment` and the response carries a Moyasar checkout URL — the
// script only enters the review pipeline once payment is confirmed.
//
// The only email sent here is the "complete your payment" prompt, so a writer who
// closes the checkout tab can still reach their invoice. The confirmation and the
// team alert fire from api/payment-webhook.js, once the payment has cleared.
//
// Required environment variables (set in Vercel project settings):
//   SUPABASE_URL                — e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   — the "service_role" secret key
//   MOYASAR_SECRET_KEY          — see lib/moyasar.js
// Optional:
//   RESEND_API_KEY              — without it the payment prompt is skipped

const { createPayment } = require("../lib/moyasar");
const { sendPaymentPrompt } = require("../lib/submission-emails");

// Where Moyasar returns the writer after checkout.
const SITE_URL = process.env.SITE_URL || "https://sceneone.info";

// --- Allowlists & limits (server is the source of truth; never trust client) ---
const GENRES = ["drama", "comedy", "romance", "crime", "thriller", "horror", "action", "documentary", "other"];
// Every priced product is its own `film_type`: price is derived from film_type
// alone (PRICES in lib/moyasar.js), never from the page count, which is optional
// (PDF uploads only) and computed in the browser. `short_under_30` is the cheaper
// short tier; the two `treatment_*` types are a different product entirely — an
// early-stage read on the story, not the eight-point script coverage.
const FILM_TYPES = ["feature", "short", "short_under_30", "treatment_short", "treatment_feature"];
// Length guard for the types sold on a page cap. The count pdf.js reports
// INCLUDES the title page, so the work itself is `pages - 1` (same convention as
// the coverage panel), and each cap here is one page LOOSER than the number
// advertised on the card: the title-page convention makes the boundary fuzzy by
// exactly one page, and bouncing an honest 29-page script is worse than letting a
// 30-page one through. A UX guard, not a security boundary — the count is
// client-supplied, so a forged one still buys the cheap tier for a long script.
// The real check is a human opening it in the reader workspace.
const PAGE_CAPS = {
  short_under_30: 30,
  treatment_short: 5,
  treatment_feature: 15,
};
const DRAFTS = ["first", "revised", "final"];
function isTreatment(t) { return String(t || "").indexOf("treatment") === 0; }
// Writer's self-declared experience, shown to readers so they can pitch the
// coverage's depth and tone. Ordered least → most experienced; the labels live
// in submit.html (writer-facing) and js/admin.js (reader-facing), keyed on these
// values — add a level in all three or the table falls back to the raw key.
const WRITER_LEVELS = ["new", "emerging", "professional", "veteran"];
const ALLOWED_EXT = ["pdf", "fdx", "fountain", "docx", "txt"];
const MAX = { title: 200, email: 254, writer: 120, duration: 60, theme: 200, logline: 1000, vision: 5000, path: 300, fileName: 255,
  // Treatment-only fields. `treatment_text` is the whole document when a writer
  // pastes it instead of relying on the upload, so its cap is generous.
  characters: 5000, toneRef: 500, treatmentText: 60000 };

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
  if (row.characters && row.characters.length > MAX.characters) return "بيانات غير صحيحة";
  if (row.tone_ref && row.tone_ref.length > MAX.toneRef) return "بيانات غير صحيحة";
  if (row.treatment_text && row.treatment_text.length > MAX.treatmentText) return "بيانات غير صحيحة";
  if (!row.email || row.email.length > MAX.email || !EMAIL_RE.test(row.email)) return "بريد إلكتروني غير صحيح";
  if (GENRES.indexOf(row.genre) === -1) return "بيانات غير صحيحة";
  if (FILM_TYPES.indexOf(row.film_type) === -1) return "بيانات غير صحيحة";
  // `draft` is a script concept: the treatment form has no such field, so it is
  // required for script types only and must be empty (never a bogus value) for
  // a treatment.
  if (isTreatment(row.film_type)) {
    if (row.draft) return "بيانات غير صحيحة";
  } else if (DRAFTS.indexOf(row.draft) === -1) {
    return "بيانات غير صحيحة";
  }
  if (WRITER_LEVELS.indexOf(row.writer_level) === -1) return "بيانات غير صحيحة";
  if (!row.file_path || row.file_path.length > MAX.path || !PATH_RE.test(row.file_path)) return "ملف النص مطلوب";
  if (!row.file_name || row.file_name.length > MAX.fileName) return "ملف النص مطلوب";
  if (ALLOWED_EXT.indexOf(fileExt(row.file_name)) === -1) return "صيغة الملف غير مدعومة";
  return null;
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
    writer_level: (b.writerLevel || "").toString().trim(),
    genre: (b.genre || "").toString().trim(),
    film_type: (b.filmType || "").toString().trim(),
    draft: (b.draft || "").toString().trim(),
    duration: (b.duration || "").toString().trim(),
    theme: (b.theme || "").toString().trim(),
    logline: (b.logline || "").toString().trim(),
    vision: (b.vision || "").toString().trim(),
    // Present only on the treatment form; null (not "") keeps script rows clean.
    characters: (b.characters || "").toString().trim() || null,
    tone_ref: (b.toneRef || "").toString().trim() || null,
    treatment_text: (b.treatmentText || "").toString().trim() || null,
    ip_registered: b.ip === "yes" || b.ip === true,
    file_path: (b.filePath || "").toString().trim() || null,
    file_name: (b.fileName || "").toString().trim() || null,
    // Payment gates everything downstream: nothing is assignable to a reader
    // until the webhook moves this to `paid`.
    status: "pending_payment",
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

  // Tiers sold on a page cap bounce anything plainly too long, rather than
  // invoicing the writer for the wrong product. Only when we actually have a
  // count — non-PDF uploads have none.
  const cap = PAGE_CAPS[row.film_type];
  if (cap && row.pages && row.pages - 1 > cap) {
    return res.status(400).json({
      message: "عدد صفحات الملف يتجاوز " + cap + " صفحة، وهو أطول مما تغطيه الفئة المختارة. اختر الفئة المناسبة لعدد صفحات نصك.",
    });
  }

  let submissionId;
  try {
    const resp = await fetch(supabaseUrl + "/rest/v1/submissions", {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        "Content-Type": "application/json",
        // We need the new row's id to tie the Moyasar invoice to it.
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Supabase insert failed:", resp.status, detail);
      return res.status(502).json({ message: "تعذّر حفظ النص" });
    }

    const inserted = await resp.json();
    submissionId = inserted && inserted[0] && inserted[0].id;
    if (!submissionId) {
      console.error("Supabase insert returned no id:", JSON.stringify(inserted));
      return res.status(502).json({ message: "تعذّر حفظ النص" });
    }
  } catch (err) {
    console.error("Supabase request error:", err);
    return res.status(500).json({ message: "تعذّر حفظ النص" });
  }

  // Open the payment. The row stays `pending_payment` — only the webhook may
  // promote it to `paid`.
  let payment;
  try {
    payment = await createPayment({
      submissionId: submissionId,
      filmType: row.film_type,
      titleAr: row.title_ar,
      callbackUrl: SITE_URL + "/payment-status",
    });
  } catch (err) {
    console.error("Moyasar invoice failed:", err);
    return res.status(502).json({ message: "تعذّر بدء عملية الدفع" });
  }

  // Store the invoice so the webhook can match on it, and keep the checkout URL
  // so the writer can be sent back to it later. A failure here is not fatal —
  // the invoice also carries metadata.submission_id as a fallback.
  try {
    const patch = await fetch(supabaseUrl + "/rest/v1/submissions?id=eq." + submissionId, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        payment_invoice_id: payment.id,
        payment_url: payment.url,
        payment_amount: payment.amount,
      }),
    });
    if (!patch.ok) console.error("invoice patch failed:", patch.status, await patch.text());
  } catch (err) {
    console.error("invoice patch error:", err);
  }

  // The browser redirects to checkout straight away; this is the fallback for a
  // writer who abandons that page. Non-blocking — the invoice already exists.
  await sendPaymentPrompt(row, payment.url);

  return res.status(201).json({ ok: true, paymentUrl: payment.url });
};
