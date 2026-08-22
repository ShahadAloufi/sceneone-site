#!/usr/bin/env node
/* ===========================================================
   Scene One — launch promotion grant
   Moves promo submissions into the normal pipeline WITHOUT treating them
   as paid: no invoice was ever raised, so no payment email may go out.

   Run it from the repo root with the same secrets Vercel holds:

     SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... RESEND_API_KEY=... \
       node scripts/promo-grant.js --test you@example.com
     ... node scripts/promo-grant.js --emails a@b.com,c@d.com --dry-run
     ... node scripts/promo-grant.js --emails a@b.com,c@d.com --apply

   Modes (nothing is written or sent unless you ask for it):
     --test <email>   send ONLY the promo email to that address, using a sample
                      row. Touches no database record at all.
     --dry-run        look up the submissions and print exactly what WOULD
                      change. No writes, no emails. This is the default.
     --apply          perform the updates and send the promo emails.
     --apply --no-email   perform the updates only (e.g. to send later).

   What --apply does per submission, oldest field first:
     status pending_payment → paid → unassigned   (the normal release path)
     payment_amount        → 0                    (nothing was charged)
     is_promo              → true                 (the flag every payment path checks)
     paid_at               → now                  (so the pipeline treats it normally)
     confirmation_sent_at  → now                  (BLOCKS the payment confirmation
                                                   for good: the webhook claims that
                                                   stamp before emailing, so a stray
                                                   payment event can never send one)
   =========================================================== */
"use strict";

const { promoEmail, sendPromoWelcome } = require("../lib/submission-emails");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* ---------- args ---------- */
const argv = process.argv.slice(2);
function flag(name) { return argv.indexOf(name) > -1; }
function value(name) {
  const i = argv.indexOf(name);
  return i > -1 ? argv[i + 1] : null;
}
const TEST_TO = value("--test");
const APPLY = flag("--apply");
const NO_EMAIL = flag("--no-email");
const EMAILS = (value("--emails") || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

function die(msg) { console.error("\n✗ " + msg + "\n"); process.exit(1); }

/* ---------- supabase (service role — server-side only) ---------- */
function rest(path, init) {
  return fetch(SUPABASE_URL + "/rest/v1/" + path, Object.assign({}, init, {
    headers: Object.assign({
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
    }, (init && init.headers) || {}),
  }));
}

const FIELDS = "id,email,writer,title_ar,title_en,film_type,status,payment_amount,is_promo,paid_at,confirmation_sent_at,created_at";

// The newest submission for this address that is still awaiting payment. Newest
// because a writer who submitted twice means the later one is the live attempt.
async function findPending(email) {
  const resp = await rest(
    "submissions?email=eq." + encodeURIComponent(email) +
    "&select=" + FIELDS + "&order=created_at.desc"
  );
  if (!resp.ok) die("lookup failed for " + email + ": " + resp.status + " " + (await resp.text()));
  const rows = await resp.json();
  return {
    all: rows,
    pending: rows.filter((r) => r.status === "pending_payment"),
  };
}

async function grant(row) {
  const now = new Date().toISOString();
  // One PATCH, filtered on the status we read — so a submission that gets paid
  // for real in the same moment is not overwritten by this grant.
  const resp = await rest(
    "submissions?id=eq." + encodeURIComponent(row.id) + "&status=eq.pending_payment",
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "unassigned",     // paid → released into the reader pool
        payment_amount: 0,
        is_promo: true,
        paid_at: now,
        confirmation_sent_at: now,
      }),
    }
  );
  if (!resp.ok) die("update failed for " + row.email + ": " + resp.status + " " + (await resp.text()));
  const out = await resp.json();
  return out && out.length ? out[0] : null;
}

/* ---------- run ---------- */
(async function main() {
  // Test mode never touches the database, so it needs only the Resend key.
  if (TEST_TO) {
    if (!process.env.RESEND_API_KEY) die("RESEND_API_KEY is required to send the test email.");
    const sample = {
      email: TEST_TO,
      writer: "",                      // no name → the generic «عزيزي/تي» greeting
      title_ar: "نموذج — عرض الإطلاق",
      title_en: "Sample — launch promotion",
    };
    console.log("Sending the promotion email to " + TEST_TO + " (no database changes)…");
    const ok = await sendPromoWelcome(sample);
    console.log(ok ? "✓ sent" : "✗ Resend rejected it — see the error above");
    process.exit(ok ? 0 : 1);
  }

  if (!EMAILS.length) die("Pass --emails a@b.com,c@d.com (or --test you@example.com).");
  if (!SUPABASE_URL || !SERVICE_KEY) die("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  if (APPLY && !NO_EMAIL && !process.env.RESEND_API_KEY) {
    die("RESEND_API_KEY is required to send the promotion emails (or pass --no-email).");
  }

  console.log(APPLY ? "\nAPPLYING promotion grants\n" : "\nDRY RUN — nothing will be written or sent\n");

  const targets = [];
  for (const email of EMAILS) {
    const { all, pending } = await findPending(email);
    if (!all.length) { console.log("  " + email + " — no submission found"); continue; }
    if (!pending.length) {
      console.log("  " + email + " — nothing pending_payment (status: " +
        all.map((r) => r.status).join(", ") + ")");
      continue;
    }
    if (pending.length > 1) {
      console.log("  " + email + " — " + pending.length + " pending; taking the newest (" +
        pending[0].id + "). Others left alone.");
    }
    const row = pending[0];
    console.log("  " + email + " — " + (row.title_ar || row.title_en || row.id) +
      " [" + row.film_type + "] " + row.status + " → unassigned, amount " +
      (row.payment_amount == null ? "—" : row.payment_amount) + " → 0, is_promo → true");
    targets.push(row);
  }

  if (!APPLY) {
    console.log("\n" + targets.length + " submission(s) would be granted. Re-run with --apply to do it.\n");
    return;
  }

  console.log("");
  for (const row of targets) {
    const updated = await grant(row);
    if (!updated) { console.log("  ✗ " + row.email + " — no longer pending_payment, skipped"); continue; }
    console.log("  ✓ " + row.email + " — granted (status " + updated.status +
      ", is_promo " + updated.is_promo + ", amount " + updated.payment_amount + ")");
    if (!NO_EMAIL) {
      const sent = await sendPromoWelcome(updated);
      console.log("    " + (sent ? "✓ promotion email sent" : "✗ promotion email FAILED — see above"));
    }
  }
  console.log("\nDone. These now sit in the reader pool and follow the normal assignment flow.\n");
})();
