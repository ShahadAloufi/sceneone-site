// Counts the pages of a submitted PDF — SERVER-SIDE.
//
// Short film coverage is priced per page (10 SAR each), so the page count is no
// longer a sanity check that a human could second-guess later: it IS the invoice
// amount. The browser also counts pages with pdf.js, and that number is fine for
// telling the writer what they are about to pay, but it arrives in a request body
// anyone can edit — trusting it would let a writer send `pages: 10` for a 40-page
// script and be charged 100 instead of 400.
//
// So the server re-counts from the file itself. The upload has already landed in
// the private `scripts` bucket by the time /api/submissions runs (the browser
// uploads first and posts only the object path), so this reads it back with the
// service-role key and counts it with pdf-lib.
//
// Lives outside api/ on purpose: every file under api/ becomes a public route.

const { PDFDocument } = require("pdf-lib");

// A screenplay's first page is its title page, which is not part of the work and
// is not what the writer is paying to have read. Every page number the app shows
// already follows this convention (the dashboard column, the coverage panel), so
// billing follows it too: a 41-page PDF is a 40-page script.
function billablePages(rawCount) {
  return rawCount > 1 ? rawCount - 1 : rawCount;
}

// Returns { raw, billable } or throws. The caller decides what the writer sees —
// every throw here means "we could not establish the length", which for a
// per-page product has to stop the submission rather than guess at it.
async function countPagesInStorage(supabaseUrl, serviceKey, bucket, objectPath) {
  const url = supabaseUrl + "/storage/v1/object/" + encodeURIComponent(bucket) + "/" +
    objectPath.split("/").map(encodeURIComponent).join("/");

  let resp;
  try {
    resp = await fetch(url, {
      headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey },
    });
  } catch (err) {
    throw new Error("storage fetch failed: " + err.message);
  }
  if (!resp.ok) {
    throw new Error("storage fetch failed: " + resp.status + " " + (await resp.text()));
  }

  const bytes = new Uint8Array(await resp.arrayBuffer());

  let doc;
  try {
    // `ignoreEncryption` still parses a password-protected file's structure when
    // it can. A file we genuinely cannot open throws, and the caller refuses the
    // submission — better than inventing a length for something we cannot read.
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch (err) {
    throw new Error("pdf parse failed: " + err.message);
  }

  const raw = doc.getPageCount();
  if (!Number.isInteger(raw) || raw < 1) throw new Error("pdf parse produced no pages");
  return { raw: raw, billable: billablePages(raw) };
}

module.exports = { countPagesInStorage, billablePages };
