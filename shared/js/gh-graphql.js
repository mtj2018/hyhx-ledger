/* GitHub Contents API GET → GraphQL 读取桥
   REST contents 读取与写入共用 5000/h 配额，页面多次刷新会把读取配额耗尽；
   GraphQL 有独立配额，读取私有数据仓时统一走 GraphQL，写入仍走 REST。
   对上层保持 Contents API 的 JSON 形状（content/base64、sha、目录数组）。 */
(function () {
  if (window.__ghGraphqlBridge) return;
  window.__ghGraphqlBridge = 1;
  var orig = window.fetch.bind(window);

  function parseContents(u) {
    try {
      var x = new URL(u, location.href);
      if (x.hostname !== "api.github.com") return null;
      var m = x.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/contents(?:\/(.*))?$/);
      if (!m) return null;
      var path = (m[3] || "").split("/").map(function (s) { return decodeURIComponent(s); }).join("/");
      return { owner: decodeURIComponent(m[1]), repo: decodeURIComponent(m[2]), path: path, ref: x.searchParams.get("ref") || "main" };
    } catch (e) { return null; }
  }
  function b64(s) {
    var bytes = new TextEncoder().encode(String(s == null ? "" : s)), bin = "", i;
    for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function jr(o, status) {
    return new Response(JSON.stringify(o), { status: status || 200, headers: { "Content-Type": "application/json" } });
  }
  function gql(p, expr, tree, init) {
    var q = tree
      ? 'query { repository(owner:' + JSON.stringify(p.owner) + ', name:' + JSON.stringify(p.repo) + ') { object(expression:' + JSON.stringify(expr) + ') { ... on Tree { entries { name type oid } } } } }'
      : 'query { repository(owner:' + JSON.stringify(p.owner) + ', name:' + JSON.stringify(p.repo) + ') { object(expression:' + JSON.stringify(expr) + ') { ... on Blob { oid text } } } }';
    var headers = new Headers((init && init.headers) || {});
    headers.set("Content-Type", "application/json");
    return orig("https://api.github.com/graphql", { method: "POST", headers: headers, body: JSON.stringify({ query: q }) })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) { var e = new Error("GraphQL " + r.status); e.status = r.status; throw e; }
          if (j.errors && j.errors.length) { var e2 = new Error(j.errors[0].message || "GraphQL error"); e2.status = 403; throw e2; }
          return (j.data && j.data.repository && j.data.repository.object) || null;
        });
      });
  }

  window.fetch = function (input, init) {
    var url = (typeof input === "string") ? input : (input && input.url) || "";
    var method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
    var p = parseContents(url);
    if (!p || method !== "GET") return orig(input, init);

    if (!p.path) {
      return gql(p, p.ref + ":", true, init).then(function (o) {
        if (!o || !o.entries) return jr([], 200);
        var arr = o.entries.filter(function (e) { return e.type === "blob"; }).map(function (e) {
          return { name: e.name, path: (p.path ? p.path + "/" : "") + e.name, sha: e.oid, type: "file", size: 0 };
        });
        return jr(arr, 200);
      }).catch(function (e) { return jr({ message: e.message || "read failed" }, e.status || 403); });
    }

    return gql(p, p.ref + ":" + p.path, false, init).then(function (o) {
      if (!o || o.text == null) return jr({ message: "Not Found" }, 404);
      return jr({
        name: p.path.split("/").pop(), path: p.path, sha: o.oid,
        size: String(o.text).length, encoding: "base64", content: b64(o.text), type: "file"
      }, 200);
    }).catch(function (e) { return jr({ message: e.message || "read failed" }, e.status || 403); });
  };
})();
