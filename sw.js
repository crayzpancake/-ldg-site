// 网络优先：始终取最新内容；断网时才用缓存
// 2026-11-17 晨：再次触发部署，测试 Netlify 额度恢复情况（11-15、11-16 内容均已推 GitHub 待上线）
const C = "ldg-v14";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  const fresh = /\.js$/.test(u.pathname) || u.pathname === "/" || u.pathname.endsWith(".html");
  e.respondWith(fetch(r, fresh ? { cache: "no-cache" } : undefined).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === "navigate" ? caches.match("/index.html") : new Response("", { status: 504 })))));
});
