// Vercel serverless function — run the assignment-notice sweep on demand.
//
//   POST /api/sweep-notices   (Authorization: Bearer <access_token>)
//
// Called fire-and-forget by the dashboard on load. The release window is ONE
// HOUR, and a notice that falls due is only sent when something runs the sweep —
// previously that meant a reader claiming/releasing a script, or the daily cron.
// Between those, a notice could sit unsent for hours (and the reader's deadline
// never appeared, since it starts at `writer_notified_at`). Readers open the
// dashboard far more often than they claim, so hanging the sweep here is what
// makes a one-hour window mean one hour in practice.
//
// Auth: any signed-in reader/staff. Deliberately NOT open like the cron endpoint
// is guarded by CRON_SECRET — an anonymous caller must not be able to force
// notices out early and close writers' cancellation windows. Being signed in is
// enough, though: the sweep only sends what is already due, so the worst a
// reader can do by calling it is deliver a notice a few minutes sooner than the
// cron would have.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

const { sweepAssignmentNotices } = require("../lib/assignment-notices");

async function requireReader(req, url, key) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: 401 };
  const userResp = await fetch(url + "/auth/v1/user", {
    headers: { apikey: key, Authorization: "Bearer " + token },
  });
  if (!userResp.ok) return { error: 401 };
  const user = await userResp.json();
  if (!user || !user.id) return { error: 401 };
  const rowResp = await fetch(
    url + "/rest/v1/admins?id=eq." + encodeURIComponent(user.id) + "&select=id",
    { headers: { apikey: key, Authorization: "Bearer " + key } }
  );
  const rows = rowResp.ok ? await rowResp.json() : [];
  if (!rows.length) return { error: 403 };
  return { user };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("sweep-notices: env vars are not configured");
    return res.status(500).json({ message: "Server not configured" });
  }

  const gate = await requireReader(req, url, key);
  if (gate.error) return res.status(gate.error).json({ message: "Unauthorized" });

  const headers = {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
  };

  // Never throws: a failing sweep must not turn a dashboard load into an error.
  let sent = 0;
  try {
    sent = await sweepAssignmentNotices(url, headers);
    if (sent) console.log("sweep-notices: sent " + sent + " assignment notice(s)");
  } catch (err) {
    console.error("sweep-notices: sweep error:", err);
  }
  return res.status(200).json({ ok: true, sent: sent });
};
