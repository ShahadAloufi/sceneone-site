/* ===========================================================
   Scene One — Coverage workspace
   Opened from the admin dashboard (coverage.html?id=<submission id>).
   The orange-edged panel is pulled read-only from the writer's
   submission; the reader writes the evaluation below, which autosaves
   to the `coverages` table (one row per submission). "Report" renders a
   bilingual, printable coverage report from the same data.
   =========================================================== */
(function () {
  "use strict";

  var CFG = window.SCENEONE_SUPABASE || {};
  // Shared with the admin dashboard so a language choice in either place
  // carries over to the other.
  var LANG_KEY = "sceneone-admin-lang";
  var LANG = "ar";    // report language (kept in sync with the workspace language)
  var UILANG = "ar";  // workspace-chrome language
  try { var _l = localStorage.getItem(LANG_KEY); if (_l === "ar" || _l === "en") { UILANG = _l; LANG = _l; } } catch (e) {}
  // Report strings, constants and the report renderer are shared with the public
  // report page via js/report-render.js (loaded first). Alias them so the rest of
  // this workspace keeps referencing T / GLANCE / EVAL / … unchanged.
  var R = window.SOReport;
  var LOGO = R.LOGO, T = R.T;
  var GLANCE = R.GLANCE, GLANCE_OPTS = R.GLANCE_OPTS, REC_OPTS = R.REC_OPTS, EVAL = R.EVAL, MARKET = R.MARKET;
  var GENRE_EN = R.GENRE_EN, FORMAT_EN = R.FORMAT_EN, DRAFT_EN = R.DRAFT_EN;

  /* ---------- workspace-chrome translations ---------- */
  var UI = {
    en: {
      tabReview: "Reader coverage", tabReport: "Report",
      eyebrow: "Reader workspace", h1: "Coverage",
      lead: "Everything in the orange-edged panel is pulled straight from the writer's submission, locked so you can't change it. You only write the evaluation below. Your work autosaves as you type.",
      pulledTag: "Pulled from the writer's submission · read-only",
      reader: "Reader", readerPh: "Scene One Reader", date: "Date",
      glance: "Assessment at a glance",
      synopsis: "Synopsis", synopsisPh: "Summarize the story in your own words.",
      evaluation: "Evaluation", market: "The market", overall: "Overall comments",
      strengths: "Strengths", develop: "To develop",
      verdict: "Verdict", suggested: "Suggested · from the 7 scores",
      finalRating: "Final rating / 10", decision: "Decision",
      context: "Context (optional)", contextPh: "short-film and festival context", summary: "Summary",
      genReport: "Generate report", finalize: "Mark coverage complete", reopen: "Reopen coverage",
      editCoverage: "Edit coverage", print: "Print / Save as PDF",
      sendReport: "Send to writer", sending: "Sending…", sent: "Sent to writer ✓",
      sendOk: "Report sent to the writer", sendFail: "Couldn't send the report",
      pl: { title: "Title", writer: "Writer", email: "Email", ref: "Reference", format: "Format", genre: "Genre", length: "Length", draft: "Draft", ip: "IP registered", file: "Script file", logline: "Logline", vision: "Writer's vision" },
      ipYes: "Registered", ipNo: "Not registered", dl: "Download script", untitled: "Untitled", dash: "—", pagesUnit: "pages",
      saving: "Saving…", saved: "Saved", saveFailed: "Save failed", loaded: "Loaded", newCov: "New coverage", viewOnly: "View only",
      hintOverride: function (a) { return "Overriding the suggested " + a; }, hintManual: "Manual rating", hintAuto: "Using the suggested score",
      evalPh: function (n) { return "Your assessment of " + n + "."; },
      tComplete: "Coverage marked complete", tReopened: "Coverage reopened", tDlFail: "Couldn't create the download link.",
      finalizeHint: "Fill in every section (except Market) to finish.",
      scoresHint: "Give every evaluation point a score (1–5) first.",
      guard: {
        link: "Go to the dashboard",
        loadT: "Loading…", loadM: "",
        cfgT: "Not configured", cfgM: "Supabase isn't set up yet. Add the project URL and anon key in js/config.js.",
        subT: "No submission", subM: "This link is missing a submission id. Open a coverage from the dashboard.",
        authT: "Sign in required", authM: "You need to sign in to the dashboard before opening a coverage.",
        permT: "No access", permM: "This account doesn't have permission to write coverages.",
        nfT: "Submission not found", nfM: "We couldn't find this submission. It may have been removed.",
        assignT: "No access", assignM: "You can only view this coverage after assigning yourself to the script."
      }
    },
    ar: {
      tabReview: "تقييم القارئ", tabReport: "التقرير",
      eyebrow: "مساحة عمل القارئ", h1: "التغطية",
      lead: "جميع المعلومات داخل الإطار البرتقالي مستخرجة مباشرةً من طلب الكاتب وهي للقراءة فقط، ولا يمكن تعديلها. يقتصر دورك على كتابة التقييم في الأقسام المخصصة أدناه. يتم حفظ عملك تلقائيًا أثناء الكتابة.",
      pulledTag: "مستخرج من نموذج تقديم الكاتب",
      reader: "القارئ", readerPh: "قارئ Scene One", date: "التاريخ",
      glance: "التقييم العام",
      synopsis: "الملخّص", synopsisPh: "لخّص القصة بأسلوبك.",
      evaluation: "التقييم", market: "السوق", overall: "ملاحظات عامة",
      strengths: "نقاط القوة", develop: "ما يحتاج إلى تطوير",
      verdict: "الحكم", suggested: "مقترح · من الدرجات السبع",
      finalRating: "التقييم النهائي / ١٠", decision: "القرار",
      context: "السياق (اختياري)", contextPh: "سياق الأفلام القصيرة والمهرجانات", summary: "الخلاصة",
      genReport: "إنشاء التقرير", finalize: "وضع علامة اكتمال التقييم", reopen: "إعادة فتح التقييم",
      editCoverage: "تعديل التقييم", print: "طباعة / حفظ PDF",
      sendReport: "إرسال إلى الكاتب", sending: "جارٍ الإرسال…", sent: "تم الإرسال ✓",
      sendOk: "تم إرسال التقرير إلى الكاتب", sendFail: "تعذّر إرسال التقرير",
      pl: { title: "عنوان السيناريو", writer: "اسم الكاتب", email: "البريد الإلكتروني", ref: "الرقم المرجعي", format: "نوع العمل", genre: "التصنيف", length: "عدد الصفحات/المدة", draft: "نسخة السيناريو", ip: "تسجيل الملكية الفكرية", file: "ملف السيناريو", logline: "الملخص المختصر", vision: "رؤية الكاتب" },
      ipYes: "مسجل", ipNo: "غير مسجل", dl: "تحميل النص", untitled: "بدون عنوان", dash: "—", pagesUnit: "صفحة",
      saving: "جارٍ الحفظ…", saved: "تم الحفظ", saveFailed: "فشل الحفظ", loaded: "تم التحميل", newCov: "تقييم جديد", viewOnly: "عرض فقط",
      hintOverride: function (a) { return "يتجاوز الدرجة المقترحة " + a; }, hintManual: "تقييم يدوي", hintAuto: "استخدام الدرجة المقترحة",
      // Contract the preposition ل with a leading definite article ال → لل
      // (e.g. "الفكرة" → "تقييمك للفكرة"), otherwise just prefix ل.
      evalPh: function (n) { n = String(n); return "تقييمك ل" + (n.slice(0, 2) === "ال" ? n.slice(1) : n) + "."; },
      tComplete: "تم وضع علامة اكتمال التقييم", tReopened: "أُعيد فتح التقييم", tDlFail: "تعذّر إنشاء رابط التحميل.",
      finalizeHint: "املأ كل قسم (عدا السوق) لإكمال التقييم.",
      scoresHint: "اختر درجة (١–٥) لكل نقطة تقييم أولاً.",
      guard: {
        link: "الذهاب إلى لوحة التحكم",
        loadT: "جارٍ التحميل", loadM: "",
        cfgT: "غير مُهيأ", cfgM: "لم يتم إعداد Supabase بعد. أضف رابط المشروع والمفتاح العام في js/config.js.",
        subT: "لا يوجد نص", subM: "هذا الرابط لا يحتوي على معرّف نص. افتح تغطية من لوحة التحكم.",
        authT: "يلزم تسجيل الدخول", authM: "يجب تسجيل الدخول إلى لوحة التحكم قبل فتح التغطية.",
        permT: "لا صلاحية", permM: "هذا الحساب لا يملك صلاحية كتابة التغطيات.",
        nfT: "النص غير موجود", nfM: "تعذّر العثور على هذا النص. ربما تمت إزالته.",
        assignT: "لا صلاحية", assignM: "يمكنك عرض هذه التغطية فقط بعد إسناد النص إلى نفسك."
      }
    }
  };
  // maps a glance option (canonical English) to its UI translation key
  var GLANCE_OPT_KEY = { Excellent: "excellent", Good: "good", Fair: "fair", Poor: "poor" };

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]; }); }
  function toast(m) { var t = $("toast"); t.textContent = m; t.classList.add("show"); setTimeout(function () { t.classList.remove("show"); }, 2200); }
  function today() { var d = new Date(); return d.toLocaleDateString("en-US", { month: "long", year: "numeric" }); }
  // Textareas auto-grow to fit their content so writers never fight a scrollbar.
  function autoGrow(ta) {
    if (!ta) return;
    ta.style.height = "auto";
    // With box-sizing:border-box the border isn't part of scrollHeight, so add it
    // back — otherwise the box ends up a couple px short and clips the last line.
    var cs = getComputedStyle(ta);
    var border = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
    ta.style.height = (ta.scrollHeight + border) + "px";
  }
  function autoGrowAll() { var t = document.querySelectorAll("textarea"); for (var i = 0; i < t.length; i++) autoGrow(t[i]); }
  // Recompute now, on the next frame, and after web fonts load — measuring
  // scrollHeight too early (before layout/fonts settle) leaves boxes a line short.
  function autoGrowSoon() {
    autoGrowAll();
    if (window.requestAnimationFrame) requestAnimationFrame(autoGrowAll);
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) document.fonts.ready.then(autoGrowAll);
  }
  document.addEventListener("input", function (e) {
    if (e.target && e.target.tagName === "TEXTAREA") { autoGrow(e.target); refreshFinalizeState(); }
  });
  window.addEventListener("load", autoGrowAll);
  window.addEventListener("resize", autoGrowAll);

  // The reader can only mark the coverage complete once every written section
  // (all except Market, which is optional) has been filled in.
  function filled(s) { return String(s == null ? "" : s).trim().length > 0; }
  // Every evaluation point must carry a 1–5 score before the coverage can be
  // reported or marked complete.
  function allScoresSet() {
    var c = state.coverage;
    for (var i = 0; i < EVAL.length; i++) { if (c.eval[EVAL[i]].score == null) return false; }
    return true;
  }
  function isEvalComplete() {
    var c = state.coverage;
    if (!allScoresSet()) return false;
    if (!filled(c.synopsis)) return false;
    for (var i = 0; i < EVAL.length; i++) { if (!filled(c.eval[EVAL[i]].text)) return false; }
    if (!filled(c.overall.strengths)) return false;
    if (!filled(c.overall.toDevelop)) return false;
    if (!filled(c.verdict.text)) return false;
    return true;
  }
  // Show/hide a custom tooltip on the button's wrapper (see .btn-tip in CSS).
  function tip(wrapId, msg) {
    var w = $(wrapId); if (!w) return;
    if (msg) w.setAttribute("data-tip", msg); else w.removeAttribute("data-tip");
  }
  function refreshFinalizeState() {
    if (readOnly) return;
    // The report button only needs every point scored; the finalize button also
    // needs every written section filled in.
    var scores = allScoresSet();
    var rep = $("genReport");
    if (rep) {
      if (covStatus === "completed") { rep.disabled = false; tip("genReportTip", ""); }
      else { rep.disabled = !scores; tip("genReportTip", scores ? "" : UI[UILANG].scoresHint); }
    }
    var btn = $("finalizeBtn"); if (!btn) return;
    if (covStatus === "completed") { btn.disabled = false; tip("finalizeTip", ""); return; }
    var ok = isEvalComplete();
    btn.disabled = !ok;
    tip("finalizeTip", ok ? "" : UI[UILANG].finalizeHint);
  }

  /* ---------- state ---------- */
  function blank() {
    var ev = {}; EVAL.forEach(function (n) { ev[n] = { score: null, text: "" }; });
    var mk = {}; MARKET.forEach(function (m) { mk[m.k] = ""; });
    return {
      submission: { titleEn: "", titleAr: "", writer: "", email: "", format: "Short film", genre: "", length: "", draft: "Final draft", logline: "", vision: "", ip: false, file: "", filePath: "", ref: "" },
      coverage: {
        reader: "Scene One Reader", date: today(), glance: {},
        synopsis: "", eval: ev, market: mk, overall: { strengths: "", toDevelop: "" }, score10: "",
        verdict: { decision: "", context: "", text: "" }
      }
    };
  }
  var state = blank();

  /* ---------- Supabase / persistence ---------- */
  var sb = null;
  var submissionId = new URLSearchParams(location.search).get("id");
  var me = null;                 // { id, email, name, role }
  var covStatus = "in_progress"; // 'in_progress' | 'completed'
  var delivered = false;         // true once the report has been emailed to the writer
  var readOnly = false;          // true for staff viewing a coverage they aren't assigned to
  var saveT = null;

  var currentSaveKey = "";
  function setSaveState(key) { currentSaveKey = key; var el = $("saveState"); if (el) el.textContent = UI[UILANG][key] || ""; }

  function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(save, 500); }

  async function save() {
    if (readOnly) return;
    if (!sb || !submissionId || !me) return;
    setSaveState("saving");
    var res = await sb.from("coverages").upsert({
      submission_id: submissionId,
      reader_id: me.id,
      data: state.coverage,
      status: covStatus,
      updated_at: new Date().toISOString()
    }, { onConflict: "submission_id" });
    if (res.error) { setSaveState("saveFailed"); return; }
    setSaveState("saved");
  }

  /* ---------- tabs ---------- */
  var views = { review: "view-review", report: "view-report" };
  function show(v) {
    Object.keys(views).forEach(function (k) { $(views[k]).classList.toggle("active", k === v); });
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("active", t.dataset.view === v); });
    if (v === "review") renderPulled();
    if (v === "report") renderReport();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll(".tab").forEach(function (t) { t.onclick = function () { show(t.dataset.view); }; });

  /* ---------- pulled (read-only) panel ---------- */
  // translate a pulled field value (format/genre/draft) to Arabic when the
  // workspace is in Arabic; otherwise show the canonical English value.
  function pulledVal(mapName, v, dash) {
    if (v == null || v === "") return dash;
    if (UILANG === "ar") { var m = T.ar[mapName]; if (m && m[v]) return m[v]; }
    return v;
  }

  // Uploaded PDF page count minus the title page (blank when unavailable).
  function pagesLabel(s) {
    if (!s.pages) return "";
    var n = s.pages > 1 ? s.pages - 1 : s.pages;
    return n + " " + UI[UILANG].pagesUnit;
  }
  function renderPulled() {
    var s = state.submission, u = UI[UILANG], pl = u.pl, dash = u.dash;
    var title = esc(s.titleEn || u.untitled) + (s.titleAr ? '  <span style="color:var(--label)">· ' + esc(s.titleAr) + "</span>" : "");
    var fileCell = s.filePath
      ? '<a href="#" id="dlLink">' + esc(s.file || u.dl) + "</a>"
      : esc(s.file || dash);
    var rows = [
      [pl.title, title, true],
      [pl.writer, esc(s.writer || dash)],
      [pl.email, '<span dir="ltr">' + esc(s.email || dash) + "</span>"],
      [pl.ref, esc(s.ref || dash)],
      [pl.format, esc(pulledVal("fmt", s.format, dash))],
      [pl.genre, esc(pulledVal("genreMap", s.genre, dash))],
      [pl.length, esc(pagesLabel(s) || s.length || dash)],
      [pl.draft, esc(pulledVal("drf", s.draft, dash))],
      [pl.ip, s.ip ? '<span style="color:var(--good);font-weight:600">' + u.ipYes + "</span>" : u.ipNo],
      [pl.file, fileCell],
      [pl.logline, '<span dir="auto">' + esc(s.logline || dash) + "</span>", true],
      [pl.vision, '<span dir="auto">' + esc(s.vision || dash) + "</span>", true]
    ];
    $("pulledGrid").innerHTML = rows.map(function (r) {
      return '<div class="' + (r[2] ? "full" : "") + '"><div class="k">' + r[0] + '</div><div class="v">' + r[1] + "</div></div>";
    }).join("");
    var dl = $("dlLink");
    if (dl) dl.addEventListener("click", function (e) { e.preventDefault(); downloadFile(s.filePath, dl); });
  }

  async function downloadFile(path, el) {
    var old = el.textContent; el.textContent = "…";
    var res = await sb.storage.from(CFG.bucket).createSignedUrl(path, 120);
    el.textContent = old;
    if (res.error || !res.data) {
      console.error("[download] createSignedUrl failed for path:", path, res.error);
      toast(UI[UILANG].tDlFail);
      return;
    }
    window.open(res.data.signedUrl, "_blank");
  }

  /* ---------- coverage inputs ---------- */
  function buildSeg(container, opts, getVal, setVal, classer, labeler) {
    container.innerHTML = opts.map(function (o) { return '<button data-v="' + o + '">' + (labeler ? labeler(o) : o) + "</button>"; }).join("");
    function refresh() {
      Array.prototype.forEach.call(container.children, function (b) {
        var on = b.dataset.v === getVal();
        b.className = on ? ("on" + (classer ? (" " + classer(b.dataset.v)) : "")) : "";
      });
    }
    Array.prototype.forEach.call(container.children, function (b) {
      b.onclick = function () { setVal(getVal() === b.dataset.v ? "" : b.dataset.v); refresh(); scheduleSave(); };
    });
    refresh();
  }
  function glanceClass(v) { return v === "Excellent" || v === "Good" ? "good" : (v === "Fair" ? "ok" : "bad"); }
  function recClass(v) { return v === "Recommend" ? "good" : (v === "Consider" ? "ok" : "bad"); }

  /* overall /10: average of the set evaluation scores (1-5), scaled to 10 */
  function autoScore() {
    var vals = EVAL.map(function (n) { return state.coverage.eval[n].score; }).filter(function (s) { return s; });
    if (!vals.length) return null;
    var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
    return Math.round(avg * 2 * 10) / 10;
  }
  function finalScore() {
    var ov = state.coverage.score10;
    if (ov !== "" && ov != null && !isNaN(+ov)) return +ov;
    return autoScore();
  }
  function updateRating() {
    var auto = autoScore();
    var el = $("autoScore");
    if (el) el.innerHTML = (auto == null ? "—" : auto) + '<span class="den"> / 10</span>';
    var hint = $("overrideHint");
    if (hint) {
      var u = UI[UILANG];
      var ov = state.coverage.score10;
      if (ov !== "" && ov != null && !isNaN(+ov) && auto != null && +ov !== auto) hint.textContent = u.hintOverride(auto);
      else if (ov !== "" && ov != null) hint.textContent = u.hintManual;
      else hint.textContent = u.hintAuto;
    }
  }

  function glanceLabel(o) { return T[UILANG][GLANCE_OPT_KEY[o]] || o; }
  function recLabel(o) { return o; } // verdict stays English in every language

  function buildCoverageInputs() {
    var tl = T[UILANG];
    // glance
    var gi = $("glanceInputs"); gi.innerHTML = "";
    GLANCE.forEach(function (cat) {
      var wrap = document.createElement("div"); wrap.className = "field";
      wrap.innerHTML = '<label class="lbl">' + esc(tl.glance_l[cat] || cat) + '</label><div class="seg rate"></div>';
      gi.appendChild(wrap);
      buildSeg(wrap.querySelector(".seg"), GLANCE_OPTS,
        function () { return state.coverage.glance[cat] || ""; },
        function (v) { state.coverage.glance[cat] = v; }, glanceClass, glanceLabel);
    });
    // rec segs
    document.querySelectorAll(".seg.rec").forEach(function (seg) {
      buildSeg(seg, REC_OPTS,
        function () { return state.coverage.verdict.decision; },
        function (v) { state.coverage.verdict.decision = v; },
        recClass, recLabel);
    });
    // evaluation
    var ei = $("evalInputs"); ei.innerHTML = "";
    EVAL.forEach(function (name) {
      var lbl = tl.eval[name] || name;
      var b = document.createElement("div"); b.className = "eval-block";
      var sc = ""; for (var i = 1; i <= 5; i++) sc += '<button data-s="' + i + '">' + i + "</button>";
      b.innerHTML = '<div class="eval-head"><span class="name">' + esc(lbl) + "</span>" +
        '<span class="score">' + sc + "</span></div>" +
        '<textarea placeholder="' + esc(UI[UILANG].evalPh(lbl)) + '"></textarea>';
      ei.appendChild(b);
      var ta = b.querySelector("textarea");
      ta.value = state.coverage.eval[name].text;
      ta.addEventListener("input", function () { state.coverage.eval[name].text = ta.value; scheduleSave(); });
      autoGrow(ta);
      var btns = b.querySelectorAll(".score button");
      function refreshSc() { btns.forEach(function (x) { x.classList.toggle("on", +x.dataset.s === state.coverage.eval[name].score); }); }
      btns.forEach(function (x) {
        x.onclick = function () {
          var v = +x.dataset.s; state.coverage.eval[name].score = (state.coverage.eval[name].score === v ? null : v);
          refreshSc(); updateRating(); refreshFinalizeState(); scheduleSave();
        };
      });
      refreshSc();
    });
    // market
    var mi = $("marketInputs"); mi.innerHTML = "";
    MARKET.forEach(function (m) {
      var f = document.createElement("div"); f.className = "field";
      f.innerHTML = '<label class="lbl">' + esc(tl.market_l[m.k] || m.label) + '</label><textarea></textarea>';
      mi.appendChild(f);
      var ta = f.querySelector("textarea"); ta.value = state.coverage.market[m.k];
      ta.addEventListener("input", function () { state.coverage.market[m.k] = ta.value; scheduleSave(); });
      autoGrow(ta);
    });
  }

  /* simple text fields on coverage */
  var covMap = {
    "c-reader": ["reader"], "c-date": ["date"], "c-synopsis": ["synopsis"],
    "c-strengths": ["overall", "strengths"], "c-develop": ["overall", "toDevelop"],
    "c-vctx": ["verdict", "context"], "c-vtext": ["verdict", "text"]
  };
  function fillCovFields() {
    Object.keys(covMap).forEach(function (id) {
      var p = covMap[id]; var v = p.length === 1 ? state.coverage[p[0]] : state.coverage[p[0]][p[1]];
      $(id).value = v || "";
    });
    $("c-reader").value = (UILANG === "ar" ? "احد قراء Scene One" : "Scene One Reader");
    $("c-score10").value = (state.coverage.score10 != null ? state.coverage.score10 : "");
    updateRating();
    autoGrowSoon();
    refreshFinalizeState();
  }
  Object.keys(covMap).forEach(function (id) {
    $(id).addEventListener("input", function () {
      var p = covMap[id]; if (p.length === 1) state.coverage[p[0]] = $(id).value; else state.coverage[p[0]][p[1]] = $(id).value;
      scheduleSave();
    });
  });
  $("c-score10").addEventListener("input", function () {
    state.coverage.score10 = $("c-score10").value;
    updateRating(); scheduleSave();
  });

  /* ---------- report ---------- */
  // The report markup is built by the shared renderer (js/report-render.js), the
  // same one the public writer-facing report page uses, so the two never drift.
  function renderReport() {
    var ar = (LANG === "ar");
    var rb = $("reportBody");
    rb.innerHTML = R.render(state.submission, state.coverage, LANG);
    rb.setAttribute("dir", ar ? "rtl" : "ltr");
    rb.classList.toggle("ar", ar);
  }

  /* ---------- language (whole workspace + report) ---------- */
  function applyUILang(lang) {
    UILANG = lang; LANG = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    var u = UI[lang];
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n"); if (u[k] != null) el.textContent = u[k];
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-ph"); if (u[k] != null) el.setAttribute("placeholder", u[k]);
    });
    document.querySelectorAll("#uiLang button").forEach(function (b) { b.classList.toggle("on", b.dataset.l === lang); });
    finalizeBtn.textContent = covStatus === "completed" ? u.reopen : u.finalize;
    setSaveState(currentSaveKey);
    buildCoverageInputs();
    fillCovFields();
    renderPulled();
    if ($("view-report").classList.contains("active")) renderReport();
    if (readOnly) applyReadOnly();
    updateSendBtn();
  }

  // Lock the whole workspace for staff who aren't the assigned reader: every
  // input becomes read-only and the editing buttons (ratings/segments/finalize)
  // are disabled, so only the assigned reader can actually write. Re-applied on
  // every language switch because buildCoverageInputs() rebuilds the controls.
  function applyReadOnly() {
    var root = $("view-review");
    if (root) {
      root.querySelectorAll("input, textarea, select").forEach(function (el) {
        el.disabled = true; el.readOnly = true;
      });
      root.querySelectorAll("button").forEach(function (b) {
        b.disabled = true; // lock every workspace button, incl. "Generate report"
      });
    }
    // "Edit coverage" (in the report view) also edits — lock it. Printing/saving
    // the report stays available to everyone.
    var edit = $("backToReview"); if (edit) edit.disabled = true;
    setSaveState("viewOnly");
  }
  document.querySelectorAll("#uiLang button").forEach(function (b) {
    b.onclick = function () { applyUILang(b.dataset.l); };
  });

  $("genReport").onclick = function () {
    // Safety net: never open the report until every point is scored.
    if (covStatus !== "completed" && !allScoresSet()) { toast(UI[UILANG].scoresHint); return; }
    show("report");
  };
  $("backToReview").onclick = function () { show("review"); };
  $("printReport").onclick = function () { window.print(); };

  // "Send to writer" is only offered once the coverage is completed.
  function updateSendBtn() {
    var b = $("sendReport"); if (!b) return;
    b.hidden = covStatus !== "completed";
    // Once delivered, the button becomes a disabled "Sent ✓" confirmation so the
    // reader can't fire duplicate emails and the sent state survives re-renders.
    b.disabled = delivered;
    b.textContent = delivered ? UI[UILANG].sent : UI[UILANG].sendReport;
  }
  // Email the writer a private link to the hosted report page. The server looks
  // up the submission's report token and sends the link; nothing is rasterised.
  $("sendReport").onclick = async function () {
    if (covStatus !== "completed" || delivered) return;
    var btn = this;
    btn.disabled = true; btn.textContent = UI[UILANG].sending;
    try {
      var sess = await sb.auth.getSession();
      var token = sess.data.session && sess.data.session.access_token;
      var resp = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ submission_id: submissionId })
      });
      var data = await resp.json().catch(function () { return {}; });
      if (!resp.ok) throw new Error(data.message || UI[UILANG].sendFail);
      delivered = true;
      toast(UI[UILANG].sendOk);
    } catch (e) {
      toast(e.message || UI[UILANG].sendFail);
    }
    // Reflect the outcome: delivered → disabled "Sent ✓"; failed → back to "Send".
    updateSendBtn();
  };

  var finalizeBtn = $("finalizeBtn");
  finalizeBtn.onclick = async function () {
    // Safety net: never finalize an incomplete coverage even if the button
    // is somehow reachable (reopening a completed one is always allowed).
    if (covStatus !== "completed" && !isEvalComplete()) { toast(UI[UILANG].finalizeHint); return; }
    covStatus = covStatus === "completed" ? "in_progress" : "completed";
    var u = UI[UILANG];
    finalizeBtn.textContent = covStatus === "completed" ? u.reopen : u.finalize;
    refreshFinalizeState();
    updateSendBtn();
    await save();
    toast(covStatus === "completed" ? u.tComplete : u.tReopened);
  };

  /* ---------- guard helpers ---------- */
  function guardState(title, msg, showLink) {
    var sp = $("guardSpinner"); if (sp) sp.hidden = true; // errors/auth are final states, not loading
    $("guardTitle").textContent = title;
    $("guardMsg").textContent = msg;
    var gl = $("guardLink"); if (gl) { gl.textContent = UI[UILANG].guard.link; gl.hidden = !showLink; }
    $("guard").style.display = "flex";
    $("app").hidden = true;
  }
  function enterApp() {
    $("guard").style.display = "none";
    $("app").hidden = false;
  }

  /* ---------- submission mapping ---------- */
  function mapSubmission(r) {
    return {
      titleEn: r.title_en || "",
      titleAr: r.title_ar || "",
      writer: r.writer || "",
      email: r.email || "",
      format: FORMAT_EN[r.film_type] || "Short film",
      genre: GENRE_EN[r.genre] || r.genre || "",
      length: r.duration || "",
      pages: (r.pages != null && r.pages > 0) ? r.pages : null,
      draft: DRAFT_EN[r.draft] || "Final draft",
      logline: r.logline || "",
      vision: r.vision || "",
      ip: !!r.ip_registered,
      file: r.file_name || "",
      filePath: r.file_path || "",
      ref: "SO-" + String(r.id).replace(/-/g, "").slice(0, 6).toUpperCase()
    };
  }

  /* ---------- init ---------- */
  (async function () {
    var G = UI[UILANG].guard;
    // Localise the initial "Loading…" screen to the reader's saved language.
    $("guardTitle").textContent = G.loadT;
    $("guardMsg").textContent = G.loadM;

    if (!window.supabase || !CFG.url || !CFG.anonKey) {
      guardState(G.cfgT, G.cfgM, true);
      return;
    }
    sb = window.supabase.createClient(CFG.url, CFG.anonKey);

    if (!submissionId) {
      guardState(G.subT, G.subM, true);
      return;
    }

    // Auth: must be a signed-in admin (reader).
    var sess = await sb.auth.getSession();
    var user = sess.data.session && sess.data.session.user;
    if (!user) {
      guardState(G.authT, G.authM, true);
      return;
    }
    var meRes = await sb.from("admins").select("id,email,name,role").eq("id", user.id).maybeSingle();
    if (meRes.error || !meRes.data) {
      guardState(G.permT, G.permM, true);
      return;
    }
    me = meRes.data;

    // Load the submission.
    var subRes = await sb.from("submissions").select("*").eq("id", submissionId).maybeSingle();
    if (subRes.error || !subRes.data) {
      guardState(G.nfT, G.nfM, true);
      return;
    }
    state.submission = mapSubmission(subRes.data);

    // Load an existing coverage (if any) BEFORE deciding access — a completed
    // coverage is a finished report that any admin/reader may open read-only.
    var covRes = await sb.from("coverages").select("*").eq("submission_id", submissionId).maybeSingle();
    var covRow = covRes.data;
    if (covRow && covRow.data) {
      var d = covRow.data;
      // backfill any missing fields against a fresh blank
      var base = blank().coverage;
      state.coverage = Object.assign({}, base, d);
      state.coverage.eval = Object.assign({}, base.eval, d.eval || {});
      state.coverage.market = Object.assign({}, base.market, d.market || {});
      state.coverage.overall = Object.assign({}, base.overall, d.overall || {});
      state.coverage.verdict = Object.assign({}, base.verdict, d.verdict || {});
      state.coverage.glance = d.glance || {};
      if (!state.coverage.date) state.coverage.date = today();
      if (state.coverage.score10 == null) state.coverage.score10 = "";
      covStatus = covRow.status || "in_progress";
      delivered = !!covRow.delivered_at;
      setSaveState("loaded");
    } else {
      covStatus = "in_progress";
      setSaveState("newCov");
    }

    // Access rules:
    //  • Assigned reader (primary or co-reader) → full edit access.
    //  • Completed coverage → read-only report, viewable by any admin/reader.
    //  • Otherwise: unassigned readers are blocked; unassigned staff get a
    //    read-only view, so the workspace stays locked for everyone but the reader.
    var isReaderRole = me.role === "senior_reader" || me.role === "junior_reader";
    var assignedToMe = subRes.data.assigned_to === me.id || subRes.data.co_reader_id === me.id;
    var isCompleted = !!(covRow && covRow.status === "completed");
    if (!assignedToMe) {
      if (isCompleted) {
        readOnly = true; // finished report — anyone may view, only the reader edits
      } else if (isReaderRole) {
        guardState(G.assignT, G.assignM, true);
        return;
      } else {
        readOnly = true; // staff may look, but not edit
      }
    }
    // Reader identity is always anonymous — never expose the admin's real name.
    state.coverage.reader = "Scene One Reader";

    applyUILang(UILANG); // builds inputs, fills fields, renders the pulled panel
    enterApp();
  })();
})();
