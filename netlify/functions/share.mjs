// /d/YYYY-MM-DD：给微信/朋友圈等抓取用的单日分享页（带当天标题和要点），打开后自动跳到网站这一天
export const config = { path: "/d/:date" };
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plain = s => String(s ?? "").replace(/<[^>]+>/g, "").replace(/^［[^］]*］/, "");
export default async (req, context) => {
  const date = String(context.params?.date || "").slice(0, 10);
  const origin = new URL(req.url).origin;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `/#d${date.replace(/-/g, "")}` : "/";
  let title = "超级鹿鼎公微博汇总", desc = "每日整理他的微博要点、持仓变化和关键价位";
  try {
    const D = await fetch(`${origin}/data/${date}.json`).then(r => r.ok ? r.json() : null);
    if (D) {
      title = `鹿公微博汇总 · ${+date.slice(5, 7)}月${+date.slice(8, 10)}日：${plain(D.highlights?.[0]).split(/[，；。]/)[0].slice(0, 26)}`;
      desc = (D.highlights || []).slice(0, 3).map(plain).join("；").slice(0, 110);
    }
  } catch (e) {}
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${origin}/og.png"><meta property="og:url" content="${origin}/d/${esc(date)}">
<meta itemprop="name" content="${esc(title)}"><meta itemprop="description" content="${esc(desc)}"><meta itemprop="image" content="${origin}/og.png">
<meta http-equiv="refresh" content="0;url=${to}"></head><body><p><a href="${to}">${esc(title)}</a></p><script>location.replace(${JSON.stringify(to)})</script></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=600" } });
};
