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
  var GLANCE_OPTS = R.GLANCE_OPTS, REC_OPTS = R.REC_OPTS;
  // WHICH points this workspace asks for depends on what the writer bought: a
  // script coverage and a treatment coverage are different documents (see the
  // schemas in js/report-render.js). These three start on the script schema and
  // are re-pointed by setSchema() once the submission is loaded and its
  // film_type is known — every builder below reads them at call time, and all of
  // those run after the load.
  var SCHEMA = R.SCRIPT_SCHEMA;
  var GLANCE = SCHEMA.glance, EVAL = SCHEMA.eval, MARKET = SCHEMA.market;
  function setSchema(sc) {
    SCHEMA = sc; GLANCE = sc.glance; EVAL = sc.eval; MARKET = sc.market;
  }
  var GENRE_EN = R.GENRE_EN, FORMAT_EN = R.FORMAT_EN, DRAFT_EN = R.DRAFT_EN, LEVEL_EN = R.LEVEL_EN;

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
      verdict: "Verdict", suggested: "Suggested · from the scores",
      finalRating: "Final rating / 10", decision: "Decision",
      context: "Context (optional)", contextPh: "short-film and festival context", summary: "Summary",
      genReport: "Generate report", finalize: "Mark coverage complete", reopen: "Reopen coverage",
      editCoverage: "Edit coverage", print: "Print / Save as PDF",
      sendReport: "Send to writer", sending: "Sending…", sent: "Sent to writer ✓",
      sendOk: "Report sent to the writer", sendFail: "Couldn't send the report",
      // Quality-control review flow
      submitApproval: "Submit Coverage for Approval",
      approveSend: "Approve & Send to Writer", requestRevision: "Request Revision",
      revisionNotePh: "Reason for revision — only needed to request a revision",
      reviewHint: "Approving needs no note. A note is only required to request a revision.",
      noteRequired: "Add a revision note before requesting changes.",
      reviewTimeout: "The request timed out. Check whether the report was sent before retrying.",
      awaitingBanner: "Submitted for approval — awaiting the quality team's review. It's locked until they respond.",
      revisionBanner: "Revision requested by the quality team:",
      approvedBanner: "Approved and sent to the writer.",
      reviewPrompt: "This coverage is awaiting your approval.",
      // Per-point review notes (evaluation points only — not synopsis or verdict).
      addComment: "Add comment", removeComment: "Remove",
      commentPh: "What needs work in this point?",
      commentLblWrite: "Your note on this point", commentLblRead: "Review note",
      // Lead readers deliver their own coverage themselves — it skips quality review.
      leadDeliver: "Send Coverage to Writer",
      leadDeliverConfirm: "Send this coverage to the writer now? As a lead reader your coverage isn't reviewed by anyone else, and this can't be undone.",
      tSubmitted: "Coverage submitted for approval", tApproved: "Approved and sent to the writer",
      tRevision: "Sent back to the reader for revision",
      // Shown as a blocking alert, not a toast: approval succeeded but the writer
      // was NOT emailed, and only a human can put that right.
      approvedNoEmail: "Approved — but the email to the writer FAILED to send.\n\n" +
        "The report is live and the coverage is approved, but the writer has not been " +
        "told. Re-approving will not resend it. Please send them this link yourself:",
      approving: "Approving…", requesting: "Sending…", reviewFail: "Couldn't complete the action.",
      pl: { title: "Title", writer: "Writer", level: "Writer's level", email: "Email", ref: "Reference", format: "Format", genre: "Genre", length: "Length", draft: "Draft", ip: "IP registered", file: "Script file", logline: "Logline", vision: "Writer's vision" },
      attachment: "Attachment for the writer",
      attachmentHint: "Optional. A guide or reference the writer can download with their report.",
      attachAdd: "Add attachment", attachRemove: "Remove",
      attachTooBig: "That file is over 10MB.", attachFailed: "Could not upload that file.",
      ipYes: "Registered", ipNo: "Not registered", dl: "Download script", untitled: "Untitled", dash: "—", pagesUnit: "pages",
      fileLocked: "Locked", fileLockedTip: "Another reader is assigned to this script.",
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
      verdict: "الحكم", suggested: "مقترح · من الدرجات",
      finalRating: "التقييم النهائي / ١٠", decision: "القرار",
      context: "السياق (اختياري)", contextPh: "سياق الأفلام القصيرة والمهرجانات", summary: "الخلاصة",
      genReport: "إنشاء التقرير", finalize: "وضع علامة اكتمال التقييم", reopen: "إعادة فتح التقييم",
      editCoverage: "تعديل التقييم", print: "طباعة / حفظ PDF",
      sendReport: "إرسال إلى الكاتب", sending: "جارٍ الإرسال…", sent: "تم الإرسال ✓",
      sendOk: "تم إرسال التقرير إلى الكاتب", sendFail: "تعذّر إرسال التقرير",
      // مسار مراجعة الجودة
      submitApproval: "إرسال التغطية للاعتماد",
      approveSend: "اعتماد وإرسال إلى الكاتب", requestRevision: "طلب تعديل",
      revisionNotePh: "سبب التعديل — مطلوب فقط عند طلب تعديل",
      reviewHint: "الاعتماد لا يحتاج إلى ملاحظة. الملاحظة مطلوبة فقط عند طلب تعديل.",
      noteRequired: "أضف ملاحظة التعديل قبل طلب التعديل.",
      reviewTimeout: "انتهت مهلة الطلب. تحقق مما إذا كان التقرير قد أُرسل قبل إعادة المحاولة.",
      awaitingBanner: "تم الإرسال للاعتماد — بانتظار مراجعة فريق الجودة. التغطية مقفلة حتى ردّهم.",
      revisionBanner: "طلب فريق الجودة إجراء تعديل:",
      approvedBanner: "تم الاعتماد والإرسال إلى الكاتب.",
      reviewPrompt: "هذه التغطية بانتظار اعتمادك.",
      // Per-point review notes (evaluation points only — not synopsis or verdict).
      addComment: "إضافة ملاحظة", removeComment: "حذف",
      commentPh: "ما الذي يحتاج إلى تعديل في هذه النقطة؟",
      commentLblWrite: "ملاحظتك على هذه النقطة", commentLblRead: "ملاحظة المراجعة",
      // Lead readers deliver their own coverage themselves — it skips quality review.
      leadDeliver: "إرسال التغطية إلى الكاتب",
      leadDeliverConfirm: "إرسال هذه التغطية إلى الكاتب الآن؟ بصفتك قارئًا رئيسيًا لا تخضع تغطيتك لمراجعة أحد، ولا يمكن التراجع عن هذا الإجراء.",
      tSubmitted: "تم إرسال التغطية للاعتماد", tApproved: "تم الاعتماد والإرسال إلى الكاتب",
      tRevision: "أُعيدت إلى القارئ للتعديل",
      approvedNoEmail: "تم الاعتماد — لكن تعذّر إرسال البريد إلى الكاتب.\n\n" +
        "التقرير جاهز والتغطية معتمدة، لكن الكاتب لم يُبلَّغ. إعادة الاعتماد لن تُعيد " +
        "الإرسال. يرجى إرسال هذا الرابط إليه يدويًا:",
      approving: "جارٍ الاعتماد…", requesting: "جارٍ الإرسال…", reviewFail: "تعذّر إكمال الإجراء.",
      pl: { title: "عنوان السيناريو", writer: "اسم الكاتب", level: "مستوى الكاتب", email: "البريد الإلكتروني", ref: "الرقم المرجعي", format: "نوع العمل", genre: "التصنيف", length: "عدد الصفحات/المدة", draft: "نسخة السيناريو", ip: "تسجيل الملكية الفكرية", file: "ملف السيناريو", logline: "الملخص المختصر", vision: "رؤية الكاتب" },
      attachment: "مرفق للكاتب",
      attachmentHint: "اختياري. دليل أو مرجع يمكن للكاتب تحميله مع تقريره.",
      attachAdd: "إضافة مرفق", attachRemove: "إزالة",
      attachTooBig: "حجم الملف يتجاوز 10 ميغابايت.", attachFailed: "تعذّر رفع الملف.",
      ipYes: "مسجل", ipNo: "غير مسجل", dl: "تحميل النص", untitled: "بدون عنوان", dash: "—", pagesUnit: "صفحة",
      fileLocked: "مقفل", fileLockedTip: "هذا النص مُسند إلى قارئ آخر.",
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
    // The report-preview button only needs every point scored; the "Submit for
    // approval" button also needs every written section filled in.
    var scores = allScoresSet();
    var rep = $("genReport");
    if (rep) { rep.disabled = !scores; tip("genReportTip", scores ? "" : UI[UILANG].scoresHint); }
    var btn = $("finalizeBtn"); if (!btn) return;
    var ok = isEvalComplete();
    btn.disabled = !ok;
    tip("finalizeTip", ok ? "" : UI[UILANG].finalizeHint);
  }

  /* ---------- state ---------- */
  function blank() {
    var ev = {}; EVAL.forEach(function (n) { ev[n] = { score: null, text: "" }; });
    var mk = {}; MARKET.forEach(function (m) { mk[m.k] = ""; });
    return {
      submission: { titleEn: "", titleAr: "", writer: "", level: "", email: "", format: "Short film", genre: "", length: "", draft: "Final draft", logline: "", vision: "", ip: false, file: "", filePath: "", ref: "" },
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
  var covStatus = "in_progress"; // 'in_progress' | 'submitted' | 'revision_requested' | 'approved'
  var reviewNote = "";           // staff's revision note (shown to the reader)
  // Per-point review notes, keyed by evaluation-point name. Written by the
  // reviewer while quality-reviewing, sent with "Request Revision", and shown
  // back to the reader against the exact point each one is about.
  var reviewComments = {};
  var evalNoteEls = {};          // name → { wrap, add, box, lbl, ta, del }
  var isStaff = false;           // admin / super_admin — the quality reviewer
  var isLead = false;            // lead_reader — reviews others' work, self-delivers their own
  var canReview = false;         // may I approve / bounce THIS coverage?
  var assignedToMe = false;      // I'm the primary assignee or co-reader of this script
  var scriptReadable = false;    // may I open the writer's script file? (staff / assigned / unclaimed)
  var readOnly = false;          // true for staff viewing a coverage they aren't assigned to
  var saveT = null;

  var currentSaveKey = "";
  function setSaveState(key) { currentSaveKey = key; var el = $("saveState"); if (el) el.textContent = UI[UILANG][key] || ""; }

  function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(save, 500); }

  async function save() {
    if (readOnly) return;
    if (!sb || !submissionId || !me) return;
    // A reader working on a bounced-back coverage moves it out of
    // 'revision_requested' the moment they save — the DB trigger only lets readers
    // persist 'in_progress' or 'submitted', so map the revision state to a draft.
    if (covStatus === "revision_requested") covStatus = "in_progress";
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
    // Scripts are IP-protected: only staff, the assigned reader, or an unclaimed
    // script may be opened. Mirrors the Storage RLS policy (the real guard).
    var fileCell = !s.filePath ? esc(s.file || dash)
      : scriptReadable ? '<a href="#" id="dlLink">' + esc(s.file || u.dl) + "</a>"
      : '<span style="color:var(--label)" title="' + esc(u.fileLockedTip) + '">' + esc(u.fileLocked) + "</span>";
    var rows = [
      [pl.title, title, true],
      [pl.writer, esc(s.writer || dash)],
      [pl.level, esc(pulledVal("lvl", s.level, dash))],
      [pl.email, '<span dir="ltr">' + esc(s.email || dash) + "</span>"],
      [pl.ref, esc(s.ref || dash)],
      [pl.format, esc(pulledVal("fmt", s.format, dash))],
      [pl.genre, esc(pulledVal("genreMap", s.genre, dash))],
      [pl.length, esc(pagesLabel(s) || s.length || dash)],
      [pl.draft, esc(pulledVal("drf", s.draft, dash))],
      [pl.ip, s.ip ? '<span style="color:var(--good);font-weight:600">' + u.ipYes + "</span>" : u.ipNo],
      [pl.file, fileCell],
      // 4th flag = prose: full-width AND long-form, so it's set at reading size rather
      // than the larger size the short scannable fields use. The title is full-width
      // too but is not prose, which is why this is a separate flag.
      [pl.logline, '<span dir="auto">' + esc(s.logline || dash) + "</span>", true, true],
      [pl.vision, '<span dir="auto">' + esc(s.vision || dash) + "</span>", true, true]
    ];
    $("pulledGrid").innerHTML = rows.map(function (r) {
      var cls = (r[2] ? "full" : "") + (r[3] ? " prose" : "");
      return '<div class="' + cls + '"><div class="k">' + r[0] + '</div><div class="v">' + r[1] + "</div></div>";
    }).join("");
    var dl = $("dlLink");
    if (dl) dl.addEventListener("click", function (e) { e.preventDefault(); downloadFile(s.filePath, dl); });
  }

  /* ---------- ATTACHMENT FOR THE WRITER ----------
     A reader can attach one resource to the coverage — a screenwriting guide, a
     formatting reference — which travels with the delivered report: named in the
     writer's email and downloadable from their report page.

     Stored in its OWN private bucket, never in `scripts`: that bucket holds the
     writer's IP under per-assignment RLS, and a shared guide has neither the same
     owner nor the same access rule. The writer has no account, so they never read
     the bucket directly — /api/report mints a short-lived signed URL against
     their report token.

     The reference lives in `coverages.data.attachment` ({name, path}), so it
     rides along with every existing save and needs no new column. */
  var ATTACH_BUCKET = "attachments";
  var ATTACH_MAX_BYTES = 10 * 1024 * 1024;

  function attachEls() {
    return {
      field: $("attachField"), input: $("attachInput"), btn: $("attachBtn"),
      name: $("attachName"), remove: $("attachRemove")
    };
  }

  // Who may attach. The assignee writes it through their own save; a reviewer
  // (staff or a lead) cannot write the coverage row at all, so their change goes
  // through /api/review-coverage on the service role. Anyone else — a reader
  // looking at someone else's approved coverage — only sees what is there.
  function canAttach() {
    return readerCanEdit() || isStaff || isLead;
  }

  function renderAttachment() {
    var e = attachEls();
    if (!e.field) return;
    var att = state.coverage && state.coverage.attachment;
    var editable = canAttach();
    e.btn.hidden = !editable || !!att;
    e.remove.hidden = !editable || !att;
    e.name.hidden = !att;
    if (att) {
      e.name.textContent = att.name;
      // Readers (and staff reviewing) can open what was attached; the writer's
      // copy is served separately, through their report token.
      e.name.onclick = function () { downloadFile(att.path, e.name, ATTACH_BUCKET); };
    }
  }

  async function uploadAttachment(file) {
    var e = attachEls();
    if (!file) return;
    if (file.size > ATTACH_MAX_BYTES) { toast(UI[UILANG].attachTooBig); return; }
    e.btn.disabled = true;
    var label = e.btn.textContent;
    e.btn.textContent = "…";
    // Namespaced by submission so one coverage's attachment can never collide
    // with another's, and the file keeps a readable name for the writer.
    var safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-80);
    var path = submissionId + "/" + Date.now().toString(36) + "-" + safe;
    var up = await sb.storage.from(ATTACH_BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream", upsert: false
    });
    e.btn.disabled = false;
    e.btn.textContent = label;
    if (up.error) {
      console.error("[attachment] upload failed:", up.error);
      toast(UI[UILANG].attachFailed);
      return;
    }
    var value = { name: file.name, path: path };
    if (!(await persistAttachment(value))) return;
    state.coverage.attachment = value;
    renderAttachment();
  }

  // One place decides HOW the reference is stored. The assignee's own save path
  // carries it (RLS lets them write the row); everyone else has to ask the
  // server. Returns false when the change did not stick, so the UI can stay
  // truthful rather than showing an attachment nobody saved.
  async function persistAttachment(value) {
    if (readerCanEdit()) { state.coverage.attachment = value; scheduleSave(); return true; }
    try {
      var sess = await sb.auth.getSession();
      var token = sess.data.session && sess.data.session.access_token;
      var resp = await fetch("/api/review-coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ submission_id: submissionId, action: "set_attachment", attachment: value })
      });
      if (!resp.ok) {
        var out = await resp.json().catch(function () { return {}; });
        toast(out.message || UI[UILANG].attachFailed);
        return false;
      }
      return true;
    } catch (e) {
      toast(UI[UILANG].attachFailed);
      return false;
    }
  }

  function bindAttachment() {
    var e = attachEls();
    if (!e.field || e.field.dataset.bound) return;
    e.field.dataset.bound = "1";
    e.btn.addEventListener("click", function () { e.input.click(); });
    e.input.addEventListener("change", function () {
      var f = e.input.files && e.input.files[0];
      e.input.value = "";                 // so the same file can be re-picked
      uploadAttachment(f);
    });
    e.remove.addEventListener("click", async function () {
      // The stored object is deliberately left in place: a coverage already
      // delivered may still link to it, and orphaned files are cheaper than a
      // broken link in a writer's inbox.
      if (!(await persistAttachment(null))) return;
      state.coverage.attachment = null;
      renderAttachment();
    });
  }

  async function downloadFile(path, el, bucket) {
    var old = el.textContent; el.textContent = "…";
    var res = await sb.storage.from(bucket || CFG.bucket).createSignedUrl(path, 120);
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
    var vals = EVAL.map(function (n) { return state.coverage.eval[n] && state.coverage.eval[n].score; }).filter(function (s) { return s; });
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
    evalNoteEls = {};
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
      buildEvalNote(b, name);
    });
    refreshEvalNotes();
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

  /* ---------- per-point review notes ----------
     Attached to each EVALUATION point only. The synopsis and the verdict are
     built elsewhere (covMap below) and deliberately get no note box: a revision
     note there would have nothing specific to attach to.

     Collapsed by default — the reviewer sees only an "Add comment" link until
     they decide a point needs one. A note that already exists always shows,
     expanded, whether it's the reviewer re-reading their own or the reader
     seeing what came back.

     The reviewer cannot save these directly: RLS ("only assigned readers update
     coverages") blocks them, so nothing is persisted until they click Request
     Revision, which sends the whole set through /api/review-coverage. */
  function buildEvalNote(block, name) {
    var wrap = document.createElement("div");
    wrap.className = "eval-note";
    wrap.innerHTML =
      '<button type="button" class="eval-note__add"></button>' +
      '<div class="eval-note__box" hidden>' +
        '<span class="eval-note__lbl"></span>' +
        "<textarea rows='2'></textarea>" +
        '<button type="button" class="eval-note__del"></button>' +
      "</div>";
    block.appendChild(wrap);

    var els = {
      wrap: wrap,
      add: wrap.querySelector(".eval-note__add"),
      box: wrap.querySelector(".eval-note__box"),
      lbl: wrap.querySelector(".eval-note__lbl"),
      ta: wrap.querySelector("textarea"),
      del: wrap.querySelector(".eval-note__del"),
      open: !!(reviewComments[name] || "").trim()
    };
    evalNoteEls[name] = els;

    els.add.addEventListener("click", function () {
      els.open = true; refreshEvalNotes(); els.ta.focus();
    });
    els.del.addEventListener("click", function () {
      delete reviewComments[name]; els.open = false; els.ta.value = ""; refreshEvalNotes();
    });
    els.ta.addEventListener("input", function () {
      var v = els.ta.value;
      if (v.trim()) reviewComments[name] = v; else delete reviewComments[name];
      autoGrow(els.ta);
    });
    els.ta.value = reviewComments[name] || "";
  }

  // Single source of truth for what each note looks like right now. Re-run on
  // load, on every language switch (which rebuilds the inputs) and after each
  // status transition, so an approved coverage stops offering "Add comment".
  function refreshEvalNotes() {
    var u = UI[UILANG];
    Object.keys(evalNoteEls).forEach(function (name) {
      var els = evalNoteEls[name];
      var text = (reviewComments[name] || "").trim();
      var writable = canReview;           // only while THIS coverage awaits review
      var open = writable ? (els.open || !!text) : !!text;

      // Nothing to write and nothing written → the whole affordance disappears,
      // which is what a reader sees on a coverage that came back clean.
      els.wrap.hidden = !writable && !text;
      els.add.hidden = !writable || open;
      els.add.textContent = u.addComment;
      els.box.hidden = !open;
      els.lbl.textContent = writable ? u.commentLblWrite : u.commentLblRead;
      els.del.hidden = !writable;
      els.del.textContent = u.removeComment;
      els.ta.value = reviewComments[name] || "";
      els.ta.setAttribute("placeholder", u.commentPh);
      // These live inside the read-only workspace, so applyReadOnly() has just
      // disabled them wholesale — re-enable for the reviewer, exactly as the
      // review bar's own controls are re-enabled.
      els.ta.disabled = !writable;
      els.ta.readOnly = !writable;
      els.add.disabled = false;
      els.del.disabled = false;
      if (open) autoGrow(els.ta);
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
    bindAttachment();
    renderAttachment();
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
    setSaveState(currentSaveKey);
    buildCoverageInputs();
    fillCovFields();
    renderPulled();
    if ($("view-report").classList.contains("active")) renderReport();
    configureWorkspaceState();
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
      // …except the attachment controls. Attaching a shared resource for the
      // writer is not editing the coverage, so a reviewer keeps it: their change
      // goes through /api/review-coverage rather than the locked row.
      if (canAttach()) {
        ["attachBtn", "attachRemove"].forEach(function (id) {
          var b = $(id); if (b) b.disabled = false;
        });
      }
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
    // Safety net: never open the report preview until every point is scored (a
    // submitted/approved coverage is already scored, so allow it regardless).
    if (covStatus === "in_progress" && !allScoresSet()) { toast(UI[UILANG].scoresHint); return; }
    show("report");
  };
  $("backToReview").onclick = function () { show("review"); };
  $("printReport").onclick = function () { window.print(); };

  // Whether the assigned reader may currently edit (draft states only; a
  // submitted or approved coverage is locked until staff act on it).
  function readerCanEdit() {
    return assignedToMe && (covStatus === "in_progress" || covStatus === "revision_requested");
  }

  function setBanner(kind, text) {
    var el = $("covBanner"); if (!el) return;
    el.hidden = !kind;
    el.className = "cov-banner" + (kind ? " cov-banner--" + kind : "");
    el.textContent = text || "";
  }

  // Single source of truth for every status-dependent piece of the workspace:
  // the read-only lock, the reader's submit button, the reader/staff banner, and
  // the staff review bar. Re-run after load, each language switch, and every
  // status transition.
  function configureWorkspaceState() {
    var u = UI[UILANG];
    var editable = readerCanEdit();
    readOnly = !editable;
    // Recomputed here (not just at load) so it can't go stale across a transition.
    canReview = (isStaff || (isLead && !assignedToMe)) && covStatus === "submitted";
    var showReview = canReview;
    // A lead delivers their own coverage straight to the writer — no review step.
    var leadSelfDeliver = isLead && assignedToMe;

    // Banner (top of the review view).
    if (showReview) setBanner("await", u.reviewPrompt);
    else if (covStatus === "approved") setBanner("approved", u.approvedBanner);
    else if (covStatus === "submitted") setBanner("await", u.awaitingBanner);
    else if (reviewNote) setBanner("revision", u.revisionBanner + " " + reviewNote);
    else setBanner("", "");

    // Reader's "Submit Coverage for Approval" — shown only while editable. For a
    // lead it reads "Send Coverage to Writer", because that is literally what it
    // does: there is no reviewer between them and the writer.
    var submit = $("finalizeBtn");
    if (submit) {
      submit.hidden = !editable;
      submit.textContent = leadSelfDeliver ? u.leadDeliver : u.submitApproval;
    }

    // Staff quality-review bar — only when the coverage is awaiting review.
    var bar = $("reviewBar"); if (bar) bar.hidden = !showReview;

    // Lock everything when read-only, THEN restore the always-available preview
    // and (for staff) the live review controls, which live inside the locked view.
    if (readOnly) applyReadOnly();
    var gen = $("genReport"); if (gen) gen.disabled = false;
    // Must run AFTER applyReadOnly(), which disables every control in the view.
    refreshEvalNotes();
    // Same reason: the attachment row decides its own visibility and enabled
    // state, and applyReadOnly() would otherwise have just switched it off.
    renderAttachment();
    if (showReview) {
      var ap = $("approveBtn"), rv = $("requestRevisionBtn"), note = $("revisionNote");
      if (ap) { ap.disabled = false; ap.textContent = u.approveSend; }
      if (rv) { rv.disabled = false; rv.textContent = u.requestRevision; }
      if (note) { note.disabled = false; note.readOnly = false; note.setAttribute("placeholder", u.revisionNotePh); }
      var hint = $("revisionNoteHint"); if (hint) hint.textContent = u.reviewHint;
    }
    if (editable) refreshFinalizeState();
  }

  // Reader submits the coverage for quality approval (in_progress/revision → submitted).
  var finalizeBtn = $("finalizeBtn");
  finalizeBtn.onclick = async function () {
    if (!readerCanEdit()) return;
    if (!isEvalComplete()) { toast(UI[UILANG].finalizeHint); return; }

    // A lead reader's coverage is not reviewed by anyone: this button delivers it
    // to the writer. Save the latest edits first (the API reads the stored row,
    // not the DOM), then hand off to /api/review-coverage, which is the only
    // thing that may stamp delivery and email the writer. Confirmed first,
    // because it emails a real writer and cannot be taken back.
    if (isLead && assignedToMe) {
      if (!confirm(UI[UILANG].leadDeliverConfirm)) return;
      await save();
      if (currentSaveKey === "saveFailed") { toast(UI[UILANG].saveFailed); return; }
      await callReview("approve", null, finalizeBtn, UI[UILANG].approving);
      return;
    }

    var prev = covStatus;
    covStatus = "submitted";
    await save();
    if (currentSaveKey === "saveFailed") { covStatus = prev; toast(UI[UILANG].saveFailed); return; }
    configureWorkspaceState();
    toast(UI[UILANG].tSubmitted);
  };

  // Staff quality actions → the privileged /api/review-coverage endpoint.
  async function callReview(action, note, btn, busyText) {
    var ap = $("approveBtn"), rv = $("requestRevisionBtn"), prevText = btn.textContent;
    ap.disabled = true; rv.disabled = true; btn.textContent = busyText;
    try {
      var sess = await sb.auth.getSession();
      var token = sess.data.session && sess.data.session.access_token;
      var body = { submission_id: submissionId, action: action };
      if (note != null) body.note = note;
      // Per-point notes ride along with the revision request — this is the only
      // moment they are persisted, since RLS blocks the reviewer writing the
      // coverage row directly. Approving clears them server-side instead.
      if (action === "request_revision") body.comments = reviewComments;
      // Approving does two Supabase round-trips and sends the writer's email, so
      // it can take a few seconds. Abort rather than leave the buttons stuck on
      // "Approving…" forever if the request never comes back.
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 30000);
      var resp;
      try {
        resp = await fetch("/api/review-coverage", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify(body),
          signal: ctrl.signal
        });
      } catch (netErr) {
        throw new Error(netErr && netErr.name === "AbortError" ? UI[UILANG].reviewTimeout : (netErr.message || UI[UILANG].reviewFail));
      } finally {
        clearTimeout(timer);
      }
      var data = await resp.json().catch(function () { return {}; });
      if (!resp.ok) throw new Error(data.message || UI[UILANG].reviewFail);
      covStatus = data.status || (action === "approve" ? "approved" : "revision_requested");
      if (action === "request_revision") reviewNote = note;
      else reviewComments = {}; // approved — the notes are spent, mirroring the server
      configureWorkspaceState();
      // The approve path can succeed while the writer's email fails — the server
      // says so with `emailed: false`. That needs a blocking alert, not a 2.2s
      // toast: the coverage is approved and drops off the active board, so a
      // missed warning means a paying writer silently never gets their report,
      // and there is no re-send action to fall back on.
      if (action === "approve" && data.emailed === false) {
        alert(UI[UILANG].approvedNoEmail + (data.reportUrl ? "\n\n" + data.reportUrl : ""));
      } else {
        toast(action === "approve" ? UI[UILANG].tApproved : UI[UILANG].tRevision);
      }
    } catch (e) {
      ap.disabled = false; rv.disabled = false; btn.textContent = prevText;
      toast(e.message || UI[UILANG].reviewFail);
    }
  }
  var approveBtn = $("approveBtn");
  if (approveBtn) approveBtn.onclick = function () { callReview("approve", null, this, UI[UILANG].approving); };
  var requestRevisionBtn = $("requestRevisionBtn");
  if (requestRevisionBtn) requestRevisionBtn.onclick = function () {
    var note = ($("revisionNote").value || "").trim();
    if (!note) { toast(UI[UILANG].noteRequired); $("revisionNote").focus(); return; }
    callReview("request_revision", note, this, UI[UILANG].requesting);
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
      // Raw type as well as its label: the report renderer picks its schema off this.
      filmType: r.film_type || "",
      genre: GENRE_EN[r.genre] || r.genre || "",
      length: r.duration || "",
      // Blank (not a default) when the row predates the field — the panel shows a
      // dash rather than inventing a level for the writer.
      level: LEVEL_EN[r.writer_level] || "",
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
    // The product decides the coverage's shape — do this before the skeleton or
    // any UI is built from EVAL / GLANCE / MARKET.
    setSchema(R.schemaFor(subRes.data.film_type));
    state.coverage = blank().coverage;
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
      reviewNote = covRow.review_note || "";
      reviewComments = (covRow.review_comments && typeof covRow.review_comments === "object")
        ? covRow.review_comments : {};
      setSaveState("loaded");
    } else {
      covStatus = "in_progress";
      setSaveState("newCov");
    }

    // Access rules (the precise read-only lock is derived per-status in
    // configureWorkspaceState()):
    //  • Assigned reader → edits while drafting; locked once submitted/approved.
    //  • Staff (admin/super_admin) → read-only view + review actions when submitted.
    //  • Approved coverage → the writer-visible report, viewable read-only by any.
    //  • Otherwise an unassigned non-staff reader has no access → block.
    isStaff = me.role === "admin" || me.role === "super_admin";
    isLead = me.role === "lead_reader";
    assignedToMe = subRes.data.assigned_to === me.id || subRes.data.co_reader_id === me.id;
    // Who may approve / bounce THIS coverage. Staff may review anything awaiting
    // review; a lead may review anyone's work but their own (they self-deliver
    // instead). Mirrors can_qa_review() + api/review-coverage.js, both of which
    // re-check independently — this only decides what the UI offers.
    canReview = (isStaff || (isLead && !assignedToMe)) && covStatus === "submitted";
    // A reader may open the script when it's theirs, still unclaimed, or — for a
    // lead — while they are quality-reviewing the coverage written against it.
    scriptReadable = isStaff || assignedToMe || !subRes.data.assigned_to || canReview;
    if (!assignedToMe && !isStaff && !canReview && covStatus !== "approved") {
      guardState(G.assignT, G.assignM, true);
      return;
    }
    // Reader identity is always anonymous — never expose the admin's real name.
    state.coverage.reader = "Scene One Reader";

    applyUILang(UILANG); // builds inputs, fills fields, renders the pulled panel
    enterApp();
  })();
})();
