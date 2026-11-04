export const config = { path: "/api/szdebug" };
export default async req => {
  const url = new URL(req.url);
  const cat = url.searchParams.get("c") || "1105", tab = url.searchParams.get("t") || "tab1", q = url.searchParams.get("q") || "";
  const u = `https://www.szse.cn/api/report/ShowReport/data?SHOWTYPE=JSON&CATALOGID=${cat}&TABKEY=${tab}&PAGENO=1${q}`;
  const r = await fetch(u, { headers: { referer: "https://www.szse.cn/", "user-agent": "Mozilla/5.0" } });
  const t = await r.text();
  return new Response(t.slice(0, 3000), { headers: { "content-type": "text/plain; charset=utf-8" } });
};
