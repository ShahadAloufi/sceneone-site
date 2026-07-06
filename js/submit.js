/* ===========================================================
   Scene One — Script Submission page
   Menu overlay · toasts · IP toggle · file dropzone · upload

   Flow: the browser uploads the script file DIRECTLY to the private
   Supabase Storage `scripts` bucket (allowed by the anon "insert only"
   policy), then POSTs the form fields + the resulting object path to
   /api/submissions, which validates and inserts the row server-side
   with the service-role key. The server is the source of truth; the
   checks here are for UX only.
   =========================================================== */
(function () {
  "use strict";

  var CFG = window.SCENEONE_SUPABASE || {};
  var BUCKET = CFG.bucket || "scripts";

  /* ---------- MENU OVERLAY ---------- */
  var menu = document.getElementById("menu");
  function openMenu() { if (menu) { menu.classList.add("open"); document.body.style.overflow = "hidden"; } }
  function closeMenu() { if (menu) { menu.classList.remove("open"); document.body.style.overflow = ""; } }
  document.querySelectorAll("[data-menu-open]").forEach(function (b) { b.addEventListener("click", openMenu); });
  document.querySelectorAll("[data-menu-close]").forEach(function (b) { b.addEventListener("click", closeMenu); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  /* ---------- TOASTS ---------- */
  var toastWrap = document.getElementById("toasts");
  function toast(title, desc, variant) {
    if (!toastWrap) return;
    var el = document.createElement("div");
    el.className = "toast" + (variant === "error" ? " error" : "");
    el.innerHTML = '<div class="toast__title"></div><div class="toast__desc"></div>';
    el.querySelector(".toast__title").textContent = title;
    el.querySelector(".toast__desc").textContent = desc;
    toastWrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity .3s ease, transform .3s ease";
      el.style.opacity = "0";
      el.style.transform = "translateY(12px)";
      setTimeout(function () { el.remove(); }, 300);
    }, 4500);
  }

  /* ---------- CONSTANTS (mirror the server allowlists) ---------- */
  var ALLOWED_EXT = ["pdf", "fdx", "fountain", "docx", "txt"];
  var MAX_BYTES = 25 * 1024 * 1024; // 25 MiB — matches the bucket's file_size_limit
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function fileExt(name) {
    var i = String(name).lastIndexOf(".");
    return i >= 0 ? String(name).slice(i + 1).toLowerCase() : "";
  }

  /* ---------- IP TOGGLE (نعم / لا) ---------- */
  var ipInput = document.querySelector('input[name="ip"]');
  document.querySelectorAll(".sub-toggle__btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".sub-toggle__btn").forEach(function (b) {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      if (ipInput) ipInput.value = btn.getAttribute("data-ip");
    });
  });

  /* ---------- ARABIC-ONLY TITLE ---------- */
  // The Arabic title field must not contain English letters. Strip any
  // Latin characters as the user types (this also covers pasted text).
  var titleArInput = document.querySelector('input[name="titleAr"]');
  if (titleArInput) {
    titleArInput.addEventListener("input", function () {
      var cleaned = titleArInput.value.replace(/[A-Za-z]/g, "");
      if (cleaned !== titleArInput.value) titleArInput.value = cleaned;
    });
  }

  /* ---------- FILE DROPZONE ---------- */
  var dropZone = document.getElementById("dropZone");
  var fileInput = document.getElementById("fileInput");
  var dropText = document.getElementById("dropText");

  function setFileLabel() {
    if (fileInput.files && fileInput.files[0]) {
      dropZone.classList.add("has-file");
      dropText.textContent = fileInput.files[0].name;
    } else {
      dropZone.classList.remove("has-file");
      dropText.textContent = "اسحب ملفك هنا أو اضغط للاختيار";
    }
  }

  if (dropZone && fileInput) {
    dropZone.addEventListener("click", function () { fileInput.click(); });
    dropZone.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
    });
    ["dragenter", "dragover"].forEach(function (ev) {
      dropZone.addEventListener(ev, function (e) { e.preventDefault(); dropZone.classList.add("dragging"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      dropZone.addEventListener(ev, function (e) { e.preventDefault(); dropZone.classList.remove("dragging"); });
    });
    dropZone.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        setFileLabel();
      }
    });
    fileInput.addEventListener("change", setFileLabel);
  }

  /* ---------- VALIDATION ---------- */
  var form = document.getElementById("submitForm");
  function fieldEl(name) { return form.querySelector('[data-field="' + name + '"]'); }
  function markInvalid(name, on) {
    var f = fieldEl(name);
    if (f) f.classList.toggle("invalid", !!on);
  }

  function collect() {
    var data = new FormData(form);
    return {
      titleAr: (data.get("titleAr") || "").toString().trim(),
      titleEn: (data.get("titleEn") || "").toString().trim(),
      email: (data.get("email") || "").toString().trim(),
      writer: (data.get("writer") || "").toString().trim(),
      genre: (data.get("genre") || "").toString().trim(),
      filmType: (data.get("filmType") || "").toString().trim(),
      draft: (data.get("draft") || "").toString().trim(),
      duration: (data.get("duration") || "").toString().trim(),
      theme: (data.get("theme") || "").toString().trim(),
      logline: (data.get("logline") || "").toString().trim(),
      vision: (data.get("vision") || "").toString().trim(),
      ip: (data.get("ip") || "no").toString()
    };
  }

  function validate(v, file) {
    var ok = true;
    function req(name, cond) { markInvalid(name, !cond); if (!cond) ok = false; }
    req("titleAr", v.titleAr.length > 0);
    req("titleEn", v.titleEn.length > 0);
    req("email", EMAIL_RE.test(v.email));
    req("writer", v.writer.length > 0);
    req("genre", v.genre.length > 0);
    req("filmType", v.filmType.length > 0);
    req("draft", v.draft.length > 0);
    req("vision", v.vision.length > 0);
    req("file", !!file);
    if (file && ALLOWED_EXT.indexOf(fileExt(file.name)) === -1) {
      toast("صيغة الملف غير مدعومة", "استخدم صيغة PDF أو FDX أو Fountain أو DOCX أو TXT.", "error");
      markInvalid("file", true); ok = false;
    }
    if (file && file.size > MAX_BYTES) {
      toast("الملف كبير جدًا", "الحد الأقصى لحجم الملف هو 25 ميغابايت.", "error");
      markInvalid("file", true); ok = false;
    }
    return ok;
  }

  /* ---------- UPLOAD + SUBMIT ---------- */
  // Build an object path that matches the server's PATH_RE:
  //   /^[A-Za-z0-9]+-[A-Za-z0-9]+\/[A-Za-z0-9._-]+$/
  function buildPath(fileName) {
    var prefix = Date.now() + "-" + Math.random().toString(36).slice(2, 10);
    var safe = String(fileName).replace(/[^A-Za-z0-9._-]/g, "_");
    if (!safe || safe === "." ) safe = "script";
    return prefix + "/" + safe;
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var v = collect();
      var file = fileInput && fileInput.files ? fileInput.files[0] : null;
      if (!validate(v, file)) return;

      if (!window.supabase || !CFG.url || !CFG.anonKey) {
        toast("الخدمة غير متاحة", "تعذّر الاتصال بالخادم، حاول لاحقًا.", "error");
        return;
      }

      var submitBtn = form.querySelector(".sub-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "جارٍ الإرسال...";

      var sb = window.supabase.createClient(CFG.url, CFG.anonKey);
      var filePath = buildPath(file.name);

      sb.storage.from(BUCKET).upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false
      }).then(function (up) {
        if (up.error) throw up.error;
        return fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titleAr: v.titleAr,
            titleEn: v.titleEn,
            email: v.email,
            writer: v.writer,
            genre: v.genre,
            filmType: v.filmType,
            draft: v.draft,
            duration: v.duration,
            theme: v.theme,
            logline: v.logline,
            vision: v.vision,
            ip: v.ip,
            filePath: filePath,
            fileName: file.name
          })
        });
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (b) { throw new Error(b.message || "فشل الإرسال"); });
        toast("تم استلام نصك بنجاح", "سنراجع طلبك ونتواصل معك عبر بريدك الإلكتروني.");
        setTimeout(function () { window.location.href = "/"; }, 1800);
      }).catch(function (err) {
        toast("تعذّر إرسال النص", (err && err.message) ? err.message : "حاول مرة أخرى.", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "إرسال النص";
      });
    });
  }
})();
