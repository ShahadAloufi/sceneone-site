// Moyasar payment gateway — invoice creation.
//
// Payment gates the pipeline: a script is not assignable to a reader until it
// has been paid for. Every submission therefore gets a Moyasar *invoice* — a
// hosted checkout page we redirect the writer to — so card data never reaches
// our servers or the submission form.
//
// Lives outside api/ on purpose: every file under api/ becomes a public route.
//
// Required environment variables (set in Vercel project settings):
//   MOYASAR_SECRET_KEY — the secret ("sk_...") key; server-side only
//
// Optional:
//   MOYASAR_LOGO_URL — the Scene One logo as hosted by the Moyasar dashboard,
//     put on the hosted checkout page via the invoice's `logo_url`. It is the
//     ONLY branding hook the hosted page has — there is no background, colour or
//     CSS parameter, so anything more than the logo would mean embedding
//     Moyasar's form in our own page, which would put the card form on our
//     origin and change our PCI position. Left unset, invoices are created
//     without the field and Moyasar falls back to whatever the dashboard
//     applies by default.

const MOYASAR_API = "https://api.moyasar.com/v1";

// Coverage prices in halalas (1 SAR = 100 halalas). No VAT component — Scene One
// is not VAT-registered, so these are the whole charge. Keys are the `film_type`
// allowlist in api/submissions.js — a type with no price here fails the invoice
// outright, which is the safe direction.
//
// FIXED-PRICE products — only the two treatments. Both SCRIPT coverages are
// priced per page (see PER_PAGE below), so their amounts depend on the file and
// cannot live in a constant.
const PRICES = {
  // Treatment coverage — a story-stage read, sold on page caps of 15 / 5.
  treatment_feature: 15000,
  treatment_short: 7000,
  // Retired 2026-08-25, kept so an OLD row can still be priced/re-quoted if
  // anything ever replays it. Nothing offers these to a new writer.
  short_under_30: 35000,
};

// PER-PAGE products: 10 SAR a page for both script coverages, differing only in
// the length they accept. The bounds ARE the advertised range — 10–40 pages is
// 100–400 SAR, 80–120 pages is 800–1200 — so the card and the invoice cannot
// disagree. Enforced at submission (api/submissions.js) against the SERVER's own
// page count, never the browser's.
const PER_PAGE = {
  short: { rate: 1000, min: 10, max: 40 },
  feature: { rate: 1000, min: 80, max: 120 },
};

function perPageRule(filmType) {
  return PER_PAGE[filmType] || null;
}

// Cinema Association partner discount, in percent. Applied to the LIST price
// from priceFor() rather than inside it, so priceFor() stays what it has always
// been — the single authority on what a product costs — and the discount stays
// a visible, separate step on top.
//
// It is applied on the strength of an UPLOADED CARD ALONE. There is no
// membership roster to check against (the association has none to give), so at
// the moment this runs nobody has verified anything: the writer ticked a box,
// typed a number and attached an image. That is a deliberate product decision —
// the alternative was making every member wait for a human before they could
// pay. What it costs, if a card turns out to be bad: 15% of the coverage, i.e.
// 15–180 SAR. What it buys: a member is never asked to wait.
//
// The claim is flagged for staff in the All-submissions tab, and the amount is
// already charged by the time they look — so a rejected card is a conversation,
// not a correction. Nothing in this file can undo a payment.
const MEMBER_DISCOUNT_PCT = 15;

// Halalas in, halalas out. Rounded, though every product we sell today divides
// evenly: a per-page amount is pages × 1000, and 85% of that is pages × 850.
function memberDiscounted(amount) {
  return Math.round((amount * (100 - MEMBER_DISCOUNT_PCT)) / 100);
}

// The amount a submission should be invoiced, in halalas. `pages` is the BILLABLE
// count (title page already excluded — see lib/pdf-pages.js) and is required for
// per-page products. Throws rather than guessing: an unpriceable submission must
// never reach checkout.
function priceFor(filmType, pages) {
  const rule = perPageRule(filmType);
  if (!rule) {
    const fixed = PRICES[filmType];
    if (!fixed) throw new Error("No price for film type: " + filmType);
    return fixed;
  }
  if (!Number.isInteger(pages)) {
    throw new Error("Page count required to price film type: " + filmType);
  }
  if (pages < rule.min || pages > rule.max) {
    throw new Error("Page count " + pages + " outside " + rule.min + "-" + rule.max +
                    " for film type: " + filmType);
  }
  return pages * rule.rate;
}

