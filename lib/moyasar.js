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

const MOYASAR_API = "https://api.moyasar.com/v1";

// Coverage prices in halalas (1 SAR = 100 halalas), VAT included. These mirror
// the prices published on the homepage: 1200 SAR feature / 750 SAR short.
const PRICES = { feature: 120000, short: 75000 };

// Creates the invoice for one submission and returns its hosted checkout URL.
// Throws on any non-2xx or malformed response — the caller decides what the
// writer sees.
async function createPayment(opts) {
  const secretKey = process.env.MOYASAR_SECRET_KEY;
  if (!secretKey) throw new Error("MOYASAR_SECRET_KEY is not configured");

  const amount = PRICES[opts.filmType];
  if (!amount) throw new Error("No price for film type: " + opts.filmType);

  const resp = await fetch(MOYASAR_API + "/invoices", {
    method: "POST",
    headers: {
      // Moyasar uses HTTP Basic with the secret key as the username and an
      // empty password.
      Authorization: "Basic " + Buffer.from(secretKey + ":").toString("base64"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amount,
      currency: "SAR",
      description: "Scene One coverage — " + (opts.titleAr || opts.submissionId),
      callback_url: opts.callbackUrl,
      // Lets the webhook match a callback back to this submission even if we
      // failed to store the invoice id on the row.
      metadata: { submission_id: opts.submissionId },
    }),
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
