/* ===========================================================
   Scene One — public-site i18n (landing page first; other public
   pages follow the same data-i18n pattern once translated).
   Mirrors the dict + data-i18n + applyLang() convention already
   used in js/admin.js / js/coverage.js, with its own storage key
   so the public site's language choice never collides with a
   staff member's admin-panel language.
   =========================================================== */
(function () {
  "use strict";

  var LANG_KEY = "sceneone-lang";
  var LANG = "ar";
  try { var stored = localStorage.getItem(LANG_KEY); if (stored === "ar" || stored === "en") LANG = stored; } catch (e) {}

  var TITLES = {
    ar: "Scene One — حيث تبدأ رحلة النص",
    en: "Scene One — Where Your Script's Journey Begins"
  };

  var T = {
    ar: {
      navHome: "الرئيسية", navAbout: "Scene One", navReaders: "من يقرأ نصك؟",
      navJourney: "رحلة النص", navGuide: "دليل المنصة", navContact: "تواصل معنا",
      menuLabel: "القائمة", closeLabel: "إغلاق",

      overlayTag: "Scene One / 2026",
      overlayBlurb: "منصة متخصصة في تقييم النصوص السينمائية وتقديم ملاحظات احترافية تساعد الكتّاب على تطوير أعمالهم وصقلها قبل خطوتهم التالية.",
      overlayContact: "تواصل", overlaySocial: "حساباتنا",

      heroTitle: "حيث تبدأ رحلة النص",
      heroSub: "تغطية سينمائية احترافية وملاحظات تطويرية يقدّمها كتّاب ومطوّرو نصوص وصنّاع أفلام.",
      btnViewCoverage: "عرض التغطيات", btnGuide: "دليل المنصة",
      heroNda: "جميع النصوص تخضع لاتفاقيات عدم إفصاح (NDA)، ولا يطّلع عليها سوى القارئ المكلّف بتقييمها.",
      partnerBadge: "شريك معتمد لدى جمعية السينما",

      quoteHtml: "لأن كل قصة تستحق أن تُمنح فرصة حقيقية للتطور،<br>" +
        "تمنحك Scene One منظورًا احترافيًا لنصك من خلال قراءات نقدية متخصصة وتقارير مفصلة تساعدك على اكتشاف نقاط القوة ومعالجة مواطن الضعف، لتتمكن من تطوير مشروعك بثقة ووضوح.",

      aboutTitle: "من الفكرة للنص.",
      aboutP1: "يمتلك الكثير من الكتّاب أفكارًا واعدة ونصوصًا تحمل إمكانات حقيقية، لكن تطوير النص السينمائي لا يعتمد على الكتابة وحدها.",
      aboutP2: "في كثير من الأحيان، يحتاج الكاتب إلى قراءة نقدية احترافية تساعده على رؤية عمله من منظور مختلف، واكتشاف نقاط القوة وفرص التحسين قبل الانتقال إلى المرحلة التالية.",
      aboutP3: "لهذا وُجدت Scene One؛ لتوفير تقييمات متخصصة وتقارير مفصلة تساعد الكتّاب على تطوير نصوصهم واتخاذ قرارات أكثر وضوحًا في رحلتهم الإبداعية.",

      cardWritersAlt: "للكُتّاب", cardProducersAlt: "شركاء الصناعة", cardCinemaAlt: "السينما السعودية",
      cardWritersImg: "assets/card_writers.png", cardProducersImg: "assets/card_producers.png", cardCinemaImg: "assets/card_cinema.png",

      journeyTitle: "رحلة النص",
      step1T: "01 — تقديم النص", step1B: "يقوم الكاتب برفع النص السينمائي وإدخال المعلومات الأساسية الخاصة بالمشروع.",
      step2T: "02 — المراجعة الأولية", step2B: "يتم التحقق من اكتمال الملف واستيفائه لمتطلبات التقديم.",
      step3T: "03 — القراءة والتقييم", step3B: "يتولى قارئ ناقد متخصص قراءة النص وإعداد تقييم احترافي يتناول عناصره الأساسية.",
      step4T: "04 — إعداد التقرير", step4B: "يتم إعداد تقرير مفصل يتضمن نقاط القوة وفرص التطوير والملاحظات العملية.",
      step5T: "05 — استلام النتائج", step5B: "يتلقى الكاتب تقريره ويبدأ رحلة تطوير النص بناءً على الملاحظات والتوصيات المقدمة.",

      partnershipEyebrow: "Strategic Partnership",
      partnershipTitle: "شراكة استراتيجية",
      partnershipBody: "نؤمن بدعم مجتمع صناعة السينما السعودية، لذلك نقدّم لأعضاء الجمعية مزايا حصرية على جميع خدمات تغطية النصوص",
      partnershipOffer: "خصم 15% لأعضاء ومنسوبي الجمعية",
      partnershipNote: "يُشترط إبراز بطاقة العضوية السارية عند الطلب",

      featureTitle: "تغطية النصوص السينمائية الطويلة",
      featureDescHtml: "يقدم هذا التقرير ملاحظات تفصيلية على الفيلم الطويل (حتى 120 صفحة). يشمل ذلك تقييمًا وملاحظات حول: " +
        "<strong>الفكرة، والموضوع وعنصر الجذب (Hook)، والرهانات الدرامية والحبكة، والشخصيات، والبناء الدرامي، والإيقاع، وقابلية الإنتاج، بالإضافة إلى التقييم العام.</strong>",
      featureLi1Html: "مدة التسليم: حتى 4 أسابيع <span class=\"ctype-card__note\">(سيتم احتساب مدة التسليم بعد اسناد نصك الى احد القراء وستصلك رسالة عبر الايميل حين الاسناد)</span>",

      shortTitle: "تغطية النصوص السينمائية القصيرة",
      shortDescHtml: "يقدم هذا التقرير ملاحظات تفصيلية على الفيلم القصير (حتى 50 صفحة). يشمل ذلك تقييمًا وملاحظات حول: " +
        "<strong>الفكرة، والموضوع وعنصر الجذب (Hook)، والرهانات الدرامية والحبكة، والشخصيات، والبناء الدرامي، والإيقاع، وقابلية الإنتاج، بالإضافة إلى التقييم العام.</strong>",
      shortLi1Html: "مدة التسليم: عادةً من 10 إلى 15 يومًا <span class=\"ctype-card__note\">(سيتم احتساب مدة التسليم بعد اسناد نصك الى احد القراء وستصلك رسالة عبر الايميل حين الاسناد)</span>",

      li2: "تقييمات وفق معايير الصناعة: Pass / Consider / Recommend",
      li3: "ملاحظات تفصيلية تتضمن اقتراحات عملية لتحسين النص السينمائي",
      li4: "منح النصوص السينمائية ذات التقييمات العالية فرصة إضافية للظهور والوصول إلى جهات في الصناعة",
      btnRequest: "اطلب التغطية", btnSample: "إطلع على نموذج التقرير",

      bannerHtml: "كل قصة تبدأ بمشهد أول<br>ونحن نبحث عن الكتّاب والقرّاء النقاد الذين يؤمنون بأن النصوص القوية هي أساس السينما.",
      bannerP: "سجّل اهتمامك اليوم لتكون من أوائل المهتمين بمنصة Scene One عند إطلاقها.",
      bannerBtn: "سجل اهتمامك",

      faqTitle: "الأسئلة الشائعة",
      faqQ1: "ما هي تغطية النصوص السينمائية؟",
      faqA1: "تغطية النصوص السينمائية (Script Coverage) هي تحليل مفصّل يقدّمه قارئ/ناقد مختص لعمل الكاتب. نشأت هذه الخدمة في الاستوديوهات حيث كان يُوظَّف قرّاء لقراءة عدد كبير من السيناريوهات نيابةً عن المنتجين. لكن خدمتنا في التغطية النقدية تختلف عن ذلك؛ فهدفنا الأساسي هو مساعدة الكتّاب على تطوير نصوصهم والوصول بها إلى مرحلة تجعلها جاهزة للإرسال إلى شركاء الصناعة، مع تقييم صريح لما ينجح وما لا ينجح وأسباب واضحة لكل رأي.",
      faqQ2: "ما هي خدمات التغطية التي نقدمها؟",
      faqA2: "نقدّم حاليًا نوعين من الملاحظات النقدية: تغطية النصوص السينمائية، حيث يدوّن الناقد ملاحظات بنّاءة تشمل الفكرة والموضوع (Premise & Theme)، عنصر الجذب (Hook)، المخاطر وتطور الحبكة (Stakes & Plot)، الشخصيات، البنية والإيقاع (Structure & Pace)، قابلية الإنتاج (Producibility)، والعرض العام، مع خاتمة تلخّص أبرز نقاط القوة والجوانب التي تحتاج إلى تحسين. وتغطية المعالجات (Treatments)، حيث يدوّن الناقد ملاحظات تمتد إلى صفحتين تشمل المحتوى، والـ logline، وبنية القصة، وأدوار الشخصيات، واقتراحات لتحسين عرضك التقديمي (Pitch).",
      faqQ3: "لماذا أحتاج إلى خدمة التغطية (Coverage)؟",
      faqA3: "من الصعب النظر إلى عملك بموضوعية تامة عندما تكون أنت المؤلف، لذلك توفّر خدمة التغطية نظرة موضوعية من شخص يفهم متطلبات الصناعة. وعند إرسال نصّك إلى استوديو أو وكيل أو منتج، فلن تتمكّن من الاطلاع على ملاحظات القارئ، مما يعني أنك لن تحصل على فرصة لمعالجة نقاط الضعف — أما من خلال هذه الخدمة فستحصل على هذه الفرصة.",
      faqQ4: "من هم Scene One؟",
      faqA4: "تأسست Scene One بهدف مساعدة كتّاب السيناريو الصاعدين على دخول صناعة الأفلام.",

      ctaH: "تواصل معنا", ctaSub: "للإستفسارات والأسئلة المتعلقة بالخدمة",

      footerCopyHtml: "© 2026 جميع الحقوق محفوظة لـSCENE ONE.<br><span class=\"footer__cr\">الرقم الموحد: 7054791293</span>",
      footerPrivacy: "سياسة الخصوصية", footerTerms: "الشروط والأحكام",

      regTitle: "سجّل اهتمامك", regDesc: "كن من أوائل المهتمين بمنصة Scene One عند إطلاقها.",
      fName: "الاسم الكامل", fNamePh: "اكتب اسمك", errName: "الاسم مطلوب",
      fEmail: "البريد الإلكتروني", errEmail: "البريد الإلكتروني غير صحيح",
      fPhone: "رقم الجوال", optWord: "(اختياري)",
      fType: "نوع الاهتمام", typeSelectPh: "اختر نوع الاهتمام", errType: "اختر نوع الاهتمام",
      typeWriter: "كاتب", typeReader: "قارئ ناقد", typePartner: "شريك صناعة", typeOther: "أخرى",
      fNotes: "ملاحظات", fNotesPh: "أخبرنا المزيد عن اهتمامك",
      submitBtn: "إرسال"
    },
    en: {
      navHome: "Home", navAbout: "Scene One", navReaders: "Who Reads Your Script?",
      navJourney: "Script Journey", navGuide: "Platform Guide", navContact: "Contact Us",
      menuLabel: "Menu", closeLabel: "Close",

      overlayTag: "Scene One / 2026",
      overlayBlurb: "A specialized platform for screenplay evaluation, offering professional feedback that helps writers develop and refine their work before their next step.",
      overlayContact: "Contact", overlaySocial: "Follow Us",

      heroTitle: "Where Your Script's Journey Begins",
      heroSub: "Professional screenplay coverage and development notes, delivered by experienced writers and film professionals.",
      btnViewCoverage: "View Coverages", btnGuide: "Platform Guide",
      heroNda: "All submissions are protected under non-disclosure agreements (NDA) and are only accessed by the assigned reader.",
      partnerBadge: "Accredited partner of the Cinema Association",

      quoteHtml: "Every story deserves a real chance to evolve.<br>" +
        "Scene One gives you a professional perspective on your script through specialized coverage and detailed reports, helping you identify strengths, address weaknesses, and move forward with clarity and confidence.",

      aboutTitle: "From Idea to Script",
      aboutP1: "Many writers have promising ideas and scripts with real potential. But developing a screenplay takes more than writing alone.",
      aboutP2: "At different stages, writers often need professional, critical feedback — the kind that helps them see their work from a new perspective, identify strengths, and uncover opportunities for improvement before moving forward.",
      aboutP3: "That's why Scene One exists. We provide specialized evaluations and detailed reports designed to help writers refine their scripts and make more confident, informed decisions throughout their creative journey.",

      cardWritersAlt: "For Writers", cardProducersAlt: "Industry Partners", cardCinemaAlt: "Saudi Cinema",
      cardWritersImg: "assets/card_writers-en.png", cardProducersImg: "assets/card_producers-en.png", cardCinemaImg: "assets/card_cinema-en.png",

      journeyTitle: "Script Journey",
      step1T: "01 — Submission", step1B: "The writer submits their screenplay and provides the essential project details.",
      step2T: "02 — Initial Review", step2B: "We verify that the submission is complete and meets all requirements.",
      step3T: "03 — Reading & Evaluation", step3B: "A specialized reader reviews the script and prepares a professional evaluation covering its core elements.",
      step4T: "04 — Report Preparation", step4B: "A detailed report is created, highlighting strengths, areas for improvement, and development opportunities.",
      step5T: "05 — Delivery", step5B: "The writer receives the report and begins the next stage of development with clear, actionable insights.",

      partnershipEyebrow: "Strategic Partnership",
      partnershipTitle: "Strategic Partnership",
      partnershipBody: "We believe in supporting Saudi Arabia's cinema industry, which is why we offer Cinema Association members exclusive benefits on all script coverage services.",
      partnershipOffer: "15% off for Association members and staff",
      partnershipNote: "A valid membership card must be presented when requesting coverage",

      featureTitle: "Feature Film Coverage",
      featureDescHtml: "Provides detailed feedback on feature-length scripts (up to 120 pages), including: " +
        "<strong>concept and premise, hook and originality, dramatic stakes and structure, characters, structure and pacing, production viability, and an overall assessment.</strong>",
      featureLi1Html: "Turnaround: up to 4 weeks <span class=\"ctype-card__note\">(the timeline begins once your script is assigned to a reader; you'll be notified by email when that happens)</span>",

      shortTitle: "Short Film Coverage",
      shortDescHtml: "Provides detailed feedback on short film scripts (up to 50 pages), including: " +
        "<strong>concept and premise, hook and originality, dramatic stakes and structure, characters, structure and pacing, production viability, and an overall assessment.</strong>",
      shortLi1Html: "Turnaround: typically 10–15 days <span class=\"ctype-card__note\">(the timeline begins once your script is assigned to a reader; you'll be notified by email when that happens)</span>",

      li2: "Industry-standard ratings: Pass / Consider / Recommend",
      li3: "Detailed, actionable notes to improve your screenplay",
      li4: "High-rated scripts may receive additional exposure and access to industry contacts",
      btnRequest: "Request Coverage", btnSample: "View Sample Report",

      bannerHtml: "Every story begins with a scene.<br>We're looking for writers and readers who believe great scripts are the foundation of great films.",
      bannerP: "Register your interest today and be among the first to access Scene One at launch.",
      bannerBtn: "Register Your Interest",

      faqTitle: "Frequently Asked Questions",
      faqQ1: "What is script coverage?",
      faqA1: "Script coverage is a detailed analysis of a writer's work, prepared by a specialized reader. The practice began in studios, where readers were hired to read large volumes of scripts on behalf of producers. Our coverage service is different: our core goal is to help writers develop their scripts to a stage where they're ready to send to industry partners, with a candid assessment of what's working, what isn't, and clear reasoning behind every note.",
      faqQ2: "What coverage services do we offer?",
      faqA2: "We currently offer two types of critical feedback: Script Coverage, where the reader provides constructive notes on premise and theme, hook, stakes and plot, characters, structure and pace, producibility, and an overall assessment, with a closing summary of the key strengths and areas that need improvement. And Treatment Coverage, where the reader provides notes spanning two pages, covering content, logline, story structure, character roles, and suggestions for strengthening your pitch.",
      faqQ3: "Why do I need coverage?",
      faqA3: "It's difficult to look at your own work with complete objectivity as the author, so coverage offers an objective view from someone who understands what the industry expects. When you submit your script to a studio, agent, or producer, you won't see the reader's notes — meaning you won't get the chance to address any weaknesses. This service gives you that chance.",
      faqQ4: "Who is Scene One?",
      faqA4: "Scene One was founded to help emerging screenwriters break into the film industry.",

      ctaH: "Get in Touch", ctaSub: "For inquiries and questions about our services",

      footerCopyHtml: "© 2026 All rights reserved to SCENE ONE.<br><span class=\"footer__cr\">Unified National Number: 7054791293</span>",
      footerPrivacy: "Privacy Policy", footerTerms: "Terms & Conditions",

      regTitle: "Register Your Interest", regDesc: "Be among the first to access Scene One at launch.",
      fName: "Full Name", fNamePh: "Enter your name", errName: "Name is required",
      fEmail: "Email", errEmail: "Invalid email address",
      fPhone: "Phone Number", optWord: "(optional)",
      fType: "Type of Interest", typeSelectPh: "Select interest type", errType: "Please select a type",
      typeWriter: "Writer", typeReader: "Script Reader", typePartner: "Industry Partner", typeOther: "Other",
      fNotes: "Notes", fNotesPh: "Tell us more about your interest",
      submitBtn: "Submit"
    }
  };

  function dict() { return T[LANG] || T.ar; }

  function applyLang(lang) {
    LANG = (lang === "en") ? "en" : "ar";
    try { localStorage.setItem(LANG_KEY, LANG); } catch (e) {}

    var html = document.documentElement;
    html.setAttribute("lang", LANG);
    html.setAttribute("dir", LANG === "ar" ? "rtl" : "ltr");
    document.title = TITLES[LANG];

    var d = dict();

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (d[k] != null) el.textContent = d[k];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-html");
      if (d[k] != null) el.innerHTML = d[k];
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-alt");
      if (d[k] != null) el.setAttribute("alt", d[k]);
    });
    document.querySelectorAll("[data-i18n-src]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-src");
      if (d[k] != null) el.setAttribute("src", d[k]);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-ph");
      if (d[k] != null) el.setAttribute("placeholder", d[k]);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-aria");
      if (d[k] != null) el.setAttribute("aria-label", d[k]);
    });

    // .footer__copy carries dir="rtl" in the markup on purpose (see comment there):
    // it keeps the Arabic reading order from scrambling around the Latin "SCENE
    // ONE" inside an LTR-structured footer row. That reasoning only applies to
    // Arabic text; in English the line is already Latin, so it should read ltr.
    document.querySelectorAll(".footer__copy").forEach(function (el) {
      el.setAttribute("dir", LANG === "ar" ? "rtl" : "ltr");
    });

    document.querySelectorAll(".lang-toggle").forEach(function (btn) {
      btn.textContent = LANG === "ar" ? "EN" : "AR";
      btn.setAttribute("aria-label", LANG === "ar" ? "Switch to English" : "التبديل إلى العربية");
    });
  }

  document.querySelectorAll(".lang-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () { applyLang(LANG === "ar" ? "en" : "ar"); });
  });

  applyLang(LANG);

  window.SceneOneI18n = { lang: function () { return LANG; }, dict: dict };
})();
