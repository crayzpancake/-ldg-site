// ETF 份额：上交所每日规模（有历史）+ 深交所 ETF 用腾讯行情的总份额每天记一笔（存 Netlify Blobs）
import { getStore } from "@netlify/blobs";
export const config = { path: "/api/etf" };
const J = (o, s = 200, cache = 1800) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${Math.min(cache, 1800)}`, "netlify-cdn-cache-control": `public, s-maxage=${cache}, stale-while-revalidate=86400` } });
const isSZ = c => /^1\d{5}$/.test(c);           // 15xxxx/16xxxx 深交所
async function sse(date) {
  const u = `https://query.sse.com.cn/commonQuery.do?jsonCallBack=&isPagination=true&pageHelp.pageSize=2000&pageHelp.pageNo=1&pageHelp.beginPage=1&pageHelp.cacheSize=1&sqlId=COMMON_SSE_ZQPZ_ETFZL_XXPL_ETFGM_SEARCH_L&STAT_DATE=${date}`;
  const r = await fetch(u, { headers: { referer: "https://www.sse.com.cn/", "user-agent": "Mozilla/5.0" } });
  const t = await r.text();
  let j; try { j = JSON.parse(t.replace(/^[^{]*\(/, "").replace(/\)\s*$/, "")); } catch (e) { return { raw: t.slice(0, 300) }; }
  return { rows: (j.pageHelp && j.pageHelp.data) || j.result || [] };
}
// 深交所：腾讯行情第 73 字段 = 总份额（份）
async function szNow(codes) {
  if (!codes.length) return {};
  const r = await fetch("https://qt.gtimg.cn/q=" + codes.map(c => "sz" + c).join(","), { headers: { referer: "https://gu.qq.com/" } });
  const t = new TextDecoder("gbk").decode(await r.arrayBuffer()), out = {};
  for (const m of t.matchAll(/v_sz(\d{6})="([^"]*)"/g)) {
    const f = m[2].split("~"); const v = +f[73] || +f[72]; const ts = f[30] || "";
    if (v > 0 && ts.length >= 8) out[m[1]] = { d: `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`, v: +(v / 1e8).toFixed(2) };
  }
  return out;
}
async function szHistory(codes) {
  const store = getStore({ name: "etfsz", consistency: "strong" });
  let H = (await store.get("h", { type: "json" })) || {};        // {date:{code:v}}
  try {
    const now = await szNow(codes); let changed = false;
    for (const c in now) { const { d, v } = now[c]; H[d] = H[d] || {}; if (H[d][c] !== v) { H[d][c] = v; changed = true; } }
    if (changed) await store.setJSON("h", H);
  } catch (e) {}
  return H;
}
function weekdays(n, to) {
  const ds = []; let t = to ? Date.parse(to + "T12:00:00Z") : Date.now() + 8 * 3600e3;
  while (ds.length < n) { const d = new Date(t); const w = d.getUTCDay(); if (w && w < 6) ds.push(d.toISOString().slice(0, 10)); t -= 864e5; }
  return ds;
}
const pick = (rows, want) => { const v = {}; (rows || []).forEach(x => { if (want.includes(x.SEC_CODE)) v[x.SEC_CODE] = +(+x.TOT_VOL / 1e4).toFixed(2); }); return v; };
async function range(days, sh, sz, to) {
  const ds = weekdays(days, to);
  const [res, H] = await Promise.all([Promise.all(ds.map(d => sh.length ? sse(d).catch(() => ({ rows: [] })) : { rows: [] })), sz.length ? szHistory(sz) : {}]);
  const out = [];
  res.forEach((r, i) => { const v = pick(r.rows, sh); sz.forEach(c => { if (H[ds[i]] && H[ds[i]][c] != null) v[c] = H[ds[i]][c]; }); if (Object.keys(v).length) out.push({ d: ds[i], v }); });
  return out.reverse();
}
async function monthly(n, sh, sz) {
  const now = new Date(Date.now() + 8 * 3600e3);
  const H = sz.length ? await szHistory(sz) : {};
  const jobs = [];
  for (let i = 0; i < n; i++) {
    const y = now.getUTCFullYear(), m = now.getUTCMonth() - i;
    const end = i === 0 ? now : new Date(Date.UTC(y, m + 1, 0));
    jobs.push((async () => {
      let t = end.getTime();
      for (let k = 0; k < 8; k++, t -= 864e5) {
        const d = new Date(t); const w = d.getUTCDay(); if (!w || w === 6) continue;
        const ds = d.toISOString().slice(0, 10);
        const r = sh.length ? await sse(ds).catch(() => ({ rows: [] })) : { rows: [] };
        const v = pick(r.rows, sh);
        if (Object.keys(v).length || !sh.length) {
          // 深交所：取该月内最近一次记录
          sz.forEach(c => { const dd = Object.keys(H).filter(x => (i === 0 || x <= ds) && x.slice(0, 7) === ds.slice(0, 7) && H[x][c] != null).sort().pop(); if (dd) v[c] = H[dd][c]; });
          if (Object.keys(v).length) return { d: ds, ym: ds.slice(0, 7), v };
        }
      }
      return null;
    })());
  }
  return (await Promise.all(jobs)).filter(Boolean).reverse();
}
export default async req => {
  const url = new URL(req.url);
  const want = (url.searchParams.get("s") || "").split(",").filter(x => /^\d{6}$/.test(x)).slice(0, 30);
  const sh = want.filter(c => !isSZ(c)), sz = want.filter(isSZ);
  if (url.searchParams.get("months")) return J({ rows: await monthly(Math.min(13, +url.searchParams.get("months") || 12), sh, sz) }, 200, 10800);
  if (url.searchParams.get("days")) return J({ rows: await range(Math.min(45, +url.searchParams.get("days") || 30), sh, sz, url.searchParams.get("to")) });
  const date = url.searchParams.get("date") || new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const r = await sse(date);
  if (url.searchParams.get("debug")) return J({ date, n: (r.rows || []).length, sample: (r.rows || []).slice(0, 2), raw: r.raw, sz: await szNow(sz) });
  const out = {};
  (r.rows || []).forEach(x => { const c = x.SEC_CODE; if (!sh.length || sh.includes(c)) out[c] = { name: x.SEC_NAME, v: +(+x.TOT_VOL / 1e4).toFixed(2), date: x.STAT_DATE }; });
  return J({ date, etf: out });
};
