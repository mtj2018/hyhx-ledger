(function () {
  function showTab(k) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-ov]"), function (b) {
      var on = b.getAttribute("data-ov") === k;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-current", on ? "true" : "false");
    });
    var map = { info: "ov-info", ctr: "ov-ctr", files: "ov-embed-files", other: "ov-embed-other" };
    Object.keys(map).forEach(function (x) {
      var el = document.getElementById(map[x]);
      if (el) el.style.display = (x === k) ? "" : "none";
    });
  }

  /* 把「重要文档管理 / 其他信息」两个视图整体搬进项目基本情况做标签页（原 id 与渲染逻辑保持不变） */
  (function embed() {
    [["view-files", "ov-embed-files"], ["view-other", "ov-embed-other"]].forEach(function (p) {
      var sec = document.getElementById(p[0]), host = document.getElementById(p[1]);
      if (!sec || !host) return;
      sec.classList.remove("view"); sec.classList.add("ov-embed-sec");
      sec.style.display = ""; sec.removeAttribute("id_backup");
      host.appendChild(sec);
    });
  })();

  var ON = { zlj: false, lm: true, zja: false, zjd: false };
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  /* 合同清单是「合同额」的唯一数据源：把每个标段当前显示的合同额同步到全局，
     完成率统计 / B 页分项产值都只读这一份，不再各存一套数 */
  function publishCtr() {
    var net = {}, rows = document.querySelectorAll("#ctr-tj tbody tr");
    Array.prototype.forEach.call(rows, function (tr, i) {
      var cell = tr.querySelector("td.amt"); if (!cell) return;
      var v = +String(cell.textContent).replace(/,/g, "");
      if (isFinite(v)) net["t" + (i + 1)] = v;
    });
    [["ctr-ja", "j"], ["ctr-jd", "m"]].forEach(function (p) {
      var tb = document.getElementById(p[0]); if (!tb) return;
      Array.prototype.forEach.call(tb.querySelectorAll("tbody tr"), function (tr, i) {
        var cell = tr.querySelector("td.amt"); if (!cell) return;
        var v = +String(cell.textContent).replace(/,/g, "");
        if (isFinite(v)) net[p[1] + (i + 1)] = v;
      });
    });
    window.__CTR_NET = net;
    window.__CTR_STATE = { zlj: !!ON.zlj, lm: !!ON.lm };
    try { document.dispatchEvent(new CustomEvent("ctr-changed")); } catch (e0) {}
  }
  window.__ctrSet = function (opt) {
    if (opt && opt.zlj !== undefined) ON.zlj = !!opt.zlj;
    if (opt && opt.lm !== undefined) ON.lm = !!opt.lm;
    paintCtr();
  };
  function paintCtr() {
    var total = 0;
    Array.prototype.forEach.call(document.querySelectorAll("#ctr-tj td.amt"), function (c) {
      var amt = +c.getAttribute("data-amt"), z = +c.getAttribute("data-zlj"), l = +c.getAttribute("data-lm");
      var v = amt - (ON.zlj ? 0 : z) - (ON.lm ? 0 : l);
      c.textContent = fmt(v);
      total += v;
    });
    var t = document.getElementById("ctr-t-amt");
    if (t) t.textContent = fmt(total);
    Array.prototype.forEach.call(document.querySelectorAll("[data-ctrt]"), function (b) {
      b.classList.toggle("is-on", !!ON[b.getAttribute("data-ctrt")]);
    });
    Array.prototype.forEach.call(document.querySelectorAll("#ctr-tj td.z"), function (c) {
      c.classList.toggle("is-off", !ON.zlj);
    });
    Array.prototype.forEach.call(document.querySelectorAll("#ctr-tj td.l"), function (c) {
      c.classList.toggle("is-off", !ON.lm);
    });
    /* 交安 / 机电：暂列金同样可切换是否计入合同额 */
    [["zja", "ctr-ja"], ["zjd", "ctr-jd"]].forEach(function (x) {
      var tb = document.getElementById(x[1]);
      if (!tb) return;
      var on = !!ON[x[0]], tot = 0;
      Array.prototype.forEach.call(tb.querySelectorAll("td.amt"), function (c) {
        var amt = +c.getAttribute("data-amt"), z = +c.getAttribute("data-zlj");
        var v = amt - (on ? 0 : z);
        c.textContent = fmt(v);
        tot += v;
      });
      Array.prototype.forEach.call(tb.querySelectorAll("td.stot"), function (c) { c.textContent = fmt(tot); });
      Array.prototype.forEach.call(tb.querySelectorAll("td.z"), function (c) { c.classList.toggle("is-off", !on); });
    });
    publishCtr();
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var tab = t && t.closest ? t.closest("[data-ov]") : null;
    if (tab) { showTab(tab.getAttribute("data-ov")); return; }
    var tg = t && t.closest ? t.closest("[data-ctrt]") : null;
    if (tg) { var k = tg.getAttribute("data-ctrt"); ON[k] = !ON[k]; paintCtr(); return; }
  });

  showTab("info");
  paintCtr();
})();
