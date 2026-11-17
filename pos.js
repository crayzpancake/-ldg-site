// 🎯 本月仓位变化（推测）：顶部一条速览 + 详情页
(function () {
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const wl = b => `https://weibo.com/3962719063/${b}`;
  const md = d => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
  const TAG = {
    add: ["🟢▲", "加仓", "#1a9a4a"], cut: ["🔴▼", "减仓", "#d00"], swing: ["🔄", "波段", "#2f6fd6"],
    new: ["🆕", "新建仓", "#1a9a4a"], clear: ["❌", "清仓", "#888"], note: ["💬", "说明", "#999"], hold: ["⏸", "未动", "#999"]
  };
  const css = document.createElement("style");
  css.textContent = `
.posbar{margin:0 0 8px;padding:8px 12px;border-radius:12px;border:2px solid var(--red,#d00);background:var(--card,#fff);cursor:pointer}
.posbar .pt{font-weight:800;font-size:15px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.posbar .pt small{font-weight:400;color:var(--mute);font-size:12px}
.posbar .pt .go{margin-left:auto;color:var(--red,#d00);font-size:13px;font-weight:700}
.posbar .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.pchip{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:3px 10px;font-size:13.5px;font-weight:600;background:var(--chip,#f3f0ea);white-space:nowrap}
.pchip i{font-style:normal;font-weight:400;font-size:12px;opacity:.8}
.pos-t{width:100%;border-collapse:collapse;font-size:14px}
.pos-t td{border-top:1px solid var(--line,#eee);padding:9px 6px;vertical-align:top}
.pos-t .nm{font-weight:800;white-space:nowrap}.pos-t .nm small{display:block;font-weight:400;color:var(--mute);font-size:12px}
.pos-t .st{white-space:nowrap;font-weight:800}
.pos-ev{margin:2px 0;line-height:1.55}.pos-ev .d{color:var(--mute);font-size:12px;margin-right:4px}
.pos-cash{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0}.pos-cash div{background:var(--chip,#f3f0ea);border-radius:10px;padding:8px 12px}
.pos-cash b{font-size:22px;color:var(--red,#d00)}
.pos-leg{font-size:12.5px;color:var(--mute);margin:6px 0}
.pos-warn{background:#fff6e5;border:1px solid #f3d9a4;border-radius:10px;padding:8px 10px;font-size:13px;margin:6px 0}
@media (prefers-color-scheme:dark){.pos-warn{background:#3a2f1a;border-color:#5a4520}}`;
  document.head.appendChild(css);
  let P = null;
  const load = async () => P || (P = await fetch("data/pos.json?v=" + Date.now()).then(r => r.json()).catch(() => null));
  const chip = it => { const t = TAG[it.st] || TAG.hold; return `<span class="pchip" style="color:${t[2]}">${t[0]} ${esc(it.n)}<i>${esc(it.now || t[1])}</i></span>`; };

  window.renderPosBar = async function () {
    const h = document.querySelector("header"); if (!h || h.querySelector(".posbar")) return;
    const p = await load(); if (!p) return;
    const el = document.createElement("div"); el.className = "posbar";
    el.innerHTML = `<div class="pt">🎯 他${+p.ym.slice(5)}月的仓位变化 <small>据他发言推测 · 更新到 ${md(p.asof)}</small><span class="go">看详情 ›</span></div>
      <div class="chips">${p.items.map(chip).join("")}${p.cash ? `<span class="pchip" style="color:#b8860b">💰 仙晶 ${p.cash.v}万<i>${md(p.cash.d)} 他公布</i></span>` : ""}</div>`;
    el.onclick = () => { window.__go && window.__go("pos"); document.getElementById("tabs")?.scrollIntoView({ behavior: "smooth" }); };
    const m = h.querySelector(".motto"); m ? m.after(el) : h.prepend(el);
  };

  window.renderPos = async function (m) {
    m.innerHTML = `<div class="empty">读取中…</div>`;
    const p = await load(); if (!p) { m.innerHTML = `<div class="empty">读取失败，请刷新</div>`; return; }
    const rows = p.items.map(it => {
      const t = TAG[it.st] || TAG.hold;
      return `<tr><td class="nm">${esc(it.n)}<small>${esc(it.cat || "")}</small></td>
        <td class="st" style="color:${t[2]}">${t[0]} ${t[1]}<div style="font-weight:400;font-size:12px;color:var(--mute)">把握度：${esc(it.sure || "—")}</div></td>
        <td><div style="font-size:12.5px;color:var(--mute)">月初：${esc(it.base || "—")} → 现在：<b style="color:var(--ink,#222)">${esc(it.now || "")}</b></div>
        ${it.ev.map(e => { const k = TAG[e.a] || TAG.note; return `<div class="pos-ev"><span class="d">${md(e.d)}</span><span style="color:${k[2]}">${k[0]}</span> “${esc(e.x)}” <a href="${wl(e.b)}" target="_blank" rel="noopener">原文</a></div>`; }).join("")}</td></tr>`;
    }).join("");
    m.innerHTML = `<section class="box"><h2>🎯 他${+p.ym.slice(5)}月的仓位变化 <small>更新到 ${md(p.asof)} · 每晚随微博一起更新</small></h2>
      <div class="pos-warn">⚠️ 9月以后他不再晒真实持仓截图，这里是<b>根据他公开说过的话推测</b>的，不是真实持仓；他没明说的买卖不会出现在这里。仅供了解，<b>不构成投资建议</b>，请勿据此照抄。</div>
      ${p.cash ? `<div class="pos-cash"><div>💰 游戏仓仙晶（现金）<br><b>${p.cash.v}万</b> <a href="${wl(p.cash.b)}" target="_blank" rel="noopener">原文</a><br><small style="color:var(--mute)">${md(p.cash.d)} 他本人公布 · ${esc(p.cash.prevNote || "")}</small></div></div>` : ""}
      ${p.note ? `<div class="cap" style="margin:4px 0 8px">${esc(p.note)}</div>` : ""}
      <div class="pos-leg">图例：🟢▲加仓　🔴▼减仓　🔄波段（减了又买回）　🆕新建仓　❌清仓</div>
      <table class="pos-t">${rows}</table>
      ${p.hold && p.hold.length ? `<h3 style="margin:14px 0 4px;font-size:15px">⏸ 本月没说过买卖的（按10月底推测持有）</h3><div class="chips" style="display:flex;flex-wrap:wrap;gap:6px">${p.hold.map(n => `<span class="pchip" style="color:var(--mute)">${esc(n)}</span>`).join("")}</div><div class="cap" style="margin-top:6px">${esc(p.holdNote || "")}</div>` : ""}
      <div class="cap" style="margin-top:10px">起点：${esc(p.base)}。每月1号会出一张完整的月底持仓推测图，作为下个月的新起点。</div></section>`;
  };
})();
