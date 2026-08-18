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
    ar: "Scene One | حيث تبدأ رحلة النص",
    en: "Scene One | Where Your Script's Journey Begins"
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
      heroSub: "تغطية سينمائية احترافية وملاحظات تطويرية يقدّمها كتّاب ومطوّرو نصوص وصنّاع أفلام، لاكتشاف كتّاب السيناريو الواعدين وإطلاق مسيرتهم في صناعة السينما.",
      btnViewCoverage: "عرض التغطيات", btnGuide: "دليل المنصة",
      heroNda: "جميع النصوص تخضع لاتفاقيات عدم إفصاح (NDA)، ولا يطّلع عليها سوى القارئ المكلّف بتقييمها.",
      partnerBadge: "شريك معتمد",

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
      docTitleReaders: "تعرّف على قصتنا | Scene One",
      // Video hero (2026-08-13). auHeroTitleHtml is the PREVIOUS title, kept
      // because nothing references it now — delete it if the hero settles.
      auHeroTitleHtml: "تعرف على<br>قصتنا",
      auHeroTitle: "هنا<br>Scene One",
      auHeroBadge: "تغطية سينمائية احترافية<br>لكتّاب السيناريو",
      auAboutLabelWord: "عن",
      auAboutP1: "تأسست Scene One عام 2026 إيمانًا بأن السينما السعودية تبدأ من النص. جاءت الفكرة من تجربة شخصية عاشها أحد مؤسسي المنصة، بعد سنوات من كتابة السيناريو ومحاولات إيصال النصوص إلى شركات الإنتاج والوكلاء. كانت تلك المحاولات تنتهي غالبًا بالصمت؛ فلا ملاحظات، ولا توجيه، ولا حتى فرصة لمعرفة ما إذا كان النص قد قُرِئ أصلًا.",
      auAboutP2: "لاحقًا، غيّرت تجربة الحصول على أول تقرير تغطية سينمائية احترافي نظرته إلى رحلة الكاتب بالكامل. للمرة الأولى، شعر أن هناك من فهم الفيلم الذي كان يحاول كتابته، ورأى ما بين السطور، وقدّم القارئ/الناقد ملاحظات ساعدته على التعبير عنه بصورة أوضح.",
      auAboutP3: "ومن هنا وُلدت Scene One؛ لتمنح الكتّاب ما كان ينقصهم في بداية رحلتهم: قارئًا محترفًا يفهم النص، ويقدّم تغطية وملاحظات تطويرية صادقة، تساعد الكاتب على الوصول إلى أفضل نسخة ممكنة من عمله، قبل أن يصل إلى المنتج أو جهة التمويل أو الشاشة.",
      auTeamTitle: "فريق القرّاء",
      haifaName: "هيفاء السيد", haifaRole: "قارئة نصوص ومستشارة تطوير",
      haifaBio: "كاتبة سيناريو متخصصة في الدراما النفسية والاجتماعية. تضم أعمالها مشاريع حائزة على جوائز وعُرضت في مهرجانات ومنصات دولية، مع خبرة في تطوير أفلام ومسلسلات ترتكز على الشخصيات والعمق الإنساني.",
      widName: "ود القبلان", widRole: "قارئة رئيسية",
      widBio: "كاتبة سيناريو، منتجة تطوير، وقائدة عمل (showrunner) تهتم بالمحتوى المرئي ومدى تأثيره عاطفيًا على الجمهور. بشغفها بالأفلام وفن صناعة القصص، تقرأ ود النصوص بعينٍ تبحث عما ينجح في القصة، وما يمكن تطويره، وأين تكمن قوتها سرديًا، إيمانًا منها بدور القصة الجيدة في إثراء السينما السعودية.",
      fajrName: "فجر الفرحان", fajrRole: "قارئة نصوص سينمائية",
      fajrBio: "متخصصة في السينما والفنون الأدائية، بخبرة في كتابة السيناريو والإنتاج الإبداعي والسرد البصري. تركّز في قراءاتها على بناء القصة، واللغة البصرية، والأثر العاطفي للنص.",

      // ---- about-coverage.html ----
      docTitleCoverage: "عن تغطية النصوص السينمائية | Scene One",
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
      covAspect3Html: "<strong>3. منظور الإنتاج:</strong> يقيّم نطاق التنفيذ، الميزانية، والتحديات الإنتاجية المحتملة.",
      covAspect4Html: "<strong>4. جانب سوقي:</strong> تحديد الجمهور، النوع، ومدى ملاءمته للسوق السعودي.",
      covGradesTitle: "درجات التقييم في التغطية السينمائية", covGradesSub: "قراءة ما وراء الأرقام والتوصيات",
      covGradesP1: "التغطية السينمائية تجمع بين التقييم الموضوعي والانطباع الشخصي للقارئ. يمكن النظر إلى التقييم على أنه انعكاس لمدى استجابة القارئ للنص؛ أحيانًا يكون إشادة بنقاط قوته، وأحيانًا أخرى دعوة لتطوير بعض جوانبه. لذلك نادرًا ما تكون نتائج التقييم حاسمة أو مطلقة، بل تقع غالبًا في مساحة أوسع من التدرّج والتفسير.",
      covGradePass: "يشير هذا التقييم إلى أن النص يحتاج إلى مزيد من التطوير قبل أن يصبح جاهزًا. غالبًا ما تتعلق الملاحظات بعناصر مثل الحبكة، أو الشخصيات، أو الأصالة.",
      covGradeConsider: "يعني أن النص يحتوي على عناصر واعدة تستحق الاهتمام، لكنه لا يزال بحاجة إلى بعض التحسينات للوصول إلى إمكاناته الكاملة.",
      covGradeRecommend: "أعلى درجات التقييم، ويُمنح للنصوص التي تتميز بقصة قوية وتنفيذ متقن. ومع ذلك، يظل هناك دائمًا مجال للتطوير والتحسين.",
      covReportImgAlt: "نموذج تقرير التغطية السينمائية من Scene One", covReportCaption: "مثال بصري يوضح شكل التقرير",
      covTocLabel: "في هذه الصفحة", covTocGrades: "درجات التقييم",

      // ---- terms.html ----
      docTitleTerms: "الشروط والأحكام | Scene One",
      termsHeroTitle: "الشروط والأحكام",
      termsDefsTitle: "التعريفات",
      termsDefsHtml: "<li>الخدمة | المنصّة: منصّة (Scene One) الإلكترونية المعنيّة بتقييم النصوص السينمائية وربط الكتّاب بفرص التطوير والإنتاج.</li>" +
        "<li>المستخدم / الكاتب: أي شخص يقوم بإنشاء حساب أو تقديم نصّ عبر المنصّة.</li>" +
        "<li>القارئ الناقد: المختصّ الذي تعتمده الخدمة لقراءة النصوص وتقييمها.</li>" +
        "<li>التقرير: الوثيقة الكتابية التي يصدرها القارئ الناقد بعد قراءة النص.</li>" +
        "<li>النص: أي عمل سينمائي مكتوب يُقدَّم للخدمة (سيناريو فيلم قصير أو روائي طويل).</li>" +
        "<li>الشريك الإنتاجي: جهة إنتاجية متعاقدة مع (Scene One) لاستلام النصوص المرشَّحة.</li>",
      termsUseTitle: "شروط الاستخدام",
      termsUseHtml: "<li>باستخدامك لمنصّة (Scene One) أو تقديم نصّك عبرها، فإنك تُقرّ بأنك قرأت هذه الشروط وفهمتها ووافقت عليها بالكامل. إذا كنت لا توافق على أيّ بند من بنودها، يُرجى عدم استخدام الخدمة.</li>" +
        "<li>يجب أن يكون عمر المستخدم ثمانية عشر عاماً فأكثر، أو أن يحصل على موافقة وليّه القانوني قبل استخدام الخدمة.</li>" +
        "<li>تحتفظ (Scene One) بحقّ تعديل هذه الشروط في أيّ وقت، وستُبلّغ التعديلات عبر البريد الإلكتروني أو عبر إشعار داخل المنصّة قبل سريانها بمدّة معقولة.</li>" +
        "<li>بإرسالك أي محتوى أو سيناريو عبر منصة (Scene One)، فإنك تقرّ بالتزامك بجميع الأنظمة واللوائح المعمول بها في المملكة العربية السعودية، بما في ذلك نظام الإعلام المرئي والمسموع، وتتحمّل كامل المسؤولية عن توافق المحتوى المقدم مع هذه الأنظمة. للاطلاع على النظام <a href=\"https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/ed5fdbc0-c183-4a8a-a8b7-a9ed004b5900/1?utm_source\" target=\"_blank\" rel=\"noopener noreferrer\">انقر هنا</a></li>",
      termsServiceTitle: "تعريف الخدمة",
      termsServiceLead: "تقدّم (Scene One) خدمة قراءة احترافية ونقدية للنصوص السينمائية، تشمل:",
      termsServiceHtml: "<li>قراءة كاملة للنصّ من قِبَل قارئ ناقد مؤهَّل.</li>" +
        "<li>إصدار تقرير تقييم تفصيلي يشمل الفكرة والحبكة والشخصيات والحوار والإيقاع والإمكانية الإنتاجية.</li>" +
        "<li>تصنيف صريح للنصّ ضمن إحدى الفئات الثلاث: <strong>موصى به</strong>، <strong>معتبر</strong>، أو <strong>بحاجة الى تطوير</strong>.</li>" +
        "<li>ترشيح النصوص الحاصلة على توصية قوية إلى الشركاء الإنتاجيين، بعد موافقة الكاتب الصريحة.</li>",
      termsServiceNote: "<strong>الخدمة لا تشمل</strong>: إعادة كتابة النصّ، أو تطويره، أو تحريره، أو ضمان قبوله من قبل أيّ جهة إنتاجية. Scene One تقدّم قراءة نقدية احترافية فقط.",
      termsIpTitle: "الملكية الفكرية",
      termsIpLead: "بند جوهري: الكاتب هو المالك الكامل والوحيد لجميع حقوق الملكية الفكرية للنصّ الذي يقدّمه. لا تدّعي Scene One أيّ ملكية على النصّ في أيّ مرحلة من مراحل الخدمة. عند تقديم النصّ، يمنح الكاتب Scene One ترخيصاً محدوداً وغير حصري، يقتصر استخدامه على:",
      termsIpHtml: "<li>قراءة النصّ وتقييمه من قبل القارئ الناقد المعتمَد.</li>" +
        "<li>تخزينه بصورة آمنة على خوادم الخدمة طوال مدّة الاشتراك أو حتى يطلب الكاتب حذفه.</li>" +
        "<li>مشاركة النصّ مع الشركاء الإنتاجيين فقط بعد موافقة الكاتب الكتابية الصريحة، وذلك في حال حصوله على توصية ودخوله مرحلة الترشيح.</li>",
      termsIpNote1: "لا يحقّ لمقدم الخدمة استخدام النصّ لأيّ غرض آخر، ولا نشره، ولا توزيعه، ولا اقتباس أيّ جزء منه دون إذن صريح ومسبق من الكاتب.",
      termsIpNote2: "يُنصح الكاتب بشدّة بتسجيل نصّه لدى الهيئة السعودية للملكية الفكرية (SAIP) قبل تقديمه لأيّ جهة كانت.",
      termsConfTitle: "سرية النصوص والمواد المقدمة",
      termsConfHtml: "<p>تُدرك Scene One أن النصوص المقدمة عبر المنصة قد تتضمن أعمالًا أصلية وأفكارًا إبداعية تتمتع بالحماية بموجب أنظمة الملكية الفكرية المعمول بها. وعليه، تلتزم المنصة باتخاذ الإجراءات المعقولة للحفاظ على سرية النصوص وعدم إتاحتها إلا للأشخاص المخولين بالاطلاع عليها لغرض تقديم الخدمة.</p>" +
        "<p>كما يلتزم جميع القرّاء النقاد والمتعاونين المعتمدين من قبل Scene One بالحفاظ على سرية النصوص والمواد المقدمة، وعدم نسخها أو تداولها أو نشرها أو الإفصاح عنها أو إتاحتها لأي طرف ثالث خارج نطاق التقييم أو تقديم الخدمة.</p>" +
        "<p>وفي حال قيام أي قارئ ناقد أو متعاون بالإفصاح عن النص أو تسريبه أو استغلاله أو استخدامه أو مشاركته بأي صورة غير مصرح بها، فإنه يتحمل المسؤولية القانونية الكاملة تجاه صاحب النص عن أي أضرار أو مطالبات أو حقوق قد تنشأ نتيجة لذلك، دون الإخلال بحق Scene One في اتخاذ الإجراءات المناسبة، بما في ذلك إنهاء التعاون معه أو منعه من استخدام المنصة مستقبلاً.</p>" +
        "<p>ولا يُفسر تمكين القارئ الناقد أو المتعاون من الاطلاع على النص على أنه نقل أو تنازل أو ترخيص بأي حق من حقوق الملكية الفكرية المتعلقة به، والتي تبقى مملوكة بالكامل لصاحب النص.</p>",
      termsAiTitle: "استخدام أدوات الذكاء الاصطناعي",
      termsAiHtml: "<p>يلتزم القارئ الناقد بعدم إدخال النصوص أو أي جزء منها في أي أداة أو خدمة تعتمد على الذكاء الاصطناعي أو معالجة المحتوى الآلية، سواء لأغراض التقييم أو التلخيص أو التحليل أو إعادة الصياغة أو لأي غرض آخر، ما لم يحصل على موافقة كتابية مسبقة من Scene One.</p>" +
        "<p>ويهدف هذا الالتزام إلى حماية سرية النصوص والحقوق الفكرية الخاصة بأصحابها، وضمان أن تستند التقييمات المقدمة من خلال المنصة إلى القراءة والتحليل المهني المباشر للقارئ الناقد.</p>" +
        "<p>ويُعد أي استخدام غير مصرح به لأدوات الذكاء الاصطناعي فيما يتعلق بالنصوص المقدمة عبر المنصة مخالفة جوهرية لهذه الشروط، ويمنح Scene One الحق في إنهاء التعاون مع القارئ الناقد واتخاذ الإجراءات المناسبة وفق الأنظمة المعمول بها.</p>",
      termsFeesTitle: "الرسوم والدفع",
      termsFeesLead: "تعمل (Scene One) وفق النموذج التالي:",
      termsFeesHtml: "<li>تُحدَّد رسوم القراءة بحسب نوع النصّ (قصير / روائي) وتُعلَن بوضوح على المنصّة قبل تقديم النصّ.</li>" +
        "<li>تُدفع الرسوم عبر وسائل الدفع المعتمَدة في المملكة العربية السعودية، وتُصدر فواتير نظامية لكلّ عملية.</li>" +
        "<li><strong>سياسة الاسترداد:</strong> لا يحقّ للكاتب طلب استرداد الرسوم بعد البدء الفعلي في قراءة نصّه. أمّا إذا تعذّر تنفيذ الخدمة لأسباب تخصّ المنصّة، فيتمّ ردّ المبلغ كاملاً خلال أربعة عشر يوم عمل.</li>",
      termsDeliveryTitle: "مدة التسليم",
      termsDeliveryHtml: "<p>تلتزم (Scene One) بتسليم التقرير خلال المدّة الزمنية المُعلَنة عند التقديم، وتتراوح عادةً بين أسبوع إلى ثلاثة أسابيع بحسب نوع النصّ وحجمه.</p>" +
        "<p>في حال تأخّر التسليم لأيّ سبب، يُبلَّغ الكاتب فوراً عبر البريد الإلكتروني مع توضيح الأسباب والمدّة المتوقّعة الجديدة.</p>",
      termsWriterTitle: "التزامات الكاتب",
      termsWriterLead: "عند استخدام (Scene One)، يلتزم الكاتب بما يلي:",
      termsWriterHtml: "<li>أن يكون النصّ المُقدَّم من تأليفه الأصلي، وأن يكون مالكاً لجميع حقوقه.</li>" +
        "<li>أن لا يحتوي النصّ على أيّ محتوى مخالف للأنظمة السعودية، أو محرّض على الكراهية، أو يخالف الذوق العام، أو ينتهك حقوق الغير.</li>" +
        "<li>أن يقدّم معلومات صحيحة عن نفسه عند إنشاء الحساب.</li>" +
        "<li>أن لا يحاول التحايل على الخدمة أو إساءة استخدامها بأيّ صورة.</li>",
      termsWriterNote: "تتحمّل (Scene One) مسؤولية القراءة المهنية فقط، ولا تتحمّل أيّ مسؤولية عن مدى أصالة النصّ أو خلوّه من المخالفات. هذه مسؤولية الكاتب وحده.",
      termsProviderTitle: "التزامات مقدم الخدمة",
      termsProviderLead: "تلتزم (Scene One) تجاه المستخدم بما يلي:",
      termsProviderHtml: "<li>قراءة النصّ بعناية ومهنية من قِبَل قارئ مؤهّل.</li>" +
        "<li>إصدار تقرير تقييم نزيه وصادق ومفصَّل.</li>" +
        "<li>حفظ سرّية النصّ التامّة، وعدم مشاركته مع أيّ طرف خارجي إلّا بإذن الكاتب الصريح.</li>" +
        "<li>حماية البيانات الشخصية للمستخدم وفقاً لسياسة الخصوصية.</li>" +
        "<li>الالتزام بالمدّة الزمنية المُعلَنة لتسليم التقرير.</li>",
      termsLiabilityTitle: "المسؤوليات",
      termsLiabilityLead: "التقرير الصادر من (Scene One) يعبّر عن الرأي المهني للقارئ الناقد فقط، ولا يعتبر ضماناً لجودة النصّ، ولا تعهّداً بقبوله من قِبَل أيّ جهة إنتاجية أو مهرجان أو مسابقة. لا تتحمّل Scene One أيّ مسؤولية عن:",
      termsLiabilityHtml: "<li>قرارات الكاتب المبنية على التقرير.</li>" +
        "<li>عدم اهتمام شركات الإنتاج بالنصّ بعد ترشيحه.</li>" +
        "<li>أيّ نزاعات قد تنشأ بين الكاتب والشركاء الإنتاجيين.</li>" +
        "<li>أيّ ضرر غير مباشر أو فقدان أرباح ناتج عن استخدام الخدمة.</li>",
      termsLawTitle: "القانون المختص",
      termsLawHtml: "<p>تخضع هذه الشروط لأنظمة المملكة العربية السعودية وتُفسَّر وفقاً لها. تختصّ المحاكم السعودية بالنظر في أيّ نزاع قد ينشأ عن استخدام الخدمة.</p>" +
        "<p>نسعى دائماً لحلّ أيّ خلاف ودّياً قبل اللجوء إلى القضاء، ويُشجَّع المستخدم على التواصل معنا مباشرة عند وجود أيّ ملاحظة أو نزاع.</p>",

      // ---- privacy.html ----
      docTitlePrivacy: "سياسة الخصوصية | Scene One",
      privHeroTitle: "سياسة الخصوصية",
      privIntroTitle: "المقدمة",
      privIntroHtml: "<p>توضح سياسة الخصوصية هذه كيفية قيام منصة (Scene One) بجمع البيانات الشخصية ومعالجتها وتخزينها وحمايتها عند استخدامك للمنصة والخدمات المرتبطة بها، بما في ذلك خدمات قراءة النصوص السينمائية وتقييمها وربطها بفرص الإنتاج.</p>" +
        "<p>باستخدامك للمنصة، فإنك توافق على الممارسات الواردة في هذه السياسة. إذا كنت لا توافق على أي بند منها، يُرجى عدم استخدام الخدمة.</p>" +
        "<p>تسري هذه السياسة على جميع المستخدمين، بمن فيهم الكتّاب المقدّمون للنصوص، والمنتجون الشركاء، وزوار المنصة.</p>",
      privCommitTitle: "التزامنا تجاهك",
      privCommitHtml: "<p>نحن في (Scene One) نعتبر خصوصيتك أمانة. هذه السياسة توضّح كيف نجمع بياناتك، وكيف نستخدمها، ومتى نشاركها، وكيف نحميها، وما هي حقوقك تجاهها.</p>" +
        "<p>نلتزم بأحكام نظام حماية البيانات الشخصية الصادر في المملكة العربية السعودية، وبأفضل الممارسات الدولية في حماية البيانات.</p>",
      privDataTitle: "البيانات التي نجمعها",
      privDataHtml: "<p><span class=\"gold\" style=\"font-weight:500\">بيانات تقدّمها أنت مباشرة: </span>الاسم، البريد الإلكتروني، رقم الجوال، والنصّ السينمائي الذي تقدّمه، إضافةً إلى أيّ معلومات إضافية تختار مشاركتها معنا في الملف الشخصي أو عبر التواصل.</p>" +
        "<p><span class=\"gold\" style=\"font-weight:500\">بيانات تُجمَع تلقائياً: </span>عنوان IP، نوع الجهاز والمتصفّح، وقت الزيارة، الصفحات التي اطّلعت عليها، وذلك لأغراض تحسين تجربة الاستخدام والأمن السيبراني فقط.</p>",
      privUseTitle: "كيف نستخدم بياناتك",
      privUseLead: "نستخدم بياناتك للأغراض التالية فقط:",
      privUseHtml: "<li>تقديم الخدمة لك وقراءة نصّك وإصدار تقريرك.</li>" +
        "<li>التواصل معك بشأن طلبك، التقرير، أو أيّ تحديث يتعلّق بحسابك.</li>" +
        "<li>تحسين الخدمة وتطوير ميزات جديدة بناءً على سلوك الاستخدام المُجمَّع (دون كشف هويتك).</li>" +
        "<li>حماية الخدمة والمستخدمين من إساءة الاستخدام والاحتيال.</li>" +
        "<li>الالتزام بأيّ متطلّبات قانونية في المملكة العربية السعودية.</li>",
      privNotTitle: "نحن لا نقوم بـ",
      privNotHtml: "<li>لا نبيع بياناتك.</li><li>لا نشاركها مع جهات تسويقية.</li><li>لا نستخدم نصّك لتدريب أنظمة ذكاء اصطناعي.</li>",
      privNotNote: "<span class=\"gold\" style=\"font-weight:500\">نصّك </span>هو ملكٌ لك. نتعامل معه كما نتعامل مع أيّ وثيقة سرّية، ولا يطّلع عليه إلّا الفريق المعنيّ بقراءته فقط.",
      privProtectTitle: "حماية نصّك",
      privProtectHead: "أهمّ من كلّ شيء",
      privProtectLead1: "نصّك هو ملكٌ لك. نتعامل معه كما نتعامل مع أيّ وثيقة سرّية، ولا يطّلع عليه إلّا الفريق المعنيّ بقراءته فقط.",
      privProtectLead2: "الإجراءات التي نتبعها لحماية نصّك:",
      privProtectHtml: "<li><strong>تشفير كامل:</strong> النصّ مُشفَّر أثناء الإرسال والتخزين.</li>" +
        "<li><strong>وصول محدود:</strong> القارئ الناقد المعنيّ بنصّك هو الشخص الوحيد الذي يطّلع عليه، إضافةً إلى مسؤول مراجعة محدَّد.</li>" +
        "<li><strong>اتفاقيات سرّية:</strong> جميع القرّاء يوقّعون اتفاقيات سرّية ملزِمة قبل العمل مع (Scene One).</li>" +
        "<li><strong>حذف عند الطلب:</strong> يمكنك طلب حذف نصّك ومرفقاته من خوادمنا في أيّ وقت.</li>" +
        "<li><strong>مشاركة بإذن فقط:</strong> النصّ لا يُشارَك مع أيّ شريك إنتاجي إلّا بعد موافقتك الكتابية الصريحة.</li>",
      privStorageTitle: "مكان تخزين بياناتك",
      privStorageHtml: "<p>جميع بياناتك ونصوصك تُخزَّن على خوادم آمنة داخل المملكة العربية السعودية أو على بنية تحتية سحابية معتمَدة تلتزم بأنظمة حماية البيانات السعودية والمعايير الدولية.</p>" +
        "<p>في حال تطلّب الأمر استخدام خوادم خارجية لأسباب تقنية، نضمن أن تكون هذه الخوادم في دول توفّر مستوى حماية مكافئ، ولا تتمّ أيّ مشاركة دون اتخاذ كافّة الاحتياطات اللازمة.</p>",
      privRightsTitle: "حقوقك الكاملة",
      privRightsHtml: "<li>الاطّلاع على البيانات التي نحتفظ بها عنك.</li>" +
        "<li>تصحيح أيّ بيانات غير دقيقة.</li>" +
        "<li>طلب حذف بياناتك ونصوصك بالكامل.</li>" +
        "<li>سحب موافقتك على مشاركة نصّك مع الشركاء الإنتاجيين في أيّ وقت قبل إتمام الترشيح.</li>" +
        "<li>طلب نسخة من بياناتك بصيغة قابلة للاستخدام.</li>" +
        "<li>تقديم شكوى إلى الجهة المختصّة بحماية البيانات في المملكة العربية السعودية.</li>",
      privRightsContact: "لممارسة أيّ من هذه الحقوق، تواصل معنا على: <a href=\"mailto:sceneone.info@gmail.com\">sceneone.info@gmail.com</a>",
      privRetentionTitle: "مدة الاحتفاظ",
      privRetentionLead1: "نحتفظ ببياناتك ونصوصك طوال المدّة التي يكون فيها حسابك فعّالاً، أو طالما كان ذلك ضرورياً لتقديم الخدمة لك.",
      privRetentionLead2: "عند طلبك حذف حسابك:",
      privRetentionHtml: "<li>تُحذَف بياناتك الشخصية ونصوصك من خوادمنا الفعّالة خلال ثلاثين يوماً.</li>" +
        "<li>قد نحتفظ ببعض البيانات لمدّة أطول إذا اقتضت ذلك متطلّبات قانونية أو محاسبية.</li>" +
        "<li>التقارير الصادرة قد تُحفَظ بصيغة مجهَّلة لأغراض تطوير الخدمة فقط، دون أيّ معلومات تربطها بك.</li>",
      privCookiesTitle: "ملفّات تعريف الارتباط",
      privCookiesHtml: "<li>نستخدم ملفّات Cookies بحدّها الأدنى لتسهيل تجربة الاستخدام وحفظ تفضيلاتك. لا نستخدم Cookies لأغراض تسويقية أو لتتبّعك عبر مواقع أخرى.</li>" +
        "<li>يمكنك تعطيل ملفّات Cookies من إعدادات متصفّحك، مع العلم أن ذلك قد يؤثّر على بعض ميزات الخدمة.</li>",
      privUpdatesTitle: "تعديل هذه السياسة",
      privUpdatesHtml: "<p>قد نُحدّث هذه السياسة من وقت لآخر بما يتوافق مع تطوّر الخدمة أو متطلّبات الأنظمة. سنُخطرك بأيّ تعديل جوهري عبر البريد الإلكتروني أو عبر إشعار داخل المنصّة، قبل سريانه بمدّة معقولة.</p>" +
        "<p>استمرارك في استخدام الخدمة بعد التعديل يعني موافقتك على النسخة الجديدة.</p>",
      privContactTitle: "تواصل معنا",
      privContactLead: "لأيّ استفسار يتعلّق بخصوصيتك أو ببياناتك أو بهذه السياسة، تواصل معنا عبر:",
      privContactEmail: "البريد الإلكتروني: <a href=\"mailto:sceneone.info@gmail.com\">sceneone.info@gmail.com</a>",
      privContactClosing: "نلتزم بالردّ على أيّ استفسار خلال مدّة معقولة، ونرحّب بأيّ ملاحظة تساعدنا على تحسين حماية بيانات مستخدمينا."
    },
    en: {
      navHome: "Home", navAbout: "Scene One", navReaders: "Who Reads Your Script?",
      navJourney: "Script Journey", navGuide: "Platform Guide", navContact: "Contact Us",
      menuLabel: "Menu", closeLabel: "Close",

      overlayTag: "Scene One / 2026",
      overlayBlurb: "A specialized platform for screenplay evaluation, offering professional feedback that helps writers develop and refine their work before their next step.",
      overlayContact: "Contact", overlaySocial: "Follow Us",

      heroTitle: "Where Your Script's Journey Begins",
      heroSub: "Professional screenplay coverage and development notes, delivered by experienced writers and filmmakers, to discover promising screenwriters and launch their careers in the film industry.",
      btnViewCoverage: "View Coverages", btnGuide: "Platform Guide",
      heroNda: "All submissions are protected under non-disclosure agreements (NDA) and are only accessed by the assigned reader.",
      partnerBadge: "Accredited partner",

      quoteHtml: "Every story deserves a real chance to evolve.<br>" +
        "Scene One gives you a professional perspective on your script through specialized coverage and detailed reports, helping you identify strengths, address weaknesses, and move forward with clarity and confidence.",

      aboutTitle: "From Idea to Script",
      aboutP1: "Many writers have promising ideas and scripts with real potential. But developing a screenplay takes more than writing alone.",
      aboutP2: "At different stages, writers often need professional, critical feedback, the kind that helps them see their work from a new perspective, identify strengths, and uncover opportunities for improvement before moving forward.",
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
      faqA3: "It's difficult to look at your own work with complete objectivity as the author, so coverage offers an objective view from someone who understands what the industry expects. When you submit your script to a studio, agent, or producer, you won't see the reader's notes, meaning you won't get the chance to address any weaknesses. This service gives you that chance.",
      faqQ4: "Who are Scene One?",
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
      docTitleReaders: "About Us | Scene One",
      auHeroTitleHtml: "About Us",
      auHeroTitle: "Here<br>Scene One",
      auHeroBadge: "Professional script coverage<br>for screenwriters",
      auAboutLabelWord: "About",
      auAboutP1: "Scene One was founded in 2026 on the belief that Saudi cinema begins with the script. The idea came from a personal experience of one of the founders, after years of writing screenplays and trying to get scripts into the hands of production companies and agencies. Most of those attempts ended in silence. No feedback. No guidance. No way of knowing whether the script had even been read.",
      auAboutP2: "That changed after receiving a professional coverage report for the first time. It offered a clear, industry-level perspective on the script, revealing how others interpreted the work, and highlighting what was working and what needed improvement. It became easier to see the script more objectively, and to move forward with clarity. From that experience, Scene One was built.",
      auAboutP3: "A platform designed to give writers, especially those at the beginning of their journey, access to professional readers who understand scripts and provide structured, honest development feedback. Helping writers reach the strongest possible version of their work before it moves toward production or funding.",
      auTeamTitle: "Readers Profile",
      haifaName: "Haifa Alsaeed", haifaRole: "Script Reader & Development Consultant",
      haifaBio: "Screenwriter specializing in psychological and social narratives. Her work has been featured in festivals and international platforms, with experience in developing both films and series. Her approach focuses on character depth and human-driven storytelling.",
      widName: "Wid AlQublan", widRole: "Lead Reader",
      widBio: "A screenwriter, development producer, and showrunner who cares deeply for visual storytelling and its emotional influence on audience. Driven by her passion for film and the craft behind every story, Wid reads screenplays with an eye for what works, what could work better, and where its potential lies, all with the aim of enriching Saudi cinema.",
      fajrName: "Fajr Alfarhan", fajrRole: "Script Reader",
      fajrBio: "Specialized in film and performing arts, with experience in screenwriting, creative production, and visual storytelling. Her analysis focuses on story structure, visual language, and the emotional impact of the script.",

      // ---- about-coverage.html ----
      docTitleCoverage: "About Screenplay Coverage | Scene One",
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
      covAspect3Html: "<strong>3. Production Perspective:</strong> Considers scope of execution, budget feasibility, and potential production challenges.",
      covAspect4Html: "<strong>4. Market Perspective:</strong> Identifies the target audience, genre positioning, and suitability for the Saudi market.",
      covGradesTitle: "Coverage Scoring System", covGradesSub: "A closer look beyond the numbers and recommendations",
      covGradesP1: "Screenplay coverage combines objective evaluation with the reader's personal response. The rating reflects how the script resonates with the reader, sometimes highlighting its strengths, and other times pointing to areas that need further development. For this reason, ratings are rarely absolute or definitive, and typically exist within a broader spectrum of interpretation and judgment.",
      covGradePass: "This indicates that the script requires further development before it is ready. Feedback often focuses on elements such as plot, characters, or originality.",
      covGradeConsider: "This means the script shows promise and contains compelling elements, but still needs refinement to reach its full potential.",
      covGradeRecommend: "The highest rating. Given to scripts with a strong concept and solid execution. Even at this level, there is always room for further development and enhancement.",
      covReportImgAlt: "Sample screenplay coverage report from Scene One", covReportCaption: "A visual example of the report format",
      covTocLabel: "On this page", covTocGrades: "Ratings",

      // ---- terms.html ----
      docTitleTerms: "Terms & Conditions | Scene One",
      termsHeroTitle: "Terms and Conditions",
      termsDefsTitle: "Definitions",
      termsDefsHtml: "<li><strong>Service / Platform:</strong> The electronic platform Scene One, which is concerned with the evaluation of screenplays and connecting writers with development and production opportunities.</li>" +
        "<li><strong>User / Writer:</strong> Any individual who creates an account or submits a script through the Platform.</li>" +
        "<li><strong>Reader (Script Analyst):</strong> A professional accredited by the Service to read and evaluate submitted scripts.</li>" +
        "<li><strong>Report:</strong> The written document issued by the Reader after reviewing the script.</li>" +
        "<li><strong>Script:</strong> Any written cinematic work submitted to the Service (short film screenplay or feature-length screenplay).</li>" +
        "<li><strong>Production Partner:</strong> A production entity contracted with Scene One to receive shortlisted scripts.</li>",
      termsUseTitle: "Terms of Use",
      termsUseHtml: "<li>By using the Scene One Platform or submitting your script through it, you acknowledge that you have read, understood, and fully agreed to these Terms. If you do not agree to any provision herein, you must refrain from using the Service.</li>" +
        "<li>The User must be at least eighteen (18) years of age or have obtained the consent of a legal guardian prior to using the Service.</li>" +
        "<li>Scene One reserves the right to amend these Terms at any time. Any amendments will be communicated via email or through a notice on the Platform within a reasonable period prior to taking effect.</li>" +
        "<li>By submitting any content or screenplay through the Platform, you confirm your compliance with all applicable laws and regulations in the Kingdom of Saudi Arabia, including the Audiovisual Media Law, and you bear full responsibility for ensuring that the submitted content complies with such laws. <a href=\"https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/ed5fdbc0-c183-4a8a-a8b7-a9ed004b5900/1?utm_source\" target=\"_blank\" rel=\"noopener noreferrer\">Click here</a> to view the law.</li>",
      termsServiceTitle: "Service Description",
      termsServiceLead: "Scene One provides a professional script reading and evaluation service, including:",
      termsServiceHtml: "<li>A full reading of the script by a qualified Reader.</li>" +
        "<li>A detailed evaluation report covering concept, plot, characters, dialogue, pacing, and production potential.</li>" +
        "<li>A clear classification of the script into one of three categories: <strong>Recommended</strong>, <strong>Consider</strong>, or <strong>Needs Development</strong>.</li>" +
        "<li>Submission of strongly recommended scripts to Production Partners, subject to the Writer's explicit consent.</li>",
      termsServiceNote: "<strong>The Service does not include</strong> rewriting, editing, development, or any guarantee of acceptance by production companies. Scene One provides professional critical evaluation only.",
      termsIpTitle: "Intellectual Property",
      termsIpLead: "Fundamental Clause: The Writer remains the sole and exclusive owner of all intellectual property rights in the submitted script. Scene One does not claim ownership of the script at any stage of the Service. Upon submission, the Writer grants Scene One a limited, non-exclusive license solely for the purposes of:",
      termsIpHtml: "<li>Reading and evaluating the script by an accredited Reader.</li>" +
        "<li>Securely storing the script on the Platform's servers for the duration of the subscription or until deletion is requested by the Writer.</li>" +
        "<li>Sharing the script with Production Partners only upon the Writer's explicit written consent, and only if the script is recommended and enters the nomination stage.</li>",
      termsIpNote1: "Scene One shall not use, publish, distribute, or adapt any part of the script for any other purpose without the Writer's prior explicit consent.",
      termsIpNote2: "Writers are strongly advised to register their scripts with the Saudi Authority for Intellectual Property (SAIP) prior to submission.",
      termsConfTitle: "Confidentiality of Submitted Materials",
      termsConfHtml: "<p>Scene One recognizes that submitted scripts may contain original creative works protected under applicable intellectual property laws. Accordingly, the Platform undertakes reasonable measures to maintain the confidentiality of such materials and restrict access solely to authorized individuals for the purpose of delivering the Service.</p>" +
        "<p>All Readers and approved collaborators are contractually obligated to maintain strict confidentiality and are prohibited from copying, distributing, publishing, disclosing, or sharing any submitted materials with third parties outside the scope of evaluation.</p>" +
        "<p>In the event that any Reader or collaborator discloses, misuses, exploits, or shares the script without authorization, such individual shall bear full legal responsibility toward the Writer for any resulting damages, without prejudice to Scene One's right to take appropriate action, including termination of engagement or banning from the Platform.</p>" +
        "<p>Granting access to a Reader or collaborator shall not be construed as a transfer, assignment, or license of any intellectual property rights, which remain fully owned by the Writer.</p>",
      termsAiTitle: "Use of Artificial Intelligence Tools",
      termsAiHtml: "<p>Readers are strictly prohibited from inputting scripts or any part thereof into any artificial intelligence tools or automated content processing systems for purposes including, but not limited to, evaluation, summarization, analysis, rewriting, or any other use, unless prior written consent is obtained from Scene One.</p>" +
        "<p>This requirement is intended to protect the confidentiality and intellectual property rights of Writers and to ensure that evaluations are based on direct professional reading and analysis.</p>" +
        "<p>Any unauthorized use of artificial intelligence tools in relation to submitted scripts constitutes a material breach of these Terms and entitles Scene One to terminate the Reader's engagement and take appropriate legal action.</p>",
      termsFeesTitle: "Fees and Payment",
      termsFeesLead: "Scene One operates under the following model:",
      termsFeesHtml: "<li>Reading fees are determined based on the type of script (short or feature) and are clearly displayed on the Platform prior to submission.</li>" +
        "<li>Payments are processed through approved payment methods within the Kingdom of Saudi Arabia, and official invoices are issued for each transaction.</li>" +
        "<li><strong>Refund Policy:</strong> No refund shall be granted once the reading of the script has commenced. If the Service cannot be delivered due to reasons attributable to the Platform, a full refund shall be issued within fourteen (14) business days.</li>",
      termsDeliveryTitle: "Delivery Timeframe",
      termsDeliveryHtml: "<p>Scene One undertakes to deliver the evaluation report within the timeframe communicated at submission, typically ranging from one (1) to three (3) weeks depending on the type and length of the script.</p>" +
        "<p>In the event of any delay, the Writer will be promptly notified via email with an explanation and an updated expected delivery date.</p>",
      termsWriterTitle: "Writer Obligations",
      termsWriterLead: "By using Scene One, the Writer agrees to:",
      termsWriterHtml: "<li>Submit only original work and confirm ownership of all rights therein.</li>" +
        "<li>Ensure that the script does not contain content that violates Saudi laws, promotes hate, offends public morals, or infringes upon the rights of others.</li>" +
        "<li>Provide accurate personal information when creating an account.</li>" +
        "<li>Refrain from attempting to misuse or exploit the Service in any manner.</li>",
      termsWriterNote: "Scene One is responsible solely for professional evaluation and assumes no responsibility for the originality or legal compliance of submitted scripts, which remains the sole responsibility of the Writer.",
      termsProviderTitle: "Service Provider Obligations",
      termsProviderLead: "Scene One commits to:",
      termsProviderHtml: "<li>Conducting a professional and thorough reading by a qualified Reader.</li>" +
        "<li>Delivering a fair, honest, and detailed evaluation report.</li>" +
        "<li>Maintaining strict confidentiality of the script and not sharing it without explicit consent from the Writer.</li>" +
        "<li>Protecting user data in accordance with its Privacy Policy.</li>" +
        "<li>Adhering to the stated delivery timelines.</li>",
      termsLiabilityTitle: "Liability",
      termsLiabilityLead: "The evaluation report reflects the professional opinion of the Reader only and does not constitute a guarantee of the script's quality or acceptance by any production company, festival, or competition. Scene One shall not be liable for:",
      termsLiabilityHtml: "<li>Decisions made by the Writer based on the report.</li>" +
        "<li>Lack of interest from production companies after submission.</li>" +
        "<li>Any disputes arising between the Writer and Production Partners.</li>" +
        "<li>Any indirect damages or loss of profits resulting from use of the Service.</li>",
      termsLawTitle: "Governing Law",
      termsLawHtml: "<p>These Terms shall be governed by and construed in accordance with the laws and regulations of the Kingdom of Saudi Arabia. The competent courts of Saudi Arabia shall have exclusive jurisdiction over any disputes arising from the use of the Service.</p>" +
        "<p>Scene One aims to resolve disputes amicably wherever possible, and Users are encouraged to contact the Platform directly in the event of any concerns or disagreements.</p>",

      // ---- privacy.html ----
      docTitlePrivacy: "Privacy Policy | Scene One",
      privHeroTitle: "Privacy Policy",
      privIntroTitle: "Introduction",
      privIntroHtml: "<p>This Privacy Policy explains how the Scene One platform collects, processes, stores, and protects personal data when you use the platform and its related services, including screenplay reading, evaluation, and connecting scripts with production opportunities.</p>" +
        "<p>By using the platform, you agree to the practices described in this Policy. If you do not agree with any part of it, you should refrain from using the Service.</p>" +
        "<p>This Policy applies to all users, including submitting writers, production partners, and platform visitors.</p>",
      privCommitTitle: "Our Commitment to You",
      privCommitHtml: "<p>At Scene One, we treat your privacy as a responsibility. This Policy explains what data we collect, how we use it, when we share it, how we protect it, and your rights in relation to it.</p>" +
        "<p>We comply with the Personal Data Protection Law of the Kingdom of Saudi Arabia and follow international best practices in data protection, including guidance from the Saudi Data and Artificial Intelligence Authority.</p>",
      privDataTitle: "Data We Collect",
      privDataHtml: "<p><span class=\"gold\" style=\"font-weight:500\">Data you provide directly: </span>Your name, email address, mobile number, the screenplay you submit, and any additional information you choose to share in your profile or through communications with us.</p>" +
        "<p><span class=\"gold\" style=\"font-weight:500\">Data collected automatically: </span>IP address, device and browser type, access time, and pages visited, strictly for improving user experience and ensuring cybersecurity.</p>",
      privUseTitle: "How We Use Your Data",
      privUseLead: "We use your data solely for the following purposes:",
      privUseHtml: "<li>Providing the Service, including reading your script and issuing your report.</li>" +
        "<li>Communicating with you regarding your submission, report, or account updates.</li>" +
        "<li>Improving the Service and developing new features based on aggregated, non-identifiable usage data.</li>" +
        "<li>Protecting the Service and users from misuse and fraud.</li>" +
        "<li>Complying with applicable legal obligations in the Kingdom of Saudi Arabia.</li>",
      privNotTitle: "What We Do Not Do",
      privNotHtml: "<li>We do not sell your data.</li><li>We do not share your data with marketing entities.</li><li>We do not use your script to train artificial intelligence systems.</li>",
      privNotNote: "<span class=\"gold\" style=\"font-weight:500\">Your script </span>remains your property. We treat it as a confidential document and restrict access strictly to the relevant evaluation team.",
      privProtectTitle: "Protection of Your Script",
      privProtectHead: "Above all else",
      privProtectLead1: "Your script is your property. It is treated as a confidential document and accessed only by the assigned evaluation team.",
      privProtectLead2: "Security measures include:",
      privProtectHtml: "<li><strong>Full Encryption:</strong> Scripts are encrypted during transmission and storage.</li>" +
        "<li><strong>Restricted Access:</strong> Only the assigned Reader and a designated reviewer may access your script.</li>" +
        "<li><strong>Confidentiality Agreements:</strong> All Readers sign binding confidentiality agreements before working with Scene One.</li>" +
        "<li><strong>Deletion Upon Request:</strong> You may request deletion of your script and attachments at any time.</li>" +
        "<li><strong>Consent-Based Sharing:</strong> Scripts are shared with production partners only upon your explicit written consent.</li>",
      privStorageTitle: "Data Storage Location",
      privStorageHtml: "<p>All your data and scripts are stored on secure servers within the Kingdom of Saudi Arabia or on approved cloud infrastructure compliant with Saudi data protection laws and international standards.</p>" +
        "<p>If external servers are required for technical reasons, we ensure they are located in jurisdictions providing an equivalent level of protection, and no transfer occurs without appropriate safeguards.</p>",
      privRightsTitle: "Your Rights",
      privRightsHtml: "<li>Access the personal data we hold about you.</li>" +
        "<li>Correct inaccurate or incomplete data.</li>" +
        "<li>Request deletion of your data and scripts.</li>" +
        "<li>Withdraw your consent to share your script with production partners at any time prior to nomination.</li>" +
        "<li>Request a copy of your data in a usable format.</li>" +
        "<li>File a complaint with the competent data protection authority in Saudi Arabia.</li>",
      privRightsContact: "To exercise any of these rights, please contact us at: <a href=\"mailto:sceneone.info@gmail.com\">sceneone.info@gmail.com</a>",
      privRetentionTitle: "Data Retention",
      privRetentionLead1: "We retain your data and scripts for as long as your account remains active or as necessary to provide the Service.",
      privRetentionLead2: "Upon your request to delete your account:",
      privRetentionHtml: "<li>Your personal data and scripts will be deleted from active systems within thirty (30) days.</li>" +
        "<li>Certain data may be retained longer if required for legal or accounting purposes.</li>" +
        "<li>Issued reports may be retained in anonymized form solely for service improvement, without any identifiable link to you.</li>",
      privCookiesTitle: "Cookies",
      privCookiesHtml: "<li>We use cookies minimally to enhance user experience and remember your preferences. We do not use cookies for marketing or cross-site tracking.</li>" +
        "<li>You may disable cookies through your browser settings; however, doing so may affect certain features of the Service.</li>",
      privUpdatesTitle: "Updates to This Policy",
      privUpdatesHtml: "<p>We may update this Policy from time to time in line with service developments or legal requirements. Any material changes will be communicated via email or through a notice on the platform prior to taking effect.</p>" +
        "<p>Your continued use of the Service after such updates constitutes your acceptance of the revised Policy.</p>",
      privContactTitle: "Contact Us",
      privContactLead: "For any inquiries regarding your privacy, your data, or this Policy, please contact us at:",
      privContactEmail: "Email: <a href=\"mailto:sceneone.info@gmail.com\">sceneone.info@gmail.com</a>",
      privContactClosing: "We are committed to responding within a reasonable timeframe and welcome any feedback that helps us improve the protection of our users' data."
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
