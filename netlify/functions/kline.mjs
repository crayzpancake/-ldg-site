// 日K线：A股用腾讯（不复权，便于和他当时说的价位比），期货（铜 CU0、黄金 AU0）用新浪
export const config = { path: "/api/kline" };
const J = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300",
    "netlify-cdn-cache-control": "public, s-maxage=600, stale-while-revalidate=1200" },
});
const OK = /^(sh|sz)\d{6}$|^nf_[A-Z]{1,3}0$/;

async function stock(code, n) {
  const r = await fetch(`https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${code},day,,,${n},`, { headers: { referer: "https://gu.qq.com/" } });
  const j = await r.json();
  const d = j?.data?.[code];
  const rows = d?.day || d?.qfqday || [];
  return rows.map(x => [x[0], +x[2], +x[3], +x[4]]);          // [日期, 收盘, 最高, 最低]
}
async function fut(code, n) {
  const sym = code.slice(3);
  const r = await fetch(`https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_${sym}=/InnerFuturesNewService.getDailyKLine?symbol=${sym}`, { headers: { referer: "https://finance.sina.com.cn/" } });
  const t = await r.text();
  const a = JSON.parse(t.slice(t.indexOf("(") + 1, t.lastIndexOf(")")));
  return a.slice(-n).map(x => [x.d, +x.c, +x.h, +x.l]);
}

export default async req => {
  const url = new URL(req.url);
  const n = Math.min(400, Math.max(10, +url.searchParams.get("n") || 120));
  const codes = [...new Set((url.searchParams.get("s") || "").split(",").filter(c => OK.test(c)))].slice(0, 12);
  if (!codes.length) return J({ error: "缺少代码" }, 400);
  const k = {}, err = {};
  await Promise.all(codes.map(c => (c.startsWith("nf_") ? fut(c, n) : stock(c, n)).then(v => { k[c] = v; }).catch(e => { err[c] = String(e); })));
  return J({ k, err });
};
