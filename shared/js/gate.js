(function () {
  var GATE_PW = "aaa";
  var GATE_KEY = "hyhx-a-gate-ts";
  var GATE_TTL = 7 * 24 * 60 * 60 * 1000;
  function gateLeft() {
    try {
      var t = Number(localStorage.getItem(GATE_KEY) || 0);
      if (!t) return 0;
      var d = Date.now() - t;
      if (d < 0) return GATE_TTL;
      return d < GATE_TTL ? (GATE_TTL - d) : 0;
    } catch (e) { return 0; }
  }
  function gateRemember() {
    try { localStorage.setItem(GATE_KEY, String(Date.now())); } catch (e) {}
  }
  function gateSet(on) {
    document.body.classList.toggle("is-masked", !!on);
    var g = document.getElementById("pg-gate");
    if (g) g.style.display = on ? "flex" : "none";
    var eye = document.getElementById("top-eye");
    if (eye) {
      eye.setAttribute("aria-pressed", on ? "false" : "true");
      eye.title = on ? "点击输入密码查看页面信息" : "点击隐藏页面信息";
    }
    var sh = document.querySelector(".shell");
    if (sh) { if (on) sh.setAttribute("inert", ""); else sh.removeAttribute("inert"); }
  }
  function gateTry() {
    var i = document.getElementById("pg-pw"), e = document.getElementById("pg-err");
    var v = ((i && i.value) || "").trim();
    if (v === GATE_PW) {
      gateRemember();
      gateSet(false);
      if (i) i.value = "";
      if (e) e.textContent = "";
      return;
    }
    if (e) e.textContent = "密码不正确，请重新输入";
    var box = document.querySelector(".pg-gate-box");
    if (box) { box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake"); }
    if (i) { try { i.focus(); i.select(); } catch (e0) {} }
  }
  window.addEventListener("DOMContentLoaded", function () {
    var go = document.getElementById("pg-go"), pw = document.getElementById("pg-pw"), eye = document.getElementById("top-eye");
    if (go) go.addEventListener("click", gateTry);
    if (pw) pw.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); gateTry(); } });
    if (eye) eye.addEventListener("click", function () {
      if (document.body.classList.contains("is-masked")) { if (pw) { try { pw.focus(); } catch (e1) {} } }
      else gateSet(true);
    });
    var left = gateLeft();
    var tip = document.getElementById("pg-tip");
    if (tip) {
      if (left > 0) {
        var dd = Math.ceil(left / 86400000);
        tip.textContent = "本机已验证，剩余 " + dd + " 天内无需再次输入";
      }
    }
    gateSet(left <= 0);
  });
})();
