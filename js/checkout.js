/* ===========================================================
   Scene One, checkout page.

   Reads the order out of the URL, draws the summary, and mounts Moyasar's
   payment form against the invoice the server already created.

   What this file deliberately does NOT do is touch a card. Moyasar's form
   owns those fields and posts them to Moyasar; nothing here reads them, and
   nothing here is sent to our own server. Their docs forbid the alternative,
   and it would drag the whole site into the heaviest PCI scope.

   The amount in the URL is for DISPLAY ONLY. The invoice fixes the real
   figure server-side when it is created, and Moyasar rejects a form whose
   amount disagrees with its invoice — so a tampered `a=` fails closed at the
   gateway rather than charging the wrong number.
   =========================================================== */
(function () {
  "use strict";

  var q = new URLSearchParams(location.search);
  var invoiceId = (q.get("i") || "").trim();
  var amount = parseInt(q.get("a"), 10);          // halalas
  var titleAr = (q.get("t") || "").trim();
  var filmType = (q.get("f") || "").trim();
  var pages = parseInt(q.get("p"), 10);

  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var CFG = window.SCENEONE_MOYASAR || {};

  // Mirrors PRODUCT_AR in lib/moyasar.js. Duplicated rather than fetched: one
  // more serverless function to read four strings is not worth a slot, and the
  // invoice carries the authoritative description to Moyasar either way.
  var PRODUCT = {
    short: "تغطية فيلم قصير",
    feature: "تغطية فيلم طويل",
    treatment_short: "تغطية معالجة فيلم قصير",
    treatment_feature: "تغطية معالجة فيلم طويل"
  };
  var RANGE = {
    short: "نصوص من 10 إلى 40 صفحة",
    feature: "نصوص من 80 إلى 120 صفحة",
    treatment_short: "معالجة حتى 5 صفحات",
    treatment_feature: "معالجة حتى 15 صفحة"
  };
  var TURNAROUND = {
    short: "10 إلى 15 يوم عمل",
    feature: "حتى 4 أسابيع",
    treatment_short: "10 إلى 15 يوم عمل",
    treatment_feature: "10 إلى 15 يوم عمل"
  };

  function el(id) { return document.getElementById(id); }
  // 90000 halalas reads as 900; 21250 has to read as 212.50.
  function riyals(h) { var v = h / 100; return v % 1 === 0 ? String(v) : v.toFixed(2); }

  function fail(title, body) {
    document.getElementById("ck").innerHTML =
      '<div class="ck-state"><h1></h1><p></p><a href="/submit"></a></div>';
    var s = document.querySelector(".ck-state");
    s.querySelector("h1").textContent = title;
    s.querySelector("p").textContent = body;
    s.querySelector("a").textContent = "العودة إلى التقديم";
  }

  if (!UUID_RE.test(invoiceId) || !(amount > 0)) {
    return fail("رابط الدفع غير صالح",
      "افتح الرابط من الرسالة التي وصلتك بعد إرسال النص، أو أرسل النص من جديد.");
  }
  if (!CFG.publishableKey) {
    // Without the key the form cannot mount, and a silent blank column on a
    // payment page is the worst possible failure.
    return fail("الدفع غير متاح حاليًا",
      "تعذّر تحميل صفحة الدفع. تواصل معنا على sceneone.info@gmail.com ونكمل طلبك.");
  }

  var product = PRODUCT[filmType] || "تغطية النص";
  var total = riyals(amount) + " ريال";

  el("ckTitle").textContent = titleAr ? "نصك: «" + titleAr + "»" : "نصك";
  el("ckProduct").textContent = product;
  el("ckOrderName").textContent = product;
  el("ckAmount").textContent = riyals(amount);
  el("ckOrderAmt").textContent = total;
  el("ckTotal").textContent = total;
  if (RANGE[filmType]) el("ckRange").textContent = RANGE[filmType];
  if (TURNAROUND[filmType]) el("ckTurnaround").textContent = TURNAROUND[filmType];
  if (pages > 0) {
    el("ckOrderMeta").textContent = pages + " صفحة";
    // Only the per-page products have a rate to show.
    if (filmType === "short" || filmType === "feature") {
      el("ckRate").textContent = pages + " صفحة × 10 ريال للصفحة";
    }
  }
  document.title = product + " | Scene One";

  // The terms gate. The widget carries its own pay button, so the only way to
  // hold the writer back is to put the gate outside it.
  var form = el("ckForm");
  var agree = el("ckAgree");
  agree.addEventListener("change", function () {
    form.setAttribute("data-locked", agree.checked ? "false" : "true");
    el("ckHint").style.display = agree.checked ? "none" : "";
  });

  Moyasar.init({
    element: ".mysr-form",
    amount: amount,
    currency: "SAR",
    description: product + (titleAr ? "، " + titleAr : ""),
    publishable_api_key: CFG.publishableKey,
    // Pays the invoice the server already created, so the webhook keeps
    // matching on invoice_id exactly as it does today and nothing downstream
    // has to learn a second shape of payment.
    invoice_id: invoiceId,
    callback_url: location.origin + "/payment-status",
    // Card only, for now. Adding "applepay" makes the form demand an Apple Pay
    // label, a country and a validate_merchant_url, and WITHOUT them it
    // refuses to render anything at all — card fields included. An
    // unconfigured Apple Pay does not degrade to a card form, it takes the
    // card form down with it. See the note at the foot of this file.
    methods: ["creditcard"],
    supported_networks: ["mada", "visa", "mastercard"],
    language: "ar",
    // Off, so the form fills this column instead of sitting in a 360px box.
    fixed_width: false
  });

  /* ---- Apple Pay, when it is ready ----------------------------------------
     Moyasar's form wants three more keys before it will show the button:

       apple_pay: {
         label: "Scene One",            // what the sheet says you are paying
         country: "SA",
         validate_merchant_url: "..."   // an endpoint that performs Apple's
                                        // merchant session handshake
       }

     The last one is the work. Apple validates the merchant from the server,
     not the browser, so it needs an endpoint of our own — and this project is
     at 11 of Vercel Hobby's 12 functions, so that is the final slot. Check
     first whether Moyasar hosts a validation URL for registered domains; if
     they do, this is three lines and no function at all. */
})();
