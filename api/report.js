// Vercel serverless function — public, read-only report data for the writer.
//
//   GET /api/report?t=<report_token>                  → the report's JSON
//   GET /api/report?t=<report_token>&file=attachment  → the attachment's bytes
//
// The second form is what the emailed "download" button hits, via the
// /download/<token> rewrite in vercel.json. It exists so the EMAIL never has to
// carry a signed URL: signed URLs live ten minutes, an email is read whenever
// the writer gets to it, and a link that is dead on arrival is worse than no
// link. This mints one at the moment of the click, then streams the file back
// itself — so the writer stays on sceneone.info and the signed URL never leaves
// the server.
//
// It is deliberately NOT a new serverless function — the project is at Vercel
// Hobby's cap of 12 — and it needs no new authorization: the token in the URL is
// the same one that authorizes the report itself.
//
// The unguessable per-submission token IS the authorization: no login. Returns
// only the fields the report shows (never the writer's email, file path, etc.),
// and only once the coverage is "approved" by staff. Reads use the service-role
// key (server-side only).
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Vercel's response payload ceiling for a serverless function, with room to
// spare. Anything larger is redirected instead of streamed — see the download
// branch below.
const STREAM_MAX_BYTES = 4 * 1024 * 1024;

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
  const wantFile = ((req.query && req.query.file) || "").toString().trim();
  if (!UUID_RE.test(token)) return res.status(404).json({ message: "Report not found" });

  const headers = { apikey: key, Authorization: "Bearer " + key };

  // Look up the submission by its report token. Select only report-safe fields.
  const subResp = await fetch(
    url + "/rest/v1/submissions?report_token=eq." + encodeURIComponent(token) +
    // `pages` is here because «عدد الصفحات/المدة» falls back to the page count
    // when the writer typed no duration (see mapSubmission in js/report-render.js).
    // Without it the writer's own report shows a dash for a length we hold.
    "&select=id,title_ar,title_en,writer,genre,film_type,draft,duration,logline,pages",
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

  // What the attachment is called once it lands in the writer's downloads.
  //
  // NOT the stored name: that is whatever the file was called on the reader's
  // machine ("WhatsApp Image 2026-08-26 at 8.42.30 PM.jpeg") — noise to the
  // writer, and it leaks how the file reached us. The report label and the
  // approval email are both generic already; this was the last place the raw
  // name surfaced.
  //
  // ASCII only, deliberately. This value becomes a Content-Disposition filename,
  // where anything non-ASCII needs the filename*= form to be legal — so the
  // Arabic title is dropped rather than risk a mangled name, and the English one
  // is stripped to characters that survive every filesystem. The extension is
  // kept: without it the writer's OS cannot open the file.
  function attachmentFileName(stored, titleEn) {
    const m = /\.([A-Za-z0-9]{1,8})$/.exec(String(stored || ""));
    const ext = m ? "." + m[1].toLowerCase() : "";
    const title = String(titleEn || "")
      .replace(/[^A-Za-z0-9 _-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return (title ? "Scene One - " + title + " - attachment" : "Scene One attachment") + ext;
  }

  // The reader may have attached a resource for the writer (a screenwriting
  // guide, a formatting reference). The writer has no account, so the file is
  // reached through THIS token and nothing else.
  //
  // The signed URL is minted ONLY for the download branch below, and is consumed
  // there — it never reaches the browser, and the JSON form does not pay for a
  // sign call it has no use for. The report page needs to know an attachment
  // exists and what it is called; the link it renders is our own /download route.
  const hasAttachment = !!(coverage.attachment && coverage.attachment.path);
  const attachmentName = hasAttachment
    ? attachmentFileName(coverage.attachment.name, sub.title_en) : null;

  let attachment = null;
  if (wantFile === "attachment" && hasAttachment) {
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
          // `download` sets Content-Disposition on the upstream response. It
          // still matters on the redirect fallback for large files, where the
          // browser talks to Storage directly and this is the only thing naming
          // the file.
          attachment = {
            name: attachmentName,
            url: url + "/storage/v1" + signed.signedURL + "&download=" + encodeURIComponent(attachmentName),
          };
        }
      } else {
        console.error("report: attachment sign failed:", signResp.status, await signResp.text());
      }
    } catch (err) {
      console.error("report: attachment sign error:", err);
    }
  }
  // The download button (emailed, or in the report) lands here. Everything above
  // has already run — the token resolved to a submission, and the coverage was
  // confirmed approved — so this inherits the report's own access rule rather
  // than inventing one.
  //
  // The bytes are STREAMED through this function rather than redirected to, so
  // the writer stays on sceneone.info for the whole download and never sees a
  // supabase.co URL. The signed URL is minted and consumed server-side; it never
  // reaches the browser at all.
  if (wantFile === "attachment") {
    if (!attachment) return res.status(404).json({ message: "Attachment not found" });

    let upstream;
    try {
      upstream = await fetch(attachment.url);
    } catch (err) {
      console.error("report: attachment fetch error:", err);
      return res.status(502).json({ message: "Attachment unavailable" });
    }
    if (!upstream.ok || !upstream.body) {
      console.error("report: attachment fetch failed:", upstream.status);
      return res.status(502).json({ message: "Attachment unavailable" });
    }

    // Vercel caps a function's response payload at ~4.5 MB, while an attachment
    // may be up to 10 MiB (ATTACH_MAX_BYTES in js/coverage.js). Rather than fail
    // on the large ones, hand those back to the redirect: the writer briefly
    // sees a supabase.co URL, which is the lesser problem by far. Only files
    // whose size we cannot read fall through to streaming blind.
    const declared = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > STREAM_MAX_BYTES) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Location", attachment.url);
      return res.status(302).end();
    }

    // `attachment.name` is ASCII by construction (attachmentFileName), so the
    // plain filename form is legal here and needs no filename*= companion.
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Content-Disposition",
      'attachment; filename="' + attachment.name.replace(/"/g, "") + '"');
    if (Number.isFinite(declared) && declared > 0) res.setHeader("Content-Length", String(declared));
    res.setHeader("Cache-Control", "no-store");
    res.status(200);

    try {
      await pipeline(Readable.fromWeb(upstream.body), res);
    } catch (err) {
      // Headers are already out by now, so there is no status left to send —
      // the browser sees a truncated download, which is the truthful outcome.
      console.error("report: attachment stream error:", err);
      res.end();
    }
    return;
  }

  // Neither the path nor the raw filename may travel to the browser. The
  // renderer gates the attachment block on `name` being present, so the name is
  // REPLACED rather than removed.
  if (coverage.attachment) {
    delete coverage.attachment.path;
    if (coverage.attachment.name) coverage.attachment.name = attachmentName;
  }

  delete sub.id;
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    submission: sub,
    coverage: coverage,
    // Name only. The page builds its own link to /download/<token>.
    attachment: hasAttachment ? { name: attachmentName } : null,
  });
};
