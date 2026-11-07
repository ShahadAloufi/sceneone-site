/* ===========================================================
   Scene One, interactions
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

  /* ---------- FAQ CATEGORY FILTER ----------
     Narrows the list rather than swapping panels, so the pills are buttons with
     aria-pressed, not a tablist. Switching category collapses whatever was open:
     leaving a panel expanded behind a filter change means the list reappears
     mid-scroll at a height the reader did not ask for. */
  var faqCats = document.getElementById("faqCats");
  if (faqCats) {
    var faqItems = Array.prototype.slice.call(document.querySelectorAll(".faq-item"));
    var pills = Array.prototype.slice.call(faqCats.querySelectorAll(".faq-cat"));

    function applyFaqFilter(cat) {
      faqItems.forEach(function (item) {
        item.hidden = item.getAttribute("data-faq-cat") !== cat;
        item.classList.remove("open");
        var b = item.querySelector(".faq-item__btn");
        if (b) b.setAttribute("aria-expanded", "false");
      });
      pills.forEach(function (p) {
        var on = p.getAttribute("data-faq-filter") === cat;
        p.classList.toggle("is-active", on);
        p.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }

    pills.forEach(function (p) {
      p.addEventListener("click", function () {
        applyFaqFilter(p.getAttribute("data-faq-filter"));
      });
    });

    /* The opening category comes from the markup — whichever pill ships with
       .is-active, else the first one. It used to be the hard-coded string
       "general"; when the categories were rewritten that name stopped
       existing, so this matched no item, hid all of them and left the list
       blank. Reading it from the pills means the markup stays the one place
       the categories are defined. */
    var firstPill = faqCats.querySelector(".faq-cat.is-active") || pills[0];
    if (firstPill) applyFaqFilter(firstPill.getAttribute("data-faq-filter"));
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

     There used to be a reveal step here, the video sat at opacity:0 until the
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


  /* ---------- HERO: SCENE ONE BY THE NUMBERS ----------
     Three photographic slides, each wiping up over the last. One rAF loop
     drives every moving part, because they are all reading the same clock:
     the wipe, the photo's Ken Burns scale, the figure rising into its mask,
     the label fading up behind it, and the progress bar that doubles as the
     autoplay timer. Two timers would drift apart within a cycle.

     Nothing here sets up an initial state. The markup already carries the
     first slide composed (.is-on), so a browser that never reaches this file
     shows a finished hero rather than a black band — and the loop's first
     frame simply repaints what is already on screen.

     prefers-reduced-motion is honoured by not running the loop at all: each
     slide is painted at its finished position, and autoplay never advances.
     The bars still work, so the hero stays usable without moving on its own. */
  (function heroNumbers() {
    var root = document.querySelector(".hn");
    if (!root) return;

    var slides = Array.prototype.slice.call(root.querySelectorAll(".hn-slide"));
    var fills = Array.prototype.slice.call(root.querySelectorAll(".hn__fill"));
    var bars = Array.prototype.slice.call(root.querySelectorAll(".hn__bar"));
    var countEl = root.querySelector(".hn__count-i");
    var liveEl = root.querySelector(".hn__live");
    var n = slides.length;
    if (n < 2) return;

    // HOLD is how long a slide rests; WIPE is the transition. Both are a step
    // quicker than the design's 4800/1150 — three slides at the slower pace
    // took fourteen seconds to come round, which is longer than anyone waits
    // on a hero. The guard is shorter than WIPE on purpose: a click landing
    // just before the previous wipe has settled reads as responsive rather
    // than as a dropped press.
    var HOLD = 3400, WIPE = 820, GUARD = 620;
    // Where the figure and the label start inside a wipe, and how long each
    // takes. Scaled with WIPE so they still land inside it.
    var NUM_IN = 200, NUM_DUR = 640, LAB_IN = 340, LAB_DUR = 500;

    var reduce = false;
    try {
      reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) { /* treat as no preference */ }

    var cur = 0, prev = -1;
    var t0 = -1e9;                 // when the current wipe started
    var shown = performance.now(); // when the current slide became current
    var raf = 0, running = false, pausedAt = 0;

    function cl(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
    function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function easeOut(x) { return 1 - Math.pow(1 - x, 4); }

    function paint(now) {
      // In reduce mode every slide is painted at t = done, so the current one
      // is simply whole and the others are simply hidden.
      var t = reduce ? 1e9 : now - t0;
      var p = easeInOut(cl(t / WIPE));

      for (var k = 0; k < n; k++) {
        var el = slides[k];
        var ph = el.querySelector(".hn-slide__ph");
        var num = el.querySelector(".hn-slide__num");
        var lab = el.querySelector(".hn-slide__lab");

        if (k === cur) {
          el.style.zIndex = 3;
          el.style.clipPath = "inset(" + ((1 - p) * 100).toFixed(2) + "% 0 0 0)";
          ph.style.transform = "scale(" + (1.18 - 0.18 * p).toFixed(4) + ")";
          // The figure and the label start AFTER the wipe has opened enough to
          // show them. Starting them together with the wipe means they arrive
          // before there is anything behind them.
          //
          // 120%, not the design's 105%: the mask is now 1.2x the figure's line
          // box so the digits are not clipped, and 105% of the figure no longer
          // clears the taller mask — it left a sliver of the number showing
          // below the fold before it rose.
          var pn = easeOut(cl((t - NUM_IN) / NUM_DUR));
          num.style.transform = "translateY(" + ((1 - pn) * 120).toFixed(2) + "%)";
          var pl = easeOut(cl((t - LAB_IN) / LAB_DUR));
          lab.style.opacity = pl;
          lab.style.transform = "translateY(" + ((1 - pl) * 24).toFixed(1) + "px)";
        } else if (k === prev && t < WIPE + 50) {
          // The outgoing slide stays whole underneath and drifts up a little,
          // so the wipe reads as one image sliding over another rather than as
          // a reveal onto nothing.
          el.style.zIndex = 2;
          el.style.clipPath = "inset(0 0 0 0)";
          ph.style.transform = "translateY(" + (-p * 7).toFixed(2) + "%) scale(1)";
          num.style.transform = "translateY(" + (-p * 60).toFixed(2) + "%)";
          lab.style.opacity = 1 - p;
        } else {
          el.style.zIndex = 1;
          el.style.clipPath = "inset(100% 0 0 0)";
        }
      }

      var fill = reduce ? 1 : cl((now - shown) / HOLD);
      for (var j = 0; j < n; j++) {
        if (fills[j]) fills[j].style.width = (j === cur ? fill * 100 : 0) + "%";
      }
      return fill;
    }

    function announce() {
      if (countEl) countEl.textContent = "0" + (cur + 1);
      for (var k = 0; k < n; k++) {
        if (bars[k]) bars[k].setAttribute("aria-current", k === cur ? "true" : "false");
      }
      if (!liveEl) return;
      var num = slides[cur].querySelector(".hn-slide__num");
      var lab = slides[cur].querySelector(".hn-slide__lab");
      liveEl.textContent = (num ? num.textContent : "") + " — " + (lab ? lab.textContent : "");
    }

    function go(k) {
      if (k === cur) return;
      var now = performance.now();
      if (!reduce && now - t0 < GUARD) return;   // let a wipe finish
      prev = cur; cur = k; t0 = now; shown = now;
      slides.forEach(function (el, i) { el.classList.toggle("is-on", i === cur); });
      announce();
      if (reduce) paint(now); else start();
    }

    function frame(now) {
      var fill = paint(now);
      if (fill >= 1) go((cur + 1) % n);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduce) return;
      if (pausedAt) {
        // Shift both clocks by the time spent paused, so a slide resumes where
        // it left off instead of jumping or restarting.
        var d = performance.now() - pausedAt;
        t0 += d; shown += d; pausedAt = 0;
      }
      running = true;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
      pausedAt = performance.now();
    }

    bars.forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        go(parseInt(b.getAttribute("data-go"), 10) || 0);
      });
    });

    // The design advances on a click anywhere in the hero. Anything the
    // visitor meant to press — the CTA, a bar — is left alone.
    root.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a, button")) return;
      go((cur + 1) % n);
    });

    // Don't burn a rAF on a hero nobody is looking at. Both of these also stop
    // the carousel cycling through unseen while the visitor reads further down.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) start(); else stop(); });
      }, { threshold: 0.01 }).observe(root);
    }

    announce();
    if (reduce) paint(performance.now()); else start();
  })();


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

