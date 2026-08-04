// Vercel serverless function — daily backstop for the writer's "work has started"
// notice.
//
//   GET /api/send-notices     (Vercel Cron, once a day — see vercel.json)
//
// The sweep itself lives in lib/assignment-notices.js and is normally driven by
// /api/claim-script, which readers hit constantly, so notices usually go out
// within minutes of falling due. This exists for the case where nobody touches
// the dashboard for a stretch: without it, a script claimed on Friday evening
// would leave its writer unnotified until someone next used the app.
//
// It is only a BACKSTOP, not the schedule. Vercel Hobby caps cron at once per
// day — a more frequent expression fails deployment outright — so this alone
// could delay a notice by up to 24h. Moving to Pro (once-per-minute crons) would
// let this become the primary trigger and the piggyback in claim-script could go.
//
// Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is
// set on the project. Without that env var the endpoint refuses everything —
// failing closed, because an open endpoint here would let anyone force notices
// out early, closing writers' refund windows.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
// CRON_SECRET.

const crypto = require("crypto");
const { sweepAssignmentNotices } = require("../lib/assignment-notices");

function secretMatches(received, expected) {
  const a = Buffer.from(String(received || ""));
  const b = Buffer.from(String(expected || ""));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET;

  if (!url || !key || !cronSecret) {
    console.error("send-notices: env vars are not configured");
    return res.status(500).json({ message: "Server not configured" });
  }

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!secretMatches(token, cronSecret)) {
    console.error("send-notices: bad cron secret");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const headers = {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
  };

  const sent = await sweepAssignmentNotices(url, headers);
  if (sent) console.log("send-notices: sent " + sent + " assignment notice(s)");
  return res.status(200).json({ ok: true, sent: sent });
};
