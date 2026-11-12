// 在线人数统计（只有管理员能看）
// POST /api/ping {sid}       访客页面每 60 秒报一次（仅页面在前台时）
// GET  /api/online           需 header x-admin-key == 环境变量 ADMIN_KEY
// 只存随机生成的匿名访客编号，不存 IP、不存任何个人信息。
import { getStore } from "@netlify/blobs";

export const config = { path: ["/api/ping", "/api/online", "/api/hit"] };

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const MIN = 60000;
const bj = t => new Date(t + 8 * 3600e3).toISOString(); // 北京时间
const day = t => bj(t).slice(0, 10);

export default async (req) => {
  const url = new URL(req.url);
  const store = getStore({ name: "presence", consistency: "strong" });
  const now = Date.now(), m = Math.floor(now / MIN);

  if (url.pathname === "/api/hit") {
    if (req.method !== "POST") return J({ ok: false }, 405);
    let b = {}; try { b = await req.json(); } catch (e) {}
    const v = String(b.v || "").replace(/[^a-z]/g, "").slice(0, 12);
    if (!v) return J({ ok: false }, 400);
    await store.set(`h/${day(now)}/${v}/${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, "1");
    if (Math.random() < 0.02) {
      const old = day(now - 15 * 86400e3);
      const { blobs } = await store.list({ prefix: "h/" });
      await Promise.all(blobs.filter(x => x.key.split("/")[1] < old).slice(0, 300).map(x => store.delete(x.key)));
    }
    return J({ ok: true });
  }

  if (url.pathname === "/api/ping") {
    if (req.method !== "POST") return J({ ok: false }, 405);
    let b = {}; try { b = await req.json(); } catch (e) {}
    const sid = String(b.sid || "").replace(/[^a-z0-9]/gi, "").slice(0, 24);
    if (sid.length < 8) return J({ ok: false }, 400);
    const app = b.app ? 1 : 0;
    await Promise.all([
      store.set(`m/${m}/${sid}`, String(app)),
      store.set(`d/${day(now)}/${sid}`, "1"),
    ]);
    // 偶尔清理 15 分钟以前的在线记录
    if (Math.random() < 0.05) {
      const { blobs } = await store.list({ prefix: "m/" });
      await Promise.all(blobs.filter(x => +x.key.split("/")[1] < m - 15).slice(0, 300).map(x => store.delete(x.key)));
    }
    return J({ ok: true });
  }

  // /api/online
  const key = Netlify.env.get("ADMIN_KEY");
  if (!key) return J({ error: "还没在 Netlify 设置 ADMIN_KEY" }, 500);
  if (req.headers.get("x-admin-key") !== key) return J({ error: "密码不对" }, 403);
  const { blobs } = await store.list({ prefix: "m/" });
  const on = new Set(), on5 = new Set(), app = new Set();
  for (const x of blobs) {
    const [, mm, sid] = x.key.split("/");
    if (+mm >= m - 1) on.add(sid);          // 最近 2 分钟有心跳 = 在线
    if (+mm >= m - 4) on5.add(sid);
  }
  for (const x of blobs) { const [, mm, sid] = x.key.split("/"); if (+mm >= m - 1 && on.has(sid)) { const v = await store.get(x.key); if (v === "1") app.add(sid); } }
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = day(now - i * 86400e3);
    const r = await store.list({ prefix: `d/${d}/` });
    days.push({ d, uv: r.blobs.length });
  }
  const views = {};
  for (let i = 0; i < 7; i++) {
    const d = day(now - i * 86400e3);
    const r = await store.list({ prefix: `h/${d}/` });
    for (const x of r.blobs) { const v = x.key.split("/")[2]; views[v] = views[v] || [0, 0]; views[v][1]++; if (i === 0) views[v][0]++; }
  }
  return J({ now: bj(now).slice(11, 16), online: on.size, online5: on5.size, app: app.size, days, views });
};
