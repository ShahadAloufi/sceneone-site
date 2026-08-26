// Vercel serverless function — public, read-only report data for the writer.
//
//   GET /api/report?t=<report_token>
//
// The unguessable per-submission token IS the authorization: no login. Returns
// only the fields the report shows (never the writer's email, file path, etc.),
// and only once the coverage is "approved" by staff. Reads use the service-role
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

  // Only expose an APPROVED coverage — the writer sees the report only after it
  // has passed staff quality review (a submitted/revision coverage stays private).
  const covResp = await fetch(
    url + "/rest/v1/coverages?submission_id=eq." + encodeURIComponent(sub.id) + "&select=data,status",
    { headers }
  );
  const covs = covResp.ok ? await covResp.json() : [];
  if (!covs.length || covs[0].status !== "approved") {
    return res.status(404).json({ message: "Report not found" });
  }

  const coverage = covs[0].data || {};

  // The reader may have attached a resource for the writer (a screenwriting
  // guide, a formatting reference). The writer has no account, so the file is
  // reached through THIS token and nothing else: a short-lived signed URL minted
  // here with the service role. Ten minutes — long enough to click from a report
  // they have open, short enough that a forwarded link is worthless.
  //
  // Never returns the storage path itself, only the temporary URL.
  let attachment = null;
  if (coverage.attachment && coverage.attachment.path) {
    try {
      const signResp = await fetch(
        url + "/storage/v1/object/sign/attachments/" +
        coverage.attachment.path.split("/").map(encodeURIComponent).join("/"),
        {
          method: "POST",
          headers: Object.assign({ "Content-Type": "application/json" }, headers),
          body: JSON.stringify({ expiresIn: 600 }),
        }
      );
      if (signResp.ok) {
        const signed = await signResp.json();
        if (signed && signed.signedURL) {
          const fileName = coverage.attachment.name || "attachment";
          // `download` sets Content-Disposition, so the writer's browser saves the
          // file under the name their reader gave it. Without it they would get
          // the storage key, which is ASCII-only and says nothing (an Arabic
          // filename sanitises away entirely — see uploadAttachment()).
          attachment = {
            name: fileName,
            url: url + "/storage/v1" + signed.signedURL + "&download=" + encodeURIComponent(fileName),
          };
        }
      } else {
        console.error("report: attachment sign failed:", signResp.status, await signResp.text());
      }
    } catch (err) {
      console.error("report: attachment sign error:", err);
    }
  }
  // The path must not travel to the browser even when signing failed.
  if (coverage.attachment) delete coverage.attachment.path;

  delete sub.id;
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ submission: sub, coverage: coverage, attachment: attachment });
};
