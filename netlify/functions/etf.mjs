// ETF 份额（上交所每日公布的基金规模）：?date=YYYY-MM-DD&s=510300,510310
export const config = { path: "/api/etf" };
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=1800", "netlify-cdn-cache-control": "public, s-maxage=3600" } });
async function sse(date) {
  const u = `https://query.sse.com.cn/commonQuery.do?jsonCallBack=&isPagination=true&pageHelp.pageSize=2000&pageHelp.pageNo=1&pageHelp.beginPage=1&pageHelp.cacheSize=1&sqlId=COMMON_SSE_ZQPZ_ETFZL_XXPL_ETFGM_SEARCH_L&STAT_DATE=${date}`;
  const r = await fetch(u, { headers: { referer: "https://www.sse.com.cn/", "user-agent": "Mozilla/5.0" } });
  const t = await r.text();
  let j; try { j = JSON.parse(t.replace(/^[^{]*\(/, "").replace(/\)\s*$/, "")); } catch (e) { return { raw: t.slice(0, 300) }; }
  return { rows: (j.pageHelp && j.pageHelp.data) || j.result || [] };
}
async function range(days, want) {
  const ds = []; let t = Date.now() + 8 * 3600e3;
  while (ds.length < days) { const d = new Date(t); const w = d.getUTCDay(); if (w && w < 6) ds.push(d.toISOString().slice(0, 10)); t -= 864e5; }
  const res = await Promise.all(ds.map(d => sse(d).catch(() => ({ rows: [] }))));
  const out = [];
  res.forEach((r, i) => { const v = {}; (r.rows || []).forEach(x => { if (want.includes(x.SEC_CODE)) v[x.SEC_CODE] = +(+x.TOT_VOL / 1e4).toFixed(2); }); if (Object.keys(v).length) out.push({ d: ds[i], v }); });
  return out.reverse();
}
export default async req => {
  const url = new URL(req.url);
  if (url.searchParams.get("days")) {
    const want = (url.searchParams.get("s") || "").split(",").filter(x => /^\d{6}$/.test(x)).slice(0, 20);
    return J({ rows: await range(Math.min(45, +url.searchParams.get("days") || 30), want) });
  }
  const date = url.searchParams.get("date") || new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const want = (url.searchParams.get("s") || "").split(",").filter(x => /^\d{6}$/.test(x));
  const r = await sse(date);
  if (url.searchParams.get("debug")) return J({ date, n: (r.rows || []).length, sample: (r.rows || []).slice(0, 2), raw: r.raw });
  const out = {};
  (r.rows || []).forEach(x => { const c = x.SEC_CODE; if (!want.length || want.includes(c)) out[c] = { name: x.SEC_NAME, v: +(+x.TOT_VOL / 1e4).toFixed(2), date: x.STAT_DATE }; });   // 万份 → 亿份
  return J({ date, etf: out });
};
