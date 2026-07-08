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
      navSubmissions: "النصوص المقدَّمة", navAdmins: "إدارة المشرفين", logout: "تسجيل الخروج",
      subTitle: "النصوص المقدَّمة", subSub: "نظرة عامة على النصوص المُستلمة وحالة تقييمها", refresh: "تحديث",
      kpiTotal: "إجمالي النصوص", kpiPending: "بانتظار الإسناد", kpiReview: "قيد المراجعة", kpiDone: "مكتملة ومُقيَّمة",
      subListTitle: "قائمة النصوص", thDate: "التاريخ", thTitle: "العنوان", thWriter: "الكاتب", thEmail: "البريد",
      thGenre: "التصنيف", thFilmType: "نوع الفيلم", thDraft: "المسودة", thFile: "الملف", thAssignee: "المسند إليه",
      thCoverage: "التقييم", subEmpty: "لا توجد نصوص مقدَّمة بعد.",
      adminsTitle: "المشرفون", thName: "الاسم", thRole: "الدور", createTitle: "إضافة مشرف جديد",
      fName: "الاسم", fRole: "الدور", roleAdmin: "مشرف", roleSuper: "مشرف أعلى", createBtn: "إنشاء المشرف",
      phName: "اسم المشرف", phPassword: "8 أحرف على الأقل",
      // dynamic
      signingIn: "جارٍ الدخول...", badLogin: "بيانات الدخول غير صحيحة.",
      notAdmin: "هذا الحساب ليس لديه صلاحية دخول لوحة التحكم.",
      loadFail: "تعذّر تحميل النصوص.", download: "تحميل", assignMe: "أسند إليّ", you: "أنت",
      adminFallback: "مشرف", cancel: "إلغاء", viewReport: "عرض التقرير", continueEval: "متابعة التقييم",
      startEval: "ابدأ التقييم", assignFail: "تعذّر تحديث الإسناد.", dlFail: "تعذّر إنشاء رابط التحميل.",
      del: "حذف", meParen: "(أنت)", confirmDel: function (n) { return "حذف المشرف " + n + "؟"; },
      creating: "جارٍ الإنشاء...", createOk: "تم إنشاء المشرف بنجاح.", createGenericErr: "تعذّر إنشاء المشرف",
      delGenericErr: "تعذّر الحذف"
    },
    en: {
      loginTitle: "Dashboard", loginSub: "Admin sign in", fEmail: "Email",
      fPassword: "Password", loginSubmit: "Sign in",
      navSubmissions: "Submissions", navAdmins: "Manage admins", logout: "Sign out",
      subTitle: "Submissions", subSub: "Overview of received scripts and their coverage status", refresh: "Refresh",
      kpiTotal: "Total scripts", kpiPending: "Awaiting assignment", kpiReview: "In review", kpiDone: "Completed & rated",
      subListTitle: "Scripts list", thDate: "Date", thTitle: "Title", thWriter: "Writer", thEmail: "Email",
      thGenre: "Genre", thFilmType: "Film type", thDraft: "Draft", thFile: "File", thAssignee: "Assignee",
      thCoverage: "Coverage", subEmpty: "No submissions yet.",
      adminsTitle: "Admins", thName: "Name", thRole: "Role", createTitle: "Add a new admin",
      fName: "Name", fRole: "Role", roleAdmin: "Admin", roleSuper: "Super admin", createBtn: "Create admin",
      phName: "Admin name", phPassword: "At least 8 characters",
      signingIn: "Signing in...", badLogin: "Invalid login credentials.",
      notAdmin: "This account is not authorized to access the dashboard.",
      loadFail: "Failed to load submissions.", download: "Download", assignMe: "Assign to me", you: "You",
      adminFallback: "Admin", cancel: "Unassign", viewReport: "View report", continueEval: "Continue coverage",
      startEval: "Start coverage", assignFail: "Failed to update assignment.", dlFail: "Failed to create download link.",
      del: "Delete", meParen: "(you)", confirmDel: function (n) { return "Delete admin " + n + "?"; },
      creating: "Creating...", createOk: "Admin created successfully.", createGenericErr: "Failed to create admin",
      delGenericErr: "Failed to delete"
    }
  };
  function t(k) { return T[ULANG][k]; }
  function roleLabel(role) { return role === "super_admin" ? t("roleSuper") : t("roleAdmin"); }

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
      return d.toLocaleDateString(ULANG, { year: "numeric", month: "short", day: "numeric" }) +
        " · " + d.toLocaleTimeString(ULANG, { hour: "2-digit", minute: "2-digit" });
    } catch (e) { return s; }
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
    me = await loadMe();
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
  }

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

  async function loadSubmissions() {
    // Load admin names first (for the assignee column).
    var ad = await sb.from("admins").select("id,name");
    adminsById = {};
    (ad.data || []).forEach(function (a) { adminsById[a.id] = a.name; });

    var res = await sb.from("submissions").select("*").order("created_at", { ascending: false });
    var body = $("subBody");
    body.innerHTML = "";
    if (res.error) {
      $("subEmpty").textContent = t("loadFail"); show($("subEmpty"));
      return;
    }

    // Coverage statuses (keyed by submission id) drive the evaluation button label.
    var covBySub = {};
    var cov = await sb.from("coverages").select("submission_id,status");
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
        "<td><strong>" + esc(s.title_ar) + "</strong><br><span class='adm-muted' dir='ltr'>" + esc(s.title_en) + "</span></td>" +
        "<td>" + esc(s.writer) + "</td>" +
        "<td dir='ltr'>" + esc(s.email) + "</td>" +
        "<td>" + esc(GENRES[ULANG][s.genre] || s.genre) + "</td>" +
        "<td>" + esc(FILM[ULANG][s.film_type] || s.film_type) + "</td>" +
        "<td>" + esc(DRAFT[ULANG][s.draft] || s.draft) + "</td>" +
        "<td class='adm-file'></td>" +
        "<td class='adm-assign'></td>" +
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
      // Assign cell
      renderAssign(tr.querySelector(".adm-assign"), s);
      // Coverage cell
      renderCoverage(tr.querySelector(".adm-cov"), s, covBySub[s.id]);
      body.appendChild(tr);
    });
  }

  function renderAssign(cell, s) {
    cell.innerHTML = "";
    if (!s.assigned_to) {
      var b = document.createElement("button");
      b.className = "adm-link adm-link--gold";
      b.textContent = t("assignMe");
      b.addEventListener("click", function () { assign(s.id, me.id, cell, s); });
      cell.appendChild(b);
    } else {
      var mine = s.assigned_to === me.id;
      var name = mine ? t("you") : (adminsById[s.assigned_to] || t("adminFallback"));
      var badge = document.createElement("span");
      badge.className = "adm-badge" + (mine ? " adm-badge--me" : "");
      badge.textContent = name;
      cell.appendChild(badge);

      if (!mine) {
        var take = document.createElement("button");
        take.className = "adm-link adm-link--gold";
        take.textContent = t("assignMe");
        take.style.marginInlineStart = "8px";
        take.addEventListener("click", function () { assign(s.id, me.id, cell, s); });
        cell.appendChild(take);
      }
      var un = document.createElement("button");
      un.className = "adm-link adm-link--muted";
      un.textContent = t("cancel");
      un.style.marginInlineStart = "8px";
      un.addEventListener("click", function () { assign(s.id, null, cell, s); });
      cell.appendChild(un);
    }
  }

  // Coverage cell: links to the reader workspace, label follows its status.
  function renderCoverage(cell, s, status) {
    cell.innerHTML = "";
    var link = document.createElement("a");
    link.className = "adm-link adm-link--gold";
    link.href = "coverage.html?id=" + encodeURIComponent(s.id);
    if (status === "completed") { link.textContent = t("viewReport"); link.className = "adm-link"; }
    else if (status === "in_progress") link.textContent = t("continueEval");
    else link.textContent = t("startEval");
    cell.appendChild(link);
  }

  async function assign(id, toId, cell, s) {
    cell.style.opacity = ".5";
    var res = await sb.from("submissions").update({ assigned_to: toId }).eq("id", id);
    cell.style.opacity = "1";
    if (res.error) { alert(t("assignFail")); return; }
    s.assigned_to = toId;
    renderAssign(cell, s);
    updateKpis(currentRows, currentCov);
  }

  async function downloadFile(path, btn) {
    var old = btn.textContent; btn.textContent = "..."; btn.disabled = true;
    var res = await sb.storage.from(CFG.bucket).createSignedUrl(path, 120);
    btn.textContent = old; btn.disabled = false;
    if (res.error || !res.data) { alert(t("dlFail")); return; }
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

  // ---------- NAV FOLD ----------
  var NAV_KEY = "sceneone-admin-nav";
  function setNavCollapsed(collapsed) {
    var admEl = document.querySelector(".adm");
    if (admEl) admEl.classList.toggle("is-nav-collapsed", collapsed);
    try { localStorage.setItem(NAV_KEY, collapsed ? "1" : "0"); } catch (e) {}
  }
  (function initNavFold() {
    var collapsed = false;
    try { collapsed = localStorage.getItem(NAV_KEY) === "1"; } catch (e) {}
    setNavCollapsed(collapsed);
    var fold = $("navFoldBtn"), open = $("navOpenBtn");
    if (fold) fold.addEventListener("click", function () { setNavCollapsed(true); });
    if (open) open.addEventListener("click", function () { setNavCollapsed(false); });
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
  document.querySelectorAll(".adm-lang button").forEach(function (b) {
    b.addEventListener("click", function () { applyLang(b.getAttribute("data-l")); });
  });

  // ---------- START ----------
  applyLang(ULANG);
  boot();
})();
