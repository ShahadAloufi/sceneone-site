/* ===========================================================
   Scene One — public report page (report.html)
   Read-only. Loads a completed coverage by its unguessable token
   (?t=…) via /api/report and renders it with the shared renderer.
   No login: the token in the emailed link is the authorization.
   =========================================================== */
(function () {
  "use strict";

  var LANG_KEY = "sceneone-report-lang";
  var UI = {
    ar: { loading: "جارٍ تحميل التقرير…", errT: "التقرير غير متاح", errM: "قد يكون الرابط غير صحيح أو أن التقرير لم يُنشر بعد.", save: "حفظ PDF", preparing: "جارٍ التحضير…", pdfErr: "تعذّر إنشاء ملف PDF، حاول مرة أخرى.", fileBase: "تقرير Scene One", docTitle: "Scene One | تقرير التغطية",
      attachUnavailable: "تعذّر تحميل المرفق الآن. حاول مرة أخرى بعد قليل.",
      attachMissing: "لا يوجد مرفق مع هذا التقرير." },
    en: { loading: "Loading the report…", errT: "Report unavailable", errM: "This link may be invalid, or the report hasn't been published yet.", save: "Save as PDF", preparing: "Preparing…", pdfErr: "Couldn't generate the PDF, please try again.", fileBase: "Scene One Coverage Report", docTitle: "Scene One | Coverage report",
      attachUnavailable: "The attachment couldn't be downloaded just now. Please try again shortly.",
      attachMissing: "There's no attachment with this report." }
  };

  function $(id) { return document.getElementById(id); }
  function lang() { try { var l = localStorage.getItem(LANG_KEY); return (l === "en" || l === "ar") ? l : "ar"; } catch (e) { return "ar"; } }

  var data = null; // { submission, coverage } already mapped

  function applyLang(l) {
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
    var u = UI[l];
    document.documentElement.setAttribute("lang", l);
    document.documentElement.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
    document.title = u.docTitle;
    $("loadingT").textContent = u.loading;
    $("errorT").textContent = u.errT;
    $("errorM").textContent = u.errM;
    $("saveBtn").textContent = u.save;
    var seg = $("langSeg");
    seg.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.l === l); });
    if (data) {
      var rb = $("reportBody");
      rb.innerHTML = window.SOReport.render(data.submission, data.coverage, l);
      rb.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
      rb.classList.toggle("ar", l === "ar");
    }
  }

  function showError() { $("loading").hidden = true; $("reportWrap").hidden = true; $("errorBox").hidden = false; }

  function ready() {
    $("loading").hidden = true;
    $("errorBox").hidden = true;
    $("reportWrap").hidden = false;
    $("langSeg").hidden = false;
    $("saveBtn").hidden = false;
  }

  $("langSeg").querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () { applyLang(b.dataset.l); });
  });
  // "Save as PDF": download a real PDF straight to the user's Downloads folder
  // (no browser print dialog). The file is rendered server-side by /api/report-pdf
  // with headless Chrome — the only path that renders Arabic correctly.
  function fileName(u) {
    var t = data && data.submission ? (data.submission.titleEn || data.submission.titleAr) : "";
    var base = t ? u.fileBase + " — " + t : u.fileBase;
    return base.replace(/[\\/:*?"<>|]+/g, "").trim() + ".pdf";
  }
  $("saveBtn").addEventListener("click", async function () {
    var btn = this, u = UI[lang()];
    if (btn.dataset.busy) return;
    btn.dataset.busy = "1"; btn.disabled = true;
    var old = btn.textContent; btn.textContent = u.preparing;
    try {
      var resp = await fetch("/api/report-pdf?t=" + encodeURIComponent(token));
      if (!resp.ok) throw new Error("pdf");
      var blob = await resp.blob();
      var href = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = href; a.download = fileName(u);
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(href); }, 4000);
    } catch (e) {
      alert(u.pdfErr);
    }
    btn.textContent = old; btn.disabled = false; delete btn.dataset.busy;
  });

  applyLang(lang()); // localise the loading screen immediately

  var token = new URLSearchParams(location.search).get("t") || "";
  if (!token) { showError(); return; }

  // A failed download sends the writer here rather than dropping them on raw
  // JSON in a blank tab (see downloadFailed in api/report.js). Say what happened
  // once the report is on screen, then strip the flag so a refresh does not
  // repeat it — and so the URL they might bookmark is just their report.
  var attachFlag = new URLSearchParams(location.search).get("attachment") || "";
  function reportAttachmentFailure() {
    if (!attachFlag) return;
    var u = UI[lang()];
    var msg = attachFlag === "unavailable" ? u.attachUnavailable
            : attachFlag === "missing" ? u.attachMissing : "";
    attachFlag = "";
    try {
      var url = new URL(location.href);
      url.searchParams.delete("attachment");
      history.replaceState(null, "", url.pathname + url.search);
    } catch (e) {}
    if (msg) setTimeout(function () { alert(msg); }, 0);
  }

  fetch("/api/report?t=" + encodeURIComponent(token))
    .then(function (r) { if (!r.ok) throw new Error("unavailable"); return r.json(); })
    .then(function (d) {
      // The product decides the report's shape (script vs treatment coverage);
      // mapSubmission carries film_type through, so render() needs no help.
      var schema = window.SOReport.schemaFor((d.submission || {}).film_type);
      data = {
        submission: window.SOReport.mapSubmission(d.submission || {}),
        coverage: window.SOReport.mergeCoverage(d.coverage || {}, schema)
      };
      // Resource the reader attached for this writer.
      //
      // The link is OUR route, not the signed URL the response also carries:
      // /download streams the file from sceneone.info, minting its own signed URL
      // server-side per request. So the href never goes stale however long the
      // writer has the report open, and no supabase.co URL reaches the browser.
      if (d.attachment && d.attachment.name) {
        data.coverage.attachmentLink = {
          name: d.attachment.name,
          url: "/download/" + encodeURIComponent(token)
        };
      }
      ready();
      applyLang(lang());
      reportAttachmentFailure();
    })
    .catch(function () {
      showError();
      // The report itself failed to load, so the download's own reason is no
      // longer the story — but the URL still carries it. Clear it so a reload
      // is a clean attempt.
      attachFlag = "";
    });
})();
