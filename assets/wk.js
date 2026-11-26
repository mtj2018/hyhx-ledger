/* 产值周报模块（B 页） —— 每周四填报，土建 10 个标段各填「本周完成」（可负数修正），
   数据独立存 data/xb-wk-<标段>.json（新文件走 Git Data API 写入）。
   期次：年 / 月 下拉 + 日期小方框点选（2026-11-19 起，最晚 2029-12-31），并注明第几周；
   每张卡片右上角「提交」后锁定本周数据，解锁需气泡确认（与土石方日报一致）。
   同时向工程月报提供接口：window.__WK.cum(tid, ym) → 截止当月 19 日 23:00 的最新周报累计。 */
(function () {
  "use strict";
  var OWNER = "mtj2018", REPO = "hyhx-ledger-data", DIR = "data", BR = "main";
  var TOKEN = ["github_pat_11APXBKUQ05PG", "NDyiRnskz_lDhKkCkD78klbtqNTGbV4wcv0CU4y8H0LXa8z53lCPVBJQWQNWPbkfRSLJl"].join("");
  var SEED = "2026-11-19";           /* 现有「分项产值情况」数据作为 11.19 的累计 */
  var MIN = "2026-11-19", MAX = "2029-12-31";
  var DATA = {}, SHA = {}, LOADED = false, CUR = { key: "" }, TM = {}, GRID_READY = 0;
  var PH = {
    t2: "填写仙桃城区高架桥主要形象完成情况",
    t8: "填写引江济汉特大桥主要形象完成情况"
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function fmt(v) {
    if (v === null || v === undefined || v === "" || !isFinite(v)) return "—";
    var n = Math.round((+v) * 100) / 100;
    return n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  }
  function num(v) { return Math.round((+v || 0) * 100) / 100; }
  function clampKey(k) { return k < MIN ? MIN : (k > MAX ? MAX : k); }

  /* ---------------- 周四序列 / 周号 ---------------- */
  function thursdayNear(d) {           /* 不晚于 d 的周四 */
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    while (x.getDay() !== 4) x.setDate(x.getDate() - 1);
    return x;
  }
  function parseKey(k) { var a = String(k).split("-"); return new Date(+a[0], +a[1] - 1, +a[2]); }
  function isoWeek(d) {                /* ISO 周号 */
    var t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
    var w1 = new Date(t.getFullYear(), 0, 4);
    return 1 + Math.round(((t - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  }
  function weekLabel(k) { return "第 " + isoWeek(parseKey(k)) + " 周"; }
  function prevKey(key) {
    var o = {}, i = 0, tid;
    for (tid in DATA) if (DATA[tid] && DATA[tid].w) for (var kk in DATA[tid].w) if (kk < key) o[kk] = 1;
    var ks = Object.keys(o).sort();
    return ks.length ? ks[ks.length - 1] : "";
  }

  /* ---------------- 标段与分项 ---------------- */
  function tenders() { return BASE.tenders.filter(function (t) { return /^t\d+$/.test(t.tid); }); }
  function tagOf(tid) {
    if (tid === "t1") return "HYSJSG-1标";       /* 1 标为建设集团，不套 HYTJ 前缀 */
    var tag = "";
    (BASE.tsf && BASE.tsf.rows || []).forEach(function (r) {
      if (r.k === tid) tag = r.tag || "";
      if (r.k === tid + "a") tag = r.tag || "";
    });
    return tag ? tag.replace(/TJ-/, "HYTJ-") + "标" : "";
  }
  function rowsOf(t) { return (t.out || []).map(function (r) { return { k: r.k, nm: r.nm, no: r.no }; }); }
  function nmOf(s) { return String(s === "集采材料到工地价" ? "集采材料" : s); }

  /* 种子（11.19）：累计取现有月报 2026-11 的累计；本周完成按本月完成 7/30 折算；上周末=累计-本周 */
  function seedOf(tid) {
    var t = null;
    BASE.tenders.forEach(function (x) { if (x.tid === tid) t = x; });
    if (!t) return null;
    var q = [], cum = [];
    (t.out || []).forEach(function (r) {
      var cumv = r.cum || 0, mon = (r.mon === null || r.mon === undefined) ? 0 : r.mon;
      var qv = Math.round(mon * 7 / 30);
      q.push(qv); cum.push(Math.round(cumv));
    });
    return { q: q, cum: cum, txt: "", seed: 1, ts: SEED, lk: 0 };
  }

  /* ---------------- 云端读写（新文件必须走 Git Data API） ---------------- */
  function H(json) {
    var h = { "Authorization": "Bearer " + TOKEN, "Accept": "application/vnd.github+json" };
    if (json) h["Content-Type"] = "application/json";
    return h;
  }
  function gitGet(url) {
    return fetch(url, { headers: H(false), cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }
  function jget(name) {
    return fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + DIR + "/" + name + "?ref=" + BR + "&t=" + Date.now(),
      { headers: H(false), cache: "no-store" }).then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error("读取 HTTP " + r.status);
        return r.json().then(function (j) {
          var txt = decodeURIComponent(escape(atob(String(j.content || "").replace(/\s+/g, ""))));
          SHA[name] = j.sha;
          try { return JSON.parse(txt); } catch (e) { return null; }
        });
      });
  }
  function gitPut(files, msg) {
    var base = "https://api.github.com/repos/" + OWNER + "/" + REPO;
    return gitGet(base + "/git/ref/heads/" + BR).then(function (ref) {
      return gitGet(base + "/git/commits/" + ref.object.sha).then(function (cm) {
        var parent = ref.object.sha, base_tree = cm.tree.sha;
        var entries = [], i = 0;
        function step() {
          if (i >= files.length) return Promise.resolve();
          var f = files[i++];
          var body = JSON.stringify({ content: btoa(unescape(encodeURIComponent(f.txt))), encoding: "base64" });
          return fetch(base + "/git/blobs", { method: "POST", headers: H(true), body: body })
            .then(function (r) { return r.json().then(function (j) { if (!j.sha) throw new Error("blob 失败"); entries.push({ path: "data/" + f.name, mode: "100644", type: "blob", sha: j.sha }); return step(); }); });
        }
        return step().then(function () {
          return fetch(base + "/git/trees", { method: "POST", headers: H(true), body: JSON.stringify({ base_tree: base_tree, tree: entries }) });
        }).then(function (r) { return r.json(); }).then(function (tree) {
          if (!tree.sha) throw new Error("tree 失败");
          return fetch(base + "/git/commits", { method: "POST", headers: H(true), body: JSON.stringify({ message: msg, tree: tree.sha, parents: [parent] }) });
        }).then(function (r) { return r.json(); }).then(function (c) {
          if (!c.sha) throw new Error("commit 失败");
          return fetch(base + "/git/refs/heads/" + BR, { method: "PATCH", headers: H(true), body: JSON.stringify({ sha: c.sha, force: false }) });
        }).then(function (r) { if (!r.ok) throw new Error("移动分支失败 " + r.status); return true; });
      });
    });
  }

  function load(force) {
    if (LOADED && !force) return Promise.resolve(DATA);
    var ts = tenders();
    if (location.protocol === "file:") {
      DATA = {};
      ts.forEach(function (t) { DATA[t.tid] = { v: 1, tid: t.tid, w: {} }; DATA[t.tid].w[SEED] = seedOf(t.tid); });
      LOADED = true;
      try { document.dispatchEvent(new CustomEvent("wk-ready")); } catch (e0f) {}
      return Promise.resolve(DATA);
    }
    return Promise.all(ts.map(function (t) {
      return jget("xb-wk-" + t.tid.slice(1) + ".json").catch(function () { return null; });
    })).then(function (arr) {
      DATA = {};
      ts.forEach(function (t, i) {
        var tid = t.tid, o = arr[i];
        DATA[tid] = o && o.w ? o : { v: 1, tid: tid, w: {} };
        if (!DATA[tid].w[SEED]) DATA[tid].w[SEED] = seedOf(tid);
      });
      LOADED = true;
      try { document.dispatchEvent(new CustomEvent("wk-ready")); } catch (e0) {}
      return DATA;
    });
  }

  /* ---------------- 取数 ---------------- */
  function rec(tid, key) {
    var o = DATA[tid]; if (!o) return null;
    if (!o.w[key]) {
      var p = prevKey(key), pv = p ? o.w[p] : null;
      o.w[key] = { q: (pv ? pv.cum : seedOf(tid).cum).map(function () { return 0; }), cum: (pv ? pv.cum : seedOf(tid).cum).slice(), txt: "", ts: key, lk: 0 };
    }
    return o.w[key];
  }
  function cumArr(tid, key) { var r = rec(tid, key); return r ? r.cum : null; }
  function locked(tid, key) { var r = rec(tid, key); return !!(r && r.lk); }

  function monthCum(tid, ym) {
    if (!LOADED) return null;
    var cutoff = ym + "-19", keys = Object.keys(DATA[tid] ? DATA[tid].w : {}).filter(function (k) { return k <= cutoff && k >= MIN; }).sort();
    if (!keys.length) return null;
    var k = keys[keys.length - 1];
    return { key: k, cum: cumArr(tid, k), ts: k };
  }
  function window_WK_row(tid, ym) {
    if (!LOADED) return null;
    var o = DATA[tid]; if (!o) return null;
    var cutoff = ym + "-19", keys = Object.keys(o.w || {}).filter(function (k) { return k <= cutoff && k >= MIN; }).sort();
    if (!keys.length) return null;
    var k = keys[keys.length - 1], r = rec(tid, k);
    if (!r) return null;
    return { key: k, q: (r.q || []).slice(), cum: (r.cum || []).slice() };
  }
  window.__WK = {
    cum: function (tid, ym) { return monthCum(tid, ym); },
    row: function (tid, ym) { return window_WK_row(tid, ym); },
    ready: function () { return LOADED; },
    seed: SEED,
    snap: function (key) {
      if (!LOADED) return null;
      key = key || CUR.key;
      var out = { key: key, rows: {} };
      tenders().forEach(function (t) {
        var r = rec(t.tid, key), q = (r && r.q) || [];
        out.rows[t.tid] = {
          filled: q.some(function (v) { return !!v; }) || !!(r && (r.txt || "").trim()),
          qsum: q.reduce(function (a, b) { return a + (+b || 0); }, 0),
          txt: (r && r.txt) || "",
          lk: !!(r && r.lk)
        };
      });
      return out;
    }
  };

  /* ---------------- 期次选择：年 / 月 / 「日 · 第N周」下拉（与工程旬报一致） ---------------- */
  function setKey(k) {
    var t = ymd(thursdayNear(parseKey(k)));
    if (t < MIN) t = MIN;
    if (t > MAX) t = MAX;
    CUR.key = t;
  }
  /* 某月可填的周四（起点 2026-11-19 之前的一律不出现） */
  function dayOpts(y, m) {
    var out = [], d = new Date(y, m - 1, 1);
    while (d.getMonth() === m - 1) {
      if (d.getDay() === 4) { var s = ymd(d); if (s >= MIN && s <= MAX) out.push(s); }
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  function monthOpts(y) {
    var out = [];
    for (var m = 1; m <= 12; m++) if (dayOpts(y, m).length) out.push(m);
    return out;
  }
  /* 周序按自然月内计数：26 日 → 第四周 */
  function wkOf(k) { return Math.ceil(parseInt(k.slice(8, 10), 10) / 7); }
  function cnW(n) { return ("零一二三四五六".charAt(n) || n); }
  function options() {
    var host = $("#wk-bar"); if (!host) return;
    var d = parseKey(CUR.key), y = d.getFullYear(), m = d.getMonth() + 1;
    var ms = monthOpts(y);
    var ds = dayOpts(y, m) || [];
    host.innerHTML = '<span class="xb-lb">填报期</span>'
      + '<select class="pg-sel" id="wk-y">' + [2026, 2027, 2028, 2029].map(function (v) { return '<option value="' + v + '"' + (v === y ? " selected" : "") + ">" + v + " 年</option>"; }).join("") + "</select>"
      + '<select class="pg-sel" id="wk-m">' + ms.map(function (v) { return '<option value="' + v + '"' + (v === m ? " selected" : "") + ">" + v + " 月</option>"; }).join("") + "</select>"
      + '<select class="pg-sel wk-day" id="wk-d">' + ds.map(function (k) {
        return '<option value="' + k + '"' + (k === CUR.key ? " selected" : "") + ">" + parseInt(k.slice(8, 10), 10) + " 日 · 第" + cnW(wkOf(k)) + "周</option>";
      }).join("") + "</select>"
      + '<span class="xb-note">只填「本周完成」，允许填负数修正前几周多报/错报</span>';
    $("#wk-y").onchange = pickY;
    $("#wk-m").onchange = pickM;
    $("#wk-d").onchange = function () { if (this.value) CUR.key = this.value; render(); };
  }
  function pickY() {
    var y = +$("#wk-y").value, m = +$("#wk-m").value;
    if (!dayOpts(y, m).length) m = monthOpts(y)[0];
    CUR.key = dayOpts(y, m)[0];
    options(); render();
  }
  function pickM() {
    var y = +$("#wk-y").value, m = +$("#wk-m").value;
    var ds = dayOpts(y, m);
    CUR.key = ds[0];
    options(); render();
  }

  /* ---------------- 渲染 ---------------- */
  function cell(t, span) {
    var tid = t.tid, key = CUR.key, r = rec(tid, key), rows = rowsOf(t);
    var q = r ? r.q : [], cum = r ? r.cum : [], lk = !!(r && r.lk);
    var body = rows.map(function (row, i) {
      return '<tr><td class="wk-it">' + nmOf(row.nm) + "</td>"
        + '<td class="wk-prev">' + fmt(cum[i] - q[i]) + "</td>"
        + '<td class="wk-q">' + (lk
          ? '<span class="wk-qv">' + fmt(q[i]) + "</span>"
          : '<input type="text" inputmode="decimal" data-wkq="' + tid + "|" + i + '" value="' + (q[i] === 0 ? "" : q[i]) + '" placeholder="0">') + "</td>"
        + '<td class="wk-cum" data-wkcum="' + tid + "|" + i + '">' + fmt(cum[i]) + "</td></tr>";
    }).join("");
    var qs = 0, cs = 0;
    rows.forEach(function (row, i) { qs += (+q[i] || 0); cs += (+cum[i] || 0); });
    body += '<tr class="wk-tot"><td class="wk-it">合计</td>'
      + '<td class="wk-prev" data-wktprev="' + tid + '">' + fmt(cs - qs) + "</td>"
      + '<td class="wk-q" data-wktq="' + tid + '">' + fmt(qs) + "</td>"
      + '<td class="wk-cum" data-wktcum="' + tid + '">' + fmt(cs) + "</td></tr>";
    var txtBox = span > 1
      ? '<div class="wk-txt"><div class="wk-note"><b>文字周报</b><span>' + (PH[tid] || "本周形象进度、节点、存在问题") + '</span></div>'
        + '<textarea data-wktxt="' + tid + '" placeholder="本周形象进度、节点、存在的问题…"' + (lk ? " readonly" : "") + ">" + (r ? (r.txt || "") : "") + "</textarea></div>"
      : "";
    var tag = tagOf(tid);
    return '<div class="wk-card' + (span > 1 ? " wk-wide" : "") + '" style="grid-column:span ' + span + '">'
      + '<div class="wk-hd"><b>' + t.name + '</b><em>' + tag + '</em>'
      + '<span class="wk-dot" data-wkdot="' + tid + '"></span>'
      + '<button type="button" class="wk-sub' + (lk ? " on" : "") + '" data-wksub="' + tid + '">' + (lk ? "解锁" : "提交") + "</button></div>"
      + '<div class="wk-body"><div class="wk-tbwrap"><table class="wk-tbl"><thead><tr><th>项目</th><th>上周末完成</th><th>本周完成</th><th>累计完成</th></tr></thead><tbody>'
      + body + "</tbody></table></div>" + txtBox + "</div></div>";
  }

  function render() {
    var host = $("#wk-body"); if (!host) return;
    if (!LOADED) { host.innerHTML = '<div class="xb-loading">正在读取云端产值周报…</div>'; return; }
    var ts = tenders(), h = '<div class="wk-grid">';
    ts.forEach(function (t) { h += cell(t, (t.tid === "t2" || t.tid === "t8") ? 2 : 1); });
    h += "</div>";
    host.innerHTML = h;
    bind();
  }

  function bind() {
    var host = $("#wk-body"); if (!host) return;
    host.querySelectorAll("[data-wkq]").forEach(function (inp) {
      inp.oninput = function () {
        var p = inp.getAttribute("data-wkq").split("|"), tid = p[0], i = +p[1];
        var r = rec(tid, CUR.key);
        var oldQ = r.q[i] || 0;
        var basePrev = (r.cum[i] || 0) - oldQ;
        var v = parseFloat(inp.value);
        r.q[i] = isFinite(v) ? num(v) : 0;
        r.cum[i] = basePrev + r.q[i];
        var cellv = host.querySelector('[data-wkcum="' + tid + "|" + i + '"]');
        if (cellv) cellv.textContent = fmt(r.cum[i]);
        var prevCell = inp.closest("tr").querySelector(".wk-prev");
        if (prevCell) prevCell.textContent = fmt(basePrev);
        var qs = 0, cs = 0;
        r.q.forEach(function (v, j) { qs += (+v || 0); cs += (+r.cum[j] || 0); });
        var tq = host.querySelector('[data-wktq="' + tid + '"]');
        if (tq) tq.textContent = fmt(qs);
        var tc = host.querySelector('[data-wktcum="' + tid + '"]');
        if (tc) tc.textContent = fmt(cs);
        var tp = host.querySelector('[data-wktprev="' + tid + '"]');
        if (tp) tp.textContent = fmt(cs - qs);
        save(tid);
      };
      inp.onblur = function () { render(); };
    });
    host.querySelectorAll("[data-wktxt]").forEach(function (ta) {
      ta.oninput = function () {
        var tid = ta.getAttribute("data-wktxt"), r = rec(tid, CUR.key);
        r.txt = ta.value; save(tid);
      };
    });
    host.querySelectorAll("[data-wksub]").forEach(function (btn) {
      btn.onclick = function () {
        var tid = btn.getAttribute("data-wksub"), r = rec(tid, CUR.key);
        if (r.lk) {
          pop(btn, '是否确定修改 <span class="p-seg">“' + (tenderName(tid)) + '”</span> 本周数据？', function () {
            r.lk = 0; save(tid, true).then(function () { render(); flagMsg("已解锁：" + tenderName(tid) + "，可以修改"); });
          });
        } else {
          r.lk = 1; save(tid, true).then(function () { render(); flagMsg("已提交并锁定：" + tenderName(tid)); });
        }
      };
    });
  }
  function tenderName(tid) { var n = ""; tenders().forEach(function (t) { if (t.tid === tid) n = t.name; }); return n || tid; }

  /* 与土石方日报一致的锁旁确认气泡 */
  function pop(anchor, text, onOk) {
    var old = document.getElementById("bx-pop"); if (old) old.remove();
    var p = document.createElement("div");
    p.id = "bx-pop"; p.className = "bx-pop";
    p.innerHTML = '<div class="p-tx">' + text + '</div><div class="p-act"><button type="button" class="no">取消</button><button type="button" class="ok">确认</button></div>';
    document.body.appendChild(p);
    var r = anchor.getBoundingClientRect();
    var top = r.bottom + window.scrollY + 8, left = r.left + window.scrollX - 8, w = p.offsetWidth || 240;
    if (left + w > window.innerWidth - 12) left = Math.max(12, window.innerWidth - w - 12);
    if (r.bottom + p.offsetHeight + 20 > window.innerHeight) top = r.top + window.scrollY - p.offsetHeight - 8;
    p.style.top = top + "px"; p.style.left = left + "px";
    function close() { p.remove(); document.removeEventListener("click", out, true); document.removeEventListener("keydown", esc); }
    function out(ev) { if (!p.contains(ev.target)) close(); }
    function esc(ev) { if (ev.key === "Escape") close(); }
    p.querySelector(".no").onclick = close;
    p.querySelector(".ok").onclick = function () { close(); onOk(); };
    setTimeout(function () { document.addEventListener("click", out, true); document.addEventListener("keydown", esc); }, 0);
  }

  function markDot(tid, ok, err) {
    var d = document.querySelector('[data-wkdot="' + tid + '"]');
    if (!d) return;
    d.className = "wk-dot" + (ok ? " ok" : err ? " err" : "");
    d.title = ok ? "已同步云端" : err ? "未同步：保存在本机" : "未改动";
  }

  var QL = Promise.resolve();
  function save(tid, now) {
    clearTimeout(TM[tid]);
    var n = tid.slice(1);
    return new Promise(function (res) {
      TM[tid] = setTimeout(function () {
        var o = DATA[tid]; if (!o) { res(false); return; }
        o.ts = Date.now();
        if (location.protocol === "file:") { flagMsg("本机打开为只读预览，改动不上传云端"); res(false); return; }
        QL = QL.then(function () {
          return gitPut([{ name: "xb-wk-" + n + ".json", txt: JSON.stringify(o) }], "产值周报 " + tid + " " + CUR.key);
        }).then(function () {
          markDot(tid, 1); res(true);
          try { document.dispatchEvent(new CustomEvent("wk-ready")); } catch (e1) {}
        }, function (e) {
          markDot(tid, 0, 1); flagMsg("保存失败：" + (e && e.message ? e.message : e)); res(false);
        });
      }, now ? 0 : 900);
    });
  }

  function flagMsg(m) { var el = $("#wk-msg"); if (el) { el.textContent = m; el.classList.add("on"); setTimeout(function () { el.classList.remove("on"); }, 3000); } }

  function boot() {
    if (!$("#view-wk")) return;
    CUR.key = clampKey(ymd(thursdayNear(new Date())));
    options();
    load().then(function () { render(); });
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('.nav-item[data-view="wk"]') : null;
      if (a) { options(); load().then(render); }
    });
  }
  function waitBase() {
    if (window.BASE) { boot(); return; }
    setTimeout(waitBase, 120);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", waitBase); else waitBase();
})();
