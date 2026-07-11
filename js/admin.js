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
      fName: "الاسم", fRole: "الدور", roleAdmin: "مشرف", roleSuper: "مشرف أعلى", createBtn: "إنشاء المشرف",
      roleSeniorReader: "قارئ أول", roleJuniorReader: "قارئ مبتدئ", assignCo: "إضافة قارئ مشارك",
      assignTwice: "لا يمكنك إسناد نفسك مرتين",
      covLocked: "أسند نفسك أولاً", covDenied: "لا يمكنك عرض هذا التقييم إلا بعد إسناد نفسك للنص.",
      phName: "اسم المشرف", phPassword: "8 أحرف على الأقل",
      // dynamic
      signingIn: "جارٍ الدخول...", badLogin: "بيانات الدخول غير صحيحة.",
      notAdmin: "هذا الحساب ليس لديه صلاحية دخول لوحة التحكم.",
      loadFail: "تعذّر تحميل النصوص.", loadingSubs: "جارٍ تحميل النصوص…", download: "تحميل", assignMe: "أسند إليّ",
      adminFallback: "مشرف", cancel: "إلغاء", viewReport: "عرض التقرير", continueEval: "متابعة التقييم",
      inReview: "قيد التقييم", awaitingAssign: "بانتظار الإسناد",
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
      fName: "Name", fRole: "Role", roleAdmin: "Admin", roleSuper: "Super admin", createBtn: "Create admin",
      roleSeniorReader: "Senior Reader", roleJuniorReader: "Junior Reader", assignCo: "Add co-reader",
      assignTwice: "You cannot assign yourself twice",
      covLocked: "Assign yourself first", covDenied: "You can only view this coverage after assigning yourself to the script.",
      phName: "Admin name", phPassword: "At least 8 characters",
      signingIn: "Signing in...", badLogin: "Invalid login credentials.",
      notAdmin: "This account is not authorized to access the dashboard.",
      loadFail: "Failed to load submissions.", loadingSubs: "Loading submissions…", download: "Download", assignMe: "Assign to me",
      adminFallback: "Admin", cancel: "Unassign", viewReport: "View report", continueEval: "Continue coverage",
      inReview: "In review", awaitingAssign: "Awaiting assignment",
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
  var DEADLINE_DAYS = 14;
  function deadlineCell(createdAt, completed) {
    var due = new Date(createdAt);
    due.setDate(due.getDate() + DEADLINE_DAYS);
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
    return "<td class='adm-due'><div>" + dateStr + "</div>" +
      "<span class='adm-due__badge " + cls + "'>" + esc(badge) + "</span></td>";
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
    if (me) enterDashboard();
    else { hide(dashView); show(loginView); }
  }

  function enterDashboard() {
    hide(loginView);
    show(dashView);
    $("admWho").textContent = me.name;
    $("admRole").textContent = roleLabel(me.role);
    var av = $("admAvatar"); if (av) av.textContent = (me.name || "?").trim().charAt(0) || "?";
    if (me.role === "super_admin") { show($("adminsTabBtn")); }
    loadSubmissions();
    subscribeRealtime();
  }

  // Live updates: refresh the board when submissions or coverages change, so a
  // new script appears the moment it's submitted — no manual refresh needed.
  // Debounced and silent (updates the table in place without a spinner flash).
  var realtimeSub = null, reloadTimer = null;
  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(function () {
      if (me && !dashView.hidden) {
        loadSubmissions(true);
        if (!$("tab-admins").hidden) loadAdmins();
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

  // ---------- TABS ----------
  document.querySelectorAll(".adm-navitem").forEach(function (t) {
    t.addEventListener("click", function () {
      var name = t.getAttribute("data-tab");
      document.querySelectorAll(".adm-navitem").forEach(function (x) { x.classList.remove("is-active"); });
      t.classList.add("is-active");
      $("tab-submissions").hidden = name !== "submissions";
      $("tab-admins").hidden = name !== "admins";
      if (name === "admins") loadAdmins();
    });
  });

  // ---------- SUBMISSIONS ----------
  // KPI tiles: total / pending (unassigned) / in review (assigned, not done) / completed.
  function updateKpis(rows, covBySub) {
    var total = rows.length, pending = 0, review = 0, done = 0;
    rows.forEach(function (s) {
      if (covBySub[s.id] === "completed") done++;
      else if (s.assigned_to) review++;
      if (!s.assigned_to) pending++;
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
      sb.from("coverages").select("submission_id,status")
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
    (cov.data || []).forEach(function (c) { covBySub[c.submission_id] = c.status; });
    var rows = res.data || [];
    currentRows = rows;
    currentCov = covBySub;
    updateKpis(rows, covBySub);
    $("subCount").textContent = rows.length;
    if (!rows.length) { show($("subEmpty")); return; }
    hide($("subEmpty"));

    rows.forEach(function (s) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + esc(fmtDate(s.created_at)) + "</td>" +
        deadlineCell(s.created_at, covBySub[s.id] === "completed") +
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
      // File cell
      var fileCell = tr.querySelector(".adm-file");
      if (s.file_path) {
        var a = document.createElement("button");
        a.className = "adm-link";
        a.textContent = t("download");
        a.addEventListener("click", function () { downloadFile(s.file_path, a); });
        fileCell.appendChild(a);
      } else { fileCell.textContent = "—"; }
      // Assignee dropdown cell
      renderAssignee(tr.querySelector(".adm-assignee"), s);
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
  // True when the signed-in user is assigned to a submission (primary or co-reader).
  function amAssignedTo(s) { return !!me && (s.assigned_to === me.id || s.co_reader_id === me.id); }

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
      row.appendChild(addSlotBtn(cell, s, "primary"));
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

    // Completed coverage → finished report, viewable by everyone.
    if (status === "completed") { covLink(t("viewReport"), "adm-link"); return; }

    var gold = "adm-link adm-link--gold";

    // Nobody has claimed the script yet → "Awaiting assignment" (disabled for
    // everyone; a reader must assign themselves before coverage can begin).
    if (!s.assigned_to) { covBtn(t("awaitingAssign"), gold); return; }

    // The script is mine to work on (I'm the primary assignee or co-reader):
    // "Start coverage" until I begin writing, then "Continue coverage".
    if (assigned) {
      covLink(status === "in_progress" ? t("continueEval") : t("startEval"), gold);
      return;
    }

    // Claimed by another reader → "In review" for everyone else. Staff can open
    // a read-only copy; other readers get a disabled button.
    if (reader) covBtn(t("inReview"), gold);
    else covLink(t("inReview"), gold);
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
      alert(t("assignFail"));
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

  // ---------- ADMINS (super admin) ----------
  async function loadAdmins() {
    var res = await sb.from("admins").select("id,email,name,role").order("created_at", { ascending: true });
    var body = $("adminsBody");
    body.innerHTML = "";
    (res.data || []).forEach(function (a) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + esc(a.name) + "</td>" +
        "<td dir='ltr'>" + esc(a.email) + "</td>" +
        "<td>" + esc(roleLabel(a.role)) + "</td>" +
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
      if (!$("tab-admins").hidden) loadAdmins();
    }
  }

  // Refresh the board when the dashboard regains focus — e.g. coming back from
  // the coverage workspace — so coverage statuses (Start → Continue → View
  // report) reflect any writing done there without a manual reload.
  function refreshOnReturn() {
    if (!me || dashView.hidden) return;
    loadSubmissions();
    if (!$("tab-admins").hidden) loadAdmins();
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
