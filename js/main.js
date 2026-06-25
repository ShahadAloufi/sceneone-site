/* ===========================================================
   Scene One — interactions
   Menu overlay · FAQ accordion · cards hover · register modal
   · form validation/toast · about-coverage TOC scroll-spy
   =========================================================== */
(function () {
  "use strict";

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
    }, 4000);
  }

  /* ---------- REGISTER MODAL ---------- */
  var modal = document.getElementById("registerModal");
  var form = document.getElementById("registerForm");

  function openModal() { if (modal) { modal.classList.add("open"); document.body.style.overflow = "hidden"; } }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
    if (form) {
      form.reset();
      form.querySelectorAll(".field").forEach(function (f) { f.classList.remove("invalid"); });
    }
  }

  document.querySelectorAll("[data-register]").forEach(function (b) {
    b.addEventListener("click", openModal);
  });
  document.querySelectorAll("[data-register-close]").forEach(function (b) {
    b.addEventListener("click", closeModal);
  });
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeModal(); closeMenu(); }
  });

  /* ---------- FORM VALIDATION + SUBMIT ----------
     The original site posted to /api/registrations (Express + Postgres +
     email). A static site has no server, so we validate client-side and
     show the same success toast. To capture submissions for real, point
     `submitRegistration` at a form service (e.g. Formspree) — see README.
  ------------------------------------------------------------------- */
  function fieldEl(name) { return form.querySelector('[data-field="' + name + '"]'); }
  function markInvalid(name, on) {
    var f = fieldEl(name);
    if (f) f.classList.toggle("invalid", !!on);
  }

  function validate(values) {
    var ok = true;
    if (!values.name || values.name.trim().length < 2) { markInvalid("name", true); ok = false; } else markInvalid("name", false);
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!values.email || !emailRe.test(values.email.trim())) { markInvalid("email", true); ok = false; } else markInvalid("email", false);
    if (!values.type || values.type.trim().length < 1) { markInvalid("type", true); ok = false; } else markInvalid("type", false);
    return ok;
  }

  function submitRegistration(values) {
    // No backend in the static build — resolve immediately.
    // To wire up a real endpoint, replace this with a fetch() call:
    //   return fetch("https://formspree.io/f/XX: { method:"POST",
    //     headers:{ "Content-Type":"application/json" }, body: JSON.stringify(values) });
    return Promise.resolve();
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var values = {
        name: (data.get("name") || "").toString(),
        email: (data.get("email") || "").toString(),
        phone: (data.get("phone") || "").toString(),
        type: (data.get("type") || "").toString(),
        notes: (data.get("notes") || "").toString()
      };
      if (!validate(values)) return;

      var submitBtn = form.querySelector(".modal__submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "جارٍ الإرسال...";

      submitRegistration(values).then(function () {
        toast("تم تسجيل اهتمامك بنجاح", "سنتواصل معك عند إطلاق المنصة.");
        closeModal();
      }).catch(function () {
        toast("حدث خطأ", "تعذّر إرسال التسجيل، حاول مرة أخرى.", "error");
      }).then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "إرسال";
      });
    });
  }

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
