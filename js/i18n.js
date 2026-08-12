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

  // Per-page <title>. Keyed by a data-i18n-doctitle on the <title> element
  // itself, so this file doesn't need to know which page it's running on —
  // each page just names its own key (see T.ar/T.en "docTitle*" entries).
  // Falls back to the landing page's title if a page doesn't opt in.
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
      submitBtn: "إرسال",

      // ---- readers.html (About Us / Reader Team) ----
      docTitleReaders: "تعرّف على قصتنا — Scene One",
      auHeroTitleHtml: "تعرف على<br>قصتنا",
      auAboutLabelWord: "عن",
      auAboutP1: "تأسست Scene One عام 2026 إيمانًا بأن السينما السعودية تبدأ من النص. جاءت الفكرة من تجربة شخصية عاشها أحد مؤسسي المنصة، بعد سنوات من كتابة السيناريو ومحاولات إيصال النصوص إلى شركات الإنتاج والوكلاء. كانت تلك المحاولات تنتهي غالبًا بالصمت؛ فلا ملاحظات، ولا توجيه، ولا حتى فرصة لمعرفة ما إذا كان النص قد قُرِئ أصلًا.",
      auAboutP2: "لاحقًا، غيّرت تجربة الحصول على أول تقرير تغطية سينمائية احترافي نظرته إلى رحلة الكاتب بالكامل. للمرة الأولى، شعر أن هناك من فهم الفيلم الذي كان يحاول كتابته، ورأى ما بين السطور، وقدّم القارئ/الناقد ملاحظات ساعدته على التعبير عنه بصورة أوضح.",
      auAboutP3: "ومن هنا وُلدت Scene One؛ لتمنح الكتّاب ما كان ينقصهم في بداية رحلتهم: قارئًا محترفًا يفهم النص، ويقدّم تغطية وملاحظات تطويرية صادقة، تساعد الكاتب على الوصول إلى أفضل نسخة ممكنة من عمله، قبل أن يصل إلى المنتج أو جهة التمويل أو الشاشة.",
      auTeamTitle: "فريق القرّاء",
      haifaName: "هيفاء السيد", haifaRole: "قارئة نصوص ومستشارة تطوير",
      haifaBio: "كاتبة سيناريو متخصصة في الدراما النفسية والاجتماعية. تضم أعمالها مشاريع حائزة على جوائز وعُرضت في مهرجانات ومنصات دولية، مع خبرة في تطوير أفلام ومسلسلات ترتكز على الشخصيات والعمق الإنساني.",
      fajrName: "فجر الفرحان", fajrRole: "قارئة نصوص سينمائية",
      fajrBio: "متخصصة في السينما والفنون الأدائية، بخبرة في كتابة السيناريو والإنتاج الإبداعي والسرد البصري. تركّز في قراءاتها على بناء القصة، واللغة البصرية، والأثر العاطفي للنص.",

      // ---- about-coverage.html ----
      docTitleCoverage: "عن تغطية النصوص السينمائية — Scene One",
      covHeroTitle: "عن تغطية النصوص السينمائية", covHeroSub: "دليل واضح للكتّاب والمبدعين",
      covTag1: "للكتّاب والمخرجين وصنّاع الأفلام", covTag2: "وقت القراءة: ٩ دقائق", covTag3: "تطوير النصوص السينمائية",
      covWhatTitle: "ما هي تغطية النصوص السينمائية؟",
      covWhatP1: "الكتابة رحلة طويلة يقضي خلالها الكاتب وقتًا مع شخصياته وأفكاره، محاولًا أن يحوّل ما يشعر به إلى قصة تصل للآخرين. لكن يبقى السؤال الأهم: هل نجح النص في إيصال فكرته وأثره إلى القارئ؟",
      covWhatP2: "هنا يأتي دور تغطية النص. وهي قراءة مهنية للنص السينمائي، يقدّمها قارئ مختص من خلال تقرير يوضّح نقاط القوة، والجوانب التي تحتاج إلى تطوير، وما قد لا يصل للقارئ بالشكل المقصود.",
      covReaderTitle: "من هو القارئ في منصة SCENE ONE",
      covReaderP1: "من يقف وراء هذه الملاحظات والتحليلات؟ غالبًا ما يكونون مجموعةً من المحترفين ذوي الخبرة والمواهب الصاعدة في صناعة السينما. هؤلاء هم قرّاء النصوص أو مستشارو السيناريو. وفي أفضل الحالات، يكونون كتّابًا أو صنّاع أفلام لديهم خبرة فعلية في مشاريع أُنتجت أو نُشرت، ما يمنحهم معرفة عميقة تساعدهم على تقديم ملاحظات دقيقة وقادرة على تطوير النص بشكل ملموس.",
      covReaderP2: "لكن الأمر لا يقتصر على أصحاب الخبرات الطويلة فقط. فهناك أيضًا أصوات جديدة في المجال، مثل المشاركين في برامج الإرشاد والتدريب أو الكتّاب الطموحين الذين ما زالوا في بداية مسيرتهم. هؤلاء يقدّمون وجهات نظر جديدة ومختلفة، ويخوضون بدورهم رحلة التعلّم نحو الاحتراف.",
      covReaderP3: "صحيح أن الخبرة تلعب دورًا مهمًا في عمق الملاحظات وجودتها، إلا أن وجود هذه المواهب الصاعدة ضروري للحفاظ على حيوية الصناعة وتنوّعها. سواء كان القارئ خبيرًا أمضى سنوات طويلة في المجال أو موهبة واعدة في بداياتها، فإن لكلٍّ منهم دورًا فريدًا في المساهمة بصناعة القصص التي نحبها.",
      covReportTitle: "ماذا يحتوي التقرير؟",
      covReportP1: "تخيّل التغطية السينمائية كخريطة تفصيلية لنصك، تُسلّط الضوء على عناصره المختلفة مثل الأصالة، والحبكة، والشخصيات، والإيقاع، والثيم، والنبرة، إلى جانب عناصر أساسية أخرى كمنطق الأحداث وجودة التنفيذ. يُقيّم كل عنصر على حدة، لكن قيمته الحقيقية تظهر عند النظر إلى كيفية تفاعله مع بقية العناصر، لتكوين صورة متكاملة عن نقاط قوة النص وإمكاناته وفرص تطويره.",
      covAspectsHeading: "أهم جوانب التقييم والتحليل",
      covAspect1Html: "<strong>1. جانب تطويري:</strong> يركّز على تحسين المسودة وتحديد أولويات التعديل.",
      covAspect2Html: "<strong>2. جانب تجهيزي:</strong> معرفة ما إذا كان النص مناسبًا للتقديم إلى جهات الإنتاج، المسابقات، المعامل أو صناديق الدعم.",
      covAspect3Html: "<strong>3. جانب إنتاجي:</strong> النظر إلى حجم التنفيذ والتحديات الإنتاجية.",
      covAspect4Html: "<strong>4. جانب سوقي:</strong> تحديد الجمهور، النوع، ومدى ملاءمته للسوق السعودي.",
      covGradesTitle: "درجات التقييم في التغطية السينمائية", covGradesSub: "قراءة ما وراء الأرقام والتوصيات",
      covGradesP1: "التغطية السينمائية تجمع بين التقييم الموضوعي والانطباع الشخصي للقارئ. يمكن النظر إلى التقييم على أنه انعكاس لمدى استجابة القارئ للنص؛ أحيانًا يكون إشادة بنقاط قوته، وأحيانًا أخرى دعوة لتطوير بعض جوانبه. لذلك نادرًا ما تكون نتائج التقييم حاسمة أو مطلقة، بل تقع غالبًا في مساحة أوسع من التدرّج والتفسير.",
      covGradePass: "يشير هذا التقييم إلى أن النص يحتاج إلى مزيد من التطوير قبل أن يصبح جاهزًا. غالبًا ما تتعلق الملاحظات بعناصر مثل الحبكة، أو الشخصيات، أو الأصالة.",
      covGradeConsider: "يعني أن النص يحتوي على عناصر واعدة تستحق الاهتمام، لكنه لا يزال بحاجة إلى بعض التحسينات للوصول إلى إمكاناته الكاملة.",
      covGradeRecommend: "أعلى درجات التقييم، ويُمنح للنصوص التي تتميز بقصة قوية وتنفيذ متقن. ومع ذلك، يظل هناك دائمًا مجال للتطوير والتحسين.",
      covReportImgAlt: "نموذج تقرير التغطية السينمائية من Scene One", covReportCaption: "مثال بصري يوضح شكل التقرير",
      covTocLabel: "في هذه الصفحة", covTocGrades: "درجات التقييم"
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
      submitBtn: "Submit",

      // ---- readers.html (About Us / Reader Team) ----
      docTitleReaders: "About Us — Scene One",
      auHeroTitleHtml: "About Us",
      auAboutLabelWord: "About",
      auAboutP1: "Scene One was founded in 2026 on the belief that Saudi cinema begins with the script. The idea came from a personal experience of one of the founders, after years of writing screenplays and trying to get scripts into the hands of production companies and agencies. Most of those attempts ended in silence. No feedback. No guidance. No way of knowing whether the script had even been read.",
      auAboutP2: "That changed after receiving a professional coverage report for the first time. It offered a clear, industry-level perspective on the script, revealing how others interpreted the work, and highlighting what was working and what needed improvement. It became easier to see the script more objectively, and to move forward with clarity. From that experience, Scene One was built.",
      auAboutP3: "A platform designed to give writers — especially those at the beginning of their journey — access to professional readers who understand scripts and provide structured, honest development feedback. Helping writers reach the strongest possible version of their work before it moves toward production or funding.",
      auTeamTitle: "Readers Profile",
      haifaName: "Haifa Alsaeed", haifaRole: "Script Reader & Development Consultant",
      haifaBio: "Screenwriter specializing in psychological and social narratives. Her work has been featured in festivals and international platforms, with experience in developing both films and series. Her approach focuses on character depth and human-driven storytelling.",
      fajrName: "Fajr Alfarhan", fajrRole: "Script Reader",
      fajrBio: "Specialized in film and performing arts, with experience in screenwriting, creative production, and visual storytelling. Her analysis focuses on story structure, visual language, and the emotional impact of the script.",

      // ---- about-coverage.html ----
      docTitleCoverage: "About Screenplay Coverage — Scene One",
      covHeroTitle: "About Screenplay Coverage", covHeroSub: "A clear guide for writers and creatives",
      covTag1: "For writers, directors, and filmmakers", covTag2: "Reading time: 9 minutes", covTag3: "Developing screenplays",
      covWhatTitle: "What is Screenplay Coverage?",
      covWhatP1: "Writing is a long journey. A writer lives with their characters and ideas, trying to turn what they feel into a story that reaches others. But the key question remains: has the script succeeded in delivering its idea and emotional impact to the reader?",
      covWhatP2: "This is where screenplay coverage comes in. It is a professional evaluation of a script by a specialized reader, presented in a report that highlights strengths, identifies areas for improvement, and points out what may not be clearly reaching the audience.",
      covReaderTitle: "Who is the Reader at Scene One?",
      covReaderP1: "Who stands behind these notes and evaluations? They are typically professionals with experience and emerging talent in the film industry: script readers, screenwriters, or development consultants. In many cases, they are writers or filmmakers with hands-on experience in projects that have been produced or published, giving them the depth needed to provide precise, actionable feedback that helps improve a script in a tangible way.",
      covReaderP2: "However, it's not limited to highly experienced professionals. There are also emerging voices in the field, participants in mentorship programs or aspiring writers at the beginning of their journey. They bring fresh perspectives and evolving viewpoints as they grow into the craft.",
      covReaderP3: "Experience certainly plays a key role in the depth and quality of feedback. At the same time, supporting emerging talent is essential to sustaining the industry's growth. Whether a reader is highly experienced or an emerging voice, each contributes in a meaningful way to shaping the stories that move forward.",
      covReportTitle: "What Does the Report Include?",
      covReportP1: "Screenplay coverage acts as a detailed map of your script. It highlights key elements such as originality, plot, characters, pacing, tone, and structure, along with aspects like narrative logic and execution quality. Each element is evaluated individually, but its true value comes from how it interacts with the rest, creating a complete picture of the script's strengths, potential, and areas for development.",
      covAspectsHeading: "Key Areas of Evaluation & Analysis",
      covAspect1Html: "<strong>1. Developmental Perspective:</strong> Focuses on improving the draft and identifying revision priorities.",
      covAspect2Html: "<strong>2. Readiness Perspective:</strong> Evaluates whether the script is ready for submission to production companies, labs, competitions, or funding opportunities.",
      covAspect3Html: "<strong>3. Production Perspective:</strong> Considers scope of execution and potential production challenges.",
      covAspect4Html: "<strong>4. Market Perspective:</strong> Identifies the target audience, genre positioning, and suitability for the Saudi market.",
      covGradesTitle: "Coverage Scoring System", covGradesSub: "A closer look beyond the numbers and recommendations",
      covGradesP1: "Screenplay coverage combines objective evaluation with the reader's personal response. The rating reflects how the script resonates with the reader, sometimes highlighting its strengths, and other times pointing to areas that need further development. For this reason, ratings are rarely absolute or definitive, and typically exist within a broader spectrum of interpretation and judgment.",
      covGradePass: "This indicates that the script requires further development before it is ready. Feedback often focuses on elements such as plot, characters, or originality.",
      covGradeConsider: "This means the script shows promise and contains compelling elements, but still needs refinement to reach its full potential.",
      covGradeRecommend: "The highest rating. Given to scripts with a strong concept and solid execution. Even at this level, there is always room for further development and enhancement.",
      covReportImgAlt: "Sample screenplay coverage report from Scene One", covReportCaption: "A visual example of the report format",
      covTocLabel: "On this page", covTocGrades: "Ratings"
    }
  };

  function dict() { return T[LANG] || T.ar; }

  function applyLang(lang) {
    LANG = (lang === "en") ? "en" : "ar";
    try { localStorage.setItem(LANG_KEY, LANG); } catch (e) {}

    var html = document.documentElement;
    html.setAttribute("lang", LANG);
    html.setAttribute("dir", LANG === "ar" ? "rtl" : "ltr");
    var d = dict();
    var titleKey = document.querySelector("title").getAttribute("data-i18n-doctitle");
    document.title = (titleKey && d[titleKey] != null) ? d[titleKey] : TITLES[LANG];

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

    // Both languages are always shown (.lang-btn[data-lang]); mark whichever
    // matches the current one active rather than swapping button text.
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === LANG);
    });
  }

  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { applyLang(btn.getAttribute("data-lang")); });
  });

  applyLang(LANG);

  window.SceneOneI18n = { lang: function () { return LANG; }, dict: dict };
})();
