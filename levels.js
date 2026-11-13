// 🎯 离操作价还差多少：把博主说过的建仓/加仓/减仓价位和实时价格对比
(function () {
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rich = s => esc(s).replace(/&lt;(\/?)b&gt;/g, "<$1b>");
  const link = b => `https://weibo.com/3962719063/${b}`;
  let timer = null, Q = {}, at = 0, fail = false;

  const css = `
.lv-box h2 small .lv-live{display:inline-block;width:7px;height:7px;border-radius:50%;background:#2fb344;margin-right:4px;vertical-align:1px}
.lv-box h2 small .lv-live.off{background:#bbb}
.lv-grid{display:grid;gap:10px}
.lv-card{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--card)}
.lv-top{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.lv-name{font-weight:700;font-size:16px}
.lv-code{font-size:12px;color:var(--mute)}
.lv-sp{flex:1}
.lv-px{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}
.lv-chg{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.lv-up{color:#d00}.lv-dn{color:#1a9a4a}
.lv-t{font-size:11px;color:var(--mute);width:100%;text-align:right;margin-top:-2px}
.lv-rule{position:relative;height:34px;margin:10px 4px 4px}
.lv-rule .ln{position:absolute;left:0;right:0;top:16px;height:2px;background:var(--line)}
.lv-rule .lm{position:absolute;top:8px;width:2px;height:18px;margin-left:-1px;border-radius:1px}
.lv-rule .lm.buy{background:#1a9a4a}.lv-rule .lm.sell{background:#d00}
.lv-rule .lm span{position:absolute;top:-15px;left:50%;transform:translateX(-50%);font-size:10.5px;white-space:nowrap;color:var(--mute);font-variant-numeric:tabular-nums}
.lv-rule .lm.buy span{color:#1a9a4a}.lv-rule .lm.sell span{color:#d00}
.lv-rule .lnow{position:absolute;top:10px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:var(--ink);border:2px solid var(--card);box-shadow:0 0 0 1px var(--ink)}
.lv-rule .lnow span{position:absolute;top:17px;left:50%;transform:translateX(-50%);font-size:10.5px;font-weight:700;white-space:nowrap}
.lv-rows{margin-top:14px;display:grid;gap:6px}
.lv-row{display:grid;grid-template-columns:auto 1fr auto;gap:4px 10px;align-items:center;font-size:14px;padding:6px 8px;border-radius:8px;background:var(--chip)}
.lv-row .tag{font-size:12px;font-weight:700;padding:1px 7px;border-radius:999px;color:#fff;white-space:nowrap}
.lv-row .tag.buy{background:#1a9a4a}.lv-row .tag.sell{background:#d00}
.lv-row .p{font-variant-numeric:tabular-nums}
.lv-row .p small{color:var(--mute);margin-left:6px}
.lv-row .gap{font-weight:700;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.lv-row.hit .gap{color:var(--mute);font-weight:600}
.lv-row .bar{grid-column:1/-1;height:5px;border-radius:3px;background:var(--line);overflow:hidden}
.lv-row .bar i{display:block;height:100%;border-radius:3px}
.lv-row.buyr .bar i{background:#1a9a4a}.lv-row.sellr .bar i{background:#d00}
.lv-cond{margin-top:8px;font-size:13px;padding:6px 8px;border-radius:8px;background:var(--chip)}
.lv-src{margin-top:6px;font-size:12px;color:var(--mute)}
.lv-src a{color:var(--mute)}
.lv-note{font-size:12px;color:var(--mute);margin-top:8px}
.lv-hits{margin:0 0 10px;padding:9px 12px;border-radius:10px;background:var(--soft);border:1px solid var(--red);font-size:13.5px;line-height:1.6}.lv-hits b{color:var(--red)}
@media (min-width:700px){.lv-grid{grid-template-columns:1fr 1fr}}
`;
  function addCss() {
    if (document.getElementById("lv-css")) return;
    const s = document.createElement("style"); s.id = "lv-css"; s.textContent = css; document.head.appendChild(s);
  }
  const f2 = (v, u) => (u === "元/克" ? v.toFixed(2) : v.toFixed(2));

  function cardHTML(L) {
    const q = Q[L.code];
    const px = q && q.px > 0 ? q.px : null;
    const chg = q ? q.chg : null;
    const lv = L.lv || [];
    let rule = "", rows = "";
    if (lv.length) {
      const vals = lv.map(x => x.p).concat(px ? [px] : []);
      const lo = Math.min(...vals) * 0.94, hi = Math.max(...vals) * 1.04;
      const pos = v => ((v - lo) / (hi - lo) * 100).toFixed(1);
      rule = `<div class="lv-rule"><div class="ln"></div>${lv.map(x => `<div class="lm ${x.k}" style="left:${pos(x.p)}%"><span>${esc(x.txt || x.p)}</span></div>`).join("")}${px ? `<div class="lnow" style="left:${pos(px)}%"><span>现价 ${f2(px, L.unit)}</span></div>` : ""}</div>`;
      rows = `<div class="lv-rows">${lv.map(x => {
        let gap = "—", hit = false, w = 0;
        if (px) {
          const d = (x.p / px - 1) * 100;            // 负数=要跌，正数=要涨
          hit = x.k === "buy" ? px <= x.p : px >= x.p;
          gap = hit ? (x.k === "buy" ? "现价已在其下" : "现价已在其上") : (d < 0 ? `离这还有 ${Math.abs(d).toFixed(1)}%` : `离这还有 ${d.toFixed(1)}%`);
          w = hit ? 100 : Math.max(3, 100 - Math.min(100, Math.abs(d) * 2.5));   // 离得越近条越满（差 40% 以上算空）
          gap += hit ? "" : `<br><small style="font-weight:400;color:var(--mute)">差 ${Math.abs(x.p - px).toFixed(2)}${L.unit === "元/克" ? " 元/克" : " 元"}</small>`;
        }
        return `<div class="lv-row ${x.k}r${hit ? " hit" : ""}"><span class="tag ${x.k}">${esc(x.a)}</span><span class="p">${esc(x.txt || x.p)}${L.unit === "元/克" ? " 元/克" : " 元"}<small>${esc(x.n || "")}</small></span><span class="gap">${gap}</span><div class="bar"><i style="width:${w}%"></i></div></div>`;
      }).join("")}</div>`;
    }
    const cond = L.cond ? `<div class="lv-cond">📋 ${rich(L.cond)}</div>` : "";
    return `<div class="lv-card">
      <div class="lv-top"><span class="lv-name">${esc(L.name)}</span><span class="lv-code">${esc(L.disp || "")}</span><span class="lv-sp"></span>
        <span class="lv-px">${px ? f2(px, L.unit) : "—"}</span>${chg != null && px ? `<span class="lv-chg ${chg >= 0 ? "lv-up" : "lv-dn"}">${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%</span>` : ""}
        ${q && q.t ? `<span class="lv-t">${esc(q.t)}</span>` : ""}</div>
      ${rule}${rows}${cond}
      <div class="lv-src">${rich(L.x || "")} · ${esc((L.d || "").slice(5).replace("-", "/"))} <a href="${link(L.b)}" target="_blank" rel="noopener">原文</a>${L.tip ? ` · ${esc(L.tip)}` : ""}</div>
    </div>`;
  }

  function paint(el, IDX) {
    const L = IDX.levels || [];
    const hitList = [];
    L.forEach(x => (x.lv || []).forEach(v => { const q = Q[x.code]; if (q && q.px > 0 && (v.k === "buy" ? q.px <= v.p : q.px >= v.p)) hitList.push({ name: x.name, a: v.a, p: v.p, unit: x.unit, px: q.px, k: v.k }); }));
    const hits = hitList.length;
    const hitBar = hits ? `<div class="lv-hits">🔔 <b>已到他提过的价位（${hits} 个）</b>：${hitList.map(h => `${esc(h.name)}「${esc(h.a)} ${h.p}${h.unit === "元/克" ? " 元/克" : " 元"}」，现价 ${f2(h.px, h.unit)} 已${h.k === "buy" ? "在其下" : "在其上"}`).join("；")}</div>` : "";
    const t = at ? new Date(at) : null;
    el.innerHTML = `<section class="box lv-box"><h2>📌 他提过的价位 · 现价离多远 <small><span class="lv-live${fail ? " off" : ""}"></span>${fail ? "行情暂时连不上" : (t ? `实时 · ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}:${String(t.getSeconds()).padStart(2, "0")} 更新` : "读取行情…")}</small></h2>
      ${hitBar}<div class="lv-grid">${L.map(cardHTML).join("")}</div>
      <div class="lv-note">绿色 = 他提过的买入/加仓相关价位，红色 = 他提过的目标价；百分比是现价离该价位的距离，条越满离得越近。这些是他在不同时间、不同前提下随口提到的参考位，不是操作信号，他也可能随时改变想法。股价每 15 秒刷新（A股交易时段实时，收盘后为收盘价）；黄金用上期所黄金主力合约近似人民币金价。只整理公开发言，不构成投资建议，请勿据此去打扰博主本人。</div>
    </section>`;
  }

  async function pull(el, IDX) {
    if (!document.body.contains(el)) { clearInterval(timer); timer = null; return; }
    const codes = (IDX.levels || []).map(x => x.code).filter(Boolean);
    try {
      const r = await fetch("/api/quote?s=" + codes.join(","), { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      Object.assign(Q, j.q || {}); at = Date.now(); fail = !Object.keys(j.q || {}).length;
    } catch (e) { fail = true; }
    paint(el, IDX);
  }

  window.renderLevels = function (el, IDX) {
    if (!el || !(IDX.levels || []).length) return;
    addCss(); paint(el, IDX); pull(el, IDX);
    clearInterval(timer);
    timer = setInterval(() => { if (!document.hidden) pull(el, IDX); }, 15000);
  };
})();
