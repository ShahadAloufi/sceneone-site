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
    ar: { loading: "جارٍ تحميل التقرير…", errT: "التقرير غير متاح", errM: "قد يكون الرابط غير صحيح أو أن التقرير لم يُنشر بعد.", print: "طباعة / حفظ PDF", docTitle: "Scene One — تقرير التغطية" },
    en: { loading: "Loading the report…", errT: "Report unavailable", errM: "This link may be invalid, or the report hasn't been published yet.", print: "Print / Save as PDF", docTitle: "Scene One — Coverage report" }
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
    $("printBtn").textContent = u.print;
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
    $("printBtn").hidden = false;
  }

  $("langSeg").querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () { applyLang(b.dataset.l); });
  });
  $("printBtn").addEventListener("click", function () { window.print(); });

  applyLang(lang()); // localise the loading screen immediately

  var token = new URLSearchParams(location.search).get("t") || "";
  if (!token) { showError(); return; }

  fetch("/api/report?t=" + encodeURIComponent(token))
    .then(function (r) { if (!r.ok) throw new Error("unavailable"); return r.json(); })
    .then(function (d) {
      data = {
        submission: window.SOReport.mapSubmission(d.submission || {}),
        coverage: window.SOReport.mergeCoverage(d.coverage || {})
      };
      ready();
      applyLang(lang());
    })
    .catch(showError);
})();
