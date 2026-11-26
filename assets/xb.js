/* 工程旬报模块（B 页） —— 自包含：独立读写 xt-xb-<标段>.json，不干扰月报数据链 */
(function () {
  "use strict";
  var OWNER = "mtj2018", REPO = "hyhx-ledger-data", DIR = "data", BR = "main";
  var TOKEN = ["github_pat_11APXBKUQ05PG", "NDyiRnskz_lDhKkCkD78klbtqNTGbV4wcv0CU4y8H0LXa8z53lCPVBJQWQNWPbkfRSLJl"].join("");
  var ITEMS = [
    { n: "挖方·主线", u: "万方", g: "土石方" }, { n: "挖方·匝道", u: "万方", g: "土石方" },
    { n: "填方·主线", u: "万方", g: "土石方" }, { n: "填方·匝道", u: "万方", g: "土石方" },
    { n: "路基管桩", u: "万米", g: "软基处理" }, { n: "水泥搅拌桩", u: "万米", g: "软基处理" },
    { n: "高压旋喷桩", u: "万米", g: "软基处理" }, { n: "固化土桩", u: "万米", g: "软基处理" },
    { n: "换填类", u: "万方", g: "软基处理" }, { n: "桩基", u: "根", g: "桥梁" },
    { n: "预应力管桩", u: "万米", g: "桥梁" }, { n: "预应力管桩配套", u: "套", g: "桥梁" },
    { n: "墩柱", u: "个", g: "桥梁" }, { n: "盖梁", u: "个", g: "桥梁" },
    { n: "梁板预制", u: "片", g: "桥梁" }, { n: "梁板安装", u: "片", g: "桥梁" },
    { n: "小桥", u: "座", g: "桥梁" }, { n: "小型构造物", u: "道", g: "桥梁" }
  ];
  var TENDERS = ["HYSJSG-1标", "HYTJ-2标", "HYTJ-3标", "HYTJ-4标", "HYTJ-5标",
                 "HYTJ-6标", "HYTJ-7标", "HYTJ-8标", "HYTJ-9标", "HYTJ-10标"];
  var CITIES = ["武汉", "孝感", "仙桃", "潜江", "荆州", "宜昌"];
  var CITEMS = ["土石方", "路基管桩", "水泥搅拌桩", "桩基", "桥梁管桩", "墩柱", "盖梁", "梁板预制", "梁板安装"];
  var DATA = {}, SHA = {}, LOADED = false, CUR = { tid: "1", xun: "", role: "sg" }, DIRTY = {};

  function $(s, r) { return (r || document).querySelector(s); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function lastDay(y, m) { return new Date(y, m, 0).getDate(); }
  function xunOf(y, m) { return [10, 20, lastDay(y, m)]; }
  function keyOf(y, m, d) { return y + "-" + pad(m) + "-" + pad(d); }
  function todayKey() {
    var t = new Date();
    var ds = xunOf(t.getFullYear(), t.getMonth() + 1), pick = ds[2];
    if (t.getDate() <= 10) pick = 10; else if (t.getDate() <= 20) pick = 20;
    return keyOf(t.getFullYear(), t.getMonth() + 1, pick);
  }
  function fmt(v, u) {
    if (v === null || v === undefined || v === "" || !isFinite(v)) return "—";
    if (u === "万方" || u === "万米") return (Math.abs(v) < 1e-9 ? "0" : v.toFixed(2));
    return Math.round(v).toLocaleString();
  }
  function pct(a, b) { return b > 0 ? (a / b * 100).toFixed(1) + "%" : "—"; }

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

  /* ---------------- 旬序列 ---------------- */
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

  /* ---------------- 渲染 ---------------- */
  function options() {
    var host = $("#xb-bar"); if (!host) return;
    var t = new Date(), y = parseInt(host.getAttribute("data-y") || t.getFullYear(), 10), m = parseInt(host.getAttribute("data-m") || (t.getMonth() + 1), 10);
    var k = CUR.xun || todayKey();
    var ky = parseInt(k.slice(0, 4), 10), km = parseInt(k.slice(5, 7), 10), kd = parseInt(k.slice(8, 10), 10);
    var ys = [];
    for (var yy = 2025; yy <= 2027; yy++) ys.push(yy);
    var html = '<span class="xb-lb">填报期</span><select class="pg-sel" id="xb-y">' +
      ys.map(function (v) { return '<option value="' + v + '"' + (v === ky ? " selected" : "") + ">" + v + " 年</option>"; }).join("") + "</select>" +
      '<select class="pg-sel" id="xb-m">' + Array.from({ length: 12 }, function (_, i) { return i + 1; }).map(function (v) { return '<option value="' + v + '"' + (v === km ? " selected" : "") + ">" + v + " 月</option>"; }).join("") + "</select>" +
      '<select class="pg-sel" id="xb-d">' + xunOf(ky, km).map(function (d) {
        return '<option value="' + d + '"' + (d === kd ? " selected" : "") + ">" + (d === lastDay(ky, km) ? "月末 " : "") + d + " 日旬报</option>";
      }).join("") + "</select>" +
      '<span class="xb-note">每月 10 日、20 日、月末为填报日</span>';
    host.innerHTML = html;
    $("#xb-y").onchange = chg; $("#xb-m").onchange = chg; $("#xb-d").onchange = chg;
  }
  function chg() {
    var y = +$("#xb-y").value, m = +$("#xb-m").value, d = +$("#xb-d").value;
    CUR.xun = keyOf(y, m, d);
    options(); render();
  }

  function render() {
    var pane = $("#xb-body"); if (!pane) return;
    if (!LOADED) { pane.innerHTML = '<div class="xb-loading">正在读取云端旬报数据…</div>'; return; }
    var k = CUR.xun || todayKey(), tid = CUR.tid, r = rec(tid, k);
    var pc = prevCum(tid, k);
    var tot = DATA[tid] && DATA[tid].tot ? DATA[tid].tot : null;
    var st = r.sup ? 3 : (r.sub ? 2 : 1);
    var canEdit = CUR.role === "sg" ? (st === 1) : (st === 2);
    var cur = ITEMS.map(function (it, i) { return (pc ? pc[i] : 0) + (+r.q[i] || 0); });

    var h = '<div class="xb-head"><div class="xb-t"><b>' + TENDERS[+tid - 1] + "</b><span class=\"xb-xun\">" + k.replace(/-/g, ".") + " 旬</span></div>" +
      '<span class="xb-state s' + st + '">' + (st === 1 ? "待施工单位填报" : st === 2 ? "施工单位已提交 · 待驻地办审核" : "驻地办已审核 · 正式提交") + "</span>" +
      '<div class="xb-role"><span>当前身份</span>' +
      '<button type="button" class="xb-rb' + (CUR.role === "sg" ? " on" : "") + '" data-role="sg">施工单位</button>' +
      '<button type="button" class="xb-rb' + (CUR.role === "zdb" ? " on" : "") + '" data-role="zdb">驻地办</button></div></div>';

    h += '<div class="xb-wrap"><table class="xb-tbl"><thead><tr><th rowspan="2" style="min-width:112px">项目</th><th rowspan="2">单位</th><th rowspan="2">总设计量</th><th rowspan="2">截至上期完成</th><th rowspan="2">本旬完成</th><th rowspan="2">累计完成</th><th rowspan="2">完成比例</th><th rowspan="2">滞后</th></tr></thead><tbody>';
    ITEMS.forEach(function (it, i) {
      var t = tot ? fmt(tot[i], it.u) : "—", p = pc ? fmt(pc[i], it.u) : "—";
      var red = (r.red || []).indexOf(i) >= 0;
      h += "<tr" + (red ? ' class="is-red"' : "") + "><td class=\"xb-it\">" + it.n + '</td><td class="xb-u">' + it.u + "</td><td>" + t + "</td><td>" + p + "</td>" +
        '<td class="xb-q">' + (canEdit ? '<input type="text" inputmode="decimal" data-xbq="' + i + '" value="' + (r.q[i] === 0 ? "" : r.q[i]) + '" placeholder="0">' : fmt(r.q[i], it.u)) + "</td>" +
        "<td>" + fmt(cur[i], it.u) + "</td><td>" + pct(cur[i], tot ? tot[i] : 0) + "</td>" +
        '<td class="xb-red"><button type="button" data-red="' + i + '" class="xb-rd' + (red ? " on" : "") + '"' + (canEdit ? "" : " disabled") + ">" + (red ? "滞后" : "标红") + "</button></td></tr>";
    });
    h += "</tbody></table></div>";

    /* C 区：土建 1 标三地累计完成 */
    if (tid === "1") {
      var c = DATA[1].c || (DATA[1].c = {}), ck = c[k] || (c[k] = {});
      var cd = DATA[1].ctot || null;
      h += '<div class="xb-csec"><div class="xb-ct">土建1标 分区累计完成（蔡甸 / 汉川 / 仙桃）<span>按属地拆分填报，累计口径，不随本旬自动累加</span></div>' +
        '<table class="xb-tbl xb-ctbl"><thead><tr><th>项目</th><th>单位</th><th>蔡甸（武汉）</th><th>汉川（孝感）</th><th>仙桃</th></tr></thead><tbody>';
      CITEMS.forEach(function (n, i) {
        h += '<tr><td class="xb-it">' + n + '</td><td class="xb-u">' + (i === 0 || i === 4 ? "万方/万米" : "") + "</td>";
        ["蔡甸", "汉川", "仙桃"].forEach(function (a) {
          var v = (ck[a] && ck[a][i] !== undefined) ? ck[a][i] : "";
          h += '<td class="xb-q">' + (canEdit ? '<input type="text" inputmode="decimal" data-xbc="' + a + "|" + i + '" value="' + v + '" placeholder="0">' : (v === "" ? "—" : v)) + "</td>";
        });
        h += "</tr>";
      });
      h += "</tbody></table></div>";
    }
    h += '<div class="xb-foot">' + (CUR.role === "sg"      ? '<button type="button" class="xb-btn" id="xb-sub"' + (st !== 1 ? " disabled" : "") + ">提交本旬数据</button>"
      : '<button type="button" class="xb-btn" id="xb-pass"' + (st !== 2 ? " disabled" : "") + ">审核通过并正式提交</button><button type=\"button\" class=\"xb-btn ghost\" id=\"xb-back\"" + (st !== 2 ? " disabled" : "") + ">退回施工单位</button>") +
      '<span class="xb-tip">' + (CUR.role === "sg" ? "提交后本旬数据锁定，需驻地办审核。" : "审核时无标红滞后项目，提交前需二次确认。") + "</span></div>";
    pane.innerHTML = h;
    bind();
  }

  function bind() {
    var pane = $("#xb-body");
    pane.querySelectorAll("[data-role]").forEach(function (b) {
      b.onclick = function () { CUR.role = b.getAttribute("data-role"); render(); };
    });
    pane.querySelectorAll("[data-xbq]").forEach(function (inp) {
      inp.oninput = function () {
        var i = +inp.getAttribute("data-xbq"), v = parseFloat(inp.value);
        rec(CUR.tid, CUR.xun || todayKey()).q[i] = isFinite(v) ? v : 0;
        save();
      };
      inp.onblur = function () { render(); };
    });
    pane.querySelectorAll("[data-xbc]").forEach(function (inp) {
      inp.oninput = function () {
        var a = inp.getAttribute("data-xbc").split("|"), k = CUR.xun || todayKey();
        var c = DATA[1].c || (DATA[1].c = {}); var ck = c[k] || (c[k] = {});
        var ar = ck[a[0]] || (ck[a[0]] = []);
        var v = parseFloat(inp.value); ar[+a[1]] = isFinite(v) ? v : "";
        save();
      };
      inp.onblur = function () { render(); };
    });
    pane.querySelectorAll("[data-red]").forEach(function (b) {
      b.onclick = function () {
        var i = +b.getAttribute("data-red"), r = rec(CUR.tid, CUR.xun || todayKey());
        r.red = r.red || [];
        var p = r.red.indexOf(i);
        if (p >= 0) r.red.splice(p, 1); else r.red.push(i);
        DIRTY[CUR.tid] = 1; render(); save();
      };
    });
    var s = $("#xb-sub"); if (s) s.onclick = function () {
      if (!confirm("确认提交 " + TENDERS[+CUR.tid - 1] + " " + (CUR.xun || todayKey()) + " 旬报数据？提交后本旬锁定，等待驻地办审核。")) return;
      var r = rec(CUR.tid, CUR.xun || todayKey()); r.sub = 1; r.sup = 0;
      save(true).then(function () { render(); flagMsg("已提交，等待驻地办审核"); });
    };
    var a = $("#xb-pass"); if (a) a.onclick = function () {
      var r = rec(CUR.tid, CUR.xun || todayKey());
      if (!(r.red || []).length) {
        if (!confirm("本旬 " + TENDERS[+CUR.tid - 1] + " 未标红任何滞后项目，确认无滞后项目并正式提交？")) return;
      }
      r.sup = 1; save(true).then(function () { render(); flagMsg("驻地办已审核，旬报正式提交"); });
    };
    var bk = $("#xb-back"); if (bk) bk.onclick = function () {
      var r = rec(CUR.tid, CUR.xun || todayKey()); r.sub = 0; r.sup = 0;
      save(true).then(function () { render(); flagMsg("已退回施工单位修改"); });
    };
    var tabs = $("#xb-tid"); if (tabs) tabs.querySelectorAll("[data-tid]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-tid") === CUR.tid);
      b.onclick = function () { CUR.tid = b.getAttribute("data-tid"); options(); render(); };
    });
  }

  function flagMsg(m) { var el = $("#xb-msg"); if (el) { el.textContent = m; el.classList.add("on"); setTimeout(function () { el.classList.remove("on"); }, 2600); } }

  var tm = null;
  function save(now) {
    DIRTY[CUR.tid] = 1;
    clearTimeout(tm);
    return new Promise(function (res) {
      tm = setTimeout(function () {
        var tid = CUR.tid, obj = DATA[tid]; obj.ts = Date.now();
        jput("xt-xb-" + tid + ".json", obj).then(function () { DIRTY[tid] = 0; res(true); },
          function (e) { flagMsg("保存失败：" + e.message); res(false); });
      }, now ? 0 : 900);
    });
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    if (!$("#view-xb")) return;
    CUR.xun = todayKey();
    var tabs = $("#xb-tid");
    if (tabs) tabs.innerHTML = TENDERS.map(function (t, i) {
      return '<button type="button" class="xb-tb" data-tid="' + (i + 1) + '">' + t + "</button>";
    }).join("");
    options();
    load().then(function () { render(); });
    document.addEventListener("click", function (e) {
      var n = e.target.closest ? e.target.closest('.nav-item[data-view="xb"]') : null;
      if (n) { options(); load().then(render); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
