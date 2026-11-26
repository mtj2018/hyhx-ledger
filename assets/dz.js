/* A 页 · 地市州管理：按六市自动汇总最新旬报 */
(function () {
  "use strict";
  var OWNER = "mtj2018", REPO = "hyhx-ledger-data", DIR = "data", BR = "main";
  var TOKEN = ["github_pat_11APXBKUQ05PG", "NDyiRnskz_lDhKkCkD78klbtqNTGbV4wcv0CU4y8H0LXa8z53lCPVBJQWQNWPbkfRSLJl"].join("");
  var CITEMS = ["土石方", "路基管桩", "水泥搅拌桩", "桩基", "桥梁管桩", "墩柱", "盖梁", "梁板预制", "梁板安装"];
  var CU = ["万方", "万米", "万米", "根", "套", "个", "个", "片", "片"];
  var DESIGN = {
    "武汉": [276.7, 55.1, 4.5, 2105, 0, 870, 429, 3194, 3194],
    "孝感": [43.2, 49.6, 0, 479, 824, 238, 328, 2258, 2258],
    "仙桃": [545.7, 262.4, 381.1, 6355, 3182, 3553, 2580, 18434, 18434],
    "潜江": [502.28, 242.4, 158.81, 3841, 1014, 2087, 1329, 8223, 8223],
    "荆州": [763, 47.4, 73.7, 4384, 0, 2099, 1236, 7813, 7813],
    "宜昌": [1330.2, 30, 210.5, 1741, 0, 686, 257, 3379, 3379]
  };
  var SEG = { "武汉": [], "孝感": [], "仙桃": [2, 3, 4], "潜江": [5, 6], "荆州": [7, 8], "宜昌": [9, 10] };
  var DATA = {}, LOADED = false, CURK = "";

  function $(s) { return document.querySelector(s); }
  function hdr() { return { "Authorization": "Bearer " + TOKEN, "Accept": "application/vnd.github+json" }; }
  function api(n) { return "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + DIR + "/" + n + "?ref=" + BR + "&t=" + Date.now(); }
  function load() {
    if (LOADED) return Promise.resolve(DATA);
    var names = [];
    for (var i = 1; i <= 10; i++) names.push("xt-xb-" + i + ".json");
    return Promise.all(names.map(function (n) {
      return fetch(api(n), { headers: hdr(), cache: "no-store" }).then(function (r) {
        if (!r.ok) return null;
        return r.json().then(function (j) {
          try { return JSON.parse(decodeURIComponent(escape(atob(String(j.content || "").replace(/\s+/g, ""))))); } catch (e) { return null; }
        });
      }).catch(function () { return null; });
    })).then(function (arr) {
      DATA = {}; arr.forEach(function (o, i) { if (o) DATA[i + 1] = o; }); LOADED = true; return DATA;
    });
  }
  function keys() {
    var ks = {};
    Object.keys(DATA).forEach(function (t) { Object.keys(DATA[t].x || {}).forEach(function (k) { ks[k] = 1; }); });
    return Object.keys(ks).sort();
  }
  function cum(tid, k) {
    var d = DATA[tid] && DATA[tid].x ? DATA[tid].x[k] : null;
    return d && d.cum ? d.cum : null;
  }
  function m9(a18) {
    if (!a18) return null;
    return [a18[0] + a18[1] + a18[2] + a18[3], a18[4], a18[5], a18[9], a18[11], a18[12], a18[13], a18[14], a18[15]];
  }
  function cityCum(city, k) {
    var out = new Array(9).fill(0), has = false;
    if (city === "武汉" || city === "孝感") {
      var c1 = DATA[1] && DATA[1].c ? DATA[1].c[k] : null;
      var a = c1 ? c1[city === "武汉" ? "蔡甸" : "汉川"] : null;
      if (a && a.length) { for (var i = 0; i < 9; i++) out[i] = +a[i] || 0; has = true; }
    } else if (city === "仙桃") {
      var x1 = DATA[1] && DATA[1].c ? DATA[1].c[k] : null;
      var b = x1 ? x1["仙桃"] : null;
      if (b && b.length) { for (var j = 0; j < 9; j++) out[j] += +b[j] || 0; has = true; }
    }
    (SEG[city] || []).forEach(function (t) {
      var m = m9(cum(t, k));
      if (m) { for (var i2 = 0; i2 < 9; i2++) out[i2] += +m[i2] || 0; has = true; }
    });
    return has ? out : null;
  }
  function fmt(v, u) {
    if (v === null || v === undefined || !isFinite(v)) return "—";
    if (u === "万方" || u === "万米") return (Math.abs(v) < 1e-9 ? "0" : v.toFixed(2));
    return Math.round(v).toLocaleString();
  }
  function render() {
    var host = $("#dz-body"); if (!host) return;
    if (!LOADED) { host.innerHTML = '<div class="xb-loading">正在读取旬报数据…</div>'; return; }
    var ks = keys();
    if (!ks.length) { host.innerHTML = '<div class="xb-loading">云端暂无旬报数据（请先在基础数据填报页提交工程旬报）</div>'; return; }
    var k = CURK && ks.indexOf(CURK) >= 0 ? CURK : ks[ks.length - 1];
    var sel = '<span class="dz-xun">数据期：</span><select class="pg-sel" id="dz-k">' + ks.slice().reverse().map(function (x) {
      return '<option value="' + x + '"' + (x === k ? " selected" : "") + ">" + x.replace(/-/g, ".") + " 旬</option>";
    }).join("") + '</select><span class="dz-xun">按标段属地自动汇总，累计口径</span>';
    var bar = $("#dz-bar"); if (bar) bar.innerHTML = sel;
    if ($("#dz-k")) $("#dz-k").onchange = function () { CURK = this.value; render(); };

    var h = '<div class="dz-grid">';
    ["武汉", "孝感", "仙桃", "潜江", "荆州", "宜昌"].forEach(function (city) {
      var c = cityCum(city, k), d = DESIGN[city];
      h += '<div class="dz-card"><div class="dz-hd"><b>' + city + (city === "武汉" ? "（蔡甸）" : city === "孝感" ? "（汉川）" : "") +
        "</b><em>" + (SEG[city] && SEG[city].length ? "土建" + SEG[city].join("、") + "标" : "土建1标属地") + "</em></div>";
      h += '<table class="dz-tb"><thead><tr><th>项目</th><th>总设计量</th><th>累计完成</th><th>完成比例</th></tr></thead><tbody>';
      CITEMS.forEach(function (n, i) {
        var dv = +d[i] || 0, cv = c ? +c[i] || 0 : null;
        h += "<tr><td>" + n + (CU[i] ? '<span class="dz-pct"> · ' + CU[i] + "</span>" : "") + "</td><td>" + (dv ? fmt(dv, CU[i]) : "—") +
          "</td><td>" + (cv === null ? "—" : fmt(cv, CU[i])) + '</td><td class="dz-pct">' + (dv && cv !== null ? (cv / dv * 100).toFixed(1) + "%" : "—") + "</td></tr>";
      });
      h += "</tbody></table></div>";
    });
    h += "</div>";
    h += '<div class="dz-note">口径：武汉＝土建1标蔡甸段，孝感＝土建1标汉川段，仙桃＝土建1标仙桃段＋土建2–4标，潜江＝土建5–6标，荆州＝土建7–8标，宜昌＝土建9–10标；土石方＝挖方（主线＋匝道）＋填方（主线＋匝道），桥梁管桩＝预应力管桩。总设计量为旬报表锁定值。</div>';
    host.innerHTML = h;
  }
  function boot() {
    if (!$("#view-dz")) return;
    load().then(function () { render(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.__dzReload = function () { CURK = ""; load(); return load().then(render); };
})();
