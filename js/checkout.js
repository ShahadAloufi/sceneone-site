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
  if (TURNAROUND[filmType]) el("ckTurnaround").textContent = TURNAROUND[filmType];
  // The page count stays as a plain figure under the product name; the
  // "N صفحة × 10 ريال" arithmetic is gone, as it is from the invoice line.
  if (pages > 0) el("ckOrderMeta").textContent = pages + " صفحة";
  document.title = product + " | Scene One";

  /* ---- the form ------------------------------------------------------------
     Mounted immediately, so a writer arriving from the submission page sees a
     payment form rather than an empty column waiting on a checkbox.

     The billing address still reaches Moyasar, without the form having to wait
     for it: on_initiating runs the moment the writer presses pay, BEFORE
     anything goes to Moyasar, and whatever it returns overrides the config.
     So the metadata is read then, from whatever the fields hold at that
     instant, and the terms are enforced there too — returning false stops the
     payment outright, which is a harder gate than greying the form out. */
  var agree = el("ckAgree");
  var city = el("ckCity");
  var country = el("ckCountry");
  var hint = el("ckHint");

  function refuse(message, focusEl) {
    hint.textContent = message;
    hint.style.display = "";
    if (focusEl) { focusEl.focus(); }
    hint.scrollIntoView({ block: "center", behavior: "smooth" });
    return false;
  }

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
    // All three apple_pay keys are mandatory the moment "applepay" is listed.
    // Without them the form refuses to render ANYTHING, card fields included —
    // an unconfigured Apple Pay does not degrade, it takes the card form with
    // it. That is what happened the first time this was switched on.
    methods: ["creditcard", "applepay"],
    apple_pay: {
      country: "SA",
      // What Apple's sheet shows beside the total.
      label: "Scene One",
      // Moyasar host the merchant-session handshake themselves, so this needs
      // no endpoint of ours — which was the reason it stayed off. The domain
      // side is already done: .well-known/apple-developer-merchantid-domain-
      // association is in this repo and served, and sceneone.info is
      // registered under Settings → Apple Pay Domains.
      validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate"
    },
    supported_networks: ["mada", "visa", "mastercard"],
    language: "ar",
    // Off, so the form fills this column instead of sitting in a 360px box.
    fixed_width: false,
    on_initiating: async function () {
      if (!agree.checked) return refuse("وافق على الشروط لإتمام الدفع.", agree);
      hint.style.display = "none";
      // Read now, not at init: this is the only moment the fields are final.
      // The city is optional, so an empty one is left out of the metadata
      // rather than recorded against the payment as an empty string.
      var meta = { billing_country: country.value };
      var cityValue = city.value.trim();
      if (cityValue) { meta.billing_city = cityValue.slice(0, 60); }
      return { metadata: meta };
    }
  });

  // The hint is an error, shown when the pay button is refused — not a
  // standing instruction, so it starts hidden.
  hint.style.display = "none";

  /* ---- the accepted-card marks --------------------------------------------
     Moyasar carries mada, Visa and Mastercard as base64 SVG, but scoped to
     inside its own form — the classes alone paint nothing on our badge row,
     which is why it was three empty plates. Their stylesheet is cross-origin
     so the rules cannot be read either.

     So the art is copied off the widget's own icons once they exist. Still
     the official marks, still no new assets, and if a brand is absent from
     the widget its plate is dropped rather than left blank. */
  (function paintNetworkMarks(attempt) {
    var row = document.querySelector(".ck-networks");
    if (!row) return;
    // Apple Pay is not in this list: Moyasar's stylesheet has no Apple Pay mark
    // (they render Apple's own apple-pay-button element instead), so that badge
    // is a plain <img> of Apple's official artwork, handled just below.
    var ap = document.getElementById("ckApplePayMark");
    if (ap) ap.addEventListener("error", function () {
      // No broken-image icon on a payment page if the asset is ever missing.
      var li = ap.closest("li");
      if (li) li.remove();
    });
    var want = ["Mada", "Visa", "Mastercard"];
    var painted = 0;
    want.forEach(function (name) {
      var source = document.querySelector(".mysr-form .mysr-form-ccIcon" + name);
      var target = row.querySelector(".mysr-form-ccIcon" + name);
      if (!source || !target) return;
      var art = getComputedStyle(source).backgroundImage;
      if (!art || art === "none") return;
      target.style.backgroundImage = art;
      painted++;
    });
    if (painted === want.length) return;
    // The widget renders asynchronously; give it a few frames before giving up.
    if ((attempt || 0) < 20) return setTimeout(function () { paintNetworkMarks((attempt || 0) + 1); }, 250);
    // Never leave empty plates behind.
    row.querySelectorAll(".mysr-form-ccIcon").forEach(function (el) {
      if (!el.style.backgroundImage) el.closest("li").remove();
    });
  })(0);

})();