// What each product is called on the invoice. The writer sees this line on
// Moyasar's checkout and on any receipt they revisit later, so it names the
// product rather than a film_type key.
const PRODUCT_AR = {
  short: "تغطية فيلم قصير",
  feature: "تغطية فيلم طويل",
  treatment_short: "تغطية معالجة فيلم قصير",
  treatment_feature: "تغطية معالجة فيلم طويل",
  short_under_30: "تغطية فيلم قصير",
};

// The invoice's description. For a per-page product it carries the arithmetic —
// "29 صفحة × 10 ريال" — because otherwise a writer looking at the charge weeks
// later has a bare number with nothing to reconstruct it from. Fixed-price
// products just name themselves.
function invoiceDescription(filmType, pages, titleAr, memberDiscount) {
  const product = PRODUCT_AR[filmType] || "تغطية Scene One";
  const rule = perPageRule(filmType);
  const parts = [product];
  if (rule && Number.isInteger(pages)) {
    parts.push(pages + " صفحة × " + (rule.rate / 100) + " ريال");
  }
  // Same reasoning as the per-page arithmetic above: a writer looking at this
  // charge weeks later must be able to reconstruct it, and a member discount is
  // the difference between the price on the card and the price they paid.
  if (memberDiscount) parts.push("خصم عضوية جمعية السينما " + MEMBER_DISCOUNT_PCT + "%");
  if (titleAr) parts.push(titleAr);
  // Arabic comma, not an em dash: this string is the line a writer reads on their
  // bank statement and in the Moyasar checkout, and the site's copy style avoids
  // the em dash. The separator still has to be visible — the parts are the
  // arithmetic, and running them together would defeat the point.
  return parts.join("، ");
}

// Creates the invoice for one submission and returns its hosted checkout URL.
// Throws on any non-2xx or malformed response — the caller decides what the
// writer sees.
async function createPayment(opts) {
  const secretKey = process.env.MOYASAR_SECRET_KEY;
  if (!secretKey) throw new Error("MOYASAR_SECRET_KEY is not configured");

  // Per-page products need the count; fixed ones ignore it. The member discount
  // then comes off the list price — see memberDiscounted() for what it is and is
  // not evidence of.
  const listAmount = priceFor(opts.filmType, opts.pages);
  const amount = opts.memberDiscount ? memberDiscounted(listAmount) : listAmount;

  const body = {
    amount: amount,
    currency: "SAR",
    description: invoiceDescription(opts.filmType, opts.pages, opts.titleAr || opts.submissionId, opts.memberDiscount),
    callback_url: opts.callbackUrl,
    // Kept for humans reading the Moyasar dashboard, NOT as a matching key:
    // verified 2026-07-28 that Moyasar does not copy invoice metadata onto the
    // payment object, so a webhook's payment arrives with `metadata: null`.
    // Matching relies on `payment.invoice_id`, which the payment does carry.
    metadata: { submission_id: opts.submissionId },
  };

  // Branding is opt-in: a blank or missing variable must not send an empty
  // `logo_url`, which Moyasar would reject as a malformed URI and take the
  // whole checkout down with it. A payment page with no logo is a cosmetic
  // problem; a payment page that never opens is not.
  const logoUrl = (process.env.MOYASAR_LOGO_URL || "").trim();
  if (logoUrl) body.logo_url = logoUrl;

  const resp = await fetch(MOYASAR_API + "/invoices", {
    method: "POST",
    headers: {
      // Moyasar uses HTTP Basic with the secret key as the username and an
      // empty password.
      Authorization: "Basic " + Buffer.from(secretKey + ":").toString("base64"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(function () { return null; });
  if (!resp.ok || !data || !data.url) {
    throw new Error("Moyasar invoice failed: " + resp.status + " " + JSON.stringify(data));
  }

  return { id: data.id, url: data.url, amount: amount };
}

// Re-reads a payment straight from Moyasar. The webhook calls this before
// trusting anything: a webhook body is just an HTTP POST anyone can forge, so
// the shared secret alone is not enough to move money-backed state.
async function fetchPayment(paymentId) {
  const secretKey = process.env.MOYASAR_SECRET_KEY;
  if (!secretKey) throw new Error("MOYASAR_SECRET_KEY is not configured");

  const resp = await fetch(MOYASAR_API + "/payments/" + encodeURIComponent(paymentId), {
    headers: {
      Authorization: "Basic " + Buffer.from(secretKey + ":").toString("base64"),
    },
  });

  const data = await resp.json().catch(function () { return null; });
  if (!resp.ok || !data || !data.id) {
    throw new Error("Moyasar payment lookup failed: " + resp.status + " " + JSON.stringify(data));
  }

  return data;
}

module.exports = { createPayment, fetchPayment, PRICES, PER_PAGE, priceFor, perPageRule,
                   invoiceDescription, memberDiscounted, MEMBER_DISCOUNT_PCT };
