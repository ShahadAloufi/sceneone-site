/* ===========================================================
   Scene One — interactions
   Menu overlay · FAQ accordion · cards hover · about-coverage TOC scroll-spy
   =========================================================== */
(function () {
  "use strict";

  /* ---------- SLOW/SMOOTH SCROLL HELPER ---------- */
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function smoothScrollTo(targetY, duration) {
    var startY = window.pageYOffset;
    var diff = targetY - startY;
    var startTime = null;
    function step(timestamp) {
      if (startTime === null) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + diff * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- IN-PAGE ANCHOR LINKS: SLOWER, SMOOTHER SCROLL ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var y = target.getBoundingClientRect().top + window.pageYOffset - 100;
      smoothScrollTo(y, 1400);
      history.pushState(null, "", "#" + id);
    });
  });

  /* ---------- MENU OVERLAY ---------- */
  var menu = document.getElementById("menu");
  function openMenu() { if (menu) { menu.classList.add("open"); document.body.style.overflow = "hidden"; } }
  function closeMenu() { if (menu) { menu.classList.remove("open"); document.body.style.overflow = ""; } }

  document.querySelectorAll("[data-menu-open]").forEach(function (b) {
    b.addEventListener("click", openMenu);
  });
  document.querySelectorAll("[data-menu-close]").forEach(function (b) {
    b.addEventListener("click", closeMenu);
  });

  /* ---------- AUTO-GROW TEXTAREAS ---------- */
  // Textareas grow to fit their content so they never hide text behind a scrollbar.
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

  /* ---------- NAV: solid once past the hero ---------- */
  var nav = document.querySelector(".nav");
  if (nav) {
    // On the landing page, stay transparent over the hero and only turn
    // solid once the section after it reaches the nav. Elsewhere, turn
    // solid as soon as the page scrolls.
    var navTrigger = document.querySelector(".quote");
    var onScroll = function () {
      var solid = navTrigger
        ? navTrigger.getBoundingClientRect().top <= nav.offsetHeight
        : window.scrollY > 30;
      nav.classList.toggle("scrolled", solid);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  /* ---------- FAQ ACCORDION ---------- */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var btn = item.querySelector(".faq-item__btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var isOpen = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  });

  /* ---------- THREE CARDS (desktop hover cascade) ---------- */
  var cardsRow = document.getElementById("cards");
  if (cardsRow) {
    var items = cardsRow.querySelectorAll(".cards__item");
    function setActive(i) {
      cardsRow.classList.add("has-active");
      items.forEach(function (el, idx) { el.classList.toggle("active", idx === i); });
    }
    function clearActive() {
      cardsRow.classList.remove("has-active");
      items.forEach(function (el) { el.classList.remove("active"); });
    }
    items.forEach(function (el, idx) {
      el.addEventListener("mouseenter", function () { setActive(idx); });
    });
    cardsRow.addEventListener("mouseleave", clearActive);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------- ABOUT-COVERAGE: TOC SCROLL-SPY ---------- */
  var toc = document.getElementById("toc");
  if (toc) {
    var lis = Array.prototype.slice.call(toc.querySelectorAll("li"));
    var sections = lis.map(function (li) { return document.getElementById(li.getAttribute("data-target")); });

    lis.forEach(function (li) {
      li.querySelector("button").addEventListener("click", function () {
        var el = document.getElementById(li.getAttribute("data-target"));
        if (el) {
          var y = el.getBoundingClientRect().top + window.pageYOffset - 120;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      });
    });

    function spy() {
      var offset = 140, current = 0;
      sections.forEach(function (el, i) {
        if (el && el.getBoundingClientRect().top <= offset) current = i;
      });
      lis.forEach(function (li, i) { li.classList.toggle("active", i === current); });
    }
    spy();
    window.addEventListener("scroll", spy, { passive: true });
    window.addEventListener("resize", spy);
  }

  /* ---------- HERO BACKGROUND VIDEO (landing + readers) ----------
     The markup autoplays on its own; this only exists to recover when the
     browser refuses. Autoplay is allowed for a muted, playsinline video, but not
     always: iOS Low Power Mode refuses outright, and per-site "Auto-Play: Never"
     and some data savers do the same.

     There used to be a reveal step here — the video sat at opacity:0 until the
     `playing` event. That was the bug: WebKit gates muted autoplay on the
     element actually being rendered, so hiding it until it played meant it never
     played, and only a click could start it. The element is visible from the
     first paint now, `poster` covers the not-yet-playing case, and CSS hides the
     native controls so nothing draws a play button over the hero. */
  document.querySelectorAll('video.hero__bg, video.au-hero__bg').forEach(function (v) {
    var tries = 0;

    function attempt() {
      v.muted = true;               // property, not just the attribute
      var p = v.play();
      if (p && typeof p.catch === 'function') p.catch(function () { /* blocked; wait for a chance */ });
    }

    v.addEventListener('playing', function () { tries = 0; });

    // Whatever stopped it — a policy pause, the tab going to the background, a
    // laptop dropping into Low Power Mode — ask again. `loop` means a pause is
    // never the end of playback, so it is always something to recover from.
    // Bounded, so a browser that refuses outright settles on the poster instead
    // of spinning.
    v.addEventListener('pause', function () { if (tries++ < 3) attempt(); });

    attempt();

    // And on the first interaction of each kind, or when the tab comes back to
    // the front. These stay bound and only act while it is actually paused.
    ['pointerdown', 'touchstart', 'keydown', 'scroll'].forEach(function (e) {
      window.addEventListener(e, function () { if (v.paused) { tries = 0; attempt(); } }, { passive: true });
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && v.paused) { tries = 0; attempt(); }
    });
  });

  /* ---------- PACKAGES TABS (landing) ----------
     Writers / industry partners. Progressive enhancement: the markup ships with
     the writers' panel visible and the partners' panel carrying `hidden`, so
     with this script absent the page still shows the pricing every inbound link
     points at. Visibility is driven by the `hidden` ATTRIBUTE, never an inline
     display — .pkg-panel deliberately declares no display of its own.

     #packages-partners in the URL opens the partners tab directly, so the tab
     can be linked to from outside the page. */
  var pkgTabs = document.querySelectorAll(".pkg-tab");
  if (pkgTabs.length) {
    var selectPkg = function (tab) {
      pkgTabs.forEach(function (t) {
        var on = t === tab;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
        if (panel) panel.hidden = !on;
      });
    };
    pkgTabs.forEach(function (t) {
      t.addEventListener("click", function () { selectPkg(t); });
    });
    if (window.location.hash === "#packages-partners") {
      var partnersTab = document.getElementById("pkgTabPartners");
      var pkgSection = document.getElementById("coverage-types");
      // That hash matches no element, so the smooth-scroll block below finds
      // nothing to scroll to. Aim it at the section itself.
      if (partnersTab && pkgSection) {
        selectPkg(partnersTab);
        requestAnimationFrame(function () {
          pkgSection.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
  }

  /* ---------- IN-PAGE HASH SMOOTH SCROLL (landing) ---------- */
  if (window.location.hash) {
    var target = document.getElementById(window.location.hash.replace("#", ""));
    if (target) {
      requestAnimationFrame(function () {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }
})();
