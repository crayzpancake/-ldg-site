// 今日实时微博：GET 读取；POST（带 x-write-key）写入。存 Netlify Blobs，不需要重新发布网站。
import { getStore } from "@netlify/blobs";
export const config = { path: "/api/today" };
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type,x-write-key" };
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS } });
export default async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const store = getStore({ name: "today", consistency: "strong" });
  if (req.method === "GET") return J((await store.get("day", { type: "json" })) || {});
  if (req.method === "POST") {
    const key = Netlify.env.get("LDG_WRITE_KEY");
    if (!key || req.headers.get("x-write-key") !== key) return J({ error: "写入密钥不对" }, 403);
    let d; try { d = await req.json(); } catch { return J({ error: "格式不对" }, 400); }
    if (!/^\d{4}-\d\d-\d\d$/.test(d.date || "") || !Array.isArray(d.posts)) return J({ error: "缺少 date 或 posts" }, 400);
    d.updated = new Date().toISOString();
    await store.setJSON("day", d);
    return J({ ok: true, date: d.date, count: d.posts.length });
  }
  return J({ error: "不支持" }, 405);
};
