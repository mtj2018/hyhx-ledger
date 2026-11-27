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
  /* 两套清单：c = 合同清单（原版本），0 = 0#清单（2026-11-27 套用，仅土建标段） */
  var MODE = "0";
  /* 每次打开 A 页都默认套用 0#清单，并同步给 B 页取数 */
  try { localStorage.setItem("hyhx-ctr-set", "0"); } catch (e0) {}
  var SET_DATE = "2026年11月27日";
  var CH = [
    [100, "临时工程"], [200, "路基工程"], [300, "路面工程"], [400, "桥涵工程"],
    [700, "绿化工程"], [800, "改扩建工程"], [900, "集采材料到工地价"]
  ];
  var CHNAME = {
    100: "临时工程", 200: "路基工程", 300: "路面工程", 400: "桥涵工程",
    700: "绿化工程", 800: "改扩建工程", 900: "集采材料到工地价"
  };

  function fmt(n, d) {
    if (n === null || n === undefined || n === "" || !isFinite(n)) return "";
    var s = Number(n).toFixed(d === undefined ? 0 : d);
    if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
    var p = s.split(".");
    if (p[0] !== "-" && p[0].length > 3) p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return p.join(".");
  }
  function num(s) {
    var v = +String(s == null ? "" : s).replace(/,/g, "").trim();
    return isFinite(v) ? v : 0;
  }
  function dec() { return 0; }
  function dash(td) { td.innerHTML = '<span style="color:#AEB8C6">—</span>'; }

  /* 每个修订行：章节单元格按当前清单取值；无 0# 金额时沿用合同金额 */
  function rowVals(tr) {
    var cells = tr.querySelectorAll("td.ch"), out = [], sumC = 0, sumZ = 0, zlj = 0;
    var zc = tr.querySelector("td.z"); if (zc) zlj = num(zc.textContent);
    Array.prototype.forEach.call(cells, function (c, i) {
      var key = CH[i][0];
      var cv = num(c.getAttribute("data-c"));
      var has0 = c.hasAttribute("data-c0");
      var zv = has0 ? num(c.getAttribute("data-c0")) : cv;
      sumC += cv; sumZ += zv;
      out.push({ td: c, key: key, c: cv, z: zv, has0: has0 });
    });
    return { cells: out, sumC: sumC, sumZ: sumZ, zlj: zlj };
  }

  /* 合同清单是「合同额」的唯一数据源：把每个标段当前显示的合同额同步到全局，
     完成率统计 / B 页分项产值都只读这一份，不再各存一套数 */
  function publishCtr(chTot) {
    var net = {}, row = {}, rows = document.querySelectorAll("#ctr-tj tbody tr");
    Array.prototype.forEach.call(rows, function (tr, i) {
      if (tr.className.indexOf("total") >= 0) return;
      var amtCell = tr.querySelector("td.amt"); if (!amtCell) return;
      var v = num(amtCell.textContent), tid = "t" + (i + 1);
      net[tid] = v;
      var rv = rowVals(tr);
      row[tid] = {
        amt: (MODE === "0" ? rv.sumZ : rv.sumC) + rv.zlj,  /* 含暂列金口径，供分项页回退用 */
        zlj: rv.zlj,
        lj: chv(rv, 200), qh: chv(rv, 400), lm: chv(rv, 300), lh: chv(rv, 700), jc: chv(rv, 900),
        t100: chv(rv, 100), t200: chv(rv, 200), t300: chv(rv, 300),
        t400: chv(rv, 400), t700: chv(rv, 700), t800: chv(rv, 800), t900: chv(rv, 900)
      };
    });
    [["ctr-ja", "j"], ["ctr-jd", "m"]].forEach(function (p) {
      var tb = document.getElementById(p[0]); if (!tb) return;
      Array.prototype.forEach.call(tb.querySelectorAll("tbody tr"), function (tr, i) {
        var cell = tr.querySelector("td.amt"); if (!cell) return;
        var v = num(cell.textContent);
        if (isFinite(v)) net[p[1] + (i + 1)] = v;
      });
    });
    window.__CTR_NET = net;
    window.__CTR_ROW = row;
    window.__CTR_CH = chTot;
    window.__CTR_MODE = MODE;
    window.__CTR_STATE = { zlj: !!ON.zlj, lm: !!ON.lm, zja: !!ON.zja, zjd: !!ON.zjd, set: MODE };
    try { document.dispatchEvent(new CustomEvent("ctr-changed")); } catch (e0) {}
  }
  function chv(rv, key) {
    var v = 0;
    rv.cells.forEach(function (c) { if (c.key === key) v = (MODE === "0" ? c.z : c.c); });
    return v;
  }

  window.__ctrSet = function (opt) {
    if (opt && opt.zlj !== undefined) ON.zlj = !!opt.zlj;
    if (opt && opt.lm !== undefined) ON.lm = !!opt.lm;
    if (opt && opt.zja !== undefined) ON.zja = !!opt.zja;
    if (opt && opt.zjd !== undefined) ON.zjd = !!opt.zjd;
    if (opt && opt.set !== undefined) {
      MODE = (String(opt.set) === "0") ? "0" : "c";
      try { localStorage.setItem("hyhx-ctr-set", MODE); } catch (e1) {}
    }
    paintCtr();
  };

  function paintCtr() {
    var decd = dec(), chTot = {}, total = 0, ztot = 0;
    var rows = document.querySelectorAll("#ctr-tj tbody tr");
    var nrow = 0;
    Array.prototype.forEach.call(rows, function (tr) {
      var isTot = tr.className.indexOf("total") >= 0;
      var amtCell = isTot ? null : tr.querySelector("td.amt");
      var rv = rowVals(tr);
      if (isTot) {
        /* 合计行：各章节按当前清单逐列汇总（与是否含路面无关） */
        Array.prototype.forEach.call(tr.querySelectorAll("td[data-ct]"), function (c) {
          var k = +c.getAttribute("data-ct"); c.textContent = fmt(Math.round(chTot[k] || 0), 0);
        });
        var zc0 = tr.querySelector("td.z"); if (zc0) { zc0.textContent = fmt(ztot, 0); zc0.classList.toggle("is-off", !ON.zlj); }
        var totCell = document.getElementById("ctr-t-amt"); if (totCell) totCell.textContent = fmt(total, decd);
        return;
      }
      nrow++;
      rv.cells.forEach(function (c) {
        var k = c.key, v = (MODE === "0") ? c.z : c.c;
        var dv = Math.round(v);
        if (dv === 0) dash(c.td); else c.td.textContent = fmt(dv, 0);
        c.td.classList.toggle("is-0", MODE === "0" && c.has0 && dv !== 0);
        if (k === 300) c.td.classList.toggle("is-off", !ON.lm);
        chTot[k] = (chTot[k] || 0) + v;
      });
      var shown = 0;
      rv.cells.forEach(function (c) {
        if (c.key === 300 && !ON.lm) return;
        shown += (MODE === "0") ? c.z : c.c;
      });
      shown += ON.zlj ? rv.zlj : 0;
      shown = Math.round(shown);
      if (amtCell) amtCell.textContent = fmt(shown, 0);
      total += shown; ztot += Math.round(rv.zlj);
    });

    /* 交安 / 机电：暂列金同样可切换是否计入合同额（0#清单不涉及，金额保持不变） */
    [["zja", "ctr-ja"], ["zjd", "ctr-jd"]].forEach(function (x) {
      var tb = document.getElementById(x[1]);
      if (!tb) return;
      var on = !!ON[x[0]], tot = 0;
      Array.prototype.forEach.call(tb.querySelectorAll("td.amt"), function (c) {
        var amt = +c.getAttribute("data-amt"), z = +c.getAttribute("data-zlj");
        var v = amt - (on ? 0 : z);
        c.textContent = fmt(v, 0);
        tot += v;
      });
      Array.prototype.forEach.call(tb.querySelectorAll("td.stot"), function (c) { c.textContent = fmt(tot, 0); });
      Array.prototype.forEach.call(tb.querySelectorAll("td.z"), function (c) { c.classList.toggle("is-off", !on); c.textContent = fmt(num(c.textContent), 0); });
    });

    /* 章节汇总卡：土建按当前清单 + 交安/机电（不参与 0#） */
    var jaTmp = 0, jaCh = 0, jdTmp = 0, jdCh = 0;
    var ja = document.getElementById("ctr-ja"), jd = document.getElementById("ctr-jd");
    if (ja) Array.prototype.forEach.call(ja.querySelectorAll("tbody tr:not(.total)"), function (tr) {
      var t = tr.querySelectorAll("td"); if (t.length >= 5) { jaTmp += num(t[3].textContent); jaCh += num(t[4].textContent); }
    });
    if (jd) Array.prototype.forEach.call(jd.querySelectorAll("tbody tr:not(.total)"), function (tr) {
      var t = tr.querySelectorAll("td"); if (t.length >= 5) { jdTmp += num(t[3].textContent); jdCh += num(t[4].textContent); }
    });
    var grid = {
      100: Math.round(chTot[100] || 0) + jaTmp + jdTmp,
      200: Math.round(chTot[200] || 0), 300: Math.round(chTot[300] || 0), 400: Math.round(chTot[400] || 0),
      700: Math.round(chTot[700] || 0), 800: Math.round(chTot[800] || 0), 900: Math.round(chTot[900] || 0),
      ja: jaCh, jd: jdCh
    };
    var gridTot = 0;
    Object.keys(grid).forEach(function (k) { gridTot += grid[k]; });
    Array.prototype.forEach.call(document.querySelectorAll(".ctr-chap [data-ch]"), function (d) {
      var k = d.getAttribute("data-ch"), v = (k === "tot") ? gridTot : (grid[k] || 0);
      var span = d.querySelector(".v"); if (span) span.textContent = fmt(v, decd);
    });

    /* 切换按钮 / 备注 */
    var btn = document.getElementById("ctr-set");
    if (btn) {
      btn.textContent = "清单：" + (MODE === "0" ? "0#清单" : "合同清单");
      btn.classList.toggle("is-zero", MODE === "0");
      btn.setAttribute("aria-pressed", MODE === "0" ? "true" : "false");
      btn.setAttribute("title", MODE === "0" ? "当前套用 0#清单，点击切回合同清单" : "当前套用合同清单，点击切换为 0#清单");
    }
    var noteSet = document.getElementById("ctr-note-set");
    if (noteSet) {
      noteSet.textContent = "当前套用：" + (MODE === "0" ? "0#清单" : "合同清单");
      noteSet.parentNode.classList.toggle("is-zero", MODE === "0");
    }
    var legend = document.getElementById("ctr-legend");
    if (legend) legend.hidden = (MODE !== "0");

    publishCtr({
      "临时工程": grid[100], "路基工程": grid[200], "路面工程": grid[300], "桥涵工程": grid[400],
      "绿化工程": grid[700], "改扩建工程": grid[800], "集采材料到工地价": grid[900],
      "交安工程": grid.ja, "机电工程": grid.jd
    });
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var tab = t && t.closest ? t.closest("[data-ov]") : null;
    if (tab) { showTab(tab.getAttribute("data-ov")); return; }
    var setBtn = t && t.closest ? t.closest("#ctr-set") : null;
    if (setBtn) {
      MODE = (MODE === "0") ? "c" : "0";
      try { localStorage.setItem("hyhx-ctr-set", MODE); } catch (e2) {}
      paintCtr(); return;
    }
    var tg = t && t.closest ? t.closest("[data-ctrt]") : null;
    if (tg) {
      var k = tg.getAttribute("data-ctrt"); ON[k] = !ON[k]; paintCtr();
    }
  });

  /* 同浏览器另一页（B 页）切换后回来保持一致 */
  window.addEventListener("storage", function (e) {
    if (e.key !== "hyhx-ctr-set") return;
    MODE = (e.newValue === "0") ? "0" : "c";
    paintCtr();
  });

  showTab("info");
  paintCtr();
})();
