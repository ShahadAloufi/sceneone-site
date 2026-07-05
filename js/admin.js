/* ===========================================================
   Scene One — Admin panel
   Supabase Auth (email/password) · submissions inbox · claim/assign
   · super-admin management of admins.
   =========================================================== */
(function () {
  "use strict";

  var CFG = window.SCENEONE_SUPABASE || {};
  var GENRES = {
    drama: "دراما", comedy: "كوميديا", thriller: "إثارة / تشويق",
    horror: "رعب", action: "أكشن", documentary: "وثائقي", other: "أخرى"
  };
  var FILM = { feature: "روائي طويل", short: "قصير" };
  var DRAFT = { first: "الأولى", revised: "مُنقّحة", final: "نهائية" };

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

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtDate(s) {
    try {
      var d = new Date(s);
      return d.toLocaleDateString("ar", { year: "numeric", month: "short", day: "numeric" }) +
        " · " + d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
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
    $("admRole").textContent = me.role === "super_admin" ? "مشرف أعلى" : "مشرف";
    if (me.role === "super_admin") { show($("adminsTabBtn")); }
    loadSubmissions();
  }

  // Login
  $("adminLoginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var err = $("loginError"); hide(err); err.textContent = "";
    var btn = $("loginBtn"); btn.disabled = true; btn.textContent = "جارٍ الدخول...";
    var email = $("loginEmail").value.trim();
    var pass = $("loginPassword").value;
    var out = await sb.auth.signInWithPassword({ email: email, password: pass });
    if (out.error) {
      err.textContent = "بيانات الدخول غير صحيحة."; show(err);
    } else {
      me = await loadMe();
      if (!me) {
        await sb.auth.signOut();
        err.textContent = "هذا الحساب ليس لديه صلاحية دخول لوحة التحكم."; show(err);
      } else {
        enterDashboard();
      }
    }
    btn.disabled = false; btn.textContent = "تسجيل الدخول";
  });

  // Logout
  $("logoutBtn").addEventListener("click", async function () {
    await sb.auth.signOut();
    me = null;
    hide(dashView); show(loginView);
    $("loginPassword").value = "";
  });

  // ---------- TABS ----------
  document.querySelectorAll(".adm-tab").forEach(function (t) {
    t.addEventListener("click", function () {
      var name = t.getAttribute("data-tab");
      document.querySelectorAll(".adm-tab").forEach(function (x) { x.classList.remove("is-active"); });
      t.classList.add("is-active");
      $("tab-submissions").hidden = name !== "submissions";
      $("tab-admins").hidden = name !== "admins";
      if (name === "admins") loadAdmins();
    });
  });

  // ---------- SUBMISSIONS ----------
  async function loadSubmissions() {
    // Load admin names first (for the assignee column).
    var ad = await sb.from("admins").select("id,name");
    adminsById = {};
    (ad.data || []).forEach(function (a) { adminsById[a.id] = a.name; });

    var res = await sb.from("submissions").select("*").order("created_at", { ascending: false });
    var body = $("subBody");
    body.innerHTML = "";
    if (res.error) {
      $("subEmpty").textContent = "تعذّر تحميل النصوص."; show($("subEmpty"));
      return;
    }
    var rows = res.data || [];
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
        "<td>" + esc(GENRES[s.genre] || s.genre) + "</td>" +
        "<td>" + esc(FILM[s.film_type] || s.film_type) + "</td>" +
        "<td>" + esc(DRAFT[s.draft] || s.draft) + "</td>" +
        "<td>" + (s.ip_registered ? "نعم" : "لا") + "</td>" +
        "<td class='adm-file'></td>" +
        "<td class='adm-assign'></td>";
      // File cell
      var fileCell = tr.querySelector(".adm-file");
      if (s.file_path) {
        var a = document.createElement("button");
        a.className = "adm-link";
        a.textContent = "تحميل";
        a.addEventListener("click", function () { downloadFile(s.file_path, a); });
        fileCell.appendChild(a);
      } else { fileCell.textContent = "—"; }
      // Assign cell
      renderAssign(tr.querySelector(".adm-assign"), s);
      body.appendChild(tr);
    });
  }

  function renderAssign(cell, s) {
    cell.innerHTML = "";
    if (!s.assigned_to) {
      var b = document.createElement("button");
      b.className = "adm-link adm-link--gold";
      b.textContent = "أسند إليّ";
      b.addEventListener("click", function () { assign(s.id, me.id, cell, s); });
      cell.appendChild(b);
    } else {
      var mine = s.assigned_to === me.id;
      var name = mine ? "أنت" : (adminsById[s.assigned_to] || "مشرف");
      var badge = document.createElement("span");
      badge.className = "adm-badge" + (mine ? " adm-badge--me" : "");
      badge.textContent = name;
      cell.appendChild(badge);

      if (!mine) {
        var take = document.createElement("button");
        take.className = "adm-link adm-link--gold";
        take.textContent = "أسند إليّ";
        take.style.marginRight = "8px";
        take.addEventListener("click", function () { assign(s.id, me.id, cell, s); });
        cell.appendChild(take);
      }
      var un = document.createElement("button");
      un.className = "adm-link adm-link--muted";
      un.textContent = "إلغاء";
      un.style.marginRight = "8px";
      un.addEventListener("click", function () { assign(s.id, null, cell, s); });
      cell.appendChild(un);
    }
  }

  async function assign(id, toId, cell, s) {
    cell.style.opacity = ".5";
    var res = await sb.from("submissions").update({ assigned_to: toId }).eq("id", id);
    cell.style.opacity = "1";
    if (res.error) { alert("تعذّر تحديث الإسناد."); return; }
    s.assigned_to = toId;
    renderAssign(cell, s);
  }

  async function downloadFile(path, btn) {
    var old = btn.textContent; btn.textContent = "..."; btn.disabled = true;
    var res = await sb.storage.from(CFG.bucket).createSignedUrl(path, 120);
    btn.textContent = old; btn.disabled = false;
    if (res.error || !res.data) { alert("تعذّر إنشاء رابط التحميل."); return; }
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
        "<td>" + (a.role === "super_admin" ? "مشرف أعلى" : "مشرف") + "</td>" +
        "<td class='adm-del'></td>";
      var cell = tr.querySelector(".adm-del");
      if (a.id !== me.id) {
        var del = document.createElement("button");
        del.className = "adm-link adm-link--danger";
        del.textContent = "حذف";
        del.addEventListener("click", function () { removeAdmin(a, del); });
        cell.appendChild(del);
      } else {
        cell.innerHTML = "<span class='adm-muted'>(أنت)</span>";
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
    var btn = $("createBtn"); btn.disabled = true; btn.textContent = "جارٍ الإنشاء...";
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
      if (!resp.ok) throw new Error(data.message || "تعذّر إنشاء المشرف");
      ok.textContent = "تم إنشاء المشرف بنجاح."; show(ok);
      $("createAdminForm").reset();
      loadAdmins();
    } catch (ex) {
      err.textContent = ex.message; show(err);
    }
    btn.disabled = false; btn.textContent = "إنشاء المشرف";
  });

  async function removeAdmin(a, btn) {
    if (!confirm("حذف المشرف " + a.name + "؟")) return;
    btn.disabled = true; btn.textContent = "...";
    try {
      var resp = await fetch("/api/admin/admins?id=" + encodeURIComponent(a.id), {
        method: "DELETE", headers: await authHeader()
      });
      var data = await resp.json().catch(function () { return {}; });
      if (!resp.ok) throw new Error(data.message || "تعذّر الحذف");
      loadAdmins();
    } catch (ex) {
      alert(ex.message); btn.disabled = false; btn.textContent = "حذف";
    }
  }

  // ---------- START ----------
  boot();
})();
