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
.bd-src{font-size:11.5px;color:var(--mute);margin-top:4px}
`;
  document.head.appendChild(st);

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
      <div class="bd-src">日价来自他每天发的 CCI 指数；长协和金鸡滩价格来自他转发的数据截图${M.coal_lt ? "（" + esc(M.coal_lt.src) + "）" : ""}。</div>`;
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
        etfSec.innerHTML = `<h2>ETF 份额 <small>亿份 · 最近一年按月底 · 最新 ${md(last.d)}</small></h2>` + G.map((g, gi) => {
          const tot = row => row ? g.codes.reduce((a, c) => a + ((row.v || {})[c[0]] || 0), 0) : null;
          const t0 = tot(last);
          return `<div class="bd-sub">${esc(g.name)} · 合计 ${t0.toFixed(2)} 亿份　较上一交易日 ${sg(prevD ? t0 - tot(prevD) : null, 2)}　较上月底 ${sg(prevM ? t0 - tot(prevM) : null, 2)}　较一年前 ${sg(t0 - tot(yearAgo), 2)}</div>
            <div class="bd-cards">${g.codes.map(([c, n]) => { const v = last.v[c]; if (v == null) return ""; const p = prevM && prevM.v[c], y = yearAgo.v[c], dd = prevD && prevD.v[c]; return card(`${esc(n)} · ${c}`, v.toFixed(2), "亿份", `日 ${sg(dd != null ? v - dd : null, 2)} · 月 ${sg(p != null ? v - p : null, 2)}<br>较一年前 ${y ? sg((v / y - 1) * 100, 0) + "%" : "—"}`); }).join("")}</div>
            <div id="bd-etf-${gi}"></div>
            <details><summary style="font-size:13px;cursor:pointer">看每月底份额表</summary><div style="overflow-x:auto"><table class="bd-t"><tr><th>月份</th>${g.codes.map(c => `<th>${esc(c[1])}</th>`).join("")}<th>合计</th><th>当月变化</th></tr>${R.slice().reverse().map((row, i, a) => { const t = tot(row), p = a[i + 1] ? tot(a[i + 1]) : null; return `<tr><td>${row === R[R.length - 1] && row.ym === last.d.slice(0, 7) ? md(row.d) + "（本月至今）" : row.ym.slice(2).replace("-", "年") + "月"}</td>${g.codes.map(c => `<td>${row.v[c[0]] != null ? row.v[c[0]].toFixed(2) : "—"}</td>`).join("")}<td>${t.toFixed(2)}</td><td>${sg(p != null ? t - p : null, 2)}</td></tr>`; }).join("")}</table></div></details>`;
        }).join("") + `<div class="bd-src">每月取月底最后一个交易日的份额，本月为最新一天；数据来自上交所 ETF 规模日报，每天自动更新。份额增加一般被看作资金流入。</div>`;
        G.forEach((g, gi) => { const host = etfSec.querySelector(`#bd-etf-${gi}`); const T = R.map(row => ({ d: row.d, y: +g.codes.reduce((a, c) => a + (row.v[c[0]] || 0), 0).toFixed(1) })); if (host && T.length > 2 && window.lineChart) window.lineChart(host, T, { unit: "" }); });
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
