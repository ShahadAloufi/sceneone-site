// Vercel serverless function — public, read-only report data for the writer.
//
//   GET /api/report?t=<report_token>
//
// The unguessable per-submission token IS the authorization: no login. Returns
// only the fields the report shows (never the writer's email, file path, etc.),
// and only once the coverage is marked "completed". Reads use the service-role
// key (server-side only).
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

  const token = ((req.query && req.query.t) || "").toString().trim();
  if (!UUID_RE.test(token)) return res.status(404).json({ message: "Report not found" });

  const headers = { apikey: key, Authorization: "Bearer " + key };

  // Look up the submission by its report token. Select only report-safe fields.
  const subResp = await fetch(
    url + "/rest/v1/submissions?report_token=eq." + encodeURIComponent(token) +
    "&select=id,title_ar,title_en,writer,genre,film_type,draft,duration,logline",
    { headers }
  );
  const subs = subResp.ok ? await subResp.json() : [];
  if (!subs.length) return res.status(404).json({ message: "Report not found" });
  const sub = subs[0];

  // Only expose a completed coverage.
  const covResp = await fetch(
    url + "/rest/v1/coverages?submission_id=eq." + encodeURIComponent(sub.id) + "&select=data,status",
    { headers }
  );
  const covs = covResp.ok ? await covResp.json() : [];
  if (!covs.length || covs[0].status !== "completed") {
    return res.status(404).json({ message: "Report not found" });
  }

  delete sub.id;
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ submission: sub, coverage: covs[0].data || {} });
};
