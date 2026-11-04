// 实时行情代理：A股/港股用腾讯行情（qt.gtimg.cn），黄金用新浪期货行情（上期所黄金主力 nf_AU0，元/克）
export const config = { path: "/api/quote" };

const J = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=10",
    "netlify-cdn-cache-control": "public, s-maxage=10, stale-while-revalidate=20",
  },
});
const gbk = async r => new TextDecoder("gbk").decode(await r.arrayBuffer());
const OK = /^(sh|sz|hk)\w{4,6}$|^nf_[A-Z]{1,3}\d$/;

async function tencent(codes) {
  if (!codes.length) return {};
  const r = await fetch("https://qt.gtimg.cn/q=" + codes.join(","), { headers: { referer: "https://gu.qq.com/" } });
  const t = await gbk(r), out = {};
  for (const m of t.matchAll(/v_(\w+)="([^"]*)"/g)) {
    const f = m[2].split("~");
    if (f.length < 33) continue;
    const ts = f[30] || "";
    out[m[1]] = { name: f[1], px: +f[3], prev: +f[4], chg: +f[32],
      t: ts.length >= 12 ? `${ts.slice(4, 6)}/${ts.slice(6, 8)} ${ts.slice(8, 10)}:${ts.slice(10, 12)}` : ts };
  }
  return out;
}
async function sina(codes) {
  if (!codes.length) return {};
  const r = await fetch("https://hq.sinajs.cn/list=" + codes.join(","), { headers: { referer: "https://finance.sina.com.cn/" } });
  const t = await gbk(r), out = {};
  for (const m of t.matchAll(/hq_str_(\w+)="([^"]*)"/g)) {
    const f = m[2].split(",");
    if (f.length < 11) continue;
    const px = +f[8], prev = +f[10] || +f[5];
    const hhmmss = f[1] || "";
    out[m[1]] = { name: f[0], px, prev, chg: prev ? +((px / prev - 1) * 100).toFixed(2) : 0,
      t: (f[17] ? f[17].slice(5).replace("-", "/") + " " : "") + (hhmmss.length === 6 ? hhmmss.slice(0, 2) + ":" + hhmmss.slice(2, 4) : "") };
  }
  return out;
}

export default async req => {
  const url = new URL(req.url);
  const codes = [...new Set((url.searchParams.get("s") || "").split(",").map(s => s.trim()).filter(s => OK.test(s)))].slice(0, 30);
  if (!codes.length) return J({ error: "缺少代码" }, 400);
  const tx = codes.filter(c => !c.startsWith("nf_")), sn = codes.filter(c => c.startsWith("nf_"));
  const res = {}, err = {};
  await Promise.all([
    tencent(tx).then(o => Object.assign(res, o)).catch(e => { err.tencent = String(e); }),
    sina(sn).then(o => Object.assign(res, o)).catch(e => { err.sina = String(e); }),
  ]);
  if (url.searchParams.get("debug") === "1") {
    const raw = {};
    try { raw.tx = (await gbk(await fetch("https://qt.gtimg.cn/q=" + tx.slice(0, 2).join(",")))).slice(0, 600); } catch (e) { raw.tx = String(e); }
    try { raw.sn = (await gbk(await fetch("https://hq.sinajs.cn/list=" + sn.join(","), { headers: { referer: "https://finance.sina.com.cn/" } }))).slice(0, 600); } catch (e) { raw.sn = String(e); }
    return J({ q: res, err, raw });
  }
  return J({ q: res, err, at: Date.now() });
};
