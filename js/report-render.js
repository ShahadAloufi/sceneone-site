/* ===========================================================
   Scene One, shared coverage-report renderer
   Single source of truth for the bilingual report markup, used by
   BOTH the reader workspace (coverage.js) and the public, read-only
   report page the writer receives a link to (report.js). Data in →
   HTML string out; no DOM/state/auth assumptions, so it renders the
   same report in either place.
   =========================================================== */
(function () {
  "use strict";

  // The FULL brand lockup, not the icon-only mark. The header used to pair the
  // mark with a letterspaced "SCENE ONE" set in the page font (.rep-wm) — but
  // that typography is the OLD wordmark, so after the 2026-09-01 rebrand the
  // report was the last place still showing it. The lockup carries the wordmark
  // itself, so .rep-wm was removed rather than left to contradict it.
  // PNG because the brand artwork was supplied as raster; at 171x64 from an
  // 852x318 source it is a 5x downscale. If a vector version ever arrives, swap
  // it in — the report renders natively, so an SVG would stay crisp at any size.
  var LOGO = "assets/scene-one-logo-v5.svg";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c];
    });
  }
  function val(x, empty) {
    return x && String(x).trim() ? esc(x) : '<span class="empty">' + (empty || "–") + "</span>";
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
      // The treatment scorecard's own four levels. A treatment is read for
      // potential, not for execution, so "Excellent/Poor" (a verdict on a
      // finished thing) gives way to a scale about how far along each element is.
      strong: "Strong", promising: "Promising", developing: "Needs Development", weak: "Weak",
      synopsis: "Synopsis", evaluation: "Evaluation", market: "The market", overall: "Overall comments",
      coverageT: "Treatment coverage", synopsisT: "Treatment summary", evaluationT: "Creative assessment", marketT: "Development & industry outlook", footT: "Treatment coverage",
      // Part I of the treatment report. The reader writes their OWN logline so
      // it can be set against the writer's: a gap between the two is itself the
      // finding, and it says what the treatment actually communicated.
      readerLogline: "Logline (as read)", assessment: "Overall assessment",
      glanceT: "Creative scorecard",
      strengths: "Strengths", develop: "To develop", attachment: "Attached for you", verdict: "Verdict", pending: "Pending", notwritten: "Not yet written.",
      // The logline comes from the WRITER, not the reader, so it needs its own
      // empty state: "not yet written" would wrongly read as the reader owing
      // work. Required on the form since 2026-08, so this is only reachable by
      // rows that predate that.
      nologline: "The logline wasn't provided by the writer.",
      outof: "/ 10", foot: "Script coverage", pagesUnit: "pages",
      // What the writer sees in place of the reader's raw upload filename. The
      // stored name is whatever the file happened to be called on the reader's
      // machine ("WhatsApp Image 2026-08-26 at 8.42.30 PM.jpeg") — noise to the
      // writer, and it leaks how the file reached us. The link still serves the
      // real file; only the visible label is generic.
      attachmentFile: "Attachment",
      eval: { "Premise & Theme": "Premise & Theme", "Hook": "Hook", "Stakes & Plot": "Stakes & Plot", "Character": "Character", "Dialogue": "Dialogue", "Structure & Pace": "Structure & Pace", "Producibility": "Producibility", "Presentation": "Presentation",
              "Narrative Clarity": "Narrative clarity", "Character Basics": "Character (fundamentals)", "Emotional Journey": "Emotional journey",
              "Story Structure": "Overall story structure", "Screenplay Potential": "Screenplay development potential", "Market Viability": "Market viability", "Overall presentation": "Overall presentation",
              "Hook & Originality": "Hook & originality", "Stakes, Conflict & Plot": "Stakes, conflict & plot", "Characters & Arcs": "Characters & arcs",
              "Structure & Momentum": "Structure & narrative momentum", "Genre, Tone & Cinematic Potential": "Genre, tone & cinematic potential",
              "Treatment Clarity": "Treatment clarity & presentation" },
      market_l: { audience: "Audience", genreDemand: "Genre and demand", pathBuyers: "Path and buyers", budgetCeiling: "Budget and ceiling", regional: "Regional potential", net: "Net",
                  tPath: "Path and potential partners", tBudget: "Budget and production ceiling", tReach: "Reach potential",
                  devPriorities: "Development priorities", tProduction: "Production considerations", tMarketPos: "Market & audience positioning" },
      glance_l: { "Premise & Theme": "Premise & Theme", "Hook": "Hook", "Stakes & Plot": "Stakes & Plot", "Character": "Character", "Dialogue": "Dialogue", "Structure & Pace": "Structure & Pace", "Producibility": "Producibility", "Overall presentation": "Overall presentation",
                 "Narrative Clarity": "Narrative clarity", "Character Basics": "Character (fundamentals)", "Emotional Journey": "Emotional journey",
                 "Story Structure": "Overall story structure", "Screenplay Potential": "Screenplay development potential", "Market Viability": "Market viability",
                 "Hook & Originality": "Hook & originality", "Stakes, Conflict & Plot": "Stakes, conflict & plot", "Characters & Arcs": "Characters & arcs",
                 "Structure & Momentum": "Structure & momentum", "Genre, Tone & Cinematic Potential": "Genre, tone & cinematic potential",
                 "Treatment Clarity": "Treatment clarity" },
      decision: { Recommend: "Strong Enough for Industry Consideration", Consider: "Consider with Development", Pass: "Further Development Required" },
      decisionDesc: {
        Recommend: "Developed enough to warrant industry discussion or the next appropriate stage. This does not mean the project is production-ready.",
        Consider: "Shows meaningful creative potential, with identifiable weaknesses to address through focused development before advancing.",
        Pass: "Has foundational story questions to resolve before its potential can be reliably assessed."
      },
      fmt: {}, drf: {}, genreMap: {}, lenMap: {}, writerMap: {}, months: {}, lvl: {}
    },
    ar: {
      coverage: "تقييم النص", tagline: "حيث تبدأ رحلة النص",
      title: "العنوان", writer: "الكاتب", format: "نوع العمل", genre: "التصنيف", length: "عدد الصفحات/المدة", draft: "المسودة", reader: "القارئ", date: "التاريخ",
      logline: "الفكرة المختصرة", glance: "التقييم العام", excellent: "ممتاز", good: "جيد", fair: "مقبول", poor: "ضعيف",
      strong: "قوي", promising: "واعد", developing: "يحتاج إلى تطوير", weak: "ضعيف",
      synopsis: "الملخّص", evaluation: "التقييم", market: "السوق", overall: "ملاحظات عامة",
      coverageT: "تقييم المعالجة", synopsisT: "الملخّص (Treatment Summary)", evaluationT: "التقييم الإبداعي", marketT: "التطوير وأفق الصناعة", footT: "تقييم المعالجة",
      readerLogline: "الفكرة المختصرة كما قرأها القارئ", assessment: "التقييم العام للمشروع",
      glanceT: "التقييم الإبداعي",
      strengths: "نقاط القوة", develop: "ما يحتاج إلى تطوير", attachment: "مرفق لك", verdict: "الحكم", pending: "بانتظار التقييم", notwritten: "لم يُكتب بعد.",
      nologline: "لم يزوّدنا الكاتب بالفكرة المختصرة.",
      outof: "/ 10", foot: "تقييم النصوص", pagesUnit: "صفحة",
      attachmentFile: "المرفق",
      eval: { "Premise & Theme": "الفكرة والموضوع", "Hook": "عنصر الجذب", "Stakes & Plot": "الرهانات الدرامية والحبكة", "Character": "الشخصيات", "Dialogue": "الحوار", "Structure & Pace": "البناء الدرامي والإيقاع", "Producibility": "قابلية الإنتاج", "Presentation": "العرض والتنسيق",
              "Narrative Clarity": "وضوح الرؤية السردية", "Character Basics": "الشخصيات (الأساسيات)", "Emotional Journey": "الرحلة العاطفية",
              "Story Structure": "البناء العام للقصة", "Screenplay Potential": "قابلية التطوير لسيناريو", "Market Viability": "الجدوى السوقية", "Overall presentation": "العرض العام",
              "Hook & Originality": "عنصر الجذب والأصالة", "Stakes, Conflict & Plot": "الرهانات والصراع والحبكة", "Characters & Arcs": "الشخصيات وتحولاتها",
              "Structure & Momentum": "البناء والتقدم الدرامي", "Genre, Tone & Cinematic Potential": "النوع والنبرة والإمكانات السينمائية",
              "Treatment Clarity": "وضوح المعالجة وتقديمها" },
      market_l: { audience: "الجمهور المستهدف", genreDemand: "النوع والطلب في السوق", pathBuyers: "مسار المشروع والجهات المشترية", budgetCeiling: "الميزانية وسقف الإيرادات المتوقع", regional: "إمكانات الانتشار الإقليمي", net: "الخلاصة",
                  tPath: "مسار المشروع والجهات المحتملة", tBudget: "الميزانية وسقف الإنتاج", tReach: "إمكانات الانتشار",
                  devPriorities: "أولويات التطوير", tProduction: "قابلية الإنتاج", tMarketPos: "الموقع السوقي والجمهور المستهدف" },
      glance_l: { "Premise & Theme": "الفكرة والموضوع", "Hook": "عنصر الجذب", "Stakes & Plot": "الرهانات الدرامية والحبكة", "Character": "الشخصيات", "Dialogue": "الحوار", "Structure & Pace": "البناء الدرامي والإيقاع", "Producibility": "قابلية الإنتاج", "Overall presentation": "العرض العام",
                 "Narrative Clarity": "وضوح الرؤية السردية", "Character Basics": "الشخصيات (الأساسيات)", "Emotional Journey": "الرحلة العاطفية",
                 "Story Structure": "البناء العام للقصة", "Screenplay Potential": "قابلية التطوير لسيناريو", "Market Viability": "الجدوى السوقية",
                 "Hook & Originality": "عنصر الجذب والأصالة", "Stakes, Conflict & Plot": "الرهانات والصراع والحبكة", "Characters & Arcs": "الشخصيات وتحولاتها",
                 "Structure & Momentum": "البناء والتقدم الدرامي", "Genre, Tone & Cinematic Potential": "النوع والنبرة والإمكانات السينمائية",
                 "Treatment Clarity": "وضوح المعالجة" },
      // One wording for these three across the whole site — the guide
      // (about-coverage), the terms, and this, the report the writer reads. They
      // used to differ («يستحق الدراسة» here, «معتبر» in the terms), so a writer
      // met two names for the same verdict.
      decision: { Recommend: "قويّ بما يكفي لعرضه على جهات الصناعة", Consider: "يستحق النظر مع التطوير", Pass: "يحتاج إلى تطوير إضافي" },
      decisionDesc: {
        Recommend: "العمل مطوَّر بما يكفي لطرحه على جهات الصناعة أو للانتقال إلى المرحلة التالية المناسبة، وهذا لا يعني أنه جاهز للإنتاج.",
        Consider: "يُظهر العمل إمكانات إبداعية حقيقية، مع مواضع ضعف محددة يجب معالجتها بتطوير مركّز قبل المضي قدمًا.",
        Pass: "في العمل أسئلة سردية تأسيسية ينبغي حلّها قبل أن يمكن تقدير إمكاناته بثقة."
      },
      fmt: { "Short film": "فيلم قصير", "Feature": "فيلم طويل", "Feature film": "فيلم طويل", "TV Pilot": "حلقة تجريبية", "Web Series": "مسلسل ويب", "Series": "مسلسل", "Other": "أخرى" },
      drf: { "First draft": "المسودة الأولى", "Second draft": "المسودة الثانية", "Revised draft": "المسودة الثانية", "Final draft": "النسخة النهائية" },
      months: { January: "يناير", February: "فبراير", March: "مارس", April: "أبريل", May: "مايو", June: "يونيو", July: "يوليو", August: "أغسطس", September: "سبتمبر", October: "أكتوبر", November: "نوفمبر", December: "ديسمبر" },
      genreMap: { "Drama": "دراما", "Comedy": "كوميديا", "Crime": "جريمة", "Thriller": "إثارة", "Horror": "رعب", "Action": "أكشن", "Sci-Fi": "خيال علمي", "Romance": "رومانسي", "Animation": "رسوم متحركة", "Documentary": "وثائقي", "Other": "أخرى" },
      lenMap: {}, writerMap: {},
      // Writer's self-declared experience. Reader-facing only — this is used by
      // the coverage workspace's pulled panel, never by the writer's report.
      lvl: { "New writer": "كاتب جديد", "Emerging writer": "كاتب ناشئ", "Professional writer": "كاتب محترف", "Veteran writer": "كاتب متمرّس" }
    }
  };

  // ---- Schemas -------------------------------------------------------------
  // A coverage's shape depends on WHAT WAS BOUGHT. Script coverage reads a
  // finished screenplay; treatment coverage reads a story document and asks
  // different questions, so it has its own ordered point list and its own market
  // notes. Everything downstream — the reader workspace, the writer's report,
  // the PDF — drives off these lists, so a schema is defined once here.
  //
  // Point names are the canonical English KEYS stored in `coverages.data`, never
  // the translated labels (same rule as review_comments): a note written in
  // Arabic still lands against the right point when the report is read in
  // English. Labels for every key live in T.<lang>.eval / .glance_l above.
  //
  // Dialogue sits after Character in the script list on purpose — the two are
  // read together. A coverage written before a point existed simply has no entry
  // for it (see the legacy skip in render()).
  var GLANCE_OPTS = ["Excellent", "Good", "Fair", "Poor"];
  // The treatment scorecard's own levels. Stored as these English keys, like
  // every other value in a coverage; the labels live in T.<lang>. The third
  // key reads "Needs Development" on the page — the KEY stays "Developing" so
  // no stored row has to be rewritten to change what it is called.
  var TREATMENT_OPTS = ["Strong", "Promising", "Developing", "Weak"];
  // Each scale's level → the dictionary key holding its label.
  var OPT_LABEL_KEY = {
    Excellent: "excellent", Good: "good", Fair: "fair", Poor: "poor",
    Strong: "strong", Promising: "promising", Developing: "developing", Weak: "weak"
  };
  function optsFor(sc) { return (sc && sc.glanceOpts) || GLANCE_OPTS; }
  var REC_OPTS = ["Recommend", "Consider", "Pass"];

  var SCRIPT_SCHEMA = {
    key: "script",
    glance: ["Premise & Theme", "Hook", "Stakes & Plot", "Character", "Dialogue", "Structure & Pace", "Producibility", "Overall presentation"],
    eval: ["Premise & Theme", "Hook", "Stakes & Plot", "Character", "Dialogue", "Structure & Pace", "Producibility", "Presentation"],
    market: [
      { k: "audience", label: "Audience" },
      { k: "genreDemand", label: "Genre and demand" },
      { k: "pathBuyers", label: "Path and buyers" },
      { k: "budgetCeiling", label: "Budget and ceiling" },
      { k: "regional", label: "Regional potential" },
      { k: "net", label: "Net" }
    ]
  };

  // The treatment's nine points, in the order the sample report shows them.
  // "Premise & Theme" and "Hook" deliberately reuse the script keys — they are
  // the same question, and sharing the key means sharing the label.
  // The treatment report restructured (2026-10-31) into three parts: Project
  // Overview, Creative Assessment, Development & Industry Outlook.
  //
  // SEVEN creative points, not nine. Market viability and overall presentation
  // left the scorecard on purpose: production complexity and commercial fit are
  // not measures of story quality, and rating them alongside premise and
  // character let a difficult independent film score badly for being difficult.
  // They are discussed as prose in Part III instead.
  //
  // No numeric scoring here. A treatment is read for potential, and a 3.5/5 on
  // a story that does not exist yet claims a precision nobody has — so the four
  // qualitative levels are the only rating, and there is no /10.
  var TREATMENT_SCHEMA = {
    key: "treatment",
    glance: ["Premise & Theme", "Hook & Originality", "Stakes, Conflict & Plot", "Characters & Arcs", "Structure & Momentum", "Genre, Tone & Cinematic Potential", "Treatment Clarity"],
    eval: ["Premise & Theme", "Hook & Originality", "Stakes, Conflict & Plot", "Characters & Arcs", "Structure & Momentum", "Genre, Tone & Cinematic Potential", "Treatment Clarity"],
    market: [
      { k: "devPriorities", label: "Development priorities" },
      { k: "tProduction", label: "Production considerations" },
      { k: "tMarketPos", label: "Market & audience positioning" }
    ],
    glanceOpts: TREATMENT_OPTS,
    // Part I asks the reader for their own logline and a short executive
    // assessment; both are treatment-only fields on the stored coverage.
    overview: true,
    scores: false,
    // Points and market notes written under the NINE-point shape. A stored
    // coverage keyed by an old name still has words in it that a reader wrote,
    // so mergeCoverage carries each one onto its nearest new home rather than
    // dropping it. First match wins; a new key the reader has already filled is
    // never overwritten.
    legacy: {
      "Hook & Originality": ["Hook"],
      "Stakes, Conflict & Plot": ["Stakes & Plot"],
      "Characters & Arcs": ["Character Basics", "Emotional Journey"],
      "Structure & Momentum": ["Story Structure"],
      "Treatment Clarity": ["Narrative Clarity", "Overall presentation"]
    },
    legacyMarket: {
      devPriorities: ["Screenplay Potential"],
      tProduction: ["tBudget"],
      tMarketPos: ["tMarketViability", "audience", "genreDemand", "tPath", "tReach"]
    }
  };

  // `film_type` decides the schema; anything unknown reads as a script coverage,
  // which is the safe default (it is what every pre-treatment row is).
  function schemaFor(filmType) {
    return String(filmType || "").indexOf("treatment") === 0 ? TREATMENT_SCHEMA : SCRIPT_SCHEMA;
  }
  function asSchema(x) {
    if (!x) return SCRIPT_SCHEMA;
    return typeof x === "string" ? schemaFor(x) : x;
  }

  // Back-compat aliases: the script lists were exported under these names before
  // schemas existed.
  var GLANCE = SCRIPT_SCHEMA.glance;
  var EVAL = SCRIPT_SCHEMA.eval;
  var MARKET = SCRIPT_SCHEMA.market;

  /* maps between the submission form's stored keys and the report's labels */
  var GENRE_EN = { drama: "Drama", comedy: "Comedy", romance: "Romance", crime: "Crime", thriller: "Thriller", horror: "Horror", action: "Action", documentary: "Documentary", other: "Other" };
  var FORMAT_EN = { feature: "Feature", short: "Short film", short_under_30: "Short film",
                    treatment_feature: "Feature treatment", treatment_short: "Short film treatment" };
  var DRAFT_EN = { first: "First draft", revised: "Revised draft", final: "Final draft" };
  // `submissions.writer_level` → the canonical English the workspace stores and
  // the `lvl` map translates. Keys match WRITER_LEVELS in api/submissions.js.
  var LEVEL_EN = { new: "New writer", emerging: "Emerging writer", professional: "Professional writer", veteran: "Veteran writer" };

  // A raw `submissions` row → the shape the report renderer consumes.
  function mapSubmission(r) {
    return {
      titleEn: r.title_en || "",
      titleAr: r.title_ar || "",
      writer: r.writer || "",
      format: FORMAT_EN[r.film_type] || "Short film",
      // Kept raw (not just its label) so render() can pick the schema itself.
      filmType: r.film_type || "",
      genre: GENRE_EN[r.genre] || r.genre || "",
      length: r.duration || "",
      // Carried raw (title page included) so render() can localise the unit —
      // the label is «عدد الصفحات/المدة», and for a row with no duration the
      // count is the only thing that field can say. Blank, not zero, when the
      // row has no count at all.
      pages: (r.pages != null && r.pages > 0) ? r.pages : null,
      draft: DRAFT_EN[r.draft] || "Final draft",
      logline: r.logline || ""
    };
  }

  // A stored coverage `data` jsonb (possibly partial) → a complete coverage object.
  function mergeCoverage(stored, schema) {
    var sc = asSchema(schema);
    var ev = {}; sc.eval.forEach(function (n) { ev[n] = { score: null, text: "" }; });
    var mk = {}; sc.market.forEach(function (m) { mk[m.k] = ""; });
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
    var e = c.eval || {}; c.eval = {}; sc.eval.forEach(function (n) { c.eval[n] = Object.assign({ score: null, text: "" }, e[n] || {}); });
    var m = c.market || {}; c.market = {}; sc.market.forEach(function (x) { c.market[x.k] = m[x.k] || ""; });
    // Part I is treatment-only, so a script coverage never grows these keys.
    if (sc.overview) {
      c.readerLogline = c.readerLogline || "";
      c.assessment = c.assessment || "";
    }
    // Carry a pre-restructure coverage onto the new shape. Only ever fills a
    // blank: whatever the reader has written under a current key wins.
    if (sc.legacy) {
      Object.keys(sc.legacy).forEach(function (k) {
        if (String(c.eval[k].text || "").trim() || c.eval[k].score) return;
        for (var i = 0; i < sc.legacy[k].length; i++) {
          var src = e[sc.legacy[k][i]];
          if (src && String(src.text || "").trim()) { c.eval[k] = Object.assign({ score: null, text: "" }, src); return; }
        }
      });
    }
    if (sc.legacyMarket) {
      Object.keys(sc.legacyMarket).forEach(function (k) {
        if (String(c.market[k] || "").trim()) return;
        for (var i = 0; i < sc.legacyMarket[k].length; i++) {
          var src = sc.legacyMarket[k][i];
          // An old market note, or an old evaluation point whose subject moved
          // out of the scorecard and into the Part III prose.
          var v = (m && m[src]) || (e[src] && e[src].text) || "";
          if (String(v).trim()) { c.market[k] = v; return; }
        }
      });
    }
    return c;
  }

  function autoScore(c, schema) {
    var sc = asSchema(schema);
    // A schema with no numeric scoring has nothing to average — see
    // TREATMENT_SCHEMA. Returning null keeps every /10 off the page.
    if (sc.scores === false) return null;
    var vals = sc.eval.map(function (n) { return c.eval[n] && c.eval[n].score; }).filter(function (s) { return s; });
    if (!vals.length) return null;
    var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
    return Math.round(avg * 2 * 10) / 10;
  }
  function finalScore(c, schema) {
    if (asSchema(schema).scores === false) return null;
    var ov = c.score10;
    if (ov !== "" && ov != null && !isNaN(+ov)) return +ov;
    return autoScore(c, schema);
  }

  // Build the report's inner HTML for #reportBody. Caller sets dir/lang + the
  // `.ar` class on the container.
  // A resource the reader attached for the writer. Rendered only when the caller
  // supplied a live link (the writer's report page gets one from /api/report);
  // the workspace preview shows the name without a link, which is the honest
  // representation there — the reader already has the file.
  function attachmentHtml(c, t) {
    var att = c.attachmentLink || c.attachment;
    if (!att || !att.name) return "";
    // `att.name` still gates the block — it is how we know an attachment exists —
    // but it is no longer what the writer reads. See attachmentFile above.
    // No target="_blank": the writer's link is a download served from our own
    // origin, so a new tab would open only to be discarded by the browser. The
    // workspace preview intercepts the click anyway (wireReportAttachment in
    // js/coverage.js), so the target would mean nothing there either.
    var label = att.url
      ? '<a href="' + esc(att.url) + '" rel="noopener">' + esc(t.attachmentFile) + "</a>"
      : esc(t.attachmentFile);
    return '<div class="rep-item"><div class="ih"><span class="t">' + t.attachment + "</span></div>" +
           '<p class="rep-attach">' + label + "</p></div>";
  }

  function render(s, c, lang, schema) {
    var t = T[lang], ar = (lang === "ar"), nw = t.notwritten;
    // A submission carries its own film_type, so the caller can pass nothing and
    // still get the right shape.
    var sc = asSchema(schema || (s && s.filmType));
    var isT = sc.key === "treatment";
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
    // «عدد الصفحات/المدة» — the page count, or the duration the writer typed when
    // we hold no count.
    //
    // The COUNT WINS, and it has to: the reader workspace's own panel
    // (`pagesLabel(s) || s.length` in js/coverage.js) and the dashboard's Pages
    // column both lead with it, so a report that led with the duration showed the
    // writer a different length from the one their reader was looking at, under
    // the same label. The count is also the better fact — measured from the file
    // by the server, where the duration is self-reported and often vague or
    // absent.
    function lengthCell() {
      if (s.pages) {
        // Same title-page convention as everywhere else the count is displayed.
        var n = s.pages > 1 ? s.pages - 1 : s.pages;
        return esc(n + " " + t.pagesUnit);
      }
      return lv("length", s.length);
    }
    var top = [[t.title, '<span class="rep-title">' + esc(s.titleEn || "Untitled") + (s.titleAr ? ' <span class="ar">(' + esc(s.titleAr) + ")</span>" : "") + "</span>", true],
      [t.writer, lv("writer", s.writer)], [t.format, lv("format", s.format)], [t.genre, lv("genre", s.genre)],
      [t.length, lengthCell()], [t.draft, lv("draft", s.draft)],
      [t.reader, esc(ar ? "احد قراء Scene One" : "Scene One Reader")], [t.date, lv("date", c.date)]];
    var topHtml = top.map(function (r) { return "<div" + (r[2] ? ' style="grid-column:1/-1"' : "") + '><div class="k">' + r[0] + '</div><div class="v" dir="auto">' + r[1] + "</div></div>"; }).join("");

    // A coverage written before a point existed has nothing to say about it —
    // no score, no text, no glance mark. Rendering it anyway would grow an empty
    // section on reports that were already delivered to writers, so a point with
    // nothing in it is dropped from both the glance table and the evaluation.
    // `mergeCoverage` fills every point in EVAL, so absence is the only signal.
    function written(name) {
      var e = c.eval[name];
      return !!(e && (e.score || String(e.text || "").trim()));
    }
    // Each schema brings its own scale: the script's Excellent…Poor, the
    // treatment's Strong…Weak. The stored value is the English key either way.
    var opts = optsFor(sc);
    var glOpts = opts.map(function (o) { return t[OPT_LABEL_KEY[o]] || o; });
    var glHead = "<tr><td></td>" + glOpts.map(function (o) { return '<td class="mark">' + o + "</td>"; }).join("") + "</tr>";
    var glHtml = sc.glance.map(function (cat) {
      var v = c.glance[cat];
      // "Overall presentation" is the glance's name for the eval's "Presentation";
      // every other glance row shares its name with an evaluation point.
      if (!v && cat !== "Overall presentation" && !written(cat)) return "";
      var cells = opts.map(function (o) { return '<td class="mark ' + (v === o ? "hit" : "dim") + '">' + (v === o ? "●" : "·") + "</td>"; }).join("");
      return '<tr><td class="cat">' + t.glance_l[cat] + "</td>" + cells + "</tr>";
    }).join("");
    var evalHtml = sc.eval.map(function (n) {
      var e = c.eval[n];
      if (!written(n)) return "";
      return '<div class="rep-item"><div class="ih"><span class="t">' + t.eval[n] + "</span>" +
        (e.score && sc.scores !== false ? '<span class="sc">' + e.score + " / 5</span>" : "") + "</div>" +
        "<p>" + val(e.text, nw) + "</p></div>";
    }).join("");
    // The creative assessment, built once: a treatment puts it first and a
    // script keeps it third, so the markup cannot be written inline.
    // A treatment's scorecard belongs WITH the points it summarises — the seven
    // rows and the seven written points are the same seven judgements.
    var evalSecHtml = '<div class="rep-sec"><h2><span class="no">' + (isT ? "01" : "02") + "</span>" + (isT ? t.evaluationT : t.evaluation) + "</h2>" +
      (isT ? '<div class="glance"><h3>' + t.glanceT + '</h3><table class="gl">' + glHead + glHtml + "</table></div>" : "") +
      evalHtml + "</div>";
    // Part I, treatments only: the reader's own logline and their executive
    // read, both before the scorecard so the conclusions come first.
    var overviewHtml = sc.overview
      ? '<div class="rep-sec"><h2><span class="no">02</span>' + t.assessment + "</h2>" +
          '<div class="rep-item"><div class="ih"><span class="t">' + t.readerLogline + "</span></div>" +
            '<p dir="auto">' + val(c.readerLogline, nw) + "</p></div>" +
          '<div class="rep-item"><div class="ih"><span class="t">' + t.assessment + "</span></div>" +
            "<p>" + val(c.assessment, nw) + "</p></div></div>"
      : "";
    var marketHtml = sc.market.map(function (m) {
      return '<div class="rep-item"><div class="ih"><span class="t">' + t.market_l[m.k] + "</span></div>" +
        "<p>" + val(c.market[m.k], nw) + "</p></div>";
    }).join("");

    var fs = finalScore(c, sc);
    // The verdict reads in the report's own language. `t.decision` had been in
    // both dictionaries since this renderer was written but was never consulted,
    // so an Arabic report printed "Recommend" while every other surface — the
    // guide, the terms, the treatment sample — said «موصى به». Falls back to the
    // raw value so a decision outside the map still renders.
    var dec = c.verdict.decision ? (t.decision[c.verdict.decision] || c.verdict.decision) : t.pending;
    /* What the verdict MEANS, in the report's own language and in the same
       words as the guide. It sits beside the grade, where the reader's own
       context used to; that context moved to the line under them both. A
       verdict outside the map has no definition, and a report still being
       written has no verdict yet — both render nothing. */
    var decDesc = c.verdict.decision ? (t.decisionDesc[c.verdict.decision] || "") : "";

    var header = '<div class="rep-header">' +
      '<img class="rep-logo" src="' + LOGO + '" alt="Scene One">' +
      '<div class="rep-cov">' + (isT ? t.coverageT : t.coverage) + "</div>" +
      "</div>";

    return header +
      '<div class="rep-top">' + topHtml + "</div>" +
      '<div class="logline"><div class="k">' + t.logline + '</div><div dir="auto">' + val(s.logline, t.nologline) + "</div></div>" +
      (isT ? "" : '<div class="glance"><h3>' + t.glance + "</h3>" +
        '<table class="gl">' + glHead + glHtml + "</table></div>") +
      // A treatment LEADS with the creative assessment: the scorecard and the
      // seven points are what the reader was paid for, and a producer reading
      // this wants the judgement before the retelling. The reader's own logline
      // and the synopsis follow it. A script report keeps the older order,
      // where the synopsis establishes what was read before it is judged.
      (isT ? evalSecHtml : "") +
      overviewHtml +
      '<div class="rep-sec"><h2><span class="no">' + (isT ? "03" : "01") + "</span>" + (isT ? t.synopsisT : t.synopsis) + "</h2><p>" + val(c.synopsis, nw) + "</p></div>" +
      (isT ? "" : evalSecHtml) +
      '<div class="rep-sec"><h2><span class="no">' + (isT ? "04" : "03") + "</span>" + (isT ? t.marketT : t.market) + "</h2>" + marketHtml + "</div>" +
      '<div class="rep-sec"><h2><span class="no">' + (isT ? "05" : "04") + "</span>" + t.overall + "</h2>" +
        '<div class="rep-item"><div class="ih"><span class="t">' + t.strengths + "</span></div><p>" + val(c.overall.strengths, nw) + "</p></div>" +
        '<div class="rep-item"><div class="ih"><span class="t">' + t.develop + "</span></div><p>" + val(c.overall.toDevelop, nw) + "</p></div>" +
        attachmentHtml(c, t) + "</div>" +
      '<div class="verdict"><div class="vh">' + t.verdict + "</div>" +
        '<div style="display:flex;align-items:baseline;gap:18px;flex-wrap:wrap;margin-bottom:8px">' +
          '<div class="vd" style="margin:0">' + dec + (decDesc ? ' <span class="ctx">· ' + esc(decDesc) + "</span>" : "") + "</div>" +
          (fs != null ? '<div class="score10"><span class="n">' + fs + "</span> " + t.outof + "</div>" : "") +
        "</div>" +
        (c.verdict.context ? '<p class="vdesc">' + esc(c.verdict.context) + "</p>" : "") +
        '<p style="margin:0;color:#3f3a35">' + val(c.verdict.text, nw) + "</p></div>" +
      '<div class="rep-foot"><span>Scene One · sceneone.info</span><span>' + (isT ? t.footT : t.foot) + "</span></div>";
  }

  window.SOReport = {
    T: T, GLANCE: GLANCE, GLANCE_OPTS: GLANCE_OPTS, TREATMENT_OPTS: TREATMENT_OPTS,
    OPT_LABEL_KEY: OPT_LABEL_KEY, optsFor: optsFor, REC_OPTS: REC_OPTS, EVAL: EVAL, MARKET: MARKET,
    SCRIPT_SCHEMA: SCRIPT_SCHEMA, TREATMENT_SCHEMA: TREATMENT_SCHEMA, schemaFor: schemaFor,
    GENRE_EN: GENRE_EN, FORMAT_EN: FORMAT_EN, DRAFT_EN: DRAFT_EN, LEVEL_EN: LEVEL_EN, LOGO: LOGO,
    esc: esc, val: val, mapSubmission: mapSubmission, mergeCoverage: mergeCoverage,
    autoScore: autoScore, finalScore: finalScore, render: render
  };
})();
