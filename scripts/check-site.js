const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pages = [
  "index.html",
  "investment.html",
  "fixed-assets.html",
  "progress.html",
  "regions.html",
  "report.html",
  "report/index.html",
  "report/status.html",
  "report/daily.html",
  "report/weekly.html",
  "report/ten-day.html",
  "report/monthly.html",
  "report/regions.html",
  "report/weather.html"
];

let failed = false;
function fail(message) {
  failed = true;
  console.error("FAIL: " + message);
}

for (const page of pages) {
  const file = path.join(root, page);
  if (!fs.existsSync(file)) {
    fail("Missing page: " + page);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(page + ": missing title");
  if (page !== "report.html" && page !== "report/index.html") {
    if (!/<h1\b/i.test(html)) fail(page + ": missing h1");
    if (!/<main\b/i.test(html)) fail(page + ": missing main content");
  }
  if (!/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) {
    fail(page + ": missing noindex");
  }

  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const value = match[1];
    if (!value || value.startsWith("#") || /^[a-z]+:/i.test(value) || value.startsWith("data:")) continue;
    const localPath = path.resolve(path.dirname(file), value.split(/[?#]/)[0]);
    if (!fs.existsSync(localPath)) fail(page + ": broken reference " + value);
  }
}

const sharedFiles = [
  "shared/js/index-app.js",
  "shared/js/report-app.js",
  "shared/js/gate.js",
  "shared/js/ui.js",
  "shared/js/pages/overview.js",
  "shared/js/pages/investment.js",
  "shared/css/ui.css"
];
for (const file of sharedFiles) {
  if (!fs.existsSync(path.join(root, file))) fail("Missing shared file: " + file);
}

const version = JSON.parse(fs.readFileSync(path.join(root, "ver.json"), "utf8"));
if (!version.build) fail("ver.json: missing build");
for (const page of ["index.html", "report/status.html", "report/daily.html"]) {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  if (!html.includes(version.build)) fail(page + ": build version is not synchronized");
}

if (failed) process.exit(1);
console.log("Site checks passed: " + pages.length + " pages");
