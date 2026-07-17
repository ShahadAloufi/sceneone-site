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

  /* ---------- AUTO-GROW TEXTAREAS ---------- */
  // Textareas grow to fit their content so writers never fight a scrollbar.
  function autoGrow(ta) {
    if (!ta) return;
    ta.style.height = "auto";
    // With box-sizing:border-box the border isn't part of scrollHeight, so add it
    // back — otherwise the box ends up a couple px short and clips the last line.
    var cs = getComputedStyle(ta);
    var border = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
    ta.style.height = (ta.scrollHeight + border) + "px";
  }
  function autoGrowAll() { document.querySelectorAll("textarea").forEach(autoGrow); }
  document.addEventListener("input", function (e) { if (e.target && e.target.tagName === "TEXTAREA") autoGrow(e.target); });
  autoGrowAll();
  window.addEventListener("load", autoGrowAll);
  window.addEventListener("resize", autoGrowAll);
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) document.fonts.ready.then(autoGrowAll);

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

  // Count the pages of an uploaded PDF (best-effort). Resolves to the total
  // page count, or null for non-PDF files / on any error — never rejects, so
  // a parsing hiccup can't block the submission.
  function countPdfPages(file) {
    if (!file || fileExt(file.name) !== "pdf" || !window.pdfjsLib) return Promise.resolve(null);
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js";
    } catch (e) {}
    return file.arrayBuffer()
      .then(function (buf) { return window.pdfjsLib.getDocument({ data: buf }).promise; })
      .then(function (doc) { return doc.numPages; })
      .catch(function () { return null; });
  }

  /* ---------- ARABIC-ONLY TITLE ---------- */
  // The Arabic title field must contain no English letters. Rather than
  // stripping what the user types, keep their text and show an inline error.
  var titleArInput = document.querySelector('input[name="titleAr"]');
  var titleArField = titleArInput ? titleArInput.closest('[data-field="titleAr"]') : null;
  var titleArErr = titleArField ? titleArField.querySelector(".sub-err") : null;
  var TITLE_AR_REQUIRED_MSG = titleArErr ? titleArErr.textContent : "هذا الحقل مطلوب";
  var TITLE_AR_ENGLISH_MSG = "الرجاء إدخال العنوان بالعربية فقط";
  function titleArHasEnglish() { return !!titleArInput && /[A-Za-z]/.test(titleArInput.value); }
  if (titleArInput && titleArField) {
    titleArInput.addEventListener("input", function () {
      if (titleArHasEnglish()) {
        if (titleArErr) titleArErr.textContent = TITLE_AR_ENGLISH_MSG;
        titleArField.classList.add("invalid");
      } else {
        titleArField.classList.remove("invalid");
        if (titleArErr) titleArErr.textContent = TITLE_AR_REQUIRED_MSG;
      }
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
    // Arabic title: required AND no English letters (with a tailored message).
    var titleArClean = v.titleAr.length > 0 && !/[A-Za-z]/.test(v.titleAr);
    markInvalid("titleAr", !titleArClean);
    if (!titleArClean) {
      if (titleArErr) titleArErr.textContent = v.titleAr.length === 0 ? TITLE_AR_REQUIRED_MSG : TITLE_AR_ENGLISH_MSG;
      ok = false;
    }
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

      // The public submission form must always act as an ANONYMOUS writer. Without
      // this, a Supabase session left in this browser (e.g. an admin signed into
      // the dashboard) would be restored here and the file upload would run as
      // `authenticated` — which the anon-only Storage insert policy rejects
      // ("new row violates row-level security policy"). A sessionless client keeps
      // the upload on the `anon` role no matter who's logged in on this device.
      var sb = window.supabase.createClient(CFG.url, CFG.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
      var filePath = buildPath(file.name);

      countPdfPages(file).then(function (pageCount) {
        return sb.storage.from(BUCKET).upload(filePath, file, {
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
              fileName: file.name,
              pages: pageCount
            })
          });
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
