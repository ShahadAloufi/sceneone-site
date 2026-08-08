// Vercel serverless function — public, read-only view of one report question,
// for the reader's reply page (/answer?q=<answer_token>).
//
//   GET /api/question?q=<answer_token>
//
// The unguessable per-question token IS the authorization: the reader follows
// the link from their email and never signs in. Returns only what the reply
// form renders (script title, the question, and the answer once given) — never
// the writer's email or anything else about the submission.
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function svc() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }
  const { url, key } = svc();
  if (!url || !key) {
    console.error("Supabase env vars are not configured");
    return res.status(500).json({ message: "Server not configured" });
  }

  const token = ((req.query && req.query.q) || "").toString().trim();
  if (!UUID_RE.test(token)) return res.status(404).json({ message: "Not found" });

  const headers = { apikey: key, Authorization: "Bearer " + key };

  const qResp = await fetch(
    url + "/rest/v1/report_questions?answer_token=eq." + encodeURIComponent(token) +
    "&select=question,answer,created_at,answered_at,submission_id",
    { headers }
  );
  const rows = qResp.ok ? await qResp.json() : [];
  if (!rows.length) return res.status(404).json({ message: "Not found" });
  const row = rows[0];

  // Title only, for context at the top of the reply form.
  const subResp = await fetch(
    url + "/rest/v1/submissions?id=eq." + encodeURIComponent(row.submission_id) +
    "&select=title_ar,title_en,writer",
    { headers }
  );
  const subs = subResp.ok ? await subResp.json() : [];
  const sub = subs[0] || {};

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    question: row.question,
    answer: row.answer,
    created_at: row.created_at,
    answered_at: row.answered_at,
    submission: {
      title_ar: sub.title_ar || "",
      title_en: sub.title_en || "",
      writer: sub.writer || "",
    },
  });
};
