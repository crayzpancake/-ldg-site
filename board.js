// 📈 数据看板：动力煤、ETF 份额、期货主力——都按天自动更新
(function () {
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const md = d => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
  const sg = (v, dg = 0) => v == null || isNaN(v) ? "—" : `<span class="${v > 0 ? "bd-up" : v < 0 ? "bd-dn" : ""}">${v > 0 ? "+" : ""}${(+v).toFixed(dg)}</span>`;
  const st = document.createElement("style");
  st.textContent = `
.bd-up{color:#d00}.bd-dn{color:#1a9a4a}
.bd-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:6px 0 10px}
.bd-c{background:var(--chip);border-radius:10px;padding:8px 10px}
.bd-c .l{font-size:12px;color:var(--mute)}
.bd-c .v{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}
.bd-c .v small{font-size:12px;font-weight:400;color:var(--mute);margin-left:2px}
.bd-c .s{font-size:12px;font-variant-numeric:tabular-nums}
.bd-t{width:100%;border-collapse:collapse;font-size:13.5px;margin-top:6px}
.bd-t th,.bd-t td{padding:5px 6px;border-bottom:1px solid var(--line);text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.bd-t th{font-size:12px;color:var(--mute);font-weight:400}
.bd-t td:first-child,.bd-t th:first-child{text-align:left}
.bd-sub{font-size:13px;font-weight:700;margin:12px 0 2px}
.ev-k{display:inline-block;font-size:11px;color:#fff;border-radius:999px;padding:0 6px;margin-right:4px}.ev-k.down{background:#1a9a4a}.ev-k.up{background:#d00}
.bd-t.ev td{white-space:normal;text-align:left;vertical-align:top}.bd-t.ev td:nth-child(3){white-space:nowrap}
@media (max-width:640px){.ev-d{display:none}}
.bd-src{font-size:11.5px;color:var(--mute);margin-top:4px}
`;
  document.head.appendChild(st);

  function bandChart(host, pts, ev) {
    const NS = "http://www.w3.org/2000/svg", W = Math.max(300, host.clientWidth), H = 230, m = { l: 44, r: 14, t: 26, b: 26 };
    const mk = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); (p || svg).appendChild(e); return e; };
    host.innerHTML = ""; const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", "100%"); svg.setAttribute("height", H); host.appendChild(svg);
    const t0 = Date.parse(pts[0].d), t1 = Date.parse(pts[pts.length - 1].d);
    const X = d => m.l + (W - m.l - m.r) * ((Date.parse(d) - t0) / ((t1 - t0) || 1));
    const ys = pts.map(p => p.y), lo = Math.floor(Math.min(...ys) / 100) * 100, hi = Math.ceil(Math.max(...ys) / 100) * 100;
    const Y = v => m.t + (H - m.t - m.b) * (1 - (v - lo) / ((hi - lo) || 1));
    const step = (hi - lo) / 4;
    for (let i = 0; i <= 4; i++) { const v = lo + step * i; mk("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: "var(--line)" }); const t = mk("text", { x: m.l - 6, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--mute)" }); t.textContent = Math.round(v); }
    ev.forEach((e, i) => { const x1 = Math.max(m.l, X(e.from)), x2 = Math.min(W - m.r, X(e.to)); if (x2 <= m.l || x1 >= W - m.r) return; mk("rect", { x: x1, y: m.t, width: Math.max(4, x2 - x1), height: H - m.t - m.b, fill: e.k === "down" ? "rgba(26,154,74,.16)" : "rgba(221,0,0,.13)" }); const t = mk("text", { x: (x1 + x2) / 2, y: m.t - 8 - (i % 2) * 0, "text-anchor": "middle", "font-size": 10.5, fill: e.k === "down" ? "#1a9a4a" : "#d00", "font-weight": 700 }); t.textContent = (e.k === "down" ? "▼" : "▲") + e.t.replace("10月底–11月初", "10–11月"); });
    [...new Set(pts.map(p => p.d.slice(0, 7)))].forEach((mo, i) => { const d = mo + "-01"; if (Date.parse(d) < t0 || i % 2) return; const t = mk("text", { x: X(d), y: H - 8, "text-anchor": "middle", "font-size": 11, fill: "var(--mute)" }); t.textContent = (+mo.slice(5) === 1 ? mo.slice(2, 4) + "/" : "") + (+mo.slice(5)) + "月"; });
    mk("path", { d: pts.map((p, i) => (i ? "L" : "M") + X(p.d).toFixed(1) + "," + Y(p.y).toFixed(1)).join(""), fill: "none", stroke: "#2f6fd6", "stroke-width": 2.2 });
    pts.forEach(p => { const c = mk("circle", { cx: X(p.d), cy: Y(p.y), r: 3.2, fill: "#2f6fd6" }); const tt = document.createElementNS(NS, "title"); tt.textContent = `${p.d}：${p.y} 亿份`; c.appendChild(tt); });
    const L = pts[pts.length - 1]; const lt = mk("text", { x: X(L.d) - 6, y: Y(L.y) - 8, "text-anchor": "end", "font-size": 12, "font-weight": 700, fill: "var(--ink)" }); lt.textContent = L.y;
  }
  const card = (l, v, unit, s) => `<div class="bd-c"><div class="l">${l}</div><div class="v">${v}<small>${unit || ""}</small></div><div class="s">${s || ""}</div></div>`;

  window.renderBoard = async function (main, IDX, cache) {
    const root = main.querySelector(".viz-root"); if (!root || main.querySelector("#bd")) return;
    let M = {}; try { M = await getJSON("data/market.json"); } catch (e) {}
    const wrap = document.createElement("div"); wrap.id = "bd";
    const tiles = root.querySelector(".tiles");
    (tiles || root.firstElementChild).after(wrap);

    // ---- 动力煤 ----
    const coal = {};
    Object.values(cache || {}).forEach(D => D && D.posts.forEach(p => {
      const t = String(p.x || "").replace(/<\/?b>/g, "");
      const m = t.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*CCI指数([\s\S]{0,120})/); if (!m) return;
      const d = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
      const g = k => { const r = m[4].match(new RegExp(k + "大卡\\s*(\\d{3,4})\\s*[（(]\\s*([+-]?\\d+)")); return r ? [+r[1], +r[2]] : [null, null]; };
      const a = g(5500), b = g(5000), c = g(4500);
      if (a[0]) coal[d] = { d, q5500: a[0], c5500: a[1], q5000: b[0], c5000: b[1], q4500: c[0], c4500: c[1], src: "他发的CCI" };
    }));
    // CCTD 现货：他帖子原文里带数（「CCTD环渤海动力煤现货参考价…5500K 1026 (+2)」），自动解析，不再靠截图手填；market.json 的 coal_snap 只作兜底
    Object.values(cache || {}).forEach(D => D && D.posts.forEach(p => {
      const t = (String(p.x || "") + " " + String(p.note || "") + " " + (D.highlights || []).join(" ")).replace(/<\/?b>/g, "");
      if (!/CCTD/.test(t)) return;
      const g = k => { const r = t.match(new RegExp(k + "[:：]?\\s*(\\d{3,4})\\s*[（(][^）)]*?([+-]\\d+)")); if (r) return [+r[1], +r[2]]; const r2 = t.match(new RegExp(k + "[:：]?\\s*(\\d{3,4})")); return r2 ? [+r2[1], null] : [null, null]; };
      const a = g("5500K"), b = g("5000K"), c = g("4500K");
      if (a[0] && !coal[D.date]) coal[D.date] = { d: D.date, q5500: a[0], c5500: a[1], q5000: b[0], c5000: b[1], q4500: c[0], c4500: c[1], src: "他发的CCTD" };
    }));
    if (M.coal_snap && !coal[M.coal_snap.d]) coal[M.coal_snap.d] = { ...M.coal_snap };
    const C = Object.values(coal).sort((a, b) => a.d.localeCompare(b.d));
    const L = C[C.length - 1], LT = M.coal_lt;
    const coalSec = document.createElement("section"); coalSec.className = "box";
    coalSec.innerHTML = `<h2>📈 数据看板 · 动力煤 <small>元/吨 · 每天随他发的 CCI 自动更新</small></h2>
      ${L ? `<div class="bd-cards">${card("5500大卡", L.q5500, "", `${sg(L.c5500)} · ${md(L.d)}`)}${card("5000大卡", L.q5000 ?? "—", "", `${sg(L.c5000)} · ${md(L.d)}`)}${card("4500大卡", L.q4500 ?? "—", "", `${sg(L.c4500)} · ${md(L.d)}`)}</div>` : ""}
      ${LT ? `<div class="bd-sub">年度长协（每月1日更新 · ${md(LT.d)}）</div><div class="bd-cards">${card("长协 5500", LT.q5500, "", sg(LT.c5500))}${card("长协 5000", LT.q5000, "", sg(LT.c5000))}${card("长协 4500", LT.q4500, "", sg(LT.c4500))}${L ? card("现货比长协（5500）", "+" + (L.q5500 - LT.q5500), "", `高 ${((L.q5500 / LT.q5500 - 1) * 100).toFixed(0)}%`) : ""}</div>` : ""}
      ${M.jjt ? `<div class="bd-sub">金鸡滩坑口价（${md(M.jjt.d)}）</div><div class="bd-cards">${M.jjt.items.map(x => card(x.n, x.v, "", sg(x.c))).join("")}</div>` : ""}
      <div class="bd-sub">5500大卡走势</div><div id="bd-cci"></div><div class="bd-src" style="margin-top:0">他的判断：这波煤价差不多见顶，但 <b>880 很难跌破</b>。</div>
      <details><summary style="font-size:13px;cursor:pointer;margin-top:6px">看最近 10 天</summary>      <table class="bd-t"><tr><th>日期</th><th>5500</th><th>涨跌</th><th>5000</th><th>4500</th></tr>${C.slice(-10).reverse().map(r => `<tr><td>${md(r.d)}</td><td>${r.q5500}</td><td>${sg(r.c5500)}</td><td>${r.q5000 ?? "—"}</td><td>${r.q4500 ?? "—"}</td></tr>`).join("")}</table></details>
      <div class="bd-src">日价来自他每天发的 CCI 指数，CCTD 现货来自他帖子原文（自动解析）；长协和金鸡滩价格来自他转发的数据截图${M.coal_lt ? "（" + esc(M.coal_lt.src) + "）" : ""}。</div>`;
    wrap.appendChild(coalSec);
    const cci = C.filter(r => r.q5500).map(r => ({ d: r.d, y: r.q5500, chg: r.c5500 }));
    if (cci.length > 2 && window.lineChart) window.lineChart(coalSec.querySelector("#bd-cci"), cci, { unit: "" });

    // ---- ETF 份额 ----
    const G = M.etf_groups || [];
    const etfSec = document.createElement("section"); etfSec.className = "box";
    etfSec.innerHTML = `<h2>ETF 份额 <small>亿份 · 上交所每日公布 · 份额增加多被看作资金流入</small></h2><div class="empty">读取中…</div>`;
    wrap.appendChild(etfSec);
    // ---- 期货 ----
    const F = M.futures || [];
    const futSec = document.createElement("section"); futSec.className = "box";
    futSec.innerHTML = `<h2>大宗商品期货 <small>主力合约日收盘</small></h2><div class="empty">读取中…</div>`;
    wrap.appendChild(futSec);

    (async () => {
      try {
        const codes = G.flatMap(g => g.codes.map(c => c[0])).join(",");
        const [jm, jd] = await Promise.all([fetch(`/api/etf?months=13&s=${codes}`).then(r => r.json()), fetch(`/api/etf?days=4&s=${codes}`).then(r => r.json()).catch(() => ({ rows: [] }))]);
        const R = jm.rows || []; if (!R.length) throw 0;
        const D = jd.rows || [];
        const last = D.length ? D[D.length - 1] : R[R.length - 1], prevD = D[D.length - 2] || null;
        const prevM = R.length >= 2 ? R[R.length - 2] : null, yearAgo = R[0];
        const lab = r => r.d === last.d ? `${md(r.d)}` : `${+r.ym.slice(2, 4)}/${+r.ym.slice(5)}`;
        etfSec.innerHTML = `<h2>ETF 份额 <small>亿份 · 最近一年按月底 · 最新 ${md(last.d)} · 只列国家队参与过的宽基</small></h2>` + G.map((g, gi) => {
          const tot = row => row ? g.codes.reduce((a, c) => a + ((row.v || {})[c[0]] || 0), 0) : null;
          const t0 = tot(last);
          return `<div class="bd-sub">${esc(g.name)} · 合计 ${t0.toFixed(2)} 亿份　较上一交易日 ${sg(prevD ? t0 - tot(prevD) : null, 2)}　较上月底 ${sg(prevM ? t0 - tot(prevM) : null, 2)}　较一年前 ${sg(t0 - tot(yearAgo), 2)}</div>
            <div class="bd-cards">${g.codes.map(([c, n]) => { const v = last.v[c]; if (v == null) return ""; const p = prevM && prevM.v[c], y = yearAgo.v[c], dd = prevD && prevD.v[c]; return card(`${esc(n)} · ${c}`, v.toFixed(2), "亿份", `日 ${sg(dd != null ? v - dd : null, 2)} · 月 ${sg(p != null ? v - p : null, 2)}<br>较一年前 ${y ? sg((v / y - 1) * 100, 0) + "%" : "—"}`); }).join("")}</div>
            <div id="bd-etf-${gi}"></div>
            <details><summary style="font-size:13px;cursor:pointer">看每月底份额表</summary><div style="overflow-x:auto"><table class="bd-t"><tr><th>月份</th>${g.codes.map(c => `<th>${esc(c[1])}</th>`).join("")}<th>合计</th><th>当月变化</th></tr>${R.slice().reverse().map((row, i, a) => { const t = tot(row), p = a[i + 1] ? tot(a[i + 1]) : null; return `<tr><td>${row === R[R.length - 1] && row.ym === last.d.slice(0, 7) ? md(row.d) + "（本月至今）" : row.ym.slice(2).replace("-", "年") + "月"}</td>${g.codes.map(c => `<td>${row.v[c[0]] != null ? row.v[c[0]].toFixed(2) : "—"}</td>`).join("")}<td>${t.toFixed(2)}</td><td>${sg(p != null ? t - p : null, 2)}</td></tr>`; }).join("")}</table></div></details>`;
        }).join("") + `<div class="bd-src">每月取月底最后一个交易日的份额，本月为最新一天；数据来自上交所 ETF 规模日报，每天自动更新。份额增加一般被看作资金流入。</div>`;
        G.forEach((g, gi) => { const host = etfSec.querySelector(`#bd-etf-${gi}`); const hc = g.codes.filter(c => !/^1/.test(c[0])); const T = hc.length ? R.map(row => ({ d: row.d, y: +hc.reduce((a, c) => a + (row.v[c[0]] || 0), 0).toFixed(1) })) : []; if (host && T.length > 2) bandChart(host, T, (M.etf_events || []).filter(e => (e.g || "沪深300 ETF") === g.name)); else if (host) host.innerHTML = `<div class="bd-src">深交所 ETF 没有公开的历史份额，本站从 11/5 起每天自动记一笔，走势图会慢慢长出来。</div>`; });
        G.forEach((g, gi) => { const EV = (M.etf_events || []).filter(e => (e.g || "沪深300 ETF") === g.name); if (!EV.length) return; const box = document.createElement("div"); box.innerHTML = `<div class="bd-sub">${esc(g.name)} 大额变动</div><table class="bd-t ev"><tr><th>时间</th><th>变动</th><th>份额变化</th><th class="ev-d">说明</th></tr>${EV.slice().reverse().map(e => `<tr><td>${md(e.from)}–${md(e.to)}</td><td><span class="ev-k ${e.k}">${e.k === "down" ? "减持" : "增持"}</span>${esc(e.t.replace(/减持|增持/, ""))}<br><small style="color:var(--mute)">${esc(e.who)}</small></td><td class="${e.k === "down" ? "bd-dn" : "bd-up"}">${esc(e.chg)}</td><td class="ev-d">${esc(e.detail)}</td></tr>`).join("")}</table>`; const host = etfSec.querySelector(`#bd-etf-${gi}`); if (host) host.after(box); });
        etfSec.insertAdjacentHTML("beforeend", `<div class="bd-src">“减持/增持”指ETF份额大幅减少/增加。国家队不公告每笔操作，减持方是媒体根据基金年报、季报里中央汇金的持仓和每日份额推算的；没有确认的写“待确认/未公开”。${esc(M.etf_note || "")}</div>`);
      } catch (e) { etfSec.innerHTML = `<h2>ETF 份额</h2><div class="empty">暂时读不到，稍后刷新</div>`; }
    })();
    (async () => {
      try {
        const r = await fetch(`/api/kline?s=${F.map(f => f[0]).join(",")}&n=30`); const j = await r.json(); const K = j.k || {};
        futSec.innerHTML = `<h2>大宗商品期货 <small>主力合约日收盘 · 自动更新</small></h2><table class="bd-t"><tr><th>品种</th><th>最新收盘</th><th>日涨跌</th><th>近20日</th><th>日期</th></tr>${F.map(([c, n, u]) => {
          const k = K[c] || []; if (!k.length) return `<tr><td>${esc(n)}</td><td colspan="4">—</td></tr>`;
          const a = k[k.length - 1], b = k[k.length - 2], c20 = k[Math.max(0, k.length - 21)];
          return `<tr><td>${esc(n)} <small style="color:var(--mute)">${esc(u)}</small></td><td>${a[1]}</td><td>${b ? sg((a[1] / b[1] - 1) * 100, 2) + "%" : "—"}</td><td>${c20 ? sg((a[1] / c20[1] - 1) * 100, 1) + "%" : "—"}</td><td>${md(a[0])}</td></tr>`;
        }).join("")}</table><div class="bd-src">上期所/广期所主力合约，和现货价格会有差别。</div>`;
      } catch (e) { futSec.innerHTML = `<h2>大宗商品期货</h2><div class="empty">暂时读不到，稍后刷新</div>`; }
    })();
  };
})();
