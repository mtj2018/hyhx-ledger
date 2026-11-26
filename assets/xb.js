/* 工程旬报模块（B 页） —— 自包含：独立读写 xt-xb-<标段>.json，不干扰月报数据链
   2026-11-26 改版：按五个驻地办分标签；表内项目横排（一行项目、一行单位）压缩高度；
   1 标增加「地市州统计」小卡片（设计量 / 累计完成 / 完成比例）；
   取消身份切换，改为按钮式工作流：待施工单位填报 →（提交）→ 待监理单位复核 →（退回 / 复核通过）→ 完成；
   支持按旬报 Excel 版式导出 PDF。 */
(function () {
  "use strict";
  var OWNER = "mtj2018", REPO = "hyhx-ledger-data", DIR = "data", BR = "main";
  var TOKEN = ["github_pat_11APXBKUQ05PG", "NDyiRnskz_lDhKkCkD78klbtqNTGbV4wcv0CU4y8H0LXa8z53lCPVBJQWQNWPbkfRSLJl"].join("");
  var ITEMS = [
    { n: "主线挖方", u: "万方", g: 0 }, { n: "匝道挖方", u: "万方", g: 0 },
    { n: "主线填方", u: "万方", g: 0 }, { n: "匝道填方", u: "万方", g: 0 },
    { n: "路基管桩", u: "万米", g: 1 }, { n: "水泥搅拌桩", u: "万米", g: 1 },
    { n: "高压旋喷桩", u: "万米", g: 1 }, { n: "固化土桩", u: "万米", g: 1 },
    { n: "换填类", u: "万方", g: 1 }, { n: "桩基", u: "根", g: 2 },
    { n: "预应力管桩", u: "万米", g: 2 }, { n: "预应力管桩配套", u: "套", g: 2 },
    { n: "墩柱", u: "个", g: 2 }, { n: "盖梁", u: "个", g: 2 },
    { n: "梁板预制", u: "片", g: 2 }, { n: "梁板安装", u: "片", g: 2 },
    { n: "小桥", u: "座", g: 2 }, { n: "小型构造物", u: "道", g: 2 }
  ];
  var GROUPS = ["土石方", "软基处理", "桥梁"];
  var TENDERS = ["土建1标", "土建2标", "土建3标", "土建4标", "土建5标",
                 "土建6标", "土建7标", "土建8标", "土建9标", "土建10标"];
  var OWNS = ["HYSJSG-1标建设集团", "HYTJ-2标中铁十九局", "HYTJ-3标中铁二十五局", "HYTJ-4标中铁十七局",
              "HYTJ-5标葛洲坝路桥", "HYTJ-6标中建八局", "HYTJ-7标中交一公局", "HYTJ-8标中交路建",
              "HYTJ-9标中铁五局", "HYTJ-10标中电建路桥"];
  var CITEMS = ["土石方", "路基管桩", "水泥搅拌桩", "桩基", "桥梁管桩", "墩柱", "盖梁", "梁板预制", "梁板安装"];
  var CU = ["万方", "万米", "万米", "根", "套", "个", "个", "片", "片"];
  /* 地市州（土建1标）设计量：取自旬报 Excel「1标（蔡甸/汉川/仙桃）」块，空值为无此设计量 */
  var DMAP = {
    "蔡甸": [276.7, 55.1, 4.5, 2105, null, 870, 429, 3194, 3194],
    "汉川": [43.2, 49.6, null, 479, 824, 238, 328, 2258, 2258],
    "仙桃": [57.8, 35.7, 38.9, 1976, 1392, 1423, 973, 7186, 7186]
  };
  var CITIES = ["蔡甸", "汉川", "仙桃"];
  var ZB = [
    { id: "z1", nm: "一驻地办", sub: "土建1标", tids: [1] },
    { id: "z2", nm: "二驻地办", sub: "土建2、3、4标", tids: [2, 3, 4] },
    { id: "z3", nm: "三驻地办", sub: "土建5、6标", tids: [5, 6] },
    { id: "z4", nm: "四驻地办", sub: "土建7、8标", tids: [7, 8] },
    { id: "z5", nm: "五驻地办", sub: "土建9、10标", tids: [9, 10] }
  ];
  var DATA = {}, SHA = {}, LOADED = false, CUR = { zb: "z1", xun: "" }, CONFIRM = {}, TM = {};
  var ST = { 1: { t: "待施工单位填报", c: "s1" }, 2: { t: "待监理单位复核", c: "s2" }, 3: { t: "已完成（监理已提交）", c: "s3" } };

  function $(s, r) { return (r || document).querySelector(s); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function lastDay(y, m) { return new Date(y, m, 0).getDate(); }
  function xunOf(y, m) { return [10, 20, lastDay(y, m)]; }
  function keyOf(y, m, d) { return y + "-" + pad(m) + "-" + pad(d); }
  function cnDate(k) { var a = k.split("-"); return a[0] + "年" + (+a[1]) + "月" + (+a[2]) + "日"; }
  function todayKey() {
    var t = new Date();
    var ds = xunOf(t.getFullYear(), t.getMonth() + 1), pick = ds[2];
    if (t.getDate() <= 10) pick = 10; else if (t.getDate() <= 20) pick = 20;
    return keyOf(t.getFullYear(), t.getMonth() + 1, pick);
  }
  /* 万方 / 万米 统一保留 1 位小数；根/套/个/片/座/道 取整 */
  function fmt(v, u) {
    if (v === null || v === undefined || v === "" || !isFinite(v)) return "—";
    if (u === "万方" || u === "万米") return (Math.abs(v) < 1e-9 ? "0.0" : (+v).toFixed(1));
    return Math.round(v).toLocaleString();
  }
  /* 比例不要小数 */
  function pct(a, b) { return b > 0 ? Math.round(a / b * 100) + "%" : "—"; }
  /* 输入框回显：万方/万米 保留 1 位，其余取整 */
  function fin(v, u) {
    if (v === "" || v === null || v === undefined) return "";
    var n = +v;
    if (!isFinite(n)) return String(v);
    if (u === "万方" || u === "万米") return n.toFixed(1);
    return String(Math.round(n));
  }

  /* ---------------- 云端读写 ---------------- */
  function hdr() { return { "Authorization": "Bearer " + TOKEN, "Accept": "application/vnd.github+json" }; }
  function api(name) {
    return "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + DIR + (name ? "/" + name : "") + "?ref=" + BR + "&t=" + Date.now();
  }
  function jget(name) {
    return fetch(api(name), { headers: hdr(), cache: "no-store" }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("读取 HTTP " + r.status);
      return r.json().then(function (j) {
        var txt = decodeURIComponent(escape(atob(String(j.content || "").replace(/\s+/g, ""))));
        SHA[name] = j.sha;
        try { return JSON.parse(txt); } catch (e) { return null; }
      });
    });
  }
  function jput(name, obj) {
    var payload = { message: "xunbao " + name, content: btoa(unescape(encodeURIComponent(JSON.stringify(obj)))) };
    if (SHA[name]) payload.sha = SHA[name];
    return fetch(api(name), {
      method: "PUT",
      headers: { "Authorization": "Bearer " + TOKEN, "Accept": "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error("写入 " + r.status); if (j.content) SHA[name] = j.content.sha; return true; }); });
  }
  function load(force) {
    if (LOADED && !force) return Promise.resolve(DATA);
    var names = TENDERS.map(function (t, i) { return "xt-xb-" + (i + 1) + ".json"; });
    return Promise.all(names.map(function (n) { return jget(n).catch(function () { return null; }); })).then(function (arr) {
      DATA = {}; arr.forEach(function (o, i) { if (o) DATA[i + 1] = o; });
      LOADED = true; return DATA;
    });
  }

  /* ---------------- 旬序列 / 记录 ---------------- */
  function prevKey(k, all) {
    var keys = Object.keys(all || {}).filter(function (x) { return x < k; }).sort();
    return keys.length ? keys[keys.length - 1] : "";
  }
  function cumOf(tid, k) {
    var d = DATA[tid] && DATA[tid].x ? DATA[tid].x[k] : null;
    return d && d.cum ? d.cum : null;
  }
  function rec(tid, k) {
    var o = DATA[tid] || (DATA[tid] = { v: 1, tid: tid, x: {} });
    if (!o.x) o.x = {};
    if (!o.x[k]) o.x[k] = { q: ITEMS.map(function () { return 0; }), cum: ITEMS.map(function () { return 0; }), red: [], sub: 0, sup: 0, ts: k };
    return o.x[k];
  }
  function prevCum(tid, k) {
    var p = prevKey(k, DATA[tid] && DATA[tid].x);
    if (p) { var c = cumOf(tid, p); if (c) return c; }
    return null;
  }
  function stateOf(tid, k) { var r = rec(tid, k); return r.sup ? 3 : (r.sub ? 2 : 1); }
  function hasTot(tid, i) {
    var tot = DATA[tid] && DATA[tid].tot ? DATA[tid].tot : null;
    return !!(tot && tot[i] !== null && tot[i] !== undefined && isFinite(+tot[i]) && +tot[i] > 0);
  }

  /* ---------------- 期次选择 ---------------- */
  function options() {
    var host = $("#xb-bar"); if (!host) return;
    var k = CUR.xun || todayKey();
    var ky = parseInt(k.slice(0, 4), 10), km = parseInt(k.slice(5, 7), 10), kd = parseInt(k.slice(8, 10), 10);
    var ys = [];
    for (var yy = 2025; yy <= 2027; yy++) ys.push(yy);
    host.innerHTML = '<span class="xb-lb">填报期</span><select class="pg-sel" id="xb-y">' +
      ys.map(function (v) { return '<option value="' + v + '"' + (v === ky ? " selected" : "") + ">" + v + " 年</option>"; }).join("") + "</select>" +
      '<select class="pg-sel" id="xb-m">' + Array.from({ length: 12 }, function (_, i) { return i + 1; }).map(function (v) { return '<option value="' + v + '"' + (v === km ? " selected" : "") + ">" + v + " 月</option>"; }).join("") + "</select>" +
      '<select class="pg-sel" id="xb-d">' + xunOf(ky, km).map(function (d) {
        return '<option value="' + d + '"' + (d === kd ? " selected" : "") + ">" + d + " 日旬报</option>";
      }).join("") + "</select>";
    var dEl = $("#xb-date");
    if (dEl) dEl.textContent = cnDate(k);
    $("#xb-y").onchange = chg; $("#xb-m").onchange = chg; $("#xb-d").onchange = chg;
  }
  function chg() {
    var y = +$("#xb-y").value, m = +$("#xb-m").value, d = +$("#xb-d").value;
    CUR.xun = keyOf(y, m, d);
    options(); render();
  }

  /* ---------------- 横幅：驻地办 / 期次 / 流程状态 ---------------- */
  function zbOf(id) { for (var i = 0; i < ZB.length; i++) if (ZB[i].id === id) return ZB[i]; return ZB[0]; }
  /* 承建单位：去掉「HYTJ-9标」式前缀，只显示单位名 */
  function ownerOf(tid) { return String(OWNS[tid - 1] || "").replace(/^[^标]*标/, ""); }

  function statusChip(tid, k) {
    var st = stateOf(tid, k);
    return '<span class="xb-state ' + ST[st].c + '" data-st="' + st + '">' + ST[st].t + "</span>";
  }

  function flowBtns(tid, k, st) {
    if (st === 3) return '<span class="xb-done">流程已完成</span>';
    if (st === 1) {
      return '<button type="button" class="xb-btn" data-xb-sub="' + tid + '">提交本旬数据</button>'
        + '<span class="xb-tip">提交后本旬数字锁定，转监理复核。</span>';
    }
    var need = !((rec(tid, k).red || []).length);
    var passCls = need ? "xb-btn ok warn" : "xb-btn ok";
    var passTxt = (need && CONFIRM[tid]) ? "确认无标红，提交完成" : (need ? "复核通过（需确认）" : "复核通过并提交");
    return '<button type="button" class="xb-btn ghost" data-xb-back="' + tid + '">退回施工单位</button>'
      + '<button type="button" class="' + passCls + '" data-xb-pass="' + tid + '">' + passTxt + "</button>"
      + '<span class="xb-tip">' + (need
        ? (CONFIRM[tid] ? "本旬该标段未标红任何滞后项，请再点一次确认提交。" : "本旬该标段尚无标红项；复核通过时需二次确认。")
        : "本旬已标红滞后项，可直接提交。") + "</span>";
  }

  /* ---------------- 表：项目横排 ---------------- */
  function segTable(tid, k, st) {
    var r = rec(tid, k), pc = prevCum(tid, k);
    var tot = DATA[tid] && DATA[tid].tot ? DATA[tid].tot : null;
    var open = (st === 1), redOn = (st <= 2);
    var cur = ITEMS.map(function (it, i) { return (pc ? pc[i] : 0) + (+r.q[i] || 0); });

    var head = '<tr class="gs"><th class="lb" rowspan="3">标段 / 项目</th>';
    GROUPS.forEach(function (g, gi) {
      var cnt = ITEMS.filter(function (x) { return x.g === gi; }).length;
      head += '<th colspan="' + cnt + '" class="grp">' + g + "</th>";
    });
    head += "</tr><tr>";
    ITEMS.forEach(function (it) { head += '<th class="it">' + it.n + "</th>"; });
    head += '</tr><tr class="unit">';
    ITEMS.forEach(function (it) { head += "<th>" + it.u + "</th>"; });
    head += "</tr>";

    var cls0 = function (i) { return hasTot(tid, i) ? "" : " xb-gray"; };
    var rows = "";
    rows += '<tr><td class="lb">总设计量</td>' + ITEMS.map(function (it, i) {
      return '<td class="' + (cls0(i) ? "xb-gray" : "") + '">' + (hasTot(tid, i) ? fmt(tot[i], it.u) : "—") + "</td>";
    }).join("") + "</tr>";
    rows += '<tr><td class="lb">截至上期完成</td>' + ITEMS.map(function (it, i) {
      return '<td class="' + (cls0(i) ? "xb-gray" : "") + '">' + (hasTot(tid, i) ? (pc ? fmt(pc[i], it.u) : fmt(0, it.u)) : "—") + "</td>";
    }).join("") + "</tr>";
    rows += '<tr class="q"><td class="lb">本旬完成</td>' + ITEMS.map(function (it, i) {
      if (!hasTot(tid, i)) return '<td class="xb-gray">—</td>';
      return '<td class="xb-q">' + (open
        ? '<input type="text" inputmode="decimal" data-xbq="' + tid + "|" + i + '" value="' + (r.q[i] === 0 ? "" : r.q[i]) + '" placeholder="0">'
        : fmt(r.q[i], it.u)) + "</td>";
    }).join("") + "</tr>";
    rows += '<tr><td class="lb">累计完成</td>' + ITEMS.map(function (it, i) {
      return '<td class="' + (cls0(i) ? "xb-gray" : "") + '" data-xbcum="' + tid + "|" + i + '">' + (hasTot(tid, i) ? fmt(cur[i], it.u) : "—") + "</td>";
    }).join("") + "</tr>";
    rows += '<tr><td class="lb">完成比例</td>' + ITEMS.map(function (it, i) {
      return '<td class="' + (cls0(i) ? "xb-gray" : "") + '" data-xbpct="' + tid + "|" + i + '">' + (hasTot(tid, i) ? pct(cur[i], tot[i]) : "—") + "</td>";
    }).join("") + "</tr>";
    rows += '<tr class="rd"><td class="lb">滞后</td>' + ITEMS.map(function (it, i) {
      if (!hasTot(tid, i)) return '<td class="xb-gray">—</td>';
      var red = (r.red || []).indexOf(i) >= 0;
      return '<td class="xb-rdc"><button type="button" data-red="' + tid + "|" + i + '" class="xb-rd' + (red ? " on" : "") + '"' + (redOn ? "" : " disabled") + ">" + (red ? "滞后" : "标红") + "</button></td>";
    }).join("") + "</tr>";

    return '<div class="xb-wrap"><table class="xb-ct2" data-xbtab="' + tid + '"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table></div>";
  }

  /* 地市州上期累计：新一期未填时沿用上一期数值，避免每旬从零重录 */
  function cityPrev(k, city, i) {
    var c = (DATA[1] && DATA[1].c) || {};
    var keys = Object.keys(c).filter(function (x) { return x < k && c[x] && c[x][city] && c[x][city][i] !== undefined && c[x][city][i] !== ""; }).sort();
    return keys.length ? c[keys[keys.length - 1]][city][i] : null;
  }

  /* 地市州统计（土建1标）：行=9 项工程量，列=蔡甸/汉川/仙桃 的设计量 / 累计完成 / 完成比例 */
  function cTable(k, st) {
    var c = (DATA[1] && DATA[1].c) || ((DATA[1] = DATA[1] || { v: 1, tid: 1, x: {} }).c = {});
    if (!c) { DATA[1].c = {}; c = DATA[1].c; }
    var ck = c[k] || (c[k] = {});
    var open = (st === 1);

    var h1 = '<tr class="gs"><th class="lb" rowspan="2">地市州 / 项目</th><th class="it" rowspan="2">单位</th>';
    CITIES.forEach(function (a) { h1 += '<th colspan="3" class="grp">' + a + "</th>"; });
    h1 += "</tr><tr>";
    CITIES.forEach(function () { h1 += '<th class="it">设计量</th><th class="it">累计完成</th><th class="it">完成比例</th>'; });
    h1 += "</tr>";

    var rows = "";
    CITEMS.forEach(function (n, i) {
      var row = '<tr><td class="lb">' + n + "</td><td>" + CU[i] + "</td>";
      CITIES.forEach(function (a) {
        var dv = DMAP[a][i];
        if (dv === null || dv === undefined) {
          row += '<td class="xb-gray">—</td><td class="xb-gray">—</td><td class="xb-gray">—</td>';
          return;
        }
        var own = (ck[a] && ck[a][i] !== undefined) ? ck[a][i] : null;
        var pp = cityPrev(k, a, i);
        var v = own !== null ? own : (pp === null ? "" : pp);
        var pv = (v === "" || !isFinite(+v)) ? null : pct(+v, dv);
        row += "<td>" + dv + "</td>";
        row += '<td class="xb-q">' + (open
          ? '<input type="text" inputmode="decimal" data-xbc="' + a + "|" + i + '" value="' + fin(v, CU[i]) + '" placeholder="">'
          : (v === "" ? "—" : fmt(+v, CU[i]))) + "</td>";
        row += '<td data-xbcpct="' + a + "|" + i + '">' + (pv || "—") + "</td>";
      });
      rows += row + "</tr>";
    });
    return '<div class="xb-wrap"><table class="xb-ct2 xb-cc"><thead>' + h1 + "</thead><tbody>" + rows + "</tbody></table></div>";
  }

  /* ---------------- 渲染 ---------------- */
  function render() {
    var pane = $("#xb-body"); if (!pane) return;
    if (!LOADED) { pane.innerHTML = '<div class="xb-loading">正在读取云端旬报数据…</div>'; return; }
    var k = CUR.xun || todayKey(), z = zbOf(CUR.zb);
    var h = '<div class="xb-head"><div class="xb-t"><b>' + z.nm + "</b>"
      + '<span class="xb-xun">' + z.sub + " · " + k.replace(/-/g, ".") + " 旬</span></div></div>";

    if (z.tids.length === 1 && z.tids[0] === 1) {
      var t1 = 1, s1 = stateOf(t1, k);
      h += '<div class="xb-zone"><div class="xb-zone-hd"><span>' + TENDERS[0] + " 本旬完成</span>"
        + statusChip(t1, k) + '<div class="xb-flow">' + flowBtns(t1, k, s1) + "</div></div>"
        + segTable(t1, k, s1) + "</div>";
      h += '<div class="xb-zone"><div class="xb-zone-hd"><b>地市州统计</b><span>' + TENDERS[0] + " · 设计量 / 累计完成 / 完成比例（蔡甸 / 汉川 / 仙桃）</span></div>"
        + cTable(k, s1) + "</div>";
    } else {
      z.tids.forEach(function (tid) {
        var st = stateOf(tid, k);
        h += '<div class="xb-zone"><div class="xb-zone-hd"><b>' + TENDERS[tid - 1] + "</b><span>" + ownerOf(tid)
          + "</span>" + statusChip(tid, k) + '<div class="xb-flow">' + flowBtns(tid, k, st) + "</div></div>"
          + segTable(tid, k, st) + "</div>";
      });
    }
    pane.innerHTML = h;
    bind();
    hoverCol();
    if ($("#xb-date")) $("#xb-date").textContent = cnDate(k);
  }

  /* 鼠标所在列整列浅蓝，而不是整行（按几何位置对齐，兼容合并表头） */
  function hoverCol() {
    var pane = $("#xb-body"); if (!pane) return;
    pane.querySelectorAll("table.xb-ct2").forEach(function (tb) {
      tb.addEventListener("mouseover", function (e) {
        var cell = e.target.closest ? e.target.closest("td,th") : null;
        if (!cell || !tb.contains(cell)) return;
        var rc = cell.getBoundingClientRect();
        if (tb._hx === Math.round(rc.left) + ":" + Math.round(rc.width)) return;
        clearCol(tb);
        Array.prototype.forEach.call(tb.querySelectorAll("td,th"), function (c) {
          var r2 = c.getBoundingClientRect();
          if (Math.abs(r2.left - rc.left) < 4 && Math.abs(r2.width - rc.width) < 4) {
            var ri = c.parentNode.rowIndex || 0;
            if (c.tagName === "TD" || ri > 0) c.classList.add("colhl");
          }
        });
        tb._hx = Math.round(rc.left) + ":" + Math.round(rc.width);
      });
      tb.addEventListener("mouseleave", function () { clearCol(tb); });
    });
  }
  function clearCol(tb) {
    Array.prototype.forEach.call(tb.querySelectorAll(".colhl"), function (c) { c.classList.remove("colhl"); });
    tb._hx = "";
  }

  function bind() {
    var pane = $("#xb-body"); if (!pane) return;
    pane.querySelectorAll("[data-xbq]").forEach(function (inp) {
      inp.oninput = function () {
        var p = inp.getAttribute("data-xbq").split("|"), tid = +p[0], i = +p[1];
        var v = parseFloat(inp.value), rr = rec(tid, CUR.xun || todayKey());
        rr.q[i] = isFinite(v) ? v : 0; rr.edited = 1;
        var pc0 = prevCum(tid, CUR.xun || todayKey()), tt = DATA[tid] && DATA[tid].tot ? DATA[tid].tot[i] : 0;
        var cv = (pc0 ? (+pc0[i] || 0) : 0) + (rr.q[i] || 0);
        var cumCell = pane.querySelector('[data-xbcum="' + tid + "|" + i + '"]');
        var pctCell = pane.querySelector('[data-xbpct="' + tid + "|" + i + '"]');
        if (cumCell) cumCell.textContent = fmt(cv, ITEMS[i].u);
        if (pctCell) pctCell.textContent = pct(cv, tt);
        save(tid);
      };
      inp.onblur = function () { render(); };
    });
    pane.querySelectorAll("[data-xbc]").forEach(function (inp) {
      inp.oninput = function () {
        var a = inp.getAttribute("data-xbc").split("|"), k = CUR.xun || todayKey();
        var c = DATA[1].c || (DATA[1].c = {}), ck = c[k] || (c[k] = {});
        var ar = ck[a[0]] || (ck[a[0]] = []);
        var v = parseFloat(inp.value); ar[+a[1]] = isFinite(v) ? v : "";
        var pcell = pane.querySelector('[data-xbcpct="' + a[0] + "|" + a[1] + '"]');
        var dv = DMAP[a[0]][+a[1]];
        if (pcell) pcell.textContent = (isFinite(v) && dv) ? pct(v, dv) : "—";
        save(1);
      };
      inp.onblur = function () { render(); };
    });
    pane.querySelectorAll("[data-red]").forEach(function (b) {
      b.onclick = function () {
        var p = b.getAttribute("data-red").split("|"), tid = +p[0], i = +p[1];
        var r = rec(tid, CUR.xun || todayKey()); r.red = r.red || [];
        var at = r.red.indexOf(i);
        if (at >= 0) r.red.splice(at, 1); else r.red.push(i);
        r.edited = 1;
        render(); save(tid);
      };
    });
    var sub = pane.querySelector("[data-xb-sub]");
    if (sub) sub.onclick = function () {
      var tid = +sub.getAttribute("data-xb-sub"), k = CUR.xun || todayKey();
      var r = rec(tid, k); r.sub = 1; r.sup = 0; r.editTs = Date.now();
      CONFIRM[tid] = 0;
      save(tid, true).then(function () { render(); flagMsg(TENDERS[tid - 1] + "已提交，转监理单位复核"); });
    };
    var back = pane.querySelector("[data-xb-back]");
    if (back) back.onclick = function () {
      var tid = +back.getAttribute("data-xb-back"), k = CUR.xun || todayKey();
      var r = rec(tid, k); r.sub = 0; r.sup = 0;
      CONFIRM[tid] = 0;
      save(tid, true).then(function () { render(); flagMsg(TENDERS[tid - 1] + "已退回施工单位，可继续修改"); });
    };
    var pass = pane.querySelector("[data-xb-pass]");
    if (pass) pass.onclick = function () {
      var tid = +pass.getAttribute("data-xb-pass"), k = CUR.xun || todayKey();
      var r = rec(tid, k), noRed = !((r.red || []).length);
      if (noRed && !CONFIRM[tid]) { CONFIRM[tid] = 1; render(); flagMsg(TENDERS[tid - 1] + "本旬无标红项，请再点一次确认提交"); return; }
      r.sup = 1; r.sub = 1; CONFIRM[tid] = 0;
      save(tid, true).then(function () { render(); flagMsg(TENDERS[tid - 1] + "复核通过，本旬流程已完成"); });
    };
    var tabs = $("#xb-tid");
    if (tabs) tabs.querySelectorAll("[data-zb]").forEach(function (b) {
      b.onclick = function () { CUR.zb = b.getAttribute("data-zb"); render(); };
    });
  }

  function flagMsg(m) { var el = $("#xb-msg"); if (el) { el.textContent = m; el.classList.add("on"); setTimeout(function () { el.classList.remove("on"); }, 2600); } }

  function save(tid, now) {
    clearTimeout(TM[tid]);
    return new Promise(function (res) {
      TM[tid] = setTimeout(function () {
        var obj = DATA[tid]; if (!obj) { res(false); return; }
        obj.ts = Date.now();
        var k = CUR.xun || todayKey(), cur = obj.x && obj.x[k];
        /* 空白的当期记录不写云端，避免把「未填报」的 0 当成正式数据带到地市州统计 */
        var blank = !cur || (!cur.edited && !cur.sub && !cur.sup && !(cur.red || []).length &&
          !(cur.q || []).some(function (v) { return +v; }));
        if (blank) { res(true); return; }
        if (location.protocol === "file:") { flagMsg("本机打开为只读预览，改动不上传云端"); res(false); return; }
        /* 手工改过的旬：累计 = 上旬累计 + 本旬，写回前重算，保证 A 页读到正确的累计 */
        Object.keys(obj.x || {}).forEach(function (kk) {
          var d = obj.x[kk]; if (!d || !d.edited) return;
          var p = prevCum(tid, kk);
          d.cum = (d.q || []).map(function (v, i) { return (p ? (+p[i] || 0) : 0) + (+v || 0); });
        });
        jput("xt-xb-" + tid + ".json", obj).then(function () { res(true); },
          function (e) { flagMsg("保存失败：" + e.message); res(false); });
      }, now ? 0 : 900);
    });
  }

  /* ---------------- 导出 PDF（按旬报 Excel 版式：汇总 + 10 个标段，A3 横向） ---------------- */
  function pdfData() {
    var k = CUR.xun || todayKey();
    var blocks = [];
    for (var tid = 1; tid <= 10; tid++) {
      var tot = (DATA[tid] && DATA[tid].tot) ? DATA[tid].tot : ITEMS.map(function () { return null; });
      var pc = prevCum(tid, k);
      var r = rec(tid, k);
      var cur = ITEMS.map(function (it, i) { return (pc ? (+pc[i] || 0) : 0) + (+r.q[i] || 0); });
      blocks.push({ nm: OWNS[tid - 1], tot: tot, pc: pc || ITEMS.map(function () { return 0; }), cur: cur, q: r.q || ITEMS.map(function () { return 0; }) });
    }
    return { k: k, blocks: blocks };
  }
  function exportPdf() {
    var d = pdfData();
    var sum = function (fn) { return ITEMS.map(function (it, i) { var s = 0; d.blocks.forEach(function (b) { s += (+fn(b, i) || 0); }); return s; }); };
    var sumTot = sum(function (b, i) { return b.tot[i]; });
    var sumCur = sum(function (b, i) { return b.cur[i]; });
    var sumQ = sum(function (b, i) { return b.q[i]; });
    var sumPc = sumCur.map(function (v, i) { return v - sumQ[i]; });

    function cellRows(nm, tot, pc, cur, q, strong) {
      var cls = strong ? ' class="sum"' : "";
      var rr = "";
      rr += '<tr' + cls + '><td class="blk" rowspan="5">' + nm + '</td><td class="lb">总设计量</td>'
        + ITEMS.map(function (it, i) { return "<td>" + fmt(tot[i], it.u) + "</td>"; }).join("") + "</tr>";
      rr += "<tr" + cls + '><td class="lb">截至上期完成</td>' + ITEMS.map(function (it, i) { return "<td>" + fmt(pc[i], it.u) + "</td>"; }).join("") + "</tr>";
      rr += "<tr" + cls + '><td class="lb">累计完成</td>' + ITEMS.map(function (it, i) { return "<td>" + fmt(cur[i], it.u) + "</td>"; }).join("") + "</tr>";
      rr += "<tr" + cls + '><td class="lb">累计完成比例</td>' + ITEMS.map(function (it, i) { return "<td>" + pct(cur[i], tot[i]) + "</td>"; }).join("") + "</tr>";
      rr += "<tr" + cls + '><td class="lb">本旬完成</td>' + ITEMS.map(function (it, i) { return "<td>" + fmt(q[i], it.u) + "</td>"; }).join("") + "</tr>";
      return rr;
    }

    var head = '<tr class="h1"><th rowspan="5">标段</th><th rowspan="5">项目</th>'
      + '<th colspan="9">路基工程</th><th colspan="9">桥梁工程</th></tr>'
      + '<tr class="h2"><th colspan="4">土石方工程</th><th colspan="5">软基处理</th>'
      + '<th rowspan="3">桩基</th><th rowspan="3">预应力管桩</th><th rowspan="3">预应力管桩配套</th>'
      + '<th rowspan="3">墩柱</th><th rowspan="3">盖梁</th><th rowspan="3">梁板预制</th><th rowspan="3">梁板安装</th>'
      + '<th rowspan="3">小桥</th><th rowspan="3">小型构造物</th></tr>'
      + '<tr class="h3"><th colspan="2" rowspan="2">挖方</th><th colspan="2" rowspan="2">填方</th>'
      + '<th rowspan="2">路基管桩</th><th rowspan="2">水泥搅拌桩</th><th rowspan="2">高压旋喷桩</th>'
      + '<th rowspan="2">固化土桩</th><th rowspan="2">换填类</th></tr>'
      + '<tr class="h3"><th>主线</th><th>匝道</th><th>主线</th><th>匝道</th></tr>'
      + '<tr class="h4">' + ITEMS.map(function (it) { return "<th>" + it.u + "</th>"; }).join("") + "</tr>";

    var body = cellRows("汇总", sumTot, sumPc, sumCur, sumQ, true);
    d.blocks.forEach(function (b) { body += cellRows(b.nm.replace("标", "标<br>"), b.tot, b.pc, b.cur, b.q, false); });

    var title = "沪渝高速公路武汉至宜昌段改扩建工程施工旬报（" + d.k.replace(/-/g, ".") + "）";
    var cols = '<colgroup><col style="width:5%"><col style="width:5%">'
      + ITEMS.map(function () { return '<col style="width:5%">'; }).join("") + "</colgroup>";
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title><style>'
      + '@page{size:A3 landscape;margin:8mm}'
      + 'body{font-family:"Microsoft YaHei",SimHei,sans-serif;color:#000;margin:0}'
      + 'h1{font-size:14pt;text-align:center;margin:0 0 6px;font-weight:600;letter-spacing:1px}'
      + 'table{border-collapse:collapse;width:100%;table-layout:fixed}'
      + 'th,td{border:1px solid #333;font-size:6.9pt;text-align:center;padding:1px 1px;line-height:1.22;overflow:hidden}'
      + 'tr.h1 th,tr.h2 th{background:#F2F2F2;font-weight:600;font-size:7pt}'
      + 'tr.h3 th,tr.h4 th{background:#F7F7F7;font-size:6.6pt}'
      + 'td.lb{background:#FAFAFA;white-space:nowrap;font-size:6.6pt}'
      + 'td.blk{font-weight:600;font-size:7pt;background:#FFF;line-height:1.35}'
      + 'tr.sum td{font-weight:600;background:#F4F6FA}'
      + 'thead{display:table-header-group}'
      + '.note{font-size:7pt;margin-top:4px}'
      + '</style></head><body><h1>' + title + '</h1><table>' + cols + '<thead>' + head + '</thead><tbody>' + body
      + '</tbody></table><div class="note">备注：各标段标红数据为严重滞后项目。</div>'
      + '<script>window.onload=function(){setTimeout(function(){window.print();},300)}<\/script></body></html>';

    var w = window.open("", "_blank");
    if (!w) { flagMsg("浏览器拦截了新窗口，请允许弹窗后重试"); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    if (!$("#view-xb")) return;
    CUR.xun = todayKey();
    var tabs = $("#xb-tid");
    if (tabs) tabs.innerHTML = ZB.map(function (z) {
      return '<button type="button" class="xb-tb" data-zb="' + z.id + '">' + z.nm + "<em>" + z.sub + "</em></button>";
    }).join("");
    var mark = function () {
      var tabs2 = $("#xb-tid"); if (!tabs2) return;
      tabs2.querySelectorAll("[data-zb]").forEach(function (b) {
        var z = zbOf(b.getAttribute("data-zb"));
        b.classList.toggle("on", z.id === CUR.zb);
        var k = CUR.xun || todayKey(), done = 0;
        z.tids.forEach(function (tid) { if (stateOf(tid, k) === 3) done++; });
        var em = b.querySelector("em");
        if (em) em.textContent = z.sub + " · 已完成 " + done + "/" + z.tids.length;
      });
    };
    var oldRender = render;
    render = function () { oldRender(); mark(); };
    var pdfBtn = $("#btn-xb-pdf");
    if (pdfBtn) pdfBtn.onclick = exportPdf;
    options();
    load().then(function () { render(); mark(); });
    document.addEventListener("click", function (e) {
      var n = e.target.closest ? e.target.closest('.nav-item[data-view="xb"]') : null;
      if (n) { options(); load().then(render); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
