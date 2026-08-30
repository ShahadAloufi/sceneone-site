/* ===========================================================
   Scene One — Submission pages (script AND treatment)
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
  var CARD_BUCKET = CFG.cardBucket || "member-cards";

  // Both submission forms (script and treatment) run this file. What differs is
  // WHICH fields exist, which are required, and which extensions are accepted —
  // all read off the markup rather than branched on here, so a form can add or
  // drop a field without touching this script:
  //   • required  = any .sub-field[data-field] whose label carries a .req star
  //   • accepted  = the form's data-accept list (falls back to the script set)
  // The server re-validates everything regardless; these checks are UX only.
  var formEl = document.getElementById("submitForm");
  function requiredFields() {
    return Array.prototype.filter.call(
      document.querySelectorAll(".sub-field[data-field]"),
      function (el) { return !!el.querySelector(".req"); }
    ).map(function (el) { return el.getAttribute("data-field"); });
  }
  function hasField(name) { return !!document.querySelector('.sub-field[data-field="' + name + '"]'); }

  // A pricing card can name the tier it is selling (…?type=treatment_short), so a
  // writer who clicked the 70 SAR card does not have to pick short-vs-feature a
  // second time — and cannot land on the wrong price by mistake. Only ever
  // pre-selects an option the dropdown actually offers, and the writer can still
  // change it: this is a default, not a lock.
  (function preselectType() {
    var want = new URLSearchParams(location.search).get("type");
    if (!want) return;
    var sel = document.querySelector('select[name="filmType"]');
    if (!sel) return;
    var match = Array.prototype.some.call(sel.options, function (o) { return o.value === want; });
    if (match) sel.value = want;
  })();

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
  var ALLOWED_EXT = ((formEl && formEl.getAttribute("data-accept")) || "pdf,fdx,fountain,docx,txt")
    .split(",").map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean);
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

  /* ---------- ENGLISH-ONLY TITLE ---------- */
  // The mirror of the rule above: the English title must contain no Arabic
  // letters. Digits and punctuation stay allowed — plenty of titles carry them.
  var titleEnInput = document.querySelector('input[name="titleEn"]');
  var titleEnField = titleEnInput ? titleEnInput.closest('[data-field="titleEn"]') : null;
  var titleEnErr = titleEnField ? titleEnField.querySelector(".sub-err") : null;
  var TITLE_EN_REQUIRED_MSG = titleEnErr ? titleEnErr.textContent : "هذا الحقل مطلوب";
  var TITLE_EN_ARABIC_MSG = "الرجاء إدخال العنوان بالإنجليزية فقط";
  // The Arabic block plus its supplement and presentation forms — the ranges a
  // pasted Arabic title actually lands in.
  var ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  function titleEnHasArabic() { return !!titleEnInput && ARABIC_RE.test(titleEnInput.value); }
  if (titleEnInput && titleEnField) {
    titleEnInput.addEventListener("input", function () {
      if (titleEnHasArabic()) {
        if (titleEnErr) titleEnErr.textContent = TITLE_EN_ARABIC_MSG;
        titleEnField.classList.add("invalid");
      } else {
        titleEnField.classList.remove("invalid");
        if (titleEnErr) titleEnErr.textContent = TITLE_EN_REQUIRED_MSG;
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
        checkFileNow();
      }
    });
    fileInput.addEventListener("change", function () { setFileLabel(); checkFileNow(); });
  }

  /* ---------- MEMBERSHIP CARD (Cinema Association) ----------
     Optional, and present on the SCRIPT form only — js/submit.js also runs the
     treatment form, where none of these elements exist and every block below
     no-ops.

     The claim is collected, never verified here: there is no membership list to
     check a number against, so the format check is a typo catcher and the real
     check is a staff member looking at the card. Nothing here affects the price. */
  var memberToggle = document.getElementById("memberToggle");
  var memberFields = document.getElementById("memberFields");
  var cardDrop = document.getElementById("cardDrop");
  var cardInput = document.getElementById("cardInput");
  var cardDropText = document.getElementById("cardDropText");
  var CARD_DROP_DEFAULT = cardDropText ? cardDropText.textContent : "";
  var CARD_EXT = ["png", "jpg", "jpeg", "webp", "pdf"];
  var CARD_MAX_BYTES = 5 * 1024 * 1024;   // matches the bucket's file_size_limit
  // Mirrors MEMBER_DISCOUNT_PCT in lib/moyasar.js, which is what actually prices
  // the invoice. This one only draws the quote.
  var MEMBER_DISCOUNT_PCT = 15;
  // 340 reads better than 340.00; 212.5 has to read as 212.50.
  function riyals(n) { return n % 1 === 0 ? String(n) : n.toFixed(2); }
  // The normalised form — "CA-50", exactly as printed on the card. What the
  // writer types is normalised first (see below), so this is checked against
  // the value that will actually be stored.
  var MEMBER_RE = /^CA-\d{1,6}$/;

  function isMemberClaimed() { return !!(memberToggle && memberToggle.checked); }
  function cardFile() { return cardInput && cardInput.files ? cardInput.files[0] : null; }

  // Normalised the way it is stored and the way staff will read it: "50",
  // "ca-50" and "CA 50" all become "CA-50", so two claims on one number look
  // alike — the repeat check in the dashboard compares these strings.
  function normalizedMemberNumber() {
    var el = document.querySelector('input[name="memberNumber"]');
    var raw = el ? el.value.trim().toUpperCase().replace(/\s+/g, "") : "";
    if (!raw) return "";
    return "CA-" + raw.replace(/^CA-?/, "");
  }

  function setCardLabel() {
    if (!cardDrop || !cardDropText) return;
    var f = cardFile();
    if (f) {
      cardDrop.classList.add("has-file");
      cardDropText.textContent = f.name;
    } else {
      cardDrop.classList.remove("has-file");
      cardDropText.textContent = CARD_DROP_DEFAULT;
    }
  }

  if (memberToggle && memberFields) {
    memberToggle.addEventListener("change", function () {
      memberFields.hidden = !memberToggle.checked;
      // Unticking must not leave a stale error behind, and must not leave a
      // card queued for upload that the writer can no longer see.
      if (!memberToggle.checked) {
        markInvalid("memberNumber", false);
        markInvalid("memberCard", false);
        if (cardInput) { cardInput.value = ""; setCardLabel(); }
      }
      // The claim changes the amount, so the quote under the script picker is
      // now wrong in one direction or the other. Redraw it.
      checkFileNow();
    });
  }

  if (cardDrop && cardInput) {
    cardDrop.addEventListener("click", function () { cardInput.click(); });
    cardDrop.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cardInput.click(); }
    });
    ["dragenter", "dragover"].forEach(function (ev) {
      cardDrop.addEventListener(ev, function (e) { e.preventDefault(); cardDrop.classList.add("dragging"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      cardDrop.addEventListener(ev, function (e) { e.preventDefault(); cardDrop.classList.remove("dragging"); });
    });
    cardDrop.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        cardInput.files = e.dataTransfer.files;
        setCardLabel();
        markInvalid("memberCard", false);
      }
    });
    cardInput.addEventListener("change", function () {
      setCardLabel();
      markInvalid("memberCard", false);
    });
  }

  /* ---------- IMMEDIATE FILE FEEDBACK ----------
     Tell the writer the moment the file lands, not after they have filled the
     rest of the form and pressed submit. Two things are checked here, and both
     are re-checked server-side — this is only about WHEN the writer finds out.

       • the extension, against the form's own data-accept list
       • the page count, against the cap on the selected tier (data-cap on the
         <option>), for the products sold by length

     The count is read with pdf.js, the same routine the submission uses, so the
     number shown here is the number the server will judge. Re-runs when the tier
     changes too: picking the file first and the tier second is just as likely. */
  var fileErrEl = (function () {
    var f = document.querySelector('.sub-field[data-field="file"]');
    return f ? f.querySelector(".sub-err") : null;
  })();
  var FILE_ERR_DEFAULT = fileErrEl ? fileErrEl.textContent : "";
  var typeSelect = document.querySelector('select[name="filmType"]');

  function selectedOption() {
    return typeSelect ? typeSelect.options[typeSelect.selectedIndex] : null;
  }
  function selectedCap() {
    var opt = selectedOption();
    var cap = opt && opt.getAttribute("data-cap");
    return cap ? Number(cap) : null;
  }
  // Per-page products carry their rate and bounds on the <option> — the same
  // numbers as PER_PAGE in lib/moyasar.js. The server re-counts the file and
  // re-prices it, so this is a quote, not the invoice.
  function selectedRate() {
    var opt = selectedOption();
    if (!opt || !opt.getAttribute("data-rate")) return null;
    return {
      rate: Number(opt.getAttribute("data-rate")),
      min: Number(opt.getAttribute("data-min")),
      max: Number(opt.getAttribute("data-max")),
      // What to suggest when the file misses the range — the other tier, named by
      // the markup so this stays product-agnostic.
      underHint: opt.getAttribute("data-under-hint") || "",
      overHint: opt.getAttribute("data-over-hint") || ""
    };
  }
  var quoteEl = document.getElementById("priceQuote");
  function showQuote(msg) {
    if (!quoteEl) return;
    quoteEl.textContent = msg || "";
    quoteEl.hidden = !msg;
  }
  // Tiers priced on being short accept PDF only — a page count exists for nothing
  // else — so an option may narrow the form's list. Everything else inherits it.
  function acceptedExts() {
    var opt = selectedOption();
    var own = opt && opt.getAttribute("data-accept");
    if (!own) return ALLOWED_EXT;
    return own.split(",").map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean);
  }
  // Keep the picker and its caption honest about what the chosen tier takes.
  function syncAcceptUi() {
    var exts = acceptedExts();
    if (fileInput) fileInput.setAttribute("accept", exts.map(function (e) { return "." + e; }).join(","));
    var hint = document.querySelector('.sub-field[data-field="file"] .sub-drop__hint');
    if (hint) hint.textContent = exts.join(" · ").toUpperCase() + " — بحد أقصى 25MB";
  }
  function showFileError(msg) {
    if (fileErrEl) fileErrEl.textContent = msg || FILE_ERR_DEFAULT;
    markInvalid("file", !!msg);
  }
  // Counting a PDF is async, so a slow verdict for a file the writer has already
  // replaced must not land on the new one. Every check takes a ticket; only the
  // newest ticket may write to the UI.
  var checkTicket = 0;
  function checkFileNow() {
    var ticket = ++checkTicket;
    var file = fileInput && fileInput.files ? fileInput.files[0] : null;
    if (!file) { showQuote(null); return showFileError(null); }

    var exts = acceptedExts();
    if (exts.indexOf(fileExt(file.name)) === -1) {
      return showFileError("صيغة غير مدعومة لهذه الفئة. المسموح: " + exts.join(" · ").toUpperCase() + ".");
    }
    if (file.size > MAX_BYTES) {
      return showFileError("حجم الملف يتجاوز 25 ميغابايت.");
    }
    showFileError(null);

    var cap = selectedCap();
    var perPage = selectedRate();
    if (!cap && !perPage) { showQuote(null); return; }   // not sold by length
    countPdfPages(file).then(function (pages) {
      if (ticket !== checkTicket) return;   // a newer file is being checked
      if (!pages) { showQuote(null); return; }
      // Same arithmetic as the server: the count includes a title page.
      var billable = pages > 1 ? pages - 1 : pages;

      if (perPage) {
        if (billable < perPage.min) {
          showQuote(null);
          return showFileError(("نصك " + billable + " صفحة، والحد الأدنى لهذه الفئة " +
            perPage.min + " صفحة. " + perPage.underHint).trim());
        }
        if (billable > perPage.max) {
          showQuote(null);
          return showFileError(("نصك " + billable + " صفحة، والحد الأقصى لهذه الفئة " +
            perPage.max + " صفحة. " + perPage.overHint).trim());
        }
        showFileError(null);
        // The number the writer is about to pay, shown before they commit — so
        // it has to carry the member discount too, or a member reads 250 here
        // and is charged 212.50 at the gateway. Same arithmetic as
        // memberDiscounted() in lib/moyasar.js, which is what actually invoices.
        var listTotal = billable * perPage.rate;
        if (!isMemberClaimed()) {
          return showQuote("نصك " + billable + " صفحة × " + perPage.rate + " ريال = " +
            listTotal + " ريال");
        }
        return showQuote("نصك " + billable + " صفحة × " + perPage.rate + " ريال = " +
          listTotal + " ريال — بعد خصم العضوية " + MEMBER_DISCOUNT_PCT + "%: " +
          riyals(listTotal * (100 - MEMBER_DISCOUNT_PCT) / 100) + " ريال");
      }

      showQuote(null);
      if (billable > cap) {
        showFileError("هذا الملف " + pages + " صفحة، ويتجاوز حد الفئة المختارة (" + cap +
          " صفحات). اختر فئة أطول أو ارفع ملفًا أقصر.");
      } else {
        showFileError(null);
      }
    });
  }
  if (typeSelect) {
    typeSelect.addEventListener("change", function () { syncAcceptUi(); checkFileNow(); });
    syncAcceptUi();
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
      writerLevel: (data.get("writerLevel") || "").toString().trim(),
      genre: (data.get("genre") || "").toString().trim(),
      filmType: (data.get("filmType") || "").toString().trim(),
      draft: (data.get("draft") || "").toString().trim(),
      duration: (data.get("duration") || "").toString().trim(),
      theme: (data.get("theme") || "").toString().trim(),
      logline: (data.get("logline") || "").toString().trim(),
      vision: (data.get("vision") || "").toString().trim(),
      // Treatment-only; absent from the script form, hence "" rather than undefined.
      characters: (data.get("characters") || "").toString().trim(),
      toneRef: (data.get("toneRef") || "").toString().trim(),
      treatmentText: (data.get("treatmentText") || "").toString().trim(),
      ip: (data.get("ip") || "no").toString(),
      // Cinema Association claim; absent from the treatment form.
      isMember: isMemberClaimed(),
      memberNumber: isMemberClaimed() ? normalizedMemberNumber() : ""
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
    // English title: required AND no Arabic letters, with its own message.
    var titleEnClean = v.titleEn.length > 0 && !ARABIC_RE.test(v.titleEn);
    markInvalid("titleEn", !titleEnClean);
    if (!titleEnClean) {
      if (titleEnErr) titleEnErr.textContent = v.titleEn.length === 0 ? TITLE_EN_REQUIRED_MSG : TITLE_EN_ARABIC_MSG;
      ok = false;
    }
    // Everything else is required iff the markup says so (a .req star).
    requiredFields().forEach(function (name) {
      // The two titles are handled above, the file below, and the two membership
      // fields further down: they carry a .req star so a member can see they are
      // required, but they are required only when the box is ticked, which this
      // generic loop has no way to know.
      if (name === "titleAr" || name === "titleEn" || name === "file" ||
          name === "memberNumber" || name === "memberCard") return;
      if (name === "email") { req("email", EMAIL_RE.test(v.email)); return; }
      req(name, String(v[name] == null ? "" : v[name]).length > 0);
    });
    if (requiredFields().indexOf("file") > -1 || file) req("file", !!file);
    if (file && acceptedExts().indexOf(fileExt(file.name)) === -1) {
      toast("صيغة الملف غير مدعومة", "المسموح لهذه الفئة: " + acceptedExts().join(" · ").toUpperCase() + ".", "error");
      markInvalid("file", true); ok = false;
    }
    if (file && file.size > MAX_BYTES) {
      toast("الملف كبير جدًا", "الحد الأقصى لحجم الملف هو 25 ميغابايت.", "error");
      markInvalid("file", true); ok = false;
    }
    // Membership: both fields are required only when the writer claims it, so
    // they are checked here rather than through the .req-star machinery, which
    // would make them required for everyone. Their stars are still in the markup
    // — they are honest about what a member must fill in — which is exactly why
    // requiredFields() has to skip them above.
    if (v.isMember) {
      req("memberNumber", MEMBER_RE.test(v.memberNumber));
      var card = cardFile();
      req("memberCard", !!card);
      if (card && CARD_EXT.indexOf(fileExt(card.name)) === -1) {
        toast("صيغة البطاقة غير مدعومة", "أرفق صورة بصيغة PNG أو JPG أو WEBP أو ملف PDF.", "error");
        markInvalid("memberCard", true); ok = false;
      }
      if (card && card.size > CARD_MAX_BYTES) {
        toast("ملف البطاقة كبير جدًا", "الحد الأقصى لحجم البطاقة هو 5 ميغابايت.", "error");
        markInvalid("memberCard", true); ok = false;
      }
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

      // The membership card, when one was attached, goes to its OWN bucket —
      // never `scripts`. Same anon insert-only rule, different audience: staff
      // read it, readers never do.
      var card = isMemberClaimed() ? cardFile() : null;
      var cardPath = card ? buildPath(card.name) : null;
      function uploadCard() {
        if (!card) return Promise.resolve();
        return sb.storage.from(CARD_BUCKET).upload(cardPath, card, {
          contentType: card.type || "application/octet-stream",
          upsert: false
        }).then(function (up) {
          if (up.error) throw up.error;
        });
      }

      countPdfPages(file).then(function (pageCount) {
        return sb.storage.from(BUCKET).upload(filePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false
        }).then(function (up) {
          if (up.error) throw up.error;
          return uploadCard();
        }).then(function () {
          return fetch("/api/submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              titleAr: v.titleAr,
              titleEn: v.titleEn,
              email: v.email,
              writer: v.writer,
              writerLevel: v.writerLevel,
              genre: v.genre,
              filmType: v.filmType,
              draft: v.draft,
              duration: v.duration,
              theme: v.theme,
              logline: v.logline,
              vision: v.vision,
              characters: v.characters,
              toneRef: v.toneRef,
              treatmentText: v.treatmentText,
              ip: v.ip,
              filePath: filePath,
              fileName: file.name,
              pages: pageCount,
              // Recorded, not trusted: staff verify the card by eye. The server
              // ignores both unless isMember is true.
              isMember: v.isMember,
              memberNumber: v.memberNumber,
              memberCardPath: cardPath,
              memberCardName: card ? card.name : null
            })
          });
        });
      }).then(function (res) {
        if (!res.ok) return res.json().then(function (b) { throw new Error(b.message || "فشل الإرسال"); });
        return res.json();
      }).then(function (body) {
        // The script is saved but sits at `pending_payment` — send the writer
        // to Moyasar's hosted checkout to complete the order.
        toast("تم استلام نصك بنجاح", "سيتم تحويلك إلى صفحة الدفع لإتمام الطلب.");
        setTimeout(function () { window.location.href = body.paymentUrl; }, 1800);
      }).catch(function (err) {
        toast("تعذّر إرسال النص", (err && err.message) ? err.message : "حاول مرة أخرى.", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "إرسال النص والدفع";
      });
    });
  }
})();
