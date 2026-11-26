/* A 页 · 地市州管理：数据全部取自 B 页工程旬报（只取云端最新一期，累计口径） */
(function () {
  "use strict";
  var OWNER = "mtj2018", REPO = "hyhx-ledger-data", DIR = "data", BR = "main";
  var TOKEN = ["github_pat_11APXBKUQ05PG", "NDyiRnskz_lDhKkCkD78klbtqNTGbV4wcv0CU4y8H0LXa8z53lCPVBJQWQNWPbkfRSLJl"].join("");
  var CITEMS = ["土石方", "路基管桩", "水泥搅拌桩", "桩基", "桥梁管桩", "墩柱", "盖梁", "梁板预制", "梁板安装"];
  var CU = ["万方", "万米", "万米", "根", "套", "个", "个", "片", "片"];
  /* 土建1标地市州块的设计量（旬报表「土建1标地市州统计信息」锁定值：武汉段 / 孝感段 / 仙桃段） */
  var T1DES = {
    "武汉": [276.7, 55.1, 4.5, 2105, 0, 870, 429, 3194, 3194],
    "孝感": [43.2, 49.6, 0, 479, 824, 238, 328, 2258, 2258],
    "仙桃": [57.8, 35.7, 38.9, 1976, 1392, 1423, 973, 7186, 7186]
  };
  /* 每个地市州＝土建1标属地段（部分市为0）＋若干整建标段 */
  var CITYMAP = [
    { city: "武汉", t1: "武汉", segs: [], label: "土建1标" },
    { city: "孝感", t1: "孝感", segs: [], label: "土建1标" },
    { city: "仙桃", t1: "仙桃", segs: [2, 3, 4], label: "土建1、2、3、4标" },
    { city: "潜江", t1: null, segs: [5, 6], label: "土建5、6标" },
    { city: "荆州", t1: null, segs: [7, 8], label: "土建7、8标" },
    { city: "宜昌", t1: null, segs: [9, 10], label: "土建9、10标" }
  ];
  var DATA = {}, LOADED = false;

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
    /* 只认真正有累计数据的期次：某一期若只有个别标段填报（累计仍为空），不作为取数期 */
    var cnt = {};
    Object.keys(DATA).forEach(function (t) {
      Object.keys(DATA[t].x || {}).forEach(function (k) {
        var d = DATA[t].x[k];
        if (!d || !d.cum) return;
        if (d.cum.some(function (v) { return v !== null && v !== undefined && v !== "" && +v > 0; })) cnt[k] = (cnt[k] || 0) + 1;
      });
    });
    return Object.keys(cnt).filter(function (k) { return cnt[k] >= 5; }).sort();
  }
  function cum(tid, k) {
    var d = DATA[tid] && DATA[tid].x ? DATA[tid].x[k] : null;
    return d && d.cum ? d.cum : null;
  }
  function tot(tid) {
    return DATA[tid] && DATA[tid].tot ? DATA[tid].tot : null;
  }
  /* 旬报 18 项 → 9 项：土石方＝主线/匝道挖填方之和，桥梁管桩取预应力管桩配套「套」 */
  function m9(a18) {
    if (!a18) return null;
    return [a18[0] + a18[1] + a18[2] + a18[3], a18[4], a18[5], a18[9], a18[11], a18[12], a18[13], a18[14], a18[15]];
  }
  function addTo(out, arr) {
    if (!arr) return false;
    var ok = false;
    for (var i = 0; i < 9; i++) {
      var v = +arr[i];
      if (isFinite(v) && arr[i] !== null && arr[i] !== undefined && arr[i] !== "") { out[i] += v; ok = true; }
    }
    return ok;
  }
  /* 返回 {d: 总设计量[9], c: 累计完成[9]|null} */
  function cityData(m, k) {
    var d = new Array(9).fill(0), c = new Array(9).fill(0), hasD = false, hasC = false, i;
    if (m.t1) {
      var t1d = T1DES[m.t1];
      if (t1d) for (i = 0; i < 9; i++) { var dv = +t1d[i]; if (isFinite(dv)) { d[i] += dv; hasD = true; } }
      var c1 = DATA[1] && DATA[1].c ? (DATA[1].c[k] || {}) : {};
      var seg = c1[m.t1 === "武汉" ? "蔡甸" : m.t1 === "孝感" ? "汉川" : "仙桃"];
      if (addTo(c, seg)) hasC = true;
    }
    m.segs.forEach(function (t) {
      if (addTo(d, m9(tot(t)))) hasD = true;
      if (addTo(c, m9(cum(t, k)))) hasC = true;
    });
    return { d: hasD ? d : null, c: hasC ? c : null };
  }
  function fmt(v, u) {
    if (v === null || v === undefined || !isFinite(v)) return "—";
    if (u === "万方" || u === "万米") return (Math.abs(v) < 1e-9 ? "0" : v.toFixed(2));
    return Math.round(v).toLocaleString();
  }
  function kTxt(k) {
    var y = k.slice(0, 4), mo = +k.slice(5, 7), dd = +k.slice(8, 10);
    return y + " 年 " + mo + " 月 " + dd + " 日 · 第" + ((mo - 1) * 3 + (dd <= 10 ? 1 : dd <= 20 ? 2 : 3)) + "旬";
  }
  function render() {
    var host = $("#dz-body"); if (!host) return;
    if (!LOADED) { host.innerHTML = '<div class="xb-loading">正在读取旬报数据…</div>'; return; }
    var ks = keys();
    if (!ks.length) { host.innerHTML = '<div class="xb-loading">云端暂无旬报数据（请先在数据填报页提交工程旬报）</div>'; return; }
    var k = ks[ks.length - 1];   /* 只取最新一期 */
    var bar = $("#dz-bar");
    if (bar) bar.innerHTML = '<span class="dz-src">数据取自 B 页工程旬报表，取云端最新一期：<b>'
      + kTxt(k) + '</b>；表内为截至本期累计完成量，完成比例＝累计完成 ÷ 总设计量，随旬报填报自动更新。</span>';

    var h = '<div class="dz-grid">';
    CITYMAP.forEach(function (m) {
      var o = cityData(m, k), d = o.d, c = o.c;
      h += '<div class="dz-card"><div class="dz-hd"><b>' + m.city + '</b><em>' + m.label + '</em></div>';
      h += '<table class="dz-tb"><thead><tr><th>项目</th><th>单位</th><th>总设计量</th><th>累计完成</th><th>完成比例</th></tr></thead><tbody>';
      CITEMS.forEach(function (n, i) {
        var dv = d ? +d[i] : null, cv = c ? +c[i] : null;
        var pctv = (dv && cv !== null && isFinite(cv)) ? (cv / dv * 100).toFixed(1) + "%" : "—";
        h += "<tr><td>" + n + "</td><td class=\"dz-u\">" + CU[i] + "</td><td>" + (dv ? fmt(dv, CU[i]) : "—")
          + "</td><td>" + (cv === null ? "—" : fmt(cv, CU[i])) + '</td><td class="dz-pct">' + pctv + "</td></tr>";
      });
      h += "</tbody></table></div>";
    });
    h += "</div>";
    h += '<div class="dz-note">口径：武汉＝土建1标武汉段，孝感＝土建1标孝感段，仙桃＝土建1标仙桃段＋土建2、3、4标，潜江＝土建5、6标，荆州＝土建7、8标，宜昌＝土建9、10标；土石方＝主线挖方＋匝道挖方＋主线填方＋匝道填方，桥梁管桩＝预应力管桩配套（套）。设计量与累计完成均取自工程旬报，土建1标按旬报「地市州统计」照搬。</div>';
    host.innerHTML = h;
  }
  function boot() {
    if (!$("#view-dz")) return;
    load().then(function () { render(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.__dzReload = function () { load(); return load().then(render); };
})();
