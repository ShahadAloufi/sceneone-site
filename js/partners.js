/* /partners — the meeting-request form.
 *
 * The fields are ours; the storage is still the Google Form the page used to
 * embed, so every response lands in the same sheet the team already watches
 * and nothing had to be migrated. The post goes to that form's own
 * /formResponse endpoint with Google's entry.* field names, which is what the
 * embedded iframe did internally.
 *
 * Google answers that endpoint without CORS headers, so the response is
 * unreadable by design: the request is sent with mode "no-cors" and a resolved
 * promise means "it left the browser", not "Google accepted it". That is the
 * same guarantee the iframe gave. A rejected promise is a real failure
 * (offline, or the network blocks docs.google.com) and is the only case that
 * shows the fallback.
 */
(function () {
  "use strict";

  var form = document.getElementById("form");
  var done = document.getElementById("pn-done");
  if (!form || !done) return;

  var action = form.getAttribute("data-form-action");
  var btn = form.querySelector(".pn-submit");
  var btnLabel = btn ? btn.querySelector("span") : null;

  /* The button's own label is swapped twice (sending / back to idle), which is
     outside what data-i18n can do on its own, so the two strings are read out
     of the same dictionary by hand. */
  function t(key, fallback) {
    var i = window.SceneOneI18n;
    try { return i.dict()[key] || fallback; } catch (e) { return fallback; }
  }

  function field(name) { return form.querySelector('[data-field="' + name + '"]'); }
  function mark(el, bad) { if (el) el.classList.toggle("invalid", !!bad); }

  /* Deliberately loose. The strict patterns reject addresses that work, and a
     wrong address costs a reply, not a corrupted record. */
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function validate() {
    var name = form.querySelector('[name="entry.222620959"]');
    var mail = form.querySelector('[name="entry.418305176"]');
    var picked = form.querySelector('[name="entry.1651544575"]:checked');

    var bad = [];
    if (!name.value.trim()) { mark(field("name"), true); bad.push(field("name")); }
    else mark(field("name"), false);

    if (!emailOk(mail.value.trim())) { mark(field("email"), true); bad.push(field("email")); }
    else mark(field("email"), false);

    if (!picked) { mark(field("interest"), true); bad.push(field("interest")); }
    else mark(field("interest"), false);

    if (bad.length) {
      /* Send focus to the first problem rather than leaving the reader to hunt
         for the red. */
      var first = bad[0].querySelector("input, textarea");
      if (first) {
        bad[0].scrollIntoView({ behavior: "smooth", block: "center" });
        try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
      }
      return false;
    }
    return true;
  }

  /* Clear a field's error the moment the reader starts fixing it. */
  form.addEventListener("input", function (e) {
    var f = e.target.closest(".pn-field");
    if (f && f.classList.contains("invalid")) f.classList.remove("invalid");
  });
  form.addEventListener("change", function (e) {
    var f = e.target.closest(".pn-field");
    if (f && f.classList.contains("invalid")) f.classList.remove("invalid");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    form.classList.remove("failed");
    if (!validate()) return;

    var body = new URLSearchParams();
    var data = new FormData(form);
    data.forEach(function (v, k) { body.append(k, v); });

    if (btn) {
      btn.disabled = true;
      if (btnLabel) btnLabel.textContent = t("pnSending", btnLabel.textContent);
    }

    fetch(action, { method: "POST", mode: "no-cors", body: body })
      .then(function () {
        form.hidden = true;
        done.hidden = false;
        done.scrollIntoView({ behavior: "smooth", block: "center" });
      })
      .catch(function () {
        form.classList.add("failed");
        if (btn) {
          btn.disabled = false;
          if (btnLabel) btnLabel.textContent = t("pnSend", btnLabel.textContent);
        }
      });
  });
})();
