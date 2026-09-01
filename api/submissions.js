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

const { createPayment, perPageRule } = require("../lib/moyasar");
const { countPagesInStorage } = require("../lib/pdf-pages");
const { sendPaymentPrompt } = require("../lib/submission-emails");

// Where Moyasar returns the writer after checkout.
const SITE_URL = process.env.SITE_URL || "https://sceneone.info";
// The private Storage bucket the browser uploaded into. Must match `bucket` in
// js/config.js — the server reads the file back from here to count its pages.
const BUCKET = "scripts";

// --- Allowlists & limits (server is the source of truth; never trust client) ---
const GENRES = ["drama", "comedy", "romance", "crime", "thriller", "horror", "action", "documentary", "other"];
// Every product is its own `film_type`. The two treatments are fixed-price; both
// SCRIPT coverages are priced per page (10 SAR each — 10–40 pages for a short,
// 80–120 for a feature), so their amount comes from the file itself — see
// priceFor() in lib/moyasar.js.
const FILM_TYPES = ["feature", "short", "treatment_short", "treatment_feature"];
// Upper bound per product, in BILLABLE pages (title page excluded). The two
// SCRIPT coverages are absent: their bounds are part of their price (10–40 and
// 80–120 pages), enforced by priceFor() in lib/moyasar.js, so a limit and an
// amount can never disagree. Only the fixed-price treatments need a cap here.
const PAGE_CAPS = {
  treatment_short: 5,
  treatment_feature: 15,
};
// Products whose price or length limit depends on a count we must be able to
// read — which, since both script coverages went per-page, is every product we
// sell. Kept as a list rather than "always PDF" so a future product could accept
// FDX/Fountain again without unpicking the check.
const PDF_ONLY_TYPES = ["short", "feature", "treatment_short", "treatment_feature"];
function needsPdf(t) { return PDF_ONLY_TYPES.indexOf(String(t || "")) !== -1; }
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
// Each title must be in its own script. The form says so as the writer types,
// but that is UX — a title reaches the reader, the report header and the invoice
// description, so the rule is enforced here too. Digits and punctuation are fine
// in either; only the LETTERS are constrained.
const LATIN_RE = /[A-Za-z]/;
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
// Object path produced by the client: "<digits>-<base36>/<sanitized-name>".
// Reject anything else (path traversal, absolute paths, other buckets, etc.).
const PATH_RE = /^[A-Za-z0-9]+-[A-Za-z0-9]+\/[A-Za-z0-9._-]+$/;

// --- Partner membership (Cinema Association / جمعية السينما) -----------------
// A writer may claim membership to be considered for the 15% discount. The claim
// is RECORDED, not verified: the association has no roster it can give us, so
// there is nothing to check a number against and a staff member has to look at
// the card. These checks only reject a claim that is obviously malformed —
// they say nothing about whether the person is a member.
//
// A complete claim DISCOUNTS THE INVOICE BY 15%, immediately, in this request —
// before any human has looked at the card (2026-08-29, on request). So these
// checks are the only thing standing between an uploaded image and a cheaper
// invoice, and they are not much: they reject a malformed number or a file that
// is not an image, and nothing else. The discount is applied on the upload
// alone, by design — the alternative was making every member wait for a human
// before they could pay. See memberDiscounted() in lib/moyasar.js.
//
// The invoice cannot be corrected afterwards, so a bad card is a conversation
// with the writer, not a re-charge. Staff see every claim flagged in the
// All-submissions tab.
const MEMBER_NUMBER_RE = /^CA-\d{1,6}$/;
const CARD_BUCKET = "member-cards";
const CARD_EXT = ["png", "jpg", "jpeg", "webp", "pdf"];

function fileExt(name) {
  const i = String(name).lastIndexOf(".");
  return i >= 0 ? String(name).slice(i + 1).toLowerCase() : "";
}

// Is the claimed card actually in the bucket?
//
// The browser uploads the card straight to Storage and then POSTs the path, so
// that path is a CLAIM like every other field in the body — and it is the only
// thing standing between a request and a 15% cheaper invoice. Without this check
// the discount rides on a string: a hand-made POST naming a path nobody ever
// uploaded is invoiced at 85%, and staff opening «عرض البطاقة» get a dead link
// with nothing to tell them why.
//
// This does not make the claim VERIFIED — nothing can, there is no roster. It
// only makes it true that a card was uploaded, which is what the feature was
// always meant to trust.
//
// Uses the list endpoint rather than downloading the object: we need existence
// and a non-zero size, not the bytes.
async function cardWasUploaded(supabaseUrl, serviceKey, path) {
  const slash = path.lastIndexOf("/");
  const prefix = slash > 0 ? path.slice(0, slash) : "";
  const name = slash > 0 ? path.slice(slash + 1) : path;

  const resp = await fetch(supabaseUrl + "/storage/v1/object/list/" + CARD_BUCKET, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Content-Type": "application/json",
    },
    // `search` is a prefix match within the folder, so the exact name is still
    // compared below.
    body: JSON.stringify({ prefix: prefix, search: name, limit: 100 }),
  });
  if (!resp.ok) throw new Error("card list failed: " + resp.status + " " + (await resp.text()));

  const rows = await resp.json();
  return Array.isArray(rows) && rows.some(
    (r) => r && r.name === name && r.metadata && Number(r.metadata.size) > 0
  );
}

