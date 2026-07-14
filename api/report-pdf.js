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

// @sparticuz/chromium only wires up LD_LIBRARY_PATH and extracts its bundled OS
// libraries (libnss3.so, …) when it detects an AWS Lambda Node 20/22 runtime,
// which it does purely from these env vars. Vercel runs on Lambda (Amazon Linux
// 2023) but doesn't set them in that form, so Chromium launches without libnss3
// and dies. We pin Node 20, so declare the runtime ourselves — this MUST run
// before @sparticuz/chromium is required (its detection runs at module load).
if (!process.env.AWS_LAMBDA_JS_RUNTIME) process.env.AWS_LAMBDA_JS_RUNTIME = "nodejs20.x";

const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SITE_URL = process.env.SITE_URL || "https://sceneone.info";

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
    return res.status(500).json({ message: "Couldn't generate the PDF" });
  } finally {
    if (browser) { try { await browser.close(); } catch (e) {} }
  }
};
