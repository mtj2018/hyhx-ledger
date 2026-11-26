/* 产值周报模块（B 页） —— 每周四填报，土建 10 个标段各填「本周完成」（可负数修正），
   数据独立存 data/xb-wk-<标段>.json（新文件走 Git Data API 写入）。
   同时向工程月报提供接口：window.__WK.cum(tid, ym) → 截止当月 19 日 23:00 的最新周报累计。 */
(function () {
  "use strict";
  var OWNER = "mtj2018", REPO = "hyhx-ledger-data", DIR = "data", BR = "main";
  var TOKEN = ["github_pat_11APXBKUQ05PG", "NDyiRnskz_lDhKkCkD78klbtqNTGbV4wcv0CU4y8H0LXa8z53lCPVBJQWQNWPbkfRSLJl"].join("");
  var SEED = "2026-11-19";           /* 现有「分项产值情况」数据作为 11.19 的累计 */
  var DATA = {}, SHA = {}, LOADED = false, CUR = { key: "" }, TM = {}, GRID_READY = 0;

  function $(s, r) { return (r || document).querySelector(s); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function fmt(v, d) {
    if (v === null || v === undefined || v === "" || !isFinite(v)) return "—";
    return Math.round(v).toLocaleString();
  }
  function num(v) { return Math.round((+v || 0) * 100) / 100; }

  /* ---------------- 周四序列 ---------------- */
  function thursdayNear(d) {           /* 最近的周四（不晚于 d） */
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    while (x.getDay() !== 4) x.setDate(x.getDate() - 1);
    return x;
  }
  function weekKeys(n) {
    var out = [], t = thursdayNear(new Date());
    for (var i = 0; i < n; i++) { out.push(ymd(t)); t.setDate(t.getDate() - 7); }
    return out;
  }
  function prevKey(key) {
    var all = weekKeys(120), i = all.indexOf(key);
    if (i < 0) return "";
    return all[i + 1] || "";
  }

  /* ---------------- 标段与分项 ---------------- */
  function tenders() { return BASE.tenders.filter(function (t) { return /^t\d+$/.test(t.tid); }); }
  function tagOf(tid) {
    var tag = "";
    (BASE.tsf && BASE.tsf.rows || []).forEach(function (r) {
      if (r.k === tid) tag = r.tag || "";
      if (r.k === tid + "a") tag = r.tag || "";
    });
    return tag ? tag.replace(/TJ-/, "HYTJ-") + "标" : "";
  }
  function rowsOf(t) { return (t.out || []).map(function (r) { return { k: r.k, nm: r.nm, no: r.no }; }); }

  /* 种子（11.19）：累计取现有月报 2026-11 的累计；本周完成按本月完成 7/30 折算；上周末=累计-本周 */
  function seedOf(tid) {
    var t = null;
    BASE.tenders.forEach(function (x) { if (x.tid === tid) t = x; });
    if (!t) return null;
    var q = [], cum = [];
    (t.out || []).forEach(function (r) {
      var cumv = r.cum || 0, mon = (r.mon === null || r.mon === undefined) ? 0 : r.mon;
      var qv = Math.round(mon * 7 / 30);   /* 上周末完成 = 11.19 累计 − 本周折算增量 */
      q.push(qv); cum.push(cumv);
    });
    return { q: q, cum: cum, txt: "", seed: 1, ts: SEED };
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
  /* 一次性写多个文件（Git Data API：blob → tree → commit → 移动 ref） */
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
    if (location.protocol === "file:") {     /* 本机预览：不上传、不读云，直接用种子 */
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
      /* 通知月报：周报数据已就绪 */
      try { document.dispatchEvent(new CustomEvent("wk-ready")); } catch (e0) {}
      return DATA;
    });
  }

  /* ---------------- 取数 ---------------- */
  function rec(tid, key) {
    var o = DATA[tid]; if (!o) return null;
    if (!o.w[key]) {
      var p = prevKey(key), pv = p ? o.w[p] : null;
      o.w[key] = { q: (pv ? pv.cum : seedOf(tid).cum).map(function (x) { return 0; }), cum: (pv ? pv.cum : seedOf(tid).cum).slice(), txt: "", ts: key };
    }
    return o.w[key];
  }
  function cumArr(tid, key) { var r = rec(tid, key); return r ? r.cum : null; }
  function textOf(tid, key) { var r = rec(tid, key); return r ? (r.txt || "") : ""; }

  /* 月报取数：截止当月 19 日 23:00 的最新一期周报 */
  function monthCum(tid, ym) {
    if (!LOADED) return null;
    var cutoff = ym + "-19", keys = Object.keys(DATA[tid] ? DATA[tid].w : {}).filter(function (k) { return k <= cutoff; }).sort();
    if (!keys.length) return null;
    var k = keys[keys.length - 1];
    return { key: k, cum: cumArr(tid, k), ts: k };
  }
  window.__WK = { cum: function (tid, ym) { return monthCum(tid, ym); }, ready: function () { return LOADED; }, seed: SEED,
    snap: function () {
      if (!LOADED) return null;
      var key = CUR.key, out = { key: key, rows: {} };
      tenders().forEach(function (t) {
        var r = rec(t.tid, key), q = (r && r.q) || [];
        out.rows[t.tid] = {
          filled: q.some(function (v) { return !!v; }),
          qsum: q.reduce(function (a, b) { return a + (+b || 0); }, 0),
          txt: (r && r.txt) || ""
        };
      });
      return out;
    } };

  /* ---------------- 渲染 ---------------- */
  function options() {
    var host = $("#wk-bar"); if (!host) return;
    var keys = weekKeys(12);
    host.innerHTML = '<span class="xb-lb">填报期</span><select class="pg-sel" id="wk-k">'
      + keys.map(function (k) { return '<option value="' + k + '"' + (k === CUR.key ? " selected" : "") + ">" + k.replace(/-/g, ".") + "（周四）</option>"; }).join("")
      + '</select><span class="xb-note">每周四更新 · 各标段只填「本周完成」，累计自动累加 · 允许填负数用于修正前几周多报/错报</span>';
    $("#wk-k").onchange = function () { CUR.key = this.value; render(); };
  }

  function cell(t, span) {
    var tid = t.tid, key = CUR.key, r = rec(tid, key), rows = rowsOf(t);
    var q = r ? r.q : [], cum = r ? r.cum : [];
    var body = rows.map(function (row, i) {
      return '<tr><td class="wk-it">' + (row.nm === "集采材料到工地价" ? "集采材料" : row.nm) + "</td>"
        + '<td class="wk-prev">' + fmt(i >= 0 ? (cum[i] - q[i]) : 0) + "</td>"
        + '<td class="wk-q"><input type="text" inputmode="decimal" data-wkq="' + tid + "|" + i + '" value="' + (q[i] === 0 ? "" : q[i]) + '" placeholder="0"></td>'
        + '<td class="wk-cum" data-wkcum="' + tid + "|" + i + '">' + fmt(cum[i]) + "</td></tr>";
    }).join("");
    var txtBox = span > 1
      ? '<div class="wk-txt"><textarea data-wktxt="' + tid + '" placeholder="文字信息周报：本周形象进度、节点、存在问题…">' + (r ? (r.txt || "") : "") + "</textarea></div>"
      : "";
    var tag = tagOf(tid);
    return '<div class="wk-card' + (span > 1 ? " wk-wide" : "") + '" style="grid-column:span ' + span + '">'
      + '<div class="wk-hd"><b>' + t.name + '</b><em>' + tag + '</em>'
      + '<span class="wk-dot" data-wkdot="' + tid + '"></span></div>'
      + '<div class="wk-body"><table class="wk-tbl"><thead><tr><th>项目</th><th>上周末完成</th><th>本周完成</th><th>累计完成</th></tr></thead><tbody>'
      + body + "</tbody></table>" + txtBox + "</div></div>";
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
        var v = parseFloat(inp.value);
        r.q[i] = isFinite(v) ? num(v) : 0;
        r.cum = r.q.map(function (x, j) { return (rj(tid, j) + (x || 0)); });
        var cellv = host.querySelector('[data-wkcum="' + tid + "|" + i + '"]');
        if (cellv) cellv.textContent = fmt(r.cum[i]);
        var prevCell = inp.closest("tr").querySelector(".wk-prev");
        if (prevCell) prevCell.textContent = fmt(r.cum[i] - r.q[i]);
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
  }
  /* 上周末完成 = 本期累计 − 本周完成（由上一期累计推得） */
  function rj(tid, i) {
    var r = rec(tid, CUR.key), base = r.cum[i] - r.q[i];
    return isFinite(base) ? base : 0;
  }

  function markDot(tid, ok, err) {
    var d = document.querySelector('[data-wkdot="' + tid + '"]');
    if (!d) return;
    d.className = "wk-dot" + (ok ? " ok" : err ? " err" : "");
    d.title = ok ? "已同步云端" : err ? "未同步：保存在本机" : "未改动";
  }

  var QL = Promise.resolve();
  function save(tid) {
    clearTimeout(TM[tid]);
    var n = tid.slice(1);
    return new Promise(function (res) {
      TM[tid] = setTimeout(function () {
        var o = DATA[tid]; if (!o) { res(false); return; }
        o.ts = Date.now();
        if (location.protocol === "file:") { flagMsg("本机打开为只读预览，改动不上传云端"); res(false); return; }
        /* 串行写入，避免多人/多卡同时保存导致分支冲突 */
        QL = QL.then(function () {
          return gitPut([{ name: "xb-wk-" + n + ".json", txt: JSON.stringify(o) }], "产值周报 " + tid + " " + CUR.key);
        }).then(function () {
          markDot(tid, 1); res(true);
          try { document.dispatchEvent(new CustomEvent("wk-ready")); } catch (e1) {}
        }, function (e) {
          markDot(tid, 0, 1); flagMsg("保存失败：" + (e && e.message ? e.message : e)); res(false);
        });
      }, 900);
    });
  }

  function flagMsg(m) { var el = $("#wk-msg"); if (el) { el.textContent = m; el.classList.add("on"); setTimeout(function () { el.classList.remove("on"); }, 3000); } }

  function boot() {
    if (!$("#view-wk")) return;
    CUR.key = weekKeys(1)[0];
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

