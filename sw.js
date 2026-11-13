// 网络优先：始终取最新内容；断网时才用缓存，没缓存过的页面给离线页
const C = "ldg-v8";
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => Promise.all(["/offline.html", "/"].map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  const fresh = /\.js$/.test(u.pathname) || u.pathname === "/" || u.pathname.endsWith(".html");
  e.respondWith(fetch(r, fresh ? { cache: "no-cache" } : undefined).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; })
    .catch(async () => {
      const m = await caches.match(r, { ignoreSearch: true });
      if (m) return m;
      if (r.mode === "navigate") return (await caches.match("/index.html")) || (await caches.match("/offline.html"));
      return new Response("", { status: 504, statusText: "offline" });
    }));
});