// Returns an error string if the payload is invalid, or null if it's clean.
function validate(row) {
  if (!row.title_ar || row.title_ar.length > MAX.title) return "بيانات غير صحيحة";
  if (LATIN_RE.test(row.title_ar)) return "الرجاء إدخال العنوان بالعربية فقط";
  if (!row.title_en || row.title_en.length > MAX.title) return "بيانات غير صحيحة";
  if (ARABIC_RE.test(row.title_en)) return "الرجاء إدخال العنوان بالإنجليزية فقط";
  if (!row.writer || row.writer.length > MAX.writer) return "بيانات غير صحيحة";
  if (!row.vision || row.vision.length > MAX.vision) return "بيانات غير صحيحة";
  if (row.duration && row.duration.length > MAX.duration) return "بيانات غير صحيحة";
  if (row.theme && row.theme.length > MAX.theme) return "بيانات غير صحيحة";
  // Required on BOTH forms — a reader needs the one-line pitch to frame the read.
  if (!row.logline || row.logline.length > MAX.logline) return "بيانات غير صحيحة";
  // Duration is a script-form field — the treatment form has none — so it is
  // required only there. The theme is required on BOTH forms (2026-08-26),
  // overriding the treatment spec's original "optional".
  if (!isTreatment(row.film_type) && !row.duration) return "بيانات غير صحيحة";
  if (!row.theme) return "بيانات غير صحيحة";
  if (row.characters && row.characters.length > MAX.characters) return "بيانات غير صحيحة";
  // The tone/style reference is required on the treatment form (2026-09-01),
  // like the theme before it. Treatment-only: the script form has no such field.
  if (isTreatment(row.film_type) && !row.tone_ref) return "بيانات غير صحيحة";
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
  const ext = fileExt(row.file_name);
  if (needsPdf(row.film_type)) {
    if (ext !== "pdf") {
      return isTreatment(row.film_type)
        ? "يجب رفع المعالجة بصيغة PDF ليتم التحقق من عدد الصفحات."
        : "يجب رفع النص بصيغة PDF ليتم احتساب عدد الصفحات والسعر.";
    }
  } else if (ALLOWED_EXT.indexOf(ext) === -1) {
    return "صيغة الملف غير مدعومة";
  }
  // A membership claim must be complete or absent — never half. A number with no
  // card is unverifiable, and a card with no number gives staff nothing to key on.
  if (row.member_number || row.member_card_path) {
    if (!MEMBER_NUMBER_RE.test(row.member_number || "")) {
      return "أدخل رقم العضوية كما هو على البطاقة، مثل CA-50.";
    }
    if (!row.member_card_path || row.member_card_path.length > MAX.path ||
        !PATH_RE.test(row.member_card_path)) {
      return "أرفق صورة واضحة من بطاقة العضوية.";
    }
    if (CARD_EXT.indexOf(fileExt(row.member_card_path)) === -1) {
      return "صيغة بطاقة العضوية غير مدعومة. أرفق صورة PNG أو JPG أو WEBP أو ملف PDF.";
    }
  }
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

  // The claim, normalised before anything else looks at it. "50", "ca-50" and
  // "CA 50" are all stored as "CA-50" so two claims on one number are comparable — the only
  // check available to staff without a roster is noticing the same number under
  // different writers.
  const claimsMembership = b.isMember === true || b.isMember === "yes";
  const memberNumberRaw = (b.memberNumber || "").toString().trim().toUpperCase().replace(/\s+/g, "");
  const memberNumber = memberNumberRaw ? "CA-" + memberNumberRaw.replace(/^CA-?/, "") : "";
  const cardPath = (b.memberCardPath || "").toString().trim() || null;

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
    // Membership claim. Read ONLY when the writer actually ticked the box, so a
    // stray memberNumber in a hand-made request body cannot attach a claim to a
    // submission that never made one.
    member_number: claimsMembership ? (memberNumber || null) : null,
    member_card_path: claimsMembership ? cardPath : null,
    // Payment gates everything downstream: nothing is assignable to a reader
    // until the webhook moves this to `paid`.
    status: "pending_payment",
  };

  // The browser also counts the pages (pdf.js) so it can quote a price while the
  // writer fills the form, but that number is NOT used here: it arrives in a
  // request body anyone can edit, and for a per-page product it would be the
  // invoice. Kept only as a fallback for formats the server cannot read (FDX,
  // Fountain, DOCX — feature submissions), where it is a display value and
  // nothing more.
  const clientCount = Number(b.pages);
  if (Number.isInteger(clientCount) && clientCount > 0 && clientCount <= 3000) {
    row.pages = clientCount;
  }

  // A claim must arrive whole. Checked before validate() because validate() sees
  // only the row and cannot tell "ticked the box and filled nothing" apart from
  // "made no claim" — and the first of those should be told, not silently
  // dropped into a full-price submission with no record of what the writer meant.
  if (claimsMembership && (!row.member_number || !row.member_card_path)) {
    return res.status(400).json({
      message: "أدخل رقم العضوية وأرفق صورة البطاقة، أو ألغِ اختيار العضوية.",
    });
  }

  // Server-side validation (the server is the source of truth; the client
  // checks are for UX only). Enforces enum allowlists, length caps, the
  // storage object-path format, and the file extension.
  const err = validate(row);
  if (err) return res.status(400).json({ message: err });

  // ---- The card must really be there before it buys anything ----------------
  // Runs before the page count, the invoice and the row, so a claim with no card
  // behind it never becomes a discounted charge.
  //
  // A Storage failure here refuses the submission rather than guessing. Both
  // guesses are wrong: charging full price silently bills a member who did
  // upload their card, and skipping the check is the hole this closes. Same
  // stance the page count already takes — an amount we cannot stand behind must
  // not reach checkout.
  if (row.member_card_path) {
    let uploaded;
    try {
      uploaded = await cardWasUploaded(supabaseUrl, serviceKey, row.member_card_path);
    } catch (e) {
      console.error("submissions: card lookup failed:", e);
      return res.status(502).json({
        message: "تعذّر التحقق من رفع بطاقة العضوية. حاول مرة أخرى بعد قليل.",
      });
    }
    if (!uploaded) {
      return res.status(400).json({
        message: "لم نستلم صورة بطاقة العضوية. أعد إرفاقها ثم أرسل النص.",
      });
    }
  }

  // ---- Length, counted from the FILE (never from the request body) ----------
  // Anything whose price or discount depends on being short is re-counted here,
  // by reading the upload back out of Storage. This is what the invoice is built
  // from, so a forged `pages` in the request buys nothing.
  const rule = perPageRule(row.film_type);
  let billablePages = null;
  if (needsPdf(row.film_type)) {
    try {
      const counted = await countPagesInStorage(supabaseUrl, serviceKey, BUCKET, row.file_path);
      billablePages = counted.billable;
      row.pages = counted.raw;          // stored raw; every display subtracts the title page
    } catch (err) {
      console.error("submissions: page count failed:", err);
      return res.status(400).json({
        message: "تعذّر قراءة عدد صفحات الملف. تأكد من رفع ملف PDF سليم غير محمي بكلمة مرور.",
      });
    }
  }

  // Per-page products: the count IS the price, so its bounds are refused here
  // rather than quietly clamped.
  if (rule) {
    if (billablePages < rule.min) {
      return res.status(400).json({
        message: row.film_type === "feature"
          ? "الحد الأدنى لتغطية الفيلم الطويل " + rule.min + " صفحة. ملفك " + billablePages +
            " صفحة — اختر تغطية الفيلم القصير."
          : "الحد الأدنى " + rule.min + " صفحات. ملفك " + billablePages + " صفحة.",
      });
    }
    if (billablePages > rule.max) {
      return res.status(400).json({
        message: row.film_type === "short"
          ? "الحد الأقصى للفيلم القصير " + rule.max + " صفحة. ملفك " + billablePages +
            " صفحة — اختر تغطية الفيلم الطويل."
          : "الحد الأقصى " + rule.max + " صفحة. ملفك " + billablePages + " صفحة.",
      });
    }
  }

  // Fixed-price products keep a simple upper bound, applied to whatever count we
  // have (the server's for PDFs, the browser's for FDX/Fountain/DOCX).
  const cap = PAGE_CAPS[row.film_type];
  if (cap) {
    const measured = billablePages != null ? billablePages : (row.pages ? row.pages - 1 : null);
    if (needsPdf(row.film_type) && measured == null) {
      return res.status(400).json({
        message: "تعذّر قراءة عدد صفحات الملف. تأكد من رفع ملف PDF سليم.",
      });
    }
    if (measured != null && measured > cap) {
      return res.status(400).json({
        message: "عدد صفحات الملف يتجاوز " + cap + " صفحة، وهو أطول مما تغطيه الفئة المختارة. اختر الفئة المناسبة لعدد صفحات نصك.",
      });
    }
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
      // Per-page products price off this; fixed ones ignore it.
      pages: billablePages,
      // 15% off, on the strength of the uploaded card alone. `payment_amount` is
      // patched from the returned amount below, so the webhook's paid-vs-owed
      // comparison sees the discounted figure and does not read a member's
      // payment as an amount_mismatch.
      memberDiscount: !!row.member_number,
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
