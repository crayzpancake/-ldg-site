// 留言板接口：GET 读取、POST 发表、DELETE 隐藏（需管理密码）
// 数据存在 Netlify Blobs（store: comments），不保存访客 IP，只保存 IP 的哈希用于防刷屏。
import { getStore } from "@netlify/blobs";

export const config = { path: "/api/comments" };

const MAX_LEN = 500, KEEP = 2000, GAP_MS = 20000;
const J = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const clean = s => String(s ?? "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim();
async function hash(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("ldg:" + s));
  return [...new Uint8Array(b)].slice(0, 8).map(x => x.toString(16).padStart(2, "0")).join("");
}

export default async (req, context) => {
  const store = getStore({ name: "comments", consistency: "strong" });
  const url = new URL(req.url);
  let list = (await store.get("list", { type: "json" })) || [];

  if (req.method === "GET") {
    const since = Number(url.searchParams.get("since") || 0);
    const items = list.filter(c => !c.hidden && c.ts > since).slice(-300)
      .map(({ id, n, ts, text, re, admin }) => ({ id, n, ts, text, re, ...(admin ? { admin: 1 } : {}) }));
    return J({ items, total: list.filter(c => !c.hidden).length });
  }

  if (req.method === "POST") {
    let b;
    try { b = await req.json(); } catch { return J({ error: "提交格式不对" }, 400); }
    if (b.website) return J({ ok: true });               // 机器人陷阱字段
    const text = clean(b.text);
    if (text.length < 2) return J({ error: "内容至少 2 个字" }, 400);
    if (text.length > MAX_LEN) return J({ error: `内容最多 ${MAX_LEN} 字` }, 400);
    if ((text.match(/https?:\/\//g) || []).length > 2) return J({ error: "链接太多了" }, 400);

    const now = Date.now();
    const akey = Netlify.env.get("ADMIN_KEY"), hk = req.headers.get("x-admin-key");
    if (hk && (!akey || hk !== akey)) return J({ error: "管理密码不对，请在「管理」里重新输入" }, 403);
    const admin = !!(akey && hk === akey);
    const who = await hash(context.ip || req.headers.get("x-nf-client-connection-ip") || "?");
    const rl = (await store.get("rl", { type: "json" })) || {};
    if (!admin && rl[who] && now - rl[who] < GAP_MS) return J({ error: "发得太快了，20 秒后再试" }, 429);
    for (const k in rl) if (now - rl[k] > 3600e3) delete rl[k];
    rl[who] = now;
    await store.setJSON("rl", rl);

    const re = Number(b.re) > 0 ? Math.floor(Number(b.re)) : 0;
    const n = (list.length ? (list[list.length - 1].n || list.length) : 0) + 1;   // 楼号
    const c = { id: now.toString(36) + Math.random().toString(36).slice(2, 6), n, ts: now, text, ...(re ? { re } : {}), ...(admin ? { admin: 1 } : {}), who };
    list.push(c);
    if (list.length > KEEP) list = list.slice(-KEEP);
    await store.setJSON("list", list);
    const { who: _, ...pub } = c;
    return J({ ok: true, item: pub });
  }

  if (req.method === "DELETE") {
    const key = Netlify.env.get("ADMIN_KEY");
    if (!key || req.headers.get("x-admin-key") !== key) return J({ error: "管理密码不对" }, 403);
    const id = url.searchParams.get("id");
    const c = list.find(x => x.id === id);
    if (!c) return J({ error: "找不到这条留言" }, 404);
    c.hidden = true;
    await store.setJSON("list", list);
    return J({ ok: true });
  }

  return J({ error: "不支持的请求" }, 405);
};
