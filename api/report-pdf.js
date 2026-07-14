// Vercel serverless function — server-generated PDF of the writer's report.
//
//   GET /api/report-pdf?t=<report_token>
//
// Public, token-gated (same model as /api/report: the unguessable token IS the
// authorization, no login). We render the *already-live* report page with
// headless Chrome and return it as a real PDF the browser downloads to the
// user's Downloads folder — no browser "print" dialog. Driving the real page
// (instead of re-building the markup here) keeps the PDF pixel-identical to the
// on-screen report and, crucially, renders Arabic correctly (Chromium does the
// shaping the client-side rasterisers can't).
//
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Optional: SITE_URL (defaults to the production domain).

const fs = require("fs");
const path = require("path");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SITE_URL = process.env.SITE_URL || "https://sceneone.info";

function svc() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

// TEMP diagnostic — reports the runtime OS/Node, whether @sparticuz/chromium's
// files shipped, and where (if anywhere) libnss3.so ends up after extraction.
async function debugInfo() {
  function ls(dir) { try { return fs.readdirSync(dir); } catch (e) { return "ERR:" + e.message; } }
  function firstLine(f) { try { return fs.readFileSync(f, "utf8").split("\n")[0]; } catch (e) { return "(none)"; } }
  var out = {
    node: process.version,
    arch: process.arch,
    platform: process.platform,
    osRelease: firstLine("/etc/os-release"),
    systemRelease: firstLine("/etc/system-release"),
  };
  var pkgDir;
  try { pkgDir = path.dirname(require.resolve("@sparticuz/chromium/package.json")); } catch (e) { pkgDir = "unresolved:" + e.message; }
  out.chromiumPkgDir = pkgDir;
  out.chromiumBin = typeof pkgDir === "string" ? ls(path.join(pkgDir, "bin")) : null;
  try {
    out.execPath = await chromium.executablePath();
  } catch (e) { out.execPathError = e.message; }
  out.LD_LIBRARY_PATH = process.env.LD_LIBRARY_PATH || null;
  out.tmp = ls("/tmp");
  // Hunt for libnss3.so under the likely extraction roots.
  out.libnss3 = [];
  ["/tmp", "/tmp/al2", "/tmp/al2023", "/tmp/lib"].forEach(function (d) {
    var found = ls(d);
    if (Array.isArray(found)) found.forEach(function (f) { if (/libnss3/.test(f)) out.libnss3.push(d + "/" + f); });
  });
  return out;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }
  if (req.query && req.query.debug === "1") {
    try { return res.status(200).json(await debugInfo()); }
    catch (e) { return res.status(500).json({ debugError: String(e && e.stack ? e.stack : e) }); }
  }
  const { url, key } = svc();
  if (!url || !key) {
    console.error("Supabase env vars are not configured");
    return res.status(500).json({ message: "Server not configured" });
  }

  const token = ((req.query && req.query.t) || "").toString().trim();
  if (!UUID_RE.test(token)) return res.status(404).json({ message: "Report not found" });

  // Validate the token maps to a submission with a *completed* coverage before
  // spending time/memory launching Chromium (mirrors /api/report's gate).
  const headers = { apikey: key, Authorization: "Bearer " + key };
  const subResp = await fetch(
    url + "/rest/v1/submissions?report_token=eq." + encodeURIComponent(token) + "&select=id",
    { headers }
  );
  const subs = subResp.ok ? await subResp.json() : [];
  if (!subs.length) return res.status(404).json({ message: "Report not found" });
  const covResp = await fetch(
    url + "/rest/v1/coverages?submission_id=eq." + encodeURIComponent(subs[0].id) + "&select=status",
    { headers }
  );
  const covs = covResp.ok ? await covResp.json() : [];
  if (!covs.length || covs[0].status !== "completed") {
    return res.status(404).json({ message: "Report not found" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      // A4 portrait ≈ 794px wide, so the report keeps its full desktop layout
      // (the mobile breakpoints only fire below 620px).
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.goto(SITE_URL + "/report?t=" + encodeURIComponent(token), {
      waitUntil: "networkidle0",
      timeout: 25000,
    });
    // Wait for the report itself to be on-screen and the web fonts to settle so
    // nothing renders half-loaded.
    await page.waitForSelector("#reportWrap:not([hidden])", { timeout: 15000 });
    await page.evaluate(function () {
      return document.fonts && document.fonts.ready ? document.fonts.ready : null;
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true, // keep the dark header + coloured fills
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
    await browser.close();
    browser = null;

    // ASCII filename for the header (broad client support); the browser-side
    // download names it nicely from the report title anyway.
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="Scene One Coverage Report.pdf"');
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).end(pdf);
  } catch (err) {
    console.error("report-pdf error:", err && err.stack ? err.stack : err);
    // TEMP: surface the real error to the caller so we can diagnose the deploy.
    return res.status(500).json({ message: "Couldn't generate the PDF", error: String(err && err.message ? err.message : err) });
  } finally {
    if (browser) { try { await browser.close(); } catch (e) {} }
  }
};
