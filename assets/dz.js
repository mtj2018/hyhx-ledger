/* A 页 · 地市州管理
   总览：固化《汉宜改扩建项目投资完成情况一览表（监理月报）》数据（window.__DZ_OV）
   形象进度：数据全部取自 B 页工程旬报（只取云端最新一期，累计口径） */
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
  var TAB = "overview", CITY = "wuhan";

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

  /* ---------- 总览 ---------- */
  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function wn(v, d) {
    if (v === null || v === undefined || !isFinite(v)) return "—";
    var n = Number(v);
    var dec = d === undefined ? (Math.abs(n - Math.round(n)) > 1e-6 ? 2 : 0) : d;
    return n.toLocaleString("zh-CN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function pc(v) {
    if (v === null || v === undefined || !isFinite(v)) return "—";
    return (v * 100).toFixed(1) + "%";
  }
  function pctOrDash(a, b) {
    return (a !== null && a !== undefined && b) ? a / b : null;
  }
  function pars(t) {
    var s = esc(t || "").split("\n");
    s = s.filter(function (x) { return x.trim() !== ""; });
    if (!s.length) return "<p>—</p>";
    return s.map(function (x) { return "<p>" + x + "</p>"; }).join("");
  }
  function catOf(part) {
    var o = { tj: 0, ja: 0, jd: 0, fj: 0 };
    (part.prod || []).forEach(function (r) {
      if (/^土建/.test(r.name)) o.tj += +r.v || 0;
      else if (/^交安/.test(r.name)) o.ja += +r.v || 0;
      else if (/^机电/.test(r.name)) o.jd += +r.v || 0;
      else if (/^房建/.test(r.name)) o.fj += +r.v || 0;
    });
    return o;
  }
  function barRows(p) {
    var rows = [["路基工程", p.lj], ["桥梁工程", p.ql], ["路面工程", p.lm], ["交安工程", p.ja], ["机电工程", p.jd], ["房建工程", p.fj]];
    return '<div class="dz-bars"><div class="bhd"><span>产值完成比例</span><span>按形象进度口径</span></div><div class="dz-bars-grid">'
      + rows.map(function (r) {
        var v = r[1];
        var w = (v && isFinite(v)) ? Math.max(0, Math.min(100, v * 100)) : 0;
        return '<div class="dz-brow"><span class="k">' + r[0] + '</span><span class="tr"><i style="width:' + w.toFixed(2)
          + '%"></i></span><span class="p">' + pc(v) + '</span></div>';
      }).join("") + '</div></div>';
  }
  function prodTable(part) {
    var rows = (part.prod || []).map(function (r) {
      return '<tr><td>' + esc(r.name) + '</td><td>' + wn(r.v, 0) + '</td></tr>';
    }).join("");
    return '<table class="dz-prod"><thead><tr><th>标段</th><th>建安费产值（万元）</th></tr></thead><tbody>'
      + rows + '<tr><td>合计</td><td>' + wn(part.prodTotal, 0) + '</td></tr></tbody></table>';
  }
  function catChips(part) {
    var c = catOf(part);
    return '<div class="dz-cats">'
      + '<div class="dz-cat"><div class="k">土建</div><div class="v">' + wn(c.tj, 0) + '</div></div>'
      + '<div class="dz-cat"><div class="k">交安</div><div class="v">' + wn(c.ja, 0) + '</div></div>'
      + '<div class="dz-cat"><div class="k">机电</div><div class="v">' + wn(c.jd, 0) + '</div></div>'
      + '<div class="dz-cat"><div class="k">房建</div><div class="v">' + wn(c.fj, 0) + '</div></div>'
      + '</div>';
  }
  function narr(part) {
    return '<div class="dz-narr">'
      + '<div class="dz-narr-box"><div class="h">已完成</div>' + pars(part.done) + '</div>'
      + '<div class="dz-narr-box"><div class="h">下一步计划</div>' + pars(part.next) + '</div>'
      + '<div class="dz-narr-box"><div class="h">亟需解决的问题</div>' + pars(part.issue) + '</div>'
      + '</div>';
  }
  function partBlock(part, idx) {
    var label = part.label || "建安费产值";
    return '<div class="dz-part">'
      + '<div class="dz-part-hd"><b>' + esc(label) + '</b>'
      + (part.stake ? '<em>段面 ' + esc(part.stake.replace(/\n/g, " / ")) + '</em>' : '')
      + '<span class="sum">产值合计 <b>' + wn(part.prodTotal, 0) + '</b> 万元</span></div>'
      + catChips(part) + prodTable(part) + narr(part) + '</div>';
  }
  function cityPanel(c) {
    var b = c.budget || {}, p = c.pct || {};
    return '<div class="dz-city-panel" id="dz-city-panel">'
      + '<div class="dz-city-hd"><div><div class="nm">' + esc(c.name) + '</div>'
      + '<div class="meta">段面桩号：<b>' + esc((c.stake || "—").replace(/\n/g, "　/　")) + '</b></div></div>'
      + '<div class="len"><b>' + wn(c.length, 1) + '</b>公里</div></div>'
      + '<div class="dz-city-kpis">'
      + '<div class="dz-city-kpi"><div class="k">概算总投资</div><div class="v">' + wn(b.gs, 0) + '<small>万元</small></div></div>'
      + '<div class="dz-city-kpi"><div class="k">实际合同额</div><div class="v">' + wn(b.sj, 0) + '<small>万元</small></div></div>'
      + '<div class="dz-city-kpi"><div class="k">概算完成</div><div class="v">' + wn(b.gsDone, 0) + '<small>万元</small></div></div>'
      + '<div class="dz-city-kpi"><div class="k">固定资产</div><div class="v">' + wn(b.fixed, 0) + '<small>万元</small></div></div>'
      + '<div class="dz-city-kpi"><div class="k">实际完成</div><div class="v">' + wn(b.actualDone, 0) + '<small>万元</small></div></div>'
      + '</div>'
      + '<div class="dz-city-body">'
      + '<div class="dz-city-note"><div class="lb">项目概况</div>' + pars(c.overview) + '</div>'
      + (c.parts || []).map(partBlock).join("")
      + '<div style="margin-top:14px">' + barRows(p) + '</div>'
      + '</div></div>';
  }
  function renderOv() {
    var host = $("#dz-body"); if (!host) return;
    var D = window.__DZ_OV;
    if (!D) { host.innerHTML = '<div class="xb-loading">总览数据未加载</div>'; return; }
    var t = D.total || {}, tb = t.budget || {};
    var k = [
      ["概算总投资", wn(tb.gs, 0), "万元"],
      ["实际合同额", wn(tb.sj, 0), "万元"],
      ["概算完成", wn(tb.gsDone, 0), "万元"],
      ["固定资产", wn(tb.fixed, 0), "万元"],
      ["实际完成", wn(tb.actualDone, 0), "万元"],
      ["段面长度", wn(t.length, 1), "公里"]
    ];
    var cmp = (D.cities || []).map(function (c, i) {
      var b = c.budget || {};
      return '<tr><td>' + (i + 1) + '</td><td class="nm">' + esc(c.name) + '</td>'
        + '<td>' + wn(c.length, 1) + '</td>'
        + '<td>' + wn(b.gs, 0) + '</td>'
        + '<td>' + wn(b.sj, 0) + '</td>'
        + '<td>' + wn(b.gsDone, 0) + '</td>'
        + '<td>' + wn(b.fixed, 0) + '</td>'
        + '<td>' + wn(b.actualDone, 0) + '</td>'
        + '<td>' + pc(pctOrDash(b.fixed, b.gs)) + '</td>'
        + '<td>' + wn(c.prod ? c.prod.total : 0, 0) + '</td></tr>';
    }).join("");
    cmp += '<tr class="total"><td>—</td><td class="nm">合计</td><td>' + wn(t.length, 1) + '</td>'
      + '<td>' + wn(tb.gs, 0) + '</td><td>' + wn(tb.sj, 0) + '</td><td>' + wn(tb.gsDone, 0) + '</td>'
      + '<td>' + wn(tb.fixed, 0) + '</td><td>' + wn(tb.actualDone, 0) + '</td>'
      + '<td>' + pc(pctOrDash(tb.fixed, tb.gs)) + '</td><td>' + wn(t.prod ? t.prod.total : 0, 0) + '</td></tr>';

    var cur = null;
    (D.cities || []).some(function (c) { if (c.key === CITY) { cur = c; return true; } return false; });
    if (!cur) { cur = D.cities[0]; CITY = cur.key; }

    var switches = '<div class="dz-city-switch">' + (D.cities || []).map(function (c) {
      return '<button type="button" class="dz-city-btn' + (c.key === CITY ? ' on' : '') + '" data-city="' + c.key + '">' + esc(c.name) + '</button>';
    }).join("") + '</div>';

    host.innerHTML = '<div class="dz-ov">'
      + '<div class="dz-ov-hero">'
      + '<div class="dz-ov-hero-hd"><div><div class="t">' + esc(D.title) + '</div>'
      + '<div class="s">按地市州汇总 · 数据全部固化 · 单位：万元</div></div>'
      + '<div class="upd">更新时间 ' + esc(D.update) + '</div></div>'
      + '<div class="dz-ov-kpis">' + k.map(function (x) {
        return '<div class="dz-ov-kpi"><div class="k">' + x[0] + '</div><div class="v">' + x[1]
          + '<small>' + x[2] + '</small></div></div>';
      }).join("") + '</div>'
      + '<div class="dz-ov-sec" style="padding:0 18px 18px"><div class="dz-ov-sec-hd"><h3>地市州投资完成情况对比</h3><span>点击下方城市查看详细形象进度与问题清单</span></div>'
      + '<div style="overflow:auto"><table class="dz-ov-tbl"><thead><tr>'
      + '<th style="width:44px">序号</th><th style="width:80px">地市州</th><th>段面长度<br>（公里）</th>'
      + '<th>概算<br>（万元）</th><th>实际合同额<br>（万元）</th><th>概算完成<br>（万元）</th>'
      + '<th>固定资产<br>（万元）</th><th>实际完成<br>（万元）</th><th>固定资产<br>占概算</th><th>建安费产值<br>（万元）</th>'
      + '</tr></thead><tbody>' + cmp + '</tbody></table></div></div>'
      + '</div>'
      + '<div class="dz-ov-sec"><div class="dz-ov-sec-hd"><h3>分地市州详情</h3><span>共 ' + (D.cities || []).length + ' 个地市州（仙桃含一、二驻地范围）</span></div>'
      + switches + cityPanel(cur) + '</div>'
      + '</div>';

    Array.prototype.forEach.call(host.querySelectorAll(".dz-city-btn"), function (b) {
      b.addEventListener("click", function () {
        CITY = b.getAttribute("data-city");
        renderOv();
      });
    });
  }

  /* ---------- 形象进度（旬报） ---------- */
  function renderShape() {
    var host = $("#dz-body"); if (!host) return;
    if (!LOADED) { host.innerHTML = '<div class="xb-loading">正在读取旬报数据…</div>'; return; }
    var ks = keys();
    if (!ks.length) { host.innerHTML = '<div class="xb-loading">云端暂无旬报数据（请先在数据填报页提交工程旬报）</div>'; return; }
    var k = ks[ks.length - 1];   /* 只取最新一期 */
    var bar = $("#dz-bar");
    if (bar) bar.innerHTML = '<span class="dz-src">数据提取自工程旬报：<b>' + kTxt(k) + '</b></span>';

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
    host.innerHTML = h;
  }

  function paintTabs() {
    Array.prototype.forEach.call(document.querySelectorAll(".dz-tab"), function (b) {
      var on = b.getAttribute("data-dz") === TAB;
      b.classList.toggle("on", on);
      b.setAttribute("aria-current", on ? "true" : "false");
    });
    var bar = $("#dz-bar"); if (bar) bar.style.display = (TAB === "shape") ? "flex" : "none";
  }
  function render() {
    paintTabs();
    if (TAB === "shape") renderShape(); else renderOv();
  }
  function boot() {
    if (!$("#view-dz")) return;
    Array.prototype.forEach.call(document.querySelectorAll(".dz-tab"), function (b) {
      b.addEventListener("click", function () {
        TAB = b.getAttribute("data-dz") || "overview";
        render();
      });
    });
    render();
    load().then(function () { if (TAB === "shape") render(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.__dzReload = function () { LOADED = false; return load().then(function () { if (TAB === "shape") render(); return DATA; }); };
})();
