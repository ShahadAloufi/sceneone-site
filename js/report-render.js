/* ===========================================================
   Scene One — shared coverage-report renderer
   Single source of truth for the bilingual report markup, used by
   BOTH the reader workspace (coverage.js) and the public, read-only
   report page the writer receives a link to (report.js). Data in →
   HTML string out; no DOM/state/auth assumptions, so it renders the
   same report in either place.
   =========================================================== */
(function () {
  "use strict";

  // Vector SVG: the report renders natively (never via html2canvas anymore), so
  // the SVG stays crisp at any size — a downscaled PNG washed the thin strokes out.
  var LOGO = "assets/scene-one-logo.svg";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c];
    });
  }
  function val(x, empty) {
    return x && String(x).trim() ? esc(x) : '<span class="empty">' + (empty || "—") + "</span>";
  }
  function today() {
    return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

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
      decision: { Recommend: "Recommend", Consider: "Consider", Pass: "Pass" },
      fmt: {}, drf: {}, genreMap: {}, lenMap: {}, writerMap: {}, months: {}
    },
    ar: {
      coverage: "تقييم النص", tagline: "حيث تبدأ رحلة النص",
      title: "العنوان", writer: "الكاتب", format: "نوع العمل", genre: "التصنيف", length: "عدد الصفحات/المدة", draft: "المسودة", reader: "القارئ", date: "التاريخ",
      logline: "الفكرة المختصرة", glance: "التقييم العام", excellent: "ممتاز", good: "جيد", fair: "مقبول", poor: "ضعيف",
      synopsis: "الملخّص", evaluation: "التقييم", market: "السوق", overall: "ملاحظات عامة",
      strengths: "نقاط القوة", develop: "ما يحتاج إلى تطوير", verdict: "الحكم", pending: "بانتظار التقييم", notwritten: "لم يُكتب بعد.",
      outof: "/ 10", foot: "تقييم النصوص",
      eval: { "Premise & Theme": "الفكرة والموضوع", "Hook": "عنصر الجذب", "Stakes & Plot": "الرهانات الدرامية والحبكة", "Character": "الشخصيات", "Structure & Pace": "البناء الدرامي والإيقاع", "Producibility": "قابلية الإنتاج", "Presentation": "العرض والتنسيق" },
      market_l: { audience: "الجمهور المستهدف", genreDemand: "النوع والطلب في السوق", pathBuyers: "مسار المشروع والجهات المشترية", budgetCeiling: "الميزانية وسقف الإيرادات المتوقع", regional: "إمكانات الانتشار الإقليمي", net: "الخلاصة" },
      glance_l: { "Premise & Theme": "الفكرة والموضوع", "Hook": "عنصر الجذب", "Stakes & Plot": "الرهانات الدرامية والحبكة", "Character": "الشخصيات", "Structure & Pace": "البناء الدرامي والإيقاع", "Producibility": "قابلية الإنتاج", "Overall presentation": "العرض العام" },
      decision: { Recommend: "يُوصى به", Consider: "يستحق الدراسة", Pass: "غير موصى به" },
      fmt: { "Short film": "فيلم قصير", "Feature": "فيلم طويل", "Feature film": "فيلم طويل", "TV Pilot": "حلقة تجريبية", "Web Series": "مسلسل ويب", "Series": "مسلسل", "Other": "أخرى" },
      drf: { "First draft": "المسودة الأولى", "Second draft": "المسودة الثانية", "Revised draft": "المسودة الثانية", "Final draft": "النسخة النهائية" },
      months: { January: "يناير", February: "فبراير", March: "مارس", April: "أبريل", May: "مايو", June: "يونيو", July: "يوليو", August: "أغسطس", September: "سبتمبر", October: "أكتوبر", November: "نوفمبر", December: "ديسمبر" },
      genreMap: { "Drama": "دراما", "Comedy": "كوميديا", "Thriller": "إثارة", "Horror": "رعب", "Action": "أكشن", "Sci-Fi": "خيال علمي", "Romance": "رومانسي", "Animation": "رسوم متحركة", "Documentary": "وثائقي", "Other": "أخرى" },
      lenMap: {}, writerMap: {}
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

  // A raw `submissions` row → the shape the report renderer consumes.
  function mapSubmission(r) {
    return {
      titleEn: r.title_en || "",
      titleAr: r.title_ar || "",
      writer: r.writer || "",
      format: FORMAT_EN[r.film_type] || "Short film",
      genre: GENRE_EN[r.genre] || r.genre || "",
      length: r.duration || "",
      draft: DRAFT_EN[r.draft] || "Final draft",
      logline: r.logline || ""
    };
  }

  // A stored coverage `data` jsonb (possibly partial) → a complete coverage object.
  function mergeCoverage(stored) {
    var ev = {}; EVAL.forEach(function (n) { ev[n] = { score: null, text: "" }; });
    var mk = {}; MARKET.forEach(function (m) { mk[m.k] = ""; });
    var base = {
      reader: "Scene One Reader", date: today(), glance: {},
      synopsis: "", eval: ev, market: mk, overall: { strengths: "", toDevelop: "" }, score10: "",
      verdict: { decision: "", context: "", text: "" }
    };
    var c = Object.assign(base, stored || {});
    // Deep-fill nested objects the stored data may have omitted.
    c.glance = c.glance || {};
    c.overall = Object.assign({ strengths: "", toDevelop: "" }, c.overall || {});
    c.verdict = Object.assign({ decision: "", context: "", text: "" }, c.verdict || {});
    var e = c.eval || {}; c.eval = {}; EVAL.forEach(function (n) { c.eval[n] = Object.assign({ score: null, text: "" }, e[n] || {}); });
    var m = c.market || {}; c.market = {}; MARKET.forEach(function (x) { c.market[x.k] = m[x.k] || ""; });
    return c;
  }

  function autoScore(c) {
    var vals = EVAL.map(function (n) { return c.eval[n].score; }).filter(function (s) { return s; });
    if (!vals.length) return null;
    var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
    return Math.round(avg * 2 * 10) / 10;
  }
  function finalScore(c) {
    var ov = c.score10;
    if (ov !== "" && ov != null && !isNaN(+ov)) return +ov;
    return autoScore(c);
  }

  // Build the report's inner HTML for #reportBody. Caller sets dir/lang + the
  // `.ar` class on the container.
  function render(s, c, lang) {
    var t = T[lang], ar = (lang === "ar"), nw = t.notwritten;
    function locDate(x) { var p = String(x).split(" "); return (p.length === 2 && t.months && t.months[p[0]]) ? t.months[p[0]] + " " + p[1] : x; }
    function lv(kind, raw) {
      if (!ar) return val(raw);
      var x = raw == null ? "" : String(raw);
      if (!x.trim()) return val(raw);
      if (kind === "date") return esc(locDate(x));
      var map = { format: t.fmt, draft: t.drf, genre: t.genreMap, length: t.lenMap, writer: t.writerMap }[kind];
      if (map && map[x]) return esc(map[x]);
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

    var fs = finalScore(c);
    var dec = c.verdict.decision ? c.verdict.decision : t.pending; // verdict stays English

    var header = '<div class="rep-header">' +
      '<img class="rep-logo" src="' + LOGO + '" alt="Scene One">' +
      '<div class="rep-wm">SCENE&nbsp;<span>ONE</span></div>' +
      '<div class="rep-cov">' + t.coverage + "</div>" +
      "</div>";

    return header +
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
  }

  window.SOReport = {
    T: T, GLANCE: GLANCE, GLANCE_OPTS: GLANCE_OPTS, REC_OPTS: REC_OPTS, EVAL: EVAL, MARKET: MARKET,
    GENRE_EN: GENRE_EN, FORMAT_EN: FORMAT_EN, DRAFT_EN: DRAFT_EN, LOGO: LOGO,
    esc: esc, val: val, mapSubmission: mapSubmission, mergeCoverage: mergeCoverage,
    autoScore: autoScore, finalScore: finalScore, render: render
  };
})();
