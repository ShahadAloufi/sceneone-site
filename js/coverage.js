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
  var LOGO = "assets/scene-one-logo.svg";

  /* ---------- bilingual report strings ---------- */
  var T = {
    en: {
      coverage: "Script coverage", tagline: "Where the script's journey begins",
      title: "Title", writer: "Writer", format: "Format", genre: "Genre", length: "Length", draft: "Draft", reader: "Reader", date: "Date",
      logline: "Logline", glance: "Assessment at a glance", excellent: "Excellent", good: "Good", fair: "Fair", poor: "Poor",
      synopsis: "Synopsis", evaluation: "Evaluation", market: "The market", overall: "Overall comments",
      strengths: "Strengths", develop: "To develop", verdict: "Verdict", pending: "Pending", notwritten: "Not yet written.",
      outof: "/ 10", foot: "Script coverage",
      eval: { "Premise & Theme": "Premise & Theme", "Hook": "Hook", "Stakes & Plot": "Stakes & Plot", "Character": "Character", "Structure & Pace": "Structure & Pace", "Producibility": "Producibility", "Presentation": "Presentation" },
      market_l: { audience: "Audience", genreDemand: "Genre and demand", pathBuyers: "Path and buyers", budgetCeiling: "Budget and ceiling", regional: "Regional potential", net: "Net" },
      glance_l: { "Premise & Theme": "Premise & Theme", "Hook": "Hook", "Stakes & Plot": "Stakes & Plot", "Character": "Character", "Structure & Pace": "Structure & Pace", "Producibility": "Producibility", "Overall presentation": "Overall presentation" },
      decision: { Recommend: "Recommend", Consider: "Consider", Pass: "Pass" }
    },
    ar: {
      coverage: "تقييم النص", tagline: "حيث تبدأ رحلة النص",
      title: "العنوان", writer: "الكاتب", format: "نوع العمل", genre: "التصنيف", length: "عدد الصفحات/المدة", draft: "المسودة", reader: "القارئ", date: "التاريخ",
      logline: "الفكرة المختصرة", glance: "التقييم العام", excellent: "ممتاز", good: "جيد", fair: "مقبول", poor: "ضعيف",
      synopsis: "الملخّص", evaluation: "التقييم", market: "السوق", overall: "ملاحظات عامة",
      strengths: "نقاط القوة", develop: "ما يحتاج إلى تطوير", verdict: "الحكم", pending: "بانتظار التقييم", notwritten: "لم يُكتب بعد.",
      outof: "/ 10", foot: "تقييم النصوص",
      eval: { "Premise & Theme": "الفكرة والموضوع", "Hook": "عنصر الجذب", "Stakes & Plot": "الرهانات الدرامية والحبكة", "Character": "الشخصيات", "Structure & Pace": "البناء الدرامي والإيقاع", "Producibility": "قابلية الإنتاج", "Presentation": "العرض والتنسيق" },
      market_l: { audience: "الجمهور المستهدف", genreDemand: "النوع والطلب في السوق", pathBuyers: "مسار المشروع والجهات المشترية", budgetCeiling: "الميزانية وسقف الإيرادات المتوقع", regional: "إمكانات الانتشار الإقليمي", net: "صافي العائد" },
      glance_l: { "Premise & Theme": "الفكرة والموضوع", "Hook": "عنصر الجذب", "Stakes & Plot": "الرهانات الدرامية والحبكة", "Character": "الشخصيات", "Structure & Pace": "البناء الدرامي والإيقاع", "Producibility": "قابلية الإنتاج", "Overall presentation": "العرض العام" },
      decision: { Recommend: "يُوصى به", Consider: "يستحق الدراسة", Pass: "غير موصى به" },
      fmt: { "Short film": "فيلم قصير", "Feature": "فيلم طويل", "Feature film": "فيلم طويل", "TV Pilot": "حلقة تجريبية", "Web Series": "مسلسل ويب", "Series": "مسلسل", "Other": "أخرى" },
      drf: { "First draft": "المسودة الأولى", "Second draft": "المسودة الثانية", "Revised draft": "المسودة الثانية", "Final draft": "النسخة النهائية" },
      months: { January: "يناير", February: "فبراير", March: "مارس", April: "أبريل", May: "مايو", June: "يونيو", July: "يوليو", August: "أغسطس", September: "سبتمبر", October: "أكتوبر", November: "نوفمبر", December: "ديسمبر" },
      genreMap: { "Drama": "دراما", "Comedy": "كوميديا", "Thriller": "إثارة", "Horror": "رعب", "Action": "أكشن", "Sci-Fi": "خيال علمي", "Romance": "رومانسي", "Animation": "رسوم متحركة", "Documentary": "وثائقي", "Other": "أخرى" },
      lenMap: {},
      writerMap: {}
    }
  };
  var GLANCE = ["Premise & Theme", "Hook", "Stakes & Plot", "Character", "Structure & Pace", "Producibility", "Overall presentation"];
  var GLANCE_OPTS = ["Excellent", "Good", "Fair", "Poor"];
  var REC_OPTS = ["Recommend", "Consider", "Pass"];
  var EVAL = ["Premise & Theme", "Hook", "Stakes & Plot", "Character", "Structure & Pace", "Producibility", "Presentation"];
  var MARKET = [
    { k: "audience", label: "Audience" },
    { k: "genreDemand", label: "Genre and demand" },
    { k: "pathBuyers", label: "Path and buyers" },
    { k: "budgetCeiling", label: "Budget and ceiling" },
    { k: "regional", label: "Regional potential" },
    { k: "net", label: "Net" }
  ];

  /* maps between the submission form's stored keys and the report's labels */
  var GENRE_EN = { drama: "Drama", comedy: "Comedy", thriller: "Thriller", horror: "Horror", action: "Action", documentary: "Documentary", other: "Other" };
  var FORMAT_EN = { feature: "Feature", short: "Short film" };
  var DRAFT_EN = { first: "First draft", revised: "Revised draft", final: "Final draft" };

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
      pl: { title: "Title", writer: "Writer", email: "Email", ref: "Reference", format: "Format", genre: "Genre", length: "Length", draft: "Draft", ip: "IP registered", file: "Script file", logline: "Logline", vision: "Writer's vision" },
      ipYes: "Registered", ipNo: "Not registered", dl: "Download script", untitled: "Untitled", dash: "—",
      saving: "Saving…", saved: "Saved", saveFailed: "Save failed", loaded: "Loaded", newCov: "New coverage",
      hintOverride: function (a) { return "Overriding the suggested " + a; }, hintManual: "Manual rating", hintAuto: "Using the suggested score",
      evalPh: function (n) { return "Your assessment of " + n + "."; },
      tComplete: "Coverage marked complete", tReopened: "Coverage reopened", tDlFail: "Couldn't create the download link."
    },
    ar: {
      tabReview: "تقييم القارئ", tabReport: "التقرير",
      eyebrow: "مساحة عمل القارئ", h1: "التغطية",
      lead: "جميع المعلومات داخل الإطار البرتقالي مستوردة مباشرةً من طلب الكاتب وهي للقراءة فقط، ولا يمكن تعديلها. يقتصر دورك على كتابة التقييم في الأقسام المخصصة أدناه. يتم حفظ عملك تلقائيًا أثناء الكتابة.",
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
      pl: { title: "عنوان السيناريو", writer: "اسم الكاتب", email: "البريد الإلكتروني", ref: "الرقم المرجعي", format: "نوع العمل", genre: "التصنيف", length: "عدد الصفحات/المدة", draft: "نسخة السيناريو", ip: "تسجيل الملكية الفكرية", file: "ملف السيناريو", logline: "الملخص المختصر", vision: "رؤية الكاتب" },
      ipYes: "مسجل", ipNo: "غير مسجل", dl: "تحميل النص", untitled: "بدون عنوان", dash: "—",
      saving: "جارٍ الحفظ…", saved: "تم الحفظ", saveFailed: "فشل الحفظ", loaded: "تم التحميل", newCov: "تقييم جديد",
      hintOverride: function (a) { return "يتجاوز الدرجة المقترحة " + a; }, hintManual: "تقييم يدوي", hintAuto: "استخدام الدرجة المقترحة",
      // Contract the preposition ل with a leading definite article ال → لل
      // (e.g. "الفكرة" → "تقييمك للفكرة"), otherwise just prefix ل.
      evalPh: function (n) { n = String(n); return "تقييمك ل" + (n.slice(0, 2) === "ال" ? n.slice(1) : n) + "."; },
      tComplete: "تم وضع علامة اكتمال التقييم", tReopened: "أُعيد فتح التقييم", tDlFail: "تعذّر إنشاء رابط التحميل."
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
  function autoGrow(ta) { if (!ta) return; ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; }
  function autoGrowAll() { var t = document.querySelectorAll("textarea"); for (var i = 0; i < t.length; i++) autoGrow(t[i]); }
  document.addEventListener("input", function (e) { if (e.target && e.target.tagName === "TEXTAREA") autoGrow(e.target); });

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
  var saveT = null;

  var currentSaveKey = "";
  function setSaveState(key) { currentSaveKey = key; var el = $("saveState"); if (el) el.textContent = UI[UILANG][key] || ""; }

  function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(save, 500); }

  async function save() {
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
      [pl.length, esc(s.length || dash)],
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
          refreshSc(); updateRating(); scheduleSave();
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
    autoGrowAll();
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
  function val(x, empty) { return x && String(x).trim() ? esc(x) : '<span class="empty">' + (empty || "—") + "</span>"; }
  function renderReport() {
    var s = state.submission, c = state.coverage, t = T[LANG], ar = (LANG === "ar"), nw = t.notwritten;
    function locDate(x) { var p = String(x).split(" "); return (p.length === 2 && t.months && t.months[p[0]]) ? t.months[p[0]] + " " + p[1] : x; }
    function lv(kind, raw) {
      if (!ar) return val(raw);
      var x = raw == null ? "" : String(raw);
      if (!x.trim()) return val(raw);
      if (kind === "date") return esc(locDate(x));
      var m = { format: t.fmt, draft: t.drf, genre: t.genreMap, length: t.lenMap, writer: t.writerMap }[kind];
      if (m && m[x]) return esc(m[x]);
      return val(raw);
    }
    var top = [[t.title, '<span class="rep-title">' + esc(s.titleEn || "Untitled") + (s.titleAr ? ' <span class="ar">(' + esc(s.titleAr) + ")</span>" : "") + "</span>", true],
      [t.writer, lv("writer", s.writer)], [t.format, lv("format", s.format)], [t.genre, lv("genre", s.genre)],
      [t.length, lv("length", s.length)], [t.draft, lv("draft", s.draft)],
      [t.reader, esc(ar ? "احد قراء Scene One" : "Scene One Reader")], [t.date, lv("date", c.date)]];
    var topHtml = top.map(function (r) { return "<div" + (r[2] ? ' style="grid-column:1/-1"' : "") + '><div class="k">' + r[0] + '</div><div class="v" dir="auto">' + r[1] + "</div></div>"; }).join("");

    var glOpts = [t.excellent, t.good, t.fair, t.poor];
    var glHead = "<tr><td></td>" + glOpts.map(function (o) { return '<td class="mark">' + o + "</td>"; }).join("") + "</tr>";
    var glHtml = GLANCE.map(function (cat) {
      var v = c.glance[cat];
      var cells = GLANCE_OPTS.map(function (o) { return '<td class="mark ' + (v === o ? "hit" : "dim") + '">' + (v === o ? "●" : "·") + "</td>"; }).join("");
      return '<tr><td class="cat">' + t.glance_l[cat] + "</td>" + cells + "</tr>";
    }).join("");
    var evalHtml = EVAL.map(function (n) {
      var e = c.eval[n];
      return '<div class="rep-item"><div class="ih"><span class="t">' + t.eval[n] + "</span>" +
        (e.score ? '<span class="sc">' + e.score + " / 5</span>" : "") + "</div>" +
        "<p>" + val(e.text, nw) + "</p></div>";
    }).join("");

    var marketHtml = MARKET.map(function (m) {
      return '<div class="rep-item"><div class="ih"><span class="t">' + t.market_l[m.k] + "</span></div>" +
        "<p>" + val(c.market[m.k], nw) + "</p></div>";
    }).join("");

    var fs = finalScore();
    var dec = c.verdict.decision ? c.verdict.decision : t.pending; // verdict stays English

    var header = '<div class="rep-header">' +
      '<img class="rep-logo" src="' + LOGO + '" alt="Scene One">' +
      '<div class="rep-wm">SCENE&nbsp;<span>ONE</span></div>' +
      '<div class="rep-cov">' + t.coverage + "</div>" +
      "</div>";

    var html = header +
      '<div class="rep-top">' + topHtml + "</div>" +
      '<div class="logline"><div class="k">' + t.logline + '</div><div dir="auto">' + val(s.logline) + "</div></div>" +
      '<div class="glance"><h3>' + t.glance + "</h3>" +
        '<table class="gl">' + glHead + glHtml + "</table></div>" +
      '<div class="rep-sec"><h2><span class="no">01</span>' + t.synopsis + "</h2><p>" + val(c.synopsis, nw) + "</p></div>" +
      '<div class="rep-sec"><h2><span class="no">02</span>' + t.evaluation + "</h2>" + evalHtml + "</div>" +
      '<div class="rep-sec"><h2><span class="no">03</span>' + t.market + "</h2>" + marketHtml + "</div>" +
      '<div class="rep-sec"><h2><span class="no">04</span>' + t.overall + "</h2>" +
        '<div class="rep-item"><div class="ih"><span class="t">' + t.strengths + "</span></div><p>" + val(c.overall.strengths, nw) + "</p></div>" +
        '<div class="rep-item"><div class="ih"><span class="t">' + t.develop + "</span></div><p>" + val(c.overall.toDevelop, nw) + "</p></div></div>" +
      '<div class="verdict"><div class="vh">' + t.verdict + "</div>" +
        '<div style="display:flex;align-items:baseline;gap:18px;flex-wrap:wrap;margin-bottom:8px">' +
          '<div class="vd" style="margin:0">' + dec + (c.verdict.context ? ' <span class="ctx">· ' + esc(c.verdict.context) + "</span>" : "") + "</div>" +
          (fs != null ? '<div class="score10"><span class="n">' + fs + "</span> " + t.outof + "</div>" : "") +
        "</div>" +
        '<p style="margin:0;color:#3f3a35">' + val(c.verdict.text, nw) + "</p></div>" +
      '<div class="rep-foot"><span>Scene One · sceneone.info</span><span>' + t.foot + "</span></div>";
    var rb = $("reportBody");
    rb.innerHTML = html;
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
  }
  document.querySelectorAll("#uiLang button").forEach(function (b) {
    b.onclick = function () { applyUILang(b.dataset.l); };
  });

  $("genReport").onclick = function () { show("report"); };
  $("backToReview").onclick = function () { show("review"); };
  $("printReport").onclick = function () { window.print(); };

  var finalizeBtn = $("finalizeBtn");
  finalizeBtn.onclick = async function () {
    covStatus = covStatus === "completed" ? "in_progress" : "completed";
    var u = UI[UILANG];
    finalizeBtn.textContent = covStatus === "completed" ? u.reopen : u.finalize;
    await save();
    toast(covStatus === "completed" ? u.tComplete : u.tReopened);
  };

  /* ---------- guard helpers ---------- */
  function guardState(title, msg, showLink) {
    $("guardTitle").textContent = title;
    $("guardMsg").textContent = msg;
    $("guardLink").hidden = !showLink;
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
    if (!window.supabase || !CFG.url || !CFG.anonKey) {
      guardState("Not configured", "Supabase isn't set up yet. Add the project URL and anon key in js/config.js.", true);
      return;
    }
    sb = window.supabase.createClient(CFG.url, CFG.anonKey);

    if (!submissionId) {
      guardState("No submission", "This link is missing a submission id. Open a coverage from the dashboard.", true);
      return;
    }

    // Auth: must be a signed-in admin (reader).
    var sess = await sb.auth.getSession();
    var user = sess.data.session && sess.data.session.user;
    if (!user) {
      guardState("Sign in required", "You need to sign in to the dashboard before opening a coverage.", true);
      return;
    }
    var meRes = await sb.from("admins").select("id,email,name,role").eq("id", user.id).maybeSingle();
    if (meRes.error || !meRes.data) {
      guardState("No access", "This account doesn't have permission to write coverages.", true);
      return;
    }
    me = meRes.data;

    // Load the submission.
    var subRes = await sb.from("submissions").select("*").eq("id", submissionId).maybeSingle();
    if (subRes.error || !subRes.data) {
      guardState("Submission not found", "We couldn't find this submission. It may have been removed.", true);
      return;
    }
    state.submission = mapSubmission(subRes.data);

    // Load an existing coverage, or start blank (default the reader to me).
    var covRes = await sb.from("coverages").select("*").eq("submission_id", submissionId).maybeSingle();
    if (covRes.data && covRes.data.data) {
      var d = covRes.data.data;
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
      covStatus = covRes.data.status || "in_progress";
      setSaveState("loaded");
    } else {
      covStatus = "in_progress";
      setSaveState("newCov");
    }
    // Reader identity is always anonymous — never expose the admin's real name.
    state.coverage.reader = "Scene One Reader";

    applyUILang(UILANG); // builds inputs, fills fields, renders the pulled panel
    enterApp();
  })();
})();
