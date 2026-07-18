/* ===========================================================
   Scene One — Admin panel
   Supabase Auth (email/password) · submissions inbox · claim/assign
   · super-admin management of admins.
   =========================================================== */
(function () {
  "use strict";

  var CFG = window.SCENEONE_SUPABASE || {};

  // ---- i18n ----
  var LANG_KEY = "sceneone-admin-lang";
  var ULANG = "ar";
  try { var stored = localStorage.getItem(LANG_KEY); if (stored === "ar" || stored === "en") ULANG = stored; } catch (e) {}

  var GENRES = {
    ar: { drama: "دراما", comedy: "كوميديا", thriller: "إثارة / تشويق", horror: "رعب", action: "أكشن", documentary: "وثائقي", other: "أخرى" },
    en: { drama: "Drama", comedy: "Comedy", thriller: "Thriller", horror: "Horror", action: "Action", documentary: "Documentary", other: "Other" }
  };
  var FILM = {
    ar: { feature: "روائي طويل", short: "قصير" },
    en: { feature: "Feature", short: "Short" }
  };
  var DRAFT = {
    ar: { first: "الأولى", revised: "مُنقّحة", final: "نهائية" },
    en: { first: "First", revised: "Revised", final: "Final" }
  };

  var T = {
    ar: {
      // static (data-i18n)
      loginTitle: "لوحة التحكم", loginSub: "تسجيل دخول المشرفين", fEmail: "البريد الإلكتروني",
      fPassword: "كلمة المرور", loginSubmit: "تسجيل الدخول",
      loginId: "الدخول", loginIdPh: "أدخل بريدك الإلكتروني", passwordPh: "أدخل كلمة المرور",
      rememberMe: "تذكّرني", footerRights: "جميع الحقوق محفوظة لـ Scene One © 2026",
      showPw: "إظهار كلمة المرور", hidePw: "إخفاء كلمة المرور",
      navSubmissions: "النصوص المقدَّمة", navAdmins: "إدارة المشرفين", logout: "تسجيل الخروج",
      navDelivered: "المُسلّمة مني", deliveredTitle: "المُسلّمة مني",
      deliveredSub: "النصوص التي راجعتها وأُرسل تقريرها إلى الكاتب",
      deliveredListTitle: "التقارير المُسلّمة", thDelivered: "تاريخ التسليم", thReport: "التقرير",
      delEmpty: "لم تُسلّم أي تقارير بعد.",
      monthFilter: "الشهر", allMonths: "كل الأشهر",
      delEmptyMonth: "لا توجد تقارير مُسلّمة في هذا الشهر.",
      navDeliveries: "التسليمات", deliveriesTitle: "التسليمات",
      deliveriesSub: "جميع التقارير المُرسلة إلى الكُتّاب", deliveriesListTitle: "التقارير المُسلّمة",
      thReader: "القارئ", deliveriesEmpty: "لا توجد تقارير مُسلّمة بعد.",
      subTitle: "النصوص المقدَّمة", subSub: "نظرة عامة على النصوص المُستلمة وحالة تقييمها", refresh: "تحديث",
      kpiTotal: "إجمالي النصوص", kpiPending: "بانتظار الإسناد", kpiReview: "قيد المراجعة", kpiDone: "مكتملة ومُقيَّمة",
      subListTitle: "قائمة النصوص", thDate: "التاريخ", thTitle: "العنوان", thWriter: "الكاتب", thEmail: "البريد الإلكتروني",
      thGenre: "التصنيف", thFilmType: "نوع الفيلم", thDraft: "المسودة", thPages: "الصفحات", thFile: "الملف", thAssignee: "المسند إليه",
      thAssignee2: "المُكلَّف",
      thDeadline: "الموعد النهائي",
      dueOver: "متأخّر", dueDone: "تم التسليم", dueToday: "ينتهي اليوم",
      dueDays: function (n) { return "متبقٍّ " + n + " يوم"; },
      thCoverage: "التقييم", subEmpty: "لا توجد نصوص مقدَّمة بعد.",
      adminsTitle: "المشرفون", thName: "الاسم", thRole: "الدور", createTitle: "إضافة مشرف جديد",
      thAccess: "الدخول (٣٠ يوم)", accessNone: "لا يوجد", accessIps: function (n) { return n + " عنوان IP"; },
      accessFlagTip: "عدد كبير من عناوين IP — قد يكون الحساب مُشاركًا", accessMore: "…والمزيد",
      fName: "الاسم", fRole: "الدور", roleAdmin: "مشرف", roleSuper: "مشرف أعلى", createBtn: "إنشاء المشرف",
      roleSeniorReader: "قارئ أول", roleJuniorReader: "قارئ مبتدئ", assignCo: "إضافة قارئ مشارك",
      assignTwice: "لا يمكنك إسناد نفسك مرتين",
      assignBlocked: "أكمل نصك الحالي وسلّم تقريره قبل إسناد نص جديد.",
      covLocked: "أسند نفسك أولاً", covDenied: "لا يمكنك عرض هذا التقييم إلا بعد إسناد نفسك للنص.",
      phName: "اسم المشرف", phPassword: "8 أحرف على الأقل",
      // dynamic
      signingIn: "جارٍ الدخول...", badLogin: "بيانات الدخول غير صحيحة.",
      notAdmin: "هذا الحساب ليس لديه صلاحية دخول لوحة التحكم.",
      loadFail: "تعذّر تحميل النصوص.", loadingSubs: "جارٍ تحميل النصوص…", download: "تحميل", assignMe: "أسند إليّ",
      adminFallback: "مشرف", cancel: "إلغاء", viewReport: "عرض التقرير", continueEval: "متابعة التقييم",
      inReview: "قيد التقييم", awaitingAssign: "بانتظار الإسناد",
      reviewCov: "مراجعة التغطية", awaitingApproval: "بانتظار الاعتماد", revisionCov: "مطلوب تعديل", reviseCov: "تعديل التغطية",
      kpiApproval: "بانتظار الاعتماد", openCov: "فتح",
      navAll: "جميع النصوص", allTitle: "جميع النصوص", allSub: "أرشيف كامل بكل تفاصيل النصوص المُستلمة",
      allListTitle: "جميع النصوص",
      kanUnassigned: "بانتظار الإسناد", kanReview: "قيد التقييم", kanApproval: "بانتظار الاعتماد",
      kanEmptyReview: "لا توجد تغطيات قيد الكتابة حاليًا.",
      kanEmptyApproval: "لا يوجد ما ينتظر اعتمادك.",
      fileLocked: "مقفل", fileLockedTip: "هذا النص مُسند إلى قارئ آخر.",
      navShow: "إظهار القائمة", navFold: "طيّ القائمة", themeToggle: "تبديل المظهر",
      startEval: "ابدأ التقييم", assignFail: "تعذّر تحديث الإسناد.", dlFail: "تعذّر إنشاء رابط التحميل.",
      del: "حذف", meParen: "(أنت)", confirmDel: function (n) { return "حذف المشرف " + n + "؟"; },
      creating: "جارٍ الإنشاء...", createOk: "تم إنشاء المشرف بنجاح.", createGenericErr: "تعذّر إنشاء المشرف",
      delGenericErr: "تعذّر الحذف"
    },
    en: {
      loginTitle: "Dashboard", loginSub: "Admin sign in", fEmail: "Email",
      fPassword: "Password", loginSubmit: "Sign in",
      loginId: "Login", loginIdPh: "Enter your email", passwordPh: "Enter password",
      rememberMe: "Remember me", footerRights: "All rights reserved · Scene One © 2026",
      showPw: "Show password", hidePw: "Hide password",
      navSubmissions: "Submissions", navAdmins: "Manage admins", logout: "Sign out",
      navDelivered: "Delivered by me", deliveredTitle: "Delivered by me",
      deliveredSub: "Scripts you reviewed whose report was sent to the writer",
      deliveredListTitle: "Delivered reports", thDelivered: "Delivered on", thReport: "Report",
      delEmpty: "You haven't delivered any reports yet.",
      monthFilter: "Month", allMonths: "All months",
      delEmptyMonth: "No reports were delivered in this month.",
      navDeliveries: "Deliveries", deliveriesTitle: "Deliveries",
      deliveriesSub: "All reports sent to writers", deliveriesListTitle: "Delivered reports",
      thReader: "Reader", deliveriesEmpty: "No reports delivered yet.",
      subTitle: "Submissions", subSub: "Overview of received scripts and their coverage status", refresh: "Refresh",
      kpiTotal: "Total scripts", kpiPending: "Awaiting assignment", kpiReview: "In review", kpiDone: "Completed & rated",
      subListTitle: "Scripts list", thDate: "Date", thTitle: "Title", thWriter: "Writer", thEmail: "Email",
      thGenre: "Genre", thFilmType: "Film type", thDraft: "Draft", thPages: "Pages", thFile: "File", thAssignee: "Assignee",
      thAssignee2: "Assignee",
      thDeadline: "Deadline",
      dueOver: "Overdue", dueDone: "Delivered", dueToday: "Due today",
      dueDays: function (n) { return n + (n === 1 ? " day left" : " days left"); },
      thCoverage: "Coverage", subEmpty: "No submissions yet.",
      adminsTitle: "Admins", thName: "Name", thRole: "Role", createTitle: "Add a new admin",
      thAccess: "Logins (30d)", accessNone: "None", accessIps: function (n) { return n + (n === 1 ? " IP" : " IPs"); },
      accessFlagTip: "Many distinct IPs — the account may be shared", accessMore: "…and more",
      fName: "Name", fRole: "Role", roleAdmin: "Admin", roleSuper: "Super admin", createBtn: "Create admin",
      roleSeniorReader: "Senior Reader", roleJuniorReader: "Junior Reader", assignCo: "Add co-reader",
      assignTwice: "You cannot assign yourself twice",
      assignBlocked: "Finish your current submission and deliver its report before taking a new one.",
      covLocked: "Assign yourself first", covDenied: "You can only view this coverage after assigning yourself to the script.",
      phName: "Admin name", phPassword: "At least 8 characters",
      signingIn: "Signing in...", badLogin: "Invalid login credentials.",
      notAdmin: "This account is not authorized to access the dashboard.",
      loadFail: "Failed to load submissions.", loadingSubs: "Loading submissions…", download: "Download", assignMe: "Assign to me",
      adminFallback: "Admin", cancel: "Unassign", viewReport: "View report", continueEval: "Continue coverage",
      inReview: "In review", awaitingAssign: "Awaiting assignment",
      reviewCov: "Review coverage", awaitingApproval: "Awaiting approval", revisionCov: "Revision requested", reviseCov: "Revise coverage",
      kpiApproval: "Awaiting approval", openCov: "Open",
      navAll: "All submissions", allTitle: "All submissions", allSub: "Full archive of every script received, with all details",
      allListTitle: "All submissions",
      kanUnassigned: "Awaiting assignment", kanReview: "In review", kanApproval: "Awaiting approval",
      kanEmptyReview: "No coverage is being written right now.",
      kanEmptyApproval: "Nothing is waiting for your approval.",
      fileLocked: "Locked", fileLockedTip: "Another reader is assigned to this script.",
      navShow: "Show menu", navFold: "Collapse menu", themeToggle: "Toggle theme",
      startEval: "Start coverage", assignFail: "Failed to update assignment.", dlFail: "Failed to create download link.",
      del: "Delete", meParen: "(you)", confirmDel: function (n) { return "Delete admin " + n + "?"; },
      creating: "Creating...", createOk: "Admin created successfully.", createGenericErr: "Failed to create admin",
      delGenericErr: "Failed to delete"
    }
  };
  function t(k) { return T[ULANG][k]; }
  function roleLabel(role) {
    if (role === "super_admin") return t("roleSuper");
    if (role === "senior_reader") return t("roleSeniorReader");
    if (role === "junior_reader") return t("roleJuniorReader");
    return t("roleAdmin");
  }

  if (!window.supabase || !CFG.url || !CFG.anonKey) {
    var showNotConfigured = function () {
      document.body.innerHTML =
        '<div style="font-family:Tajawal,sans-serif;padding:48px;text-align:center;color:#333" dir="rtl">' +
        "لم يتم إعداد Supabase بعد. أضف رابط المشروع والمفتاح العام في js/config.js.</div>";
    };
    // The script may load after DOMContentLoaded has already fired, in which
    // case the event never runs again — so render immediately if the DOM is ready.
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", showNotConfigured);
    } else {
      showNotConfigured();
    }
    return;
  }

  var sb = window.supabase.createClient(CFG.url, CFG.anonKey);

  // ---- element refs ----
  var $ = function (id) { return document.getElementById(id); };
  var loginView = $("adminLogin");
  var dashView = $("adminDash");
  var me = null; // { id, email, name, role }
  var adminsById = {};
  var adminRoleById = {};
  var currentRows = [];
  var currentCov = {};

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtDate(s) {
    try {
      var d = new Date(s);
      // Show date only. The full timestamp (incl. time) stays in created_at
      // in the database and can be retrieved when the exact hour is needed.
      return d.toLocaleDateString(ULANG, { year: "numeric", month: "short", day: "numeric" });
    } catch (e) { return s; }
  }
  // Every submission gets a 2-week window from the day it was submitted.
  // Deadline = created_at + the max turnaround for the script's type (matches the
  // landing page: features 15 days, shorts 10). Derived, never stored.
  function deadlineDays(filmType) { return filmType === "feature" ? 15 : 10; }
  function deadlineCell(createdAt, filmType, completed) {
    var due = new Date(createdAt);
    due.setDate(due.getDate() + deadlineDays(filmType));
    var dateStr = esc(fmtDate(due.toISOString()));
    var badge, cls;
    if (completed) {
      badge = t("dueDone"); cls = "adm-due--done";
    } else {
      // Whole days between today (midnight) and the due date (midnight).
      var d0 = new Date(); d0.setHours(0, 0, 0, 0);
      var d1 = new Date(due); d1.setHours(0, 0, 0, 0);
      var daysLeft = Math.round((d1 - d0) / 86400000);
      if (daysLeft < 0) { badge = t("dueOver"); cls = "adm-due--over"; }
      else if (daysLeft === 0) { badge = t("dueToday"); cls = "adm-due--soon"; }
      else { badge = t("dueDays")(daysLeft); cls = daysLeft <= 3 ? "adm-due--soon" : "adm-due--ok"; }
    }
    return "<td class='adm-due'>" + deadlineInner(dateStr, cls, badge) + "</td>";
  }
  function deadlineInner(dateStr, cls, badge) {
    return "<div>" + dateStr + "</div><span class='adm-due__badge " + cls + "'>" + esc(badge) + "</span>";
  }
  // The deadline badge markup (date + coloured days-left pill) without the <td>,
  // for use inside kanban cards. Mirrors deadlineCell's computation.
  function deadlineBadge(createdAt, filmType) {
    var due = new Date(createdAt); due.setDate(due.getDate() + deadlineDays(filmType));
    var d0 = new Date(); d0.setHours(0, 0, 0, 0);
    var d1 = new Date(due); d1.setHours(0, 0, 0, 0);
    var daysLeft = Math.round((d1 - d0) / 86400000), badge, cls;
    if (daysLeft < 0) { badge = t("dueOver"); cls = "adm-due--over"; }
    else if (daysLeft === 0) { badge = t("dueToday"); cls = "adm-due--soon"; }
    else { badge = t("dueDays")(daysLeft); cls = daysLeft <= 3 ? "adm-due--soon" : "adm-due--ok"; }
    return "<span class='adm-due'>" + deadlineInner(esc(fmtDate(due.toISOString())), cls, badge) + "</span>";
  }
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }

  // ---------- AUTH ----------
  async function loadMe() {
    var sess = await sb.auth.getSession();
    var user = sess.data.session && sess.data.session.user;
    if (!user) return null;
    var res = await sb.from("admins").select("id,email,name,role").eq("id", user.id).maybeSingle();
    if (res.error || !res.data) return null; // authenticated but not an admin
    return res.data;
  }

  async function boot() {
    // Never leave the page blank: if the initial auth/network call fails,
    // fall back to the login screen so the user can retry instead of staring
    // at an empty page.
    try {
      me = await loadMe();
    } catch (e) {
      console.error("[boot] session check failed", e);
      me = null;
    }
    if (me) {
      // Keep the boot loader up until the submissions have actually loaded, so a
      // refresh shows the Scene One loader (not a blank dashboard) until the
      // table is ready. enterDashboard hides admBoot once the first load settles.
      enterDashboard();
    } else {
      hide(dashView); show(loginView);
      hide($("admBoot"));
    }
  }

  function enterDashboard() {
    hide(loginView);
    show(dashView);
    $("admWho").textContent = me.name;
    $("admRole").textContent = roleLabel(me.role);
    var av = $("admAvatar"); if (av) av.textContent = (me.name || "?").trim().charAt(0) || "?";
    // Role-gated nav tabs: set explicitly (not just show) so a previous session's
    // state can't leak across a logout→login — e.g. a reader must never see "Manage
    // admins" (super-admin only), and only readers see "Delivered by me".
    $("adminsTabBtn").hidden = me.role !== "super_admin";
    // Staff (admin/super_admin) get the full-detail archive + deliveries tabs and a
    // kanban main board; readers keep the detailed table + their "Delivered by me".
    $("allTabBtn").hidden = !isStaff(me.role);
    $("deliveriesTabBtn").hidden = !isStaff(me.role);
    $("deliveredTabBtn").hidden = !isReader(me.role);
    // Main dashboard: kanban for staff, the detailed reader table otherwise.
    var staff = isStaff(me.role);
    $("kanbanBoard").hidden = !staff;
    $("subTableView").hidden = staff;
    logAccess();
    // Hide the boot loader only once the first submissions load settles (success
    // or failure), so the loader covers the empty-dashboard gap on refresh.
    loadSubmissions().finally(function () { hide($("admBoot")); });
    subscribeRealtime();
  }

  // Record this dashboard visit (the server captures the real IP) so a super-admin
  // can spot accounts used from many IPs. Fire-and-forget — never blocks the UI.
  async function logAccess() {
    try {
      var sess = await sb.auth.getSession();
      var token = sess.data.session && sess.data.session.access_token;
      if (!token) return;
      await fetch("/api/log-access", { method: "POST", headers: { Authorization: "Bearer " + token } });
    } catch (e) {}
  }

  // Live updates: refresh the board when submissions or coverages change, so a
  // new script appears the moment it's submitted — no manual refresh needed.
  // Debounced and silent (updates the table in place without a spinner flash).
  // Reload whichever secondary tab is currently open (delivery lists shift the
  // moment a report is sent, so they must stay in sync with the main board).
  function reloadOpenSecondaryTab() {
    if (!$("tab-admins").hidden) loadAdmins();
    if (!$("tab-all").hidden) loadAll();
    if (!$("tab-delivered").hidden) loadDelivered();
    if (!$("tab-deliveries").hidden) loadDeliveries();
  }
  var realtimeSub = null, reloadTimer = null;
  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(function () {
      if (me && !dashView.hidden) {
        loadSubmissions(true);
        reloadOpenSecondaryTab();
      }
    }, 400);
  }
  function subscribeRealtime() {
    if (realtimeSub) return; // subscribe once per session
    realtimeSub = sb.channel("dashboard-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "coverages" }, scheduleReload)
      .subscribe();
  }

  // Show / hide the password.
  var pwToggle = $("pwToggle");
  if (pwToggle) pwToggle.addEventListener("click", function () {
    var inp = $("loginPassword");
    var reveal = inp.type === "password";
    inp.type = reveal ? "text" : "password";
    this.classList.toggle("is-on", reveal);
    var label = reveal ? t("hidePw") : t("showPw");
    this.setAttribute("aria-label", label);
    this.setAttribute("title", label);
  });

  // "Remember me": prefill the last-used email on return.
  var REMEMBER_KEY = "sceneone-remember-email";
  (function initRemember() {
    try {
      var saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) { $("loginEmail").value = saved; $("rememberMe").checked = true; }
    } catch (e) {}
  })();

  // Login
  $("adminLoginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var err = $("loginError"); hide(err); err.textContent = "";
    var btn = $("loginBtn"); btn.disabled = true; btn.textContent = t("signingIn");
    var email = $("loginEmail").value.trim();
    var pass = $("loginPassword").value;
    var out = await sb.auth.signInWithPassword({ email: email, password: pass });
    if (out.error) {
      err.textContent = t("badLogin"); show(err);
    } else {
      me = await loadMe();
      if (!me) {
        await sb.auth.signOut();
        err.textContent = t("notAdmin"); show(err);
      } else {
        try {
          if ($("rememberMe").checked) localStorage.setItem(REMEMBER_KEY, email);
          else localStorage.removeItem(REMEMBER_KEY);
        } catch (e2) {}
        enterDashboard();
      }
    }
    btn.disabled = false; btn.textContent = t("loginSubmit");
  });

  // Logout
  $("logoutBtn").addEventListener("click", async function () {
    await sb.auth.signOut();
    me = null;
    hide(dashView); show(loginView);
    $("loginPassword").value = "";
  });

  // Month filter on the delivered reports — re-renders from memory, no refetch.
  var delMonthSel = $("delMonth");
  if (delMonthSel) delMonthSel.addEventListener("change", renderDelivered);

  // ---------- TABS ----------
  document.querySelectorAll(".adm-navitem").forEach(function (t) {
    t.addEventListener("click", function () {
      var name = t.getAttribute("data-tab");
      document.querySelectorAll(".adm-navitem").forEach(function (x) { x.classList.remove("is-active"); });
      t.classList.add("is-active");
      $("tab-submissions").hidden = name !== "submissions";
      $("tab-all").hidden = name !== "all";
      $("tab-delivered").hidden = name !== "delivered";
      $("tab-deliveries").hidden = name !== "deliveries";
      $("tab-admins").hidden = name !== "admins";
      if (name === "admins") loadAdmins();
      if (name === "all") loadAll();
      if (name === "delivered") loadDelivered();
      if (name === "deliveries") loadDeliveries();
    });
  });

  // ---------- SUBMISSIONS ----------
  // KPI tiles over the active pipeline (approved/delivered scripts have left the
  // list): total / pending (unassigned) / in review (assigned, still drafting or
  // in revision) / awaiting approval (submitted to the quality team).
  function updateKpis(rows, covBySub) {
    var total = rows.length, pending = 0, review = 0, done = 0;
    rows.forEach(function (s) {
      if (!s.assigned_to) { pending++; return; }
      if (covBySub[s.id] === "submitted") done++;
      else review++;
    });
    var pct = function (n) { return (total ? Math.round((n / total) * 100) : 0) + "%"; };
    $("kpiTotal").textContent = total;
    $("kpiPending").textContent = pending;
    $("kpiReview").textContent = review;
    $("kpiDone").textContent = done;
    $("kpiPendingPct").textContent = pct(pending);
    $("kpiReviewPct").textContent = pct(review);
    $("kpiDonePct").textContent = pct(done);
  }

  async function loadSubmissions(silent) {
    // Show a loading spinner and hide the table while the data is in flight.
    // Live (realtime) refreshes pass silent=true so the table updates in place
    // without a spinner flash.
    if (!silent) {
      show($("subLoading"));
      hide($("subEmpty"));
      $("subTable").hidden = true;
    }

    // Fetch admins (assignee names), submissions, and coverage statuses in
    // parallel — they don't depend on each other, so one round-trip's worth of
    // latency instead of three.
    var results = await Promise.all([
      sb.from("admins").select("id,name,role"),
      sb.from("submissions").select("*").order("created_at", { ascending: false }),
      sb.from("coverages").select("submission_id,status,delivered_at")
    ]);
    var ad = results[0], res = results[1], cov = results[2];

    if (!silent) { hide($("subLoading")); }
    $("subTable").hidden = false;

    adminsById = {};
    adminRoleById = {};
    (ad.data || []).forEach(function (a) { adminsById[a.id] = a.name; adminRoleById[a.id] = a.role; });

    var body = $("subBody");
    body.innerHTML = "";
    if (res.error) {
      $("subEmpty").textContent = t("loadFail"); show($("subEmpty"));
      return;
    }

    // Coverage statuses (keyed by submission id) drive the evaluation button label.
    var covBySub = {};
    var deliveredBySub = {};
    (cov.data || []).forEach(function (c) {
      covBySub[c.submission_id] = c.status;
      if (c.delivered_at) deliveredBySub[c.submission_id] = true;
    });
    // Delivered reports move to the Delivered/Deliveries tabs; the main list keeps
    // only the active pipeline (unassigned / in review / completed-but-not-sent).
    var rows = (res.data || []).filter(function (s) { return !deliveredBySub[s.id]; });
    currentRows = rows;
    currentCov = covBySub;
    updateKpis(rows, covBySub);

    // Staff see the segmented kanban board (no writer detail); readers get the table.
    if (isStaff(me && me.role)) { renderKanban(rows, covBySub); return; }

    $("subCount").textContent = rows.length;
    if (!rows.length) { show($("subEmpty")); return; }
    hide($("subEmpty"));

    rows.forEach(function (s) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + esc(fmtDate(s.created_at)) + "</td>" +
        deadlineCell(s.created_at, s.film_type, !!deliveredBySub[s.id]) +
        "<td><strong>" + esc(s.title_ar) + "</strong><br><span class='adm-muted' dir='ltr'>" + esc(s.title_en) + "</span></td>" +
        "<td>" + esc(s.writer) + "</td>" +
        "<td dir='ltr'>" + esc(s.email) + "</td>" +
        "<td>" + esc(GENRES[ULANG][s.genre] || s.genre) + "</td>" +
        "<td>" + esc(FILM[ULANG][s.film_type] || s.film_type) + "</td>" +
        "<td>" + esc(DRAFT[ULANG][s.draft] || s.draft) + "</td>" +
        "<td>" + esc(pagesCount(s)) + "</td>" +
        "<td class='adm-file'></td>" +
        "<td class='adm-assignee'></td>" +
        "<td class='adm-cov'></td>";
      // File cell. Scripts are IP-protected: a reader may only open one that is
      // unassigned (preview before claiming) or assigned to them. Staff see all.
      // Mirrors the Storage RLS policy — that policy is the real guard.
      var fileCell = tr.querySelector(".adm-file");
      if (s.file_path) {
        if (canReadScript(s)) {
          var a = document.createElement("button");
          a.className = "adm-link";
          a.textContent = t("download");
          a.addEventListener("click", function () { downloadFile(s.file_path, a); });
          fileCell.appendChild(a);
        } else {
          var lock = document.createElement("span");
          lock.className = "adm-muted";
          lock.textContent = t("fileLocked");
          lock.title = t("fileLockedTip");
          fileCell.appendChild(lock);
        }
      } else { fileCell.textContent = "—"; }
      // Assignee dropdown cell (tag with its submission so we can re-render the
      // whole column when my active-assignment state changes).
      var assigneeCell = tr.querySelector(".adm-assignee");
      assigneeCell.__sub = s;
      renderAssignee(assigneeCell, s);
      // Coverage cell
      renderCoverage(tr.querySelector(".adm-cov"), s, covBySub[s.id]);
      body.appendChild(tr);
    });
  }

  // Uploaded PDF page count minus the title page (em dash when unavailable),
  // matching the coverage panel's convention.
  function pagesCount(s) {
    if (!s.pages) return "—";
    return String(s.pages > 1 ? s.pages - 1 : s.pages);
  }

  // First (letter) of a name, upper-cased, for the avatar.
  function initial(name) {
    name = (name || "").trim();
    return name ? name.charAt(0).toUpperCase() : "؟";
  }
  // Deterministic, theme-friendly colour derived from a key (admin id).
  function avatarColor(key) {
    var h = 0; key = String(key || "");
    for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
    return "hsl(" + h + ", 42%, 46%)";
  }

  function isJunior(id) { return adminRoleById[id] === "junior_reader"; }
  function isReader(role) { return role === "senior_reader" || role === "junior_reader"; }
  function isStaff(role) { return role === "admin" || role === "super_admin"; }
  // Script files are IP-protected. Staff may open any; a reader may open one only
  // if it's unassigned (preview before claiming) or assigned to them. Mirrors the
  // Storage RLS policy "staff read all scripts, readers read unassigned or their own".
  function canReadScript(s) {
    if (!me) return false;
    if (isStaff(me.role)) return true;
    return !s.assigned_to || s.assigned_to === me.id || s.co_reader_id === me.id;
  }
  // True when the signed-in user is assigned to a submission (primary or co-reader).
  function amAssignedTo(s) { return !!me && (s.assigned_to === me.id || s.co_reader_id === me.id); }

  // One-active-assignment rule (readers only): true while I'm the PRIMARY assignee
  // of a submission I haven't handed off yet — no coverage, still drafting, or in
  // revision. A reader is freed the moment they submit for approval, so submitted/
  // approved don't count. Mirrors the DB trigger enforce_single_active_assignment();
  // the trigger is the real guard, this just disables the "+" so readers don't hit
  // an error.
  function readerHasActivePrimary() {
    if (!me || !isReader(me.role)) return false;
    return (currentRows || []).some(function (s) {
      if (s.assigned_to !== me.id) return false;
      var st = currentCov[s.id];
      return !st || st === "in_progress" || st === "revision_requested";
    });
  }

  // Re-render every assignee cell in place (no refetch) so the primary "+"
  // lock/unlock updates across all rows the moment my assignment state changes.
  function rerenderAssigneeCells() {
    document.querySelectorAll("#subBody .adm-assignee").forEach(function (cell) {
      if (cell.__sub) renderAssignee(cell, cell.__sub);
    });
  }

  // The circular "+" icon used to claim a slot (primary or co-reader).
  function addSlotBtn(cell, s, which) {
    var label = which === "co" ? t("assignCo") : t("assignMe");
    var add = document.createElement("button");
    add.className = "adm-av adm-av--add" + (which === "co" ? " adm-av--co" : "");
    add.title = label;
    add.setAttribute("aria-label", label);
    add.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M14 19a6 6 0 0 0-12 0"/><circle cx="8" cy="9" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>';
    add.addEventListener("click", function () {
      if (which === "co") assignCo(s.id, me.id, cell, s);
      else assign(s.id, me.id, cell, s);
    });
    return add;
  }

  // A filled avatar; clicking your own frees that slot.
  function slotAvatar(id, cell, s, which) {
    var name = adminsById[id] || t("adminFallback");
    var mine = id === (me && me.id);
    var av = document.createElement(mine ? "button" : "span");
    av.className = "adm-av" + (mine ? "" : " adm-av--static");
    av.style.background = avatarColor(id);
    av.textContent = initial(name);
    av.title = mine ? name + " " + t("meParen") : name;
    av.setAttribute("aria-label", av.title);
    if (mine) av.addEventListener("click", function () {
      if (which === "co") assignCo(s.id, null, cell, s);
      else assign(s.id, null, cell, s);
    });
    return av;
  }

  // Assignee cell: an empty "add me" icon when free; once taken it shows a
  // circular letter-avatar of the assignee. Clicking your own avatar frees it.
  // When the primary assignee is a junior reader, a second (co-reader) slot is
  // shown so another reader can join them — both names then appear as assignees.
  function renderAssignee(cell, s) {
    cell.innerHTML = "";
    var row = document.createElement("div");
    row.className = "adm-assignee__row";
    if (!s.assigned_to) {
      var addBtn = addSlotBtn(cell, s, "primary");
      // Reader already has an undelivered assignment → lock the claim button.
      if (readerHasActivePrimary()) {
        addBtn.disabled = true;
        addBtn.title = t("assignBlocked");
        addBtn.setAttribute("aria-label", t("assignBlocked"));
        addBtn.style.opacity = ".4";
        addBtn.style.cursor = "not-allowed";
      }
      row.appendChild(addBtn);
    } else {
      row.appendChild(slotAvatar(s.assigned_to, cell, s, "primary"));
      if (isJunior(s.assigned_to)) {
        row.appendChild(s.co_reader_id
          ? slotAvatar(s.co_reader_id, cell, s, "co")
          : addSlotBtn(cell, s, "co"));
      }
    }
    cell.appendChild(row);
  }

  // Coverage cell: links to the reader workspace, label follows its status.
  function renderCoverage(cell, s, status) {
    cell.innerHTML = "";
    var assigned = amAssignedTo(s);
    var reader = isReader(me && me.role);

    // Open the coverage page (editable for the assigned reader, read-only for
    // staff who aren't assigned — enforced inside coverage.js).
    function covLink(label, cls) {
      var link = document.createElement("a");
      link.className = cls;
      link.href = "coverage.html?id=" + encodeURIComponent(s.id);
      link.textContent = label;
      cell.appendChild(link);
    }
    // A disabled status button (no action) — e.g. a claimed/awaiting script.
    function covBtn(label, cls, title) {
      var btn = document.createElement("button");
      btn.className = cls; btn.disabled = true; if (title) btn.title = title;
      btn.textContent = label;
      cell.appendChild(btn);
    }

    var staff = isStaff(me && me.role);

    // Approved coverage → finished, writer-visible report (viewable by everyone).
    if (status === "approved") { covLink(t("viewReport"), "adm-link"); return; }

    var gold = "adm-link adm-link--gold";

    // Nobody has claimed the script yet → "Awaiting assignment" (disabled for
    // everyone; a reader must assign themselves before coverage can begin).
    if (!s.assigned_to) { covBtn(t("awaitingAssign"), gold); return; }

    // Submitted for approval → staff open it to review (Approve / Request Revision
    // inside the workspace); everyone else sees a disabled "Awaiting approval".
    if (status === "submitted") {
      if (staff) covLink(t("reviewCov"), gold);
      else covBtn(t("awaitingApproval"), gold);
      return;
    }

    // The script is mine to work on (primary assignee or co-reader).
    if (assigned) {
      if (status === "revision_requested") covLink(t("reviseCov"), gold);
      else covLink(status === "in_progress" ? t("continueEval") : t("startEval"), gold);
      return;
    }

    // Claimed by another reader. Staff can open a read-only copy; other readers
    // get a disabled status. Revision-requested shows its own label.
    var label = status === "revision_requested" ? t("revisionCov") : t("inReview");
    if (staff) covLink(label, gold);
    else covBtn(label, gold);
  }

  // Re-render the coverage cell in the same row so its locked/unlocked state
  // tracks assignment changes live (e.g. a reader claiming/freeing a script).
  function refreshCoverageCell(assigneeCell, s) {
    var tr = assigneeCell.closest ? assigneeCell.closest("tr") : null;
    var covCell = tr ? tr.querySelector(".adm-cov") : null;
    if (covCell) renderCoverage(covCell, s, currentCov[s.id]);
  }

  async function assign(id, toId, cell, s) {
    if (cell.dataset.busy) return; // ignore clicks while a request is in flight
    cell.dataset.busy = "1";
    var prev = s.assigned_to;
    var prevCo = s.co_reader_id;
    // Optimistic: reflect the new state immediately so the click feels instant.
    s.assigned_to = toId;
    // A co-reader only makes sense under a junior primary — drop it otherwise.
    var update = { assigned_to: toId };
    if ((!toId || !isJunior(toId)) && s.co_reader_id) {
      s.co_reader_id = null;
      update.co_reader_id = null;
    }
    renderAssignee(cell, s);
    refreshCoverageCell(cell, s);
    cell.style.opacity = ".6";
    updateKpis(currentRows, currentCov);

    var res = await sb.from("submissions").update(update).eq("id", id);

    cell.style.opacity = "1";
    delete cell.dataset.busy;
    if (res.error) { // roll back to the previous assignees on failure
      s.assigned_to = prev;
      s.co_reader_id = prevCo;
      renderAssignee(cell, s);
      refreshCoverageCell(cell, s);
      updateKpis(currentRows, currentCov);
      // The DB trigger blocks a reader from taking a second active assignment.
      var blocked = /READER_HAS_ACTIVE_ASSIGNMENT/.test(res.error.message || "");
      alert(blocked ? t("assignBlocked") : t("assignFail"));
    } else if (isReader(me && me.role) && (toId === me.id || prev === me.id)) {
      // My active-assignment state changed → re-render so every other row's "+"
      // reflects the new locked/unlocked state without waiting for a refetch.
      rerenderAssigneeCells();
    }
  }

  // Claim/free the co-reader slot (only shown under a junior primary assignee).
  async function assignCo(id, toId, cell, s) {
    // The primary reader can't also take the co-reader slot.
    if (toId && toId === s.assigned_to) { alert(t("assignTwice")); return; }
    if (cell.dataset.busy) return;
    cell.dataset.busy = "1";
    var prev = s.co_reader_id;
    s.co_reader_id = toId;
    renderAssignee(cell, s);
    refreshCoverageCell(cell, s);
    cell.style.opacity = ".6";

    var res = await sb.from("submissions").update({ co_reader_id: toId }).eq("id", id);

    cell.style.opacity = "1";
    delete cell.dataset.busy;
    if (res.error) {
      s.co_reader_id = prev;
      renderAssignee(cell, s);
      refreshCoverageCell(cell, s);
      alert(t("assignFail"));
    }
  }

  async function downloadFile(path, btn) {
    var old = btn.textContent; btn.textContent = "..."; btn.disabled = true;
    var res = await sb.storage.from(CFG.bucket).createSignedUrl(path, 120);
    btn.textContent = old; btn.disabled = false;
    if (res.error || !res.data) {
      console.error("[download] createSignedUrl failed for path:", path, res.error);
      alert(t("dlFail"));
      return;
    }
    window.open(res.data.signedUrl, "_blank");
  }

  $("refreshBtn").addEventListener("click", loadSubmissions);

  // ---------- STAFF KANBAN (admin / super_admin main dashboard) ----------
  // Read-only assignee avatar (no claim button — staff don't assign).
  function roAvatar(id) {
    var name = adminsById[id] || t("adminFallback");
    var av = document.createElement("span");
    av.className = "adm-av adm-av--static";
    av.style.background = avatarColor(id);
    av.textContent = initial(name);
    av.title = name; av.setAttribute("aria-label", name);
    return av;
  }

  function kanCard(s, st, bucket) {
    var card = document.createElement("div"); card.className = "adm-card";
    var title = document.createElement("div"); title.className = "adm-card__title";
    title.innerHTML = "<strong>" + esc(s.title_ar || t("untitled")) + "</strong>" +
      (s.title_en ? "<span class='en'>" + esc(s.title_en) + "</span>" : "");
    card.appendChild(title);

    var row = document.createElement("div"); row.className = "adm-card__row";
    var dl = document.createElement("span"); dl.innerHTML = deadlineBadge(s.created_at, s.film_type);
    row.appendChild(dl);
    if (s.assigned_to) {
      var avs = document.createElement("span"); avs.className = "adm-card__avatars";
      avs.appendChild(roAvatar(s.assigned_to));
      if (s.co_reader_id) avs.appendChild(roAvatar(s.co_reader_id));
      row.appendChild(avs);
    }
    card.appendChild(row);

    // Action: staff review a submitted coverage; open (read-only) one in review.
    if (bucket === "app") {
      var a = document.createElement("a"); a.className = "adm-link adm-link--gold";
      a.href = "coverage.html?id=" + encodeURIComponent(s.id); a.textContent = t("reviewCov");
      card.appendChild(a);
    } else if (bucket === "rev") {
      var o = document.createElement("a"); o.className = "adm-link";
      o.href = "coverage.html?id=" + encodeURIComponent(s.id);
      o.textContent = st === "revision_requested" ? t("revisionCov") : t("openCov");
      card.appendChild(o);
    }
    return card;
  }

  // Unassigned scripts are deliberately NOT a board column: staff don't claim
  // scripts (readers self-assign), so there's no action for them there. The count
  // still shows in the "Awaiting assignment" KPI tile above.
  function renderKanban(rows, covBySub) {
    var rev = $("kanReview"), app = $("kanApproval");
    rev.innerHTML = ""; app.innerHTML = "";
    var cr = 0, ca = 0;
    rows.forEach(function (s) {
      if (!s.assigned_to) return; // counted in the KPI tile only
      var st = covBySub[s.id];
      if (st === "submitted") { app.appendChild(kanCard(s, st, "app")); ca++; }
      else { rev.appendChild(kanCard(s, st, "rev")); cr++; }
    });
    $("kanReviewCount").textContent = cr;
    $("kanApprovalCount").textContent = ca;
    // Empty columns get a plain-language line, not a bare dash.
    [[rev, cr, "kanEmptyReview"], [app, ca, "kanEmptyApproval"]].forEach(function (p) {
      if (!p[1]) { var d = document.createElement("div"); d.className = "adm-kancol__empty"; d.textContent = t(p[2]); p[0].appendChild(d); }
    });
  }

  // ---------- DETAIL TABLE (All submissions + Deliveries tabs) ----------
  // Full submission detail; the coverage column links to the report the writer
  // sees once approved, otherwise shows the status label. `readerName` maps a
  // submission id → the reviewing reader's name (used by the Deliveries tab).
  function renderDetailRows(bodyEl, rows, covBySub, deliveredBySub, readerNameCol) {
    bodyEl.innerHTML = "";
    rows.forEach(function (s) {
      var st = covBySub[s.id];
      var delivered = !!deliveredBySub[s.id];
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + esc(fmtDate(s.created_at)) + "</td>" +
        deadlineCell(s.created_at, s.film_type, delivered) +
        "<td><strong>" + esc(s.title_ar) + "</strong><br><span class='adm-muted' dir='ltr'>" + esc(s.title_en) + "</span></td>" +
        "<td>" + esc(s.writer) + "</td>" +
        "<td dir='ltr'>" + esc(s.email) + "</td>" +
        "<td>" + esc(GENRES[ULANG][s.genre] || s.genre) + "</td>" +
        "<td>" + esc(FILM[ULANG][s.film_type] || s.film_type) + "</td>" +
        "<td>" + esc(DRAFT[ULANG][s.draft] || s.draft) + "</td>" +
        "<td>" + esc(pagesCount(s)) + "</td>" +
        "<td class='adm-file'></td>" +
        (readerNameCol ? "<td>" + esc(readerNameCol[s.id] || "—") + "</td>" : "<td class='adm-assignee2'>" + esc(adminsById[s.assigned_to] || "—") + "</td>") +
        "<td class='adm-cov'></td>";
      var fileCell = tr.querySelector(".adm-file");
      if (s.file_path) {
        if (canReadScript(s)) {
          var b = document.createElement("button");
          b.className = "adm-link"; b.textContent = t("download");
          b.addEventListener("click", function () { downloadFile(s.file_path, b); });
          fileCell.appendChild(b);
        } else {
          var lk = document.createElement("span");
          lk.className = "adm-muted"; lk.textContent = t("fileLocked"); lk.title = t("fileLockedTip");
          fileCell.appendChild(lk);
        }
      } else { fileCell.textContent = "—"; }
      // Coverage: an approved report is viewable; otherwise show the status label.
      var covCell = tr.querySelector(".adm-cov");
      if (st === "approved" || delivered) {
        var link = document.createElement("a");
        link.className = "adm-link"; link.href = "report.html?t=" + encodeURIComponent(s.report_token);
        link.target = "_blank"; link.rel = "noopener"; link.textContent = t("viewReport");
        covCell.appendChild(link);
      } else {
        covCell.textContent = !s.assigned_to ? t("awaitingAssign")
          : st === "submitted" ? t("awaitingApproval")
          : st === "revision_requested" ? t("revisionCov")
          : t("inReview");
        covCell.className += " adm-muted";
      }
      bodyEl.appendChild(tr);
    });
  }

  // ---------- ALL SUBMISSIONS (staff) ----------
  async function loadAll() {
    var results = await Promise.all([
      sb.from("submissions").select("*").order("created_at", { ascending: false }),
      sb.from("coverages").select("submission_id,status,delivered_at")
    ]);
    var subs = (results[0].data) || [];
    var covBySub = {}, deliveredBySub = {};
    ((results[1].data) || []).forEach(function (c) {
      covBySub[c.submission_id] = c.status;
      if (c.delivered_at) deliveredBySub[c.submission_id] = true;
    });
    $("allCount").textContent = subs.length;
    if (!subs.length) { show($("allEmpty")); $("allBody").innerHTML = ""; return; }
    hide($("allEmpty"));
    renderDetailRows($("allBody"), subs, covBySub, deliveredBySub, null);
  }

  // ---------- DELIVERED BY ME (readers) ----------
  // Scripts this reader worked on (primary or co-reader) whose report was sent to
  // the writer (coverages.delivered_at set by /api/send-report).
  // Delivered reports, newest first, grouped by the month they were delivered so
  // a reader can see their output month by month. Kept in memory so the month
  // filter re-renders without refetching.
  var deliveredRows = [];

  function monthKey(iso) {
    var d = new Date(iso);
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2);
  }
  function fmtMonth(iso) {
    try { return new Date(iso).toLocaleDateString(ULANG, { year: "numeric", month: "long" }); }
    catch (e) { return iso; }
  }

  async function loadDelivered() {
    var results = await Promise.all([
      sb.from("submissions").select("*").order("created_at", { ascending: false }),
      sb.from("coverages").select("submission_id,delivered_at")
    ]);
    var subs = (results[0].data) || [];
    var deliveredOn = {};
    ((results[1].data) || []).forEach(function (c) { if (c.delivered_at) deliveredOn[c.submission_id] = c.delivered_at; });

    deliveredRows = subs
      .filter(function (s) {
        return deliveredOn[s.id] && (s.assigned_to === me.id || s.co_reader_id === me.id);
      })
      .map(function (s) { return { s: s, at: deliveredOn[s.id] }; })
      // A deliveries list reads by delivery date, not submission date.
      .sort(function (a, b) { return new Date(b.at) - new Date(a.at); });

    buildMonthFilter();
    renderDelivered();
  }

  // Options are derived from the months actually present, newest first.
  function buildMonthFilter() {
    var sel = $("delMonth"); if (!sel) return;
    var prev = sel.value, seen = {}, opts = [];
    deliveredRows.forEach(function (r) {
      var k = monthKey(r.at);
      if (!seen[k]) { seen[k] = true; opts.push({ k: k, label: fmtMonth(r.at) }); }
    });
    sel.innerHTML = '<option value="">' + esc(t("allMonths")) + "</option>" +
      opts.map(function (o) { return '<option value="' + esc(o.k) + '">' + esc(o.label) + "</option>"; }).join("");
    if (prev && seen[prev]) sel.value = prev; // keep the choice across refreshes
    var wrap = sel.closest ? sel.closest(".adm-monthfilter") : null;
    if (wrap) wrap.hidden = !deliveredRows.length;
  }

  function renderDelivered() {
    var sel = $("delMonth");
    var pick = sel ? sel.value : "";
    var rows = pick ? deliveredRows.filter(function (r) { return monthKey(r.at) === pick; }) : deliveredRows;

    var body = $("delBody");
    body.innerHTML = "";
    $("delCount").textContent = rows.length;
    if (!rows.length) {
      var empty = $("delEmpty");
      empty.textContent = pick ? t("delEmptyMonth") : t("delEmpty");
      show(empty);
      return;
    }
    hide($("delEmpty"));

    // Count per month so each group header can show its own total.
    var perMonth = {};
    rows.forEach(function (r) { var k = monthKey(r.at); perMonth[k] = (perMonth[k] || 0) + 1; });

    var lastMonth = "";
    rows.forEach(function (r) {
      var s = r.s, k = monthKey(r.at);
      if (k !== lastMonth) {
        lastMonth = k;
        var hdr = document.createElement("tr");
        hdr.className = "adm-monthrow";
        hdr.innerHTML = '<td colspan="6">' + esc(fmtMonth(r.at)) +
          ' <span class="adm-count">' + perMonth[k] + "</span></td>";
        body.appendChild(hdr);
      }
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + esc(fmtDate(s.created_at)) + "</td>" +
        "<td><strong>" + esc(s.title_ar) + "</strong><br><span class='adm-muted' dir='ltr'>" + esc(s.title_en) + "</span></td>" +
        "<td>" + esc(s.writer) + "</td>" +
        "<td dir='ltr'>" + esc(s.email) + "</td>" +
        "<td>" + esc(fmtDate(r.at)) + "</td>" +
        "<td class='adm-report'></td>";
      // Open the exact report the writer received (hosted, read-only), not the
      // editable workspace.
      var link = document.createElement("a");
      link.className = "adm-link";
      link.href = "report.html?t=" + encodeURIComponent(s.report_token);
      link.target = "_blank"; link.rel = "noopener";
      link.textContent = t("viewReport");
      tr.querySelector(".adm-report").appendChild(link);
      body.appendChild(tr);
    });
  }

  // ---------- DELIVERIES OVERSIGHT (super admin) ----------
  // Every delivered report across all readers, newest first, with the reviewing
  // reader — so a super-admin can oversee deliveries.
  async function loadDeliveries() {
    var results = await Promise.all([
      sb.from("submissions").select("*").order("created_at", { ascending: false }),
      sb.from("coverages").select("submission_id,delivered_at,delivered_by"),
      sb.from("admins").select("id,name")
    ]);
    var subs = (results[0].data) || [];
    var nameById = {};
    ((results[2].data) || []).forEach(function (a) { nameById[a.id] = a.name; });
    var deliveredOn = {}, deliveredBy = {};
    ((results[1].data) || []).forEach(function (c) {
      if (c.delivered_at) { deliveredOn[c.submission_id] = c.delivered_at; deliveredBy[c.submission_id] = c.delivered_by; }
    });

    var rows = subs.filter(function (s) { return deliveredOn[s.id]; });
    rows.sort(function (a, b) { return deliveredOn[b.id] < deliveredOn[a.id] ? -1 : 1; }); // newest delivery first

    $("dlvCount").textContent = rows.length;
    if (!rows.length) { show($("dlvEmpty")); $("dlvBody").innerHTML = ""; return; }
    hide($("dlvEmpty"));

    // Full submission detail; the "Reader" column is the reviewing reader, and
    // the coverage column links to the delivered report.
    var covBySub = {}, deliveredBySub = {}, readerBySub = {};
    rows.forEach(function (s) {
      covBySub[s.id] = "approved";
      deliveredBySub[s.id] = true;
      readerBySub[s.id] = nameById[s.assigned_to] || nameById[deliveredBy[s.id]] || "—";
    });
    renderDetailRows($("dlvBody"), rows, covBySub, deliveredBySub, readerBySub);
  }

  // ---------- ADMINS (super admin) ----------
  var IP_FLAG_THRESHOLD = 4;   // distinct IPs (last 30 days) that flags a possibly-shared account
  var ACCESS_WINDOW_DAYS = 30;

  // Aggregate the access log by admin: distinct IPs + most-recent visits (last 30 days).
  function summarizeAccess(rows) {
    var by = {};
    (rows || []).forEach(function (r) {
      var m = by[r.admin_id] || (by[r.admin_id] = { ips: {}, recent: [] });
      if (r.ip) m.ips[r.ip] = true;
      if (m.recent.length < 8) m.recent.push(r); // rows arrive newest-first
    });
    return by;
  }

  // The per-admin "Logins (30d)" cell: distinct-IP count + last visit, with a
  // warning when an account has logged in from many IPs (possible sharing).
  function accessCell(info) {
    if (!info || !info.recent.length) return "<span class='adm-muted'>" + esc(t("accessNone")) + "</span>";
    var n = Object.keys(info.ips).length;
    var flagged = n >= IP_FLAG_THRESHOLD;
    var tip = info.recent.map(function (r) { return (r.ip || "?") + " · " + fmtDate(r.created_at); }).join("\n");
    if (flagged) tip = t("accessFlagTip") + "\n\n" + tip;
    var count = "<span class='adm-ipcount" + (flagged ? " adm-ipcount--flag" : "") + "'>" +
      (flagged ? "⚠ " : "") + esc(t("accessIps")(n)) + "</span>";
    var last = "<span class='adm-muted' style='display:block;font-size:11.5px;margin-top:3px'>" +
      esc(fmtDate(info.recent[0].created_at)) + "</span>";
    return "<div title=\"" + esc(tip) + "\">" + count + last + "</div>";
  }

  async function loadAdmins() {
    var since = new Date(Date.now() - ACCESS_WINDOW_DAYS * 86400000).toISOString();
    var results = await Promise.all([
      sb.from("admins").select("id,email,name,role").order("created_at", { ascending: true }),
      sb.from("access_log").select("admin_id,ip,created_at").gte("created_at", since).order("created_at", { ascending: false })
    ]);
    var res = results[0];
    var access = summarizeAccess(results[1].data);
    var body = $("adminsBody");
    body.innerHTML = "";
    (res.data || []).forEach(function (a) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + esc(a.name) + "</td>" +
        "<td dir='ltr'>" + esc(a.email) + "</td>" +
        "<td>" + esc(roleLabel(a.role)) + "</td>" +
        "<td dir='ltr'>" + accessCell(access[a.id]) + "</td>" +
        "<td class='adm-del'></td>";
      var cell = tr.querySelector(".adm-del");
      if (a.id !== me.id) {
        var del = document.createElement("button");
        del.className = "adm-link adm-link--danger";
        del.textContent = t("del");
        del.addEventListener("click", function () { removeAdmin(a, del); });
        cell.appendChild(del);
      } else {
        cell.innerHTML = "<span class='adm-muted'>" + esc(t("meParen")) + "</span>";
      }
      body.appendChild(tr);
    });
  }

  async function authHeader() {
    var sess = await sb.auth.getSession();
    var token = sess.data.session && sess.data.session.access_token;
    return { "Content-Type": "application/json", Authorization: "Bearer " + token };
  }

  $("createAdminForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var err = $("createError"); var ok = $("createSuccess");
    hide(err); hide(ok);
    var btn = $("createBtn"); btn.disabled = true; btn.textContent = t("creating");
    var payload = {
      name: $("newName").value.trim(),
      email: $("newEmail").value.trim(),
      password: $("newPassword").value,
      role: $("newRole").value
    };
    try {
      var resp = await fetch("/api/admin/admins", {
        method: "POST", headers: await authHeader(), body: JSON.stringify(payload)
      });
      var data = await resp.json().catch(function () { return {}; });
      if (!resp.ok) throw new Error(data.message || t("createGenericErr"));
      ok.textContent = t("createOk"); show(ok);
      $("createAdminForm").reset();
      loadAdmins();
    } catch (ex) {
      err.textContent = ex.message; show(err);
    }
    btn.disabled = false; btn.textContent = t("createBtn");
  });

  async function removeAdmin(a, btn) {
    if (!confirm(t("confirmDel")(a.name))) return;
    btn.disabled = true; btn.textContent = "...";
    try {
      var resp = await fetch("/api/admin/admins?id=" + encodeURIComponent(a.id), {
        method: "DELETE", headers: await authHeader()
      });
      var data = await resp.json().catch(function () { return {}; });
      if (!resp.ok) throw new Error(data.message || t("delGenericErr"));
      loadAdmins();
    } catch (ex) {
      alert(ex.message); btn.disabled = false; btn.textContent = t("del");
    }
  }

  // ---------- NAV ----------
  // The sidebar is always shown; make sure no stale collapsed state lingers.
  (function initNav() {
    var admEl = document.querySelector(".adm");
    if (admEl) admEl.classList.remove("is-nav-collapsed");
  })();

  // ---------- LANGUAGE ----------
  function applyLang(lang) {
    ULANG = (lang === "en") ? "en" : "ar";
    try { localStorage.setItem(LANG_KEY, ULANG); } catch (e) {}
    var dict = T[ULANG];
    document.documentElement.setAttribute("lang", ULANG);
    document.documentElement.setAttribute("dir", ULANG === "ar" ? "rtl" : "ltr");
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n"); if (dict[k] != null) el.textContent = dict[k];
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-ph"); if (dict[k] != null) el.setAttribute("placeholder", dict[k]);
    });
    // Tooltips / aria-labels on icon-only buttons (fold, theme, …).
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-title");
      if (dict[k] != null) { el.setAttribute("title", dict[k]); el.setAttribute("aria-label", dict[k]); }
    });
    document.querySelectorAll(".adm-lang button").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-l") === ULANG);
    });
    // dynamic chrome + tables
    if (me) {
      $("admRole").textContent = roleLabel(me.role);
      loadSubmissions();
      reloadOpenSecondaryTab();
    }
  }

  // Refresh the board when the dashboard regains focus — e.g. coming back from
  // the coverage workspace — so coverage statuses (Start → Continue → View
  // report) reflect any writing done there without a manual reload.
  function refreshOnReturn() {
    if (!me || dashView.hidden) return;
    loadSubmissions();
    reloadOpenSecondaryTab();
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") refreshOnReturn();
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted) refreshOnReturn(); });
  document.querySelectorAll(".adm-lang button").forEach(function (b) {
    b.addEventListener("click", function () { applyLang(b.getAttribute("data-l")); });
  });

  // ---------- START ----------
  applyLang(ULANG);
  boot();
})();
