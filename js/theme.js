// Shared light/dark theme toggle for Scene One admin + reader pages.
(function () {
  var KEY = "sceneone-theme";
  var root = document.documentElement;

  function current() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function icon(theme) {
    // show the action you'd take: moon = switch to dark, sun = switch to light
    return theme === "dark" ? "☀️" : "🌙";
  }

  function paintButtons(theme) {
    var btns = document.querySelectorAll("#themeBtn");
    for (var i = 0; i < btns.length; i++) btns[i].textContent = icon(theme);
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(KEY, theme); } catch (e) {}
    paintButtons(theme);
  }

  function toggle() {
    apply(current() === "dark" ? "light" : "dark");
  }

  function init() {
    // the no-flash head script already set data-theme; just sync the icon + bind
    paintButtons(current());
    var btns = document.querySelectorAll("#themeBtn");
    for (var i = 0; i < btns.length; i++) btns[i].addEventListener("click", toggle);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
