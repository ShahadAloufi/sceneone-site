// Shared light/dark theme toggle for Scene One admin + reader pages.
(function () {
  var KEY = "sceneone-theme";
  var root = document.documentElement;

  function current() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  var SUN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
  var MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function icon(theme) {
    // show the action you'd take: moon = switch to dark, sun = switch to light
    return theme === "dark" ? SUN : MOON;
  }

  function paintButtons(theme) {
    var btns = document.querySelectorAll("#themeBtn");
    for (var i = 0; i < btns.length; i++) btns[i].innerHTML = icon(theme);
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