/* Reveal on scroll — the landing's card groups.
 *
 * The decision to animate at all was already made in <head>: index.html puts
 * .js-reveal on <html> only when IntersectionObserver exists and the reader has
 * not asked for reduced motion. This reads that class rather than re-testing,
 * so the two can never disagree and leave cards hidden with nothing to reveal
 * them.
 *
 * Groups are observed, not individual cards: a row should come in as a row,
 * staggered by --rv in reading order, rather than each card firing on its own
 * edge and arriving out of order on a wide screen.
 *
 * One-shot. Each group is unobserved the moment it lands, so scrolling back up
 * does not replay it and the observer empties itself as the reader goes down
 * the page.
 */
(function () {
  if (!document.documentElement.classList.contains("js-reveal")) return;

  var groups = document.querySelectorAll("[data-reveal]");
  if (!groups.length) return;

  Array.prototype.forEach.call(groups, function (group) {
    /* Numbered in reading order, not DOM order. The alternating reader rows
       move the portrait to the front of the row with `order: -1`, so numbering
       by DOM index staggered those rows backwards: the photo led the row for
       the eye but faded in last. Sorting on the computed `order` first makes
       the stagger follow what is seen. A group that sets no `order` keeps the
       numbering it already had. */
    var kids = Array.prototype.slice.call(group.children).map(function (el, i) {
      var ord = parseInt(window.getComputedStyle(el).order, 10);
      return { el: el, order: isNaN(ord) ? 0 : ord, i: i };
    });
    kids.sort(function (a, b) { return (a.order - b.order) || (a.i - b.i); });
    kids.forEach(function (k, i) { k.el.style.setProperty("--rv", i); });
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    });
  }, {
    /* A touch of the group has to be on screen, and the bottom 12% of the
       viewport does not count — otherwise a group "arrives" while still at the
       very edge and the stagger has played out before it is properly in view. */
    threshold: 0.1,
    rootMargin: "0px 0px -12% 0px"
  });

  Array.prototype.forEach.call(groups, function (group) { io.observe(group); });
})();
