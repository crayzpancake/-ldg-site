// /rss.xml：最近 20 天的订阅源
export const config = { path: "/rss.xml" };
const x = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const plain = s => String(s ?? "").replace(/<[^>]+>/g, "");
export default async (req) => {
  const origin = new URL(req.url).origin;
  const I = await fetch(`${origin}/data/index.json`).then(r => r.json());
  const days = I.days.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  const items = await Promise.all(days.map(async d => {
    const D = await fetch(`${origin}/data/${d.date}.json`).then(r => r.ok ? r.json() : null).catch(() => null);
    if (!D) return "";
    const body = `<ol>${(D.highlights || []).map(h => `<li>${plain(h)}</li>`).join("")}</ol><p>收录 ${D.posts.length} 条投资相关微博，<a href="${origin}/d/${d.date}">打开网站看全部</a></p>`;
    return `<item><title>${x(`${+d.date.slice(5, 7)}月${+d.date.slice(8, 10)}日 ${d.weekday || ""}：${plain(D.highlights?.[0]).replace(/^［[^］]*］/, "").split(/[，；。]/)[0].slice(0, 30)}`)}</title><link>${origin}/d/${d.date}</link><guid isPermaLink="false">ldg-${d.date}</guid><pubDate>${new Date(d.date + "T23:30:00+08:00").toUTCString()}</pubDate><description>${x(body)}</description></item>`;
  }));
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>超级鹿鼎公微博汇总</title><link>${origin}/</link><description>每日整理 @挖地瓜的超级鹿鼎公 的投资相关微博（读者整理，非本人运营）</description><language>zh-cn</language>${items.join("")}</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=1800" } });
};
