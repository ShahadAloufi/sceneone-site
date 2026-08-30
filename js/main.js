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
