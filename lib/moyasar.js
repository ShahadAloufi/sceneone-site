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
// is not VAT-registered, so these are the whole charge. These mirror the prices
// published on the homepage: 1200 SAR feature / 750 SAR short (30–50 pages) /
// 350 SAR short under 30 pages. Keys are the `film_type` allowlist in
// api/submissions.js — a type with no price here fails the invoice outright,
// which is the safe direction.
const PRICES = { feature: 120000, short: 75000, short_under_30: 35000 };

// Creates the invoice for one submission and returns its hosted checkout URL.
// Throws on any non-2xx or malformed response — the caller decides what the
// writer sees.
async function createPayment(opts) {
  const secretKey = process.env.MOYASAR_SECRET_KEY;
  if (!secretKey) throw new Error("MOYASAR_SECRET_KEY is not configured");

  const amount = PRICES[opts.filmType];
  if (!amount) throw new Error("No price for film type: " + opts.filmType);

  const body = {
    amount: amount,
    currency: "SAR",
    description: "Scene One coverage — " + (opts.titleAr || opts.submissionId),
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

module.exports = { createPayment, fetchPayment, PRICES };
