(function () {
  var bars = document.querySelectorAll("[data-execbar]");
  function paint(which) {
    Array.prototype.forEach.call(bars, function (b) {
      Array.prototype.forEach.call(b.querySelectorAll("[data-exec]"), function (x) {
        x.classList.toggle("on", x.getAttribute("data-exec") === which);
      });
    });
  }
  function show(which) {
    Array.prototype.forEach.call(document.querySelectorAll(".view"), function (v) {
      if (v.id === "view-investment") v.classList.toggle("is-on", which === "overview");
      if (v.id === "view-exec") v.classList.toggle("is-on", which === "detail");
    });
    if (location.hash !== "#" + which) history.replaceState(null, "", "#" + which);
    paint(which);
    try { window.dispatchEvent(new Event("resize")); } catch (e) {}
  }
  document.addEventListener("click", function (e) {
    var t = e.target;
    var b = t && t.closest ? t.closest("[data-exec]") : null;
    if (b) { e.preventDefault(); show(b.getAttribute("data-exec")); return; }
    var nav = t && t.closest ? t.closest(".nav-item") : null;
    if (nav) setTimeout(function () { paint("overview"); }, 0);
  });
  setTimeout(function () {
    show(location.hash === "#detail" ? "detail" : "overview");
  }, 0);
  window.addEventListener("hashchange", function () {
    show(location.hash === "#detail" ? "detail" : "overview");
  });
  /* 明细页里原有的年份标签也是 .pg-tab 风格，这里不动；总览/明细用 .fa-tab 与固投页签保持一致 */
})();
