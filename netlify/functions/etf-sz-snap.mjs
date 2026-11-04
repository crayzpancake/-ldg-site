// 每个交易日收盘后自动记录一次深交所 ETF 份额（北京时间 16:35、21:05 各一次，保险）
import { getStore } from "@netlify/blobs";
export const config = { schedule: "35 8,13 * * 1-5" };
const CODES = ["159919", "159915"];
export default async () => {
  const r = await fetch("https://qt.gtimg.cn/q=" + CODES.map(c => "sz" + c).join(","), { headers: { referer: "https://gu.qq.com/" } });
  const t = new TextDecoder("gbk").decode(await r.arrayBuffer());
  const store = getStore({ name: "etfsz", consistency: "strong" });
  const H = (await store.get("h", { type: "json" })) || {};
  for (const m of t.matchAll(/v_sz(\d{6})="([^"]*)"/g)) {
    const f = m[2].split("~"); const v = +f[73] || +f[72]; const ts = f[30] || "";
    if (v > 0 && ts.length >= 8) { const d = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`; H[d] = H[d] || {}; H[d][m[1]] = +(v / 1e8).toFixed(2); }
  }
  await store.setJSON("h", H);
  return new Response("ok");
};
