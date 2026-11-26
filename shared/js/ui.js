/* Shared usability enhancements. Keeps the existing data and save logic unchanged. */
(function () {
  "use strict";

  function text(node) {
    return node ? String(node.textContent || "").replace(/\s+/g, " ").trim() : "";
  }

  function addSkipLink() {
    var main = document.querySelector("main");
    if (!main || document.querySelector(".ui-skip-link")) return;
    if (!main.id) main.id = "main-content";
    main.setAttribute("tabindex", "-1");
    var link = document.createElement("a");
    link.className = "ui-skip-link";
    link.href = "#" + main.id;
    link.textContent = "跳到主要内容";
    link.addEventListener("click", function () {
      setTimeout(function () { main.focus({ preventScroll: true }); }, 0);
    });
    document.body.insertBefore(link, document.body.firstChild);
  }

  function labelFieldControls() {
    document.querySelectorAll(".field").forEach(function (field, index) {
      var label = field.querySelector(":scope > label");
      var control = field.querySelector("input, select, textarea");
      if (!label || !control) return;
      if (!control.id) control.id = "ui-field-" + index;
      if (!label.htmlFor) label.htmlFor = control.id;
      if (!control.getAttribute("aria-label") && !control.getAttribute("aria-labelledby")) {
        control.setAttribute("aria-label", text(label));
      }
    });
  }

  function tableCaption(table) {
    var card = table.closest(".card");
    var heading = card && card.querySelector(".card-head h2");
    return text(heading) || text(table.querySelector("caption")) || "数据表";
  }

  function labelTableControls() {
    document.querySelectorAll("main table").forEach(function (table) {
      var caption = tableCaption(table);
      var captionNode = table.querySelector("caption");
      if (!captionNode) {
        captionNode = document.createElement("caption");
        captionNode.className = "sr-only";
        captionNode.textContent = caption;
        table.insertBefore(captionNode, table.firstChild);
      }
      table.querySelectorAll("input, select, textarea").forEach(function (control) {
        if (control.type === "hidden" || control.type === "file") return;
        if (control.getAttribute("aria-label") || control.getAttribute("aria-labelledby")) return;
        if (control.closest("label")) return;
        var cell = control.closest("td, th");
        var row = cell && cell.closest("tr");
        if (!cell || !row) return;
        var rowLabel = "";
        var nameCell = row.querySelector(".nm, .nmc, .s, .bkl, .sec, td:first-child");
        if (nameCell && nameCell !== cell) rowLabel = text(nameCell);
        if (!rowLabel) rowLabel = text(row.cells[0]).slice(0, 36);
        var col = Array.prototype.indexOf.call(row.cells, cell) + 1;
        control.setAttribute("aria-label", caption + "，" + (rowLabel || "当前行") + "，第 " + col + " 列");
      });
    });
  }

  function labelInteractiveControls() {
    document.querySelectorAll("button, select").forEach(function (control) {
      if (control.getAttribute("aria-label") || control.getAttribute("aria-labelledby")) return;
      var copy = text(control);
      if (!copy && control.title) control.setAttribute("aria-label", control.title);
    });
    ["pg-hint", "rep-hint", "jr-hint", "tsf-hint", "wk-msg", "xb-msg", "bx-chip", "sync-chip"].forEach(function (id) {
      var node = document.getElementById(id);
      if (!node) return;
      if (!node.getAttribute("role")) node.setAttribute("role", "status");
      if (!node.getAttribute("aria-live")) node.setAttribute("aria-live", "polite");
    });
    var names = {
      "import-file": "导入 JSON 数据文件",
      "pg-year": "形象进度年份",
      "pg-mon": "形象进度月份",
      "exec-month-sel": "当月完成数据月份",
      "tsf-y": "土石方日报年份",
      "tsf-m": "土石方日报月份",
      "sel-tender": "工程月报标段",
      "sel-year": "工程月报年份",
      "sel-month": "工程月报月份",
      "wk-y": "产值周报年份",
      "wk-m": "产值周报月份",
      "wk-d": "产值周报日期",
      "xb-y": "工程旬报年份",
      "xb-m": "工程旬报月份",
      "xb-d": "工程旬报日期",
      "jr-year": "地市州月报年份",
      "jr-month": "地市州月报月份",
      "dz-k": "地市州旬报数据期",
      "pg-pw": "查看密码"
    };
    Object.keys(names).forEach(function (id) {
      var node = document.getElementById(id);
      if (node && !node.getAttribute("aria-label")) node.setAttribute("aria-label", names[id]);
    });
    document.querySelectorAll('input[type="file"]:not([aria-label])').forEach(function (node) {
      node.setAttribute("aria-label", "选择本地文件");
    });
    document.querySelectorAll('input[data-k="monthIdx"]:not([aria-label])').forEach(function (node) {
      node.setAttribute("aria-label", "本年时序月份");
    });
    document.querySelectorAll("textarea[data-wktxt]:not([aria-label])").forEach(function (node) {
      var card = node.closest(".wk-card");
      var heading = card && card.querySelector(".wk-hd b");
      node.setAttribute("aria-label", (text(heading) || "标段") + "，本周情况说明");
    });
  }

  function labelScrollRegions() {
    var regions = document.querySelectorAll(".tw, .pg-scroll, .xb-wrap, .tsf-wrap, .wb-scroll");
    regions.forEach(function (region) {
      if (region.scrollWidth <= region.clientWidth + 1) return;
      region.classList.add("ui-scroll-region");
      region.setAttribute("tabindex", "0");
      if (!region.getAttribute("role")) region.setAttribute("role", "region");
      if (!region.getAttribute("aria-label")) {
        var card = region.closest(".card");
        var heading = card && card.querySelector(".card-head h2");
        region.setAttribute("aria-label", (text(heading) || "数据表") + "，可横向滚动");
      }
    });
  }

  function enhanceNavigation() {
    var nav = document.querySelector(".rail nav");
    if (!nav) return;
    nav.setAttribute("aria-label", "主要导航");
    nav.addEventListener("click", function (event) {
      var item = event.target.closest && event.target.closest(".nav-item");
      if (!item) return;
      nav.querySelectorAll(".nav-item").forEach(function (link) {
        link.setAttribute("aria-current", link === item ? "page" : "false");
      });
      setTimeout(function () {
        item.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      }, 0);
    });
    var active = nav.querySelector(".nav-item.is-on");
    if (active) active.setAttribute("aria-current", "page");
  }

  var queued = false;
  function enhanceDynamicContent() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      labelFieldControls();
      labelTableControls();
      labelInteractiveControls();
      labelScrollRegions();
    });
  }

  function boot() {
    addSkipLink();
    enhanceNavigation();
    enhanceDynamicContent();
    var main = document.querySelector("main");
    if (main && window.MutationObserver) {
      new MutationObserver(enhanceDynamicContent).observe(main, {
        childList: true,
        subtree: true
      });
    }
    window.addEventListener("resize", enhanceDynamicContent);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
