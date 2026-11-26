(function () {
  "use strict";
  var oldHash = String(location.hash || "").replace("#", "");
  var routes = {
    investment: "investment.html",
    exec: "investment.html",
    fixedasset: "fixed-assets.html",
    progress: "progress.html",
    dz: "regions.html"
  };
  if (routes[oldHash]) location.replace(routes[oldHash]);
})();
