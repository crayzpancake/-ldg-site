// 🎯 实时仓位预测（推测）：顶部一条速览 + 详情页
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
.mk-t td.mm{text-align:center;font-weight:700}.mk-t tr.mk-chg td{background:#fffbe6}.mk-t tr.mk-gone td{color:#999!important;text-decoration:line-through}.mk-t tr.mk-gone td.mm{text-decoration:none}
.pos-cat{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0 4px}.pos-cat div{background:var(--chip,#f3f0ea);border-radius:10px;padding:6px 8px;font-size:12.5px}.pos-cat b{display:block;font-size:18px}.pos-cat i{font-style:normal;font-size:12px}.pos-cat i.u{color:#d00}.pos-cat i.d{color:#1a7a3a}
.pos-guess{margin:10px 0 4px;padding:8px 10px;border-radius:10px;border:1.5px dashed #2f6fd6;font-size:13.5px;line-height:1.6}.pos-guess b{color:#2f6fd6}.pos-guess div{font-size:12.5px;color:var(--mute);margin-top:2px}
.pos-lk{border:1px solid var(--line,#ddd);background:var(--chip,#f3f0ea);color:var(--ink,#222);border-radius:999px;padding:6px 12px;font-size:13.5px;cursor:pointer}
.pos-warn{background:#fff6e5;border:1px solid #f3d9a4;border-radius:10px;padding:8px 10px;font-size:13px;margin:6px 0}
@media (prefers-color-scheme:dark){.mk-t td.mm{text-align:center;font-weight:700}.mk-t tr.mk-chg td{background:#fffbe6}.mk-t tr.mk-gone td{color:#999!important;text-decoration:line-through}.mk-t tr.mk-gone td.mm{text-decoration:none}
.pos-warn{background:#3a2f1a;border-color:#5a4520}}`;
  document.head.appendChild(css);
  let P = null;
  const load = async () => P || (P = await fetch("data/pos.json?v=" + Date.now()).then(r => r.json()).catch(() => null));
  const chip = it => { const t = TAG[it.st] || TAG.hold; return `<span class="pchip" style="color:${t[2]}">${t[0]} ${esc(it.n)}<i>${esc(it.now || t[1])}</i></span>`; };

  window.renderPosBar = async function () {
    const h = document.querySelector("header"); if (!h || h.querySelector(".posbar")) return;
    const p = await load(); if (!p) return;
    const el = document.createElement("div"); el.className = "posbar";
    el.innerHTML = `<div class="pt">🎯 实时仓位预测 <small>据他发言推测 · 更新到 ${md(p.asof)}</small><span class="go">看详情 ›</span></div>
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
    m.innerHTML = `<section class="box"><h2>🎯 实时仓位预测 <small>更新到 ${md(p.asof)} · 每晚随微博一起更新</small></h2>
      <div class="pos-warn">⚠️ 9月以后他不再晒真实持仓截图，这里是<b>根据他公开说过的话推测</b>的，不是真实持仓；他没明说的买卖不会出现在这里。仅供了解，<b>不构成投资建议</b>，请勿据此照抄。${p.self ? `<br>他本人对网友推算持仓的评价：“${esc(p.self.x.replace(/^（[^）]*）/, ""))}”（${md(p.self.d)} <a href="${wl(p.self.b)}" target="_blank" rel="noopener">原文</a>）——所以这里只当参考。` : ""}</div>
      ${p.mock ? `<div id="pos-mock"><div class="empty">正在拉实时行情…</div></div>` : ""}
      <h3 style="margin:14px 0 4px;font-size:15px">📌 本月每一笔变动（他的原话）</h3>
      ${p.cash ? `<div class="pos-cash"><div>💰 游戏仓仙晶（现金）<br><b>${p.cash.v}万</b> <a href="${wl(p.cash.b)}" target="_blank" rel="noopener">原文</a><br><small style="color:var(--mute)">${md(p.cash.d)} 他本人公布 · ${esc(p.cash.prevNote || "")}</small></div></div>` : ""}
      ${p.note ? `<div class="cap" style="margin:4px 0 8px">${esc(p.note)}</div>` : ""}
      <div class="pos-leg">图例：🟢▲加仓　🔴▼减仓　🔄波段（减了又买回）　🆕新建仓　❌清仓</div>
      <table class="pos-t">${rows}</table>
      ${p.hold && p.hold.length ? `<h3 style="margin:14px 0 4px;font-size:15px">⏸ 本月没说过买卖的（按10月底推测持有）</h3><div class="chips" style="display:flex;flex-wrap:wrap;gap:6px">${p.hold.map(n => `<span class="pchip" style="color:var(--mute)">${esc(n)}</span>`).join("")}</div><div class="cap" style="margin-top:6px">${esc(p.holdNote || "")}</div>` : ""}
      <div class="cap" style="margin-top:10px">起点：${esc(p.base)}。每月1号会出一张完整的月底持仓推测图，作为下个月的新起点。</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" class="pos-lk" data-v="ops">📝 操作日志（他说过的每笔买卖）</button><button type="button" class="pos-lk" data-v="ps">🗂 历史持仓PS图</button></div></section>`;
    m.querySelectorAll(".pos-lk").forEach(b => b.onclick = () => { window.__go && window.__go(b.dataset.v); scrollTo({ top: 0 }); });
    if (p.mock) mock(m.querySelector("#pos-mock"), p);
  };

  const f = (n, d = 3) => Number(n).toFixed(d);
  const MK = { add: "▲加", cut: "▼减", swing: "🔄T", new: "🆕新", clear: "❌清" };
  async function mock(host, p) {
    const k = p.mock, codes = [k.yh.q, ...k.a.map(r => r.q), ...k.hk.map(r => r.q)];
    let QC = {}; try { QC = JSON.parse(localStorage.getItem("ldg_qcache") || "{}"); } catch (e) {}
    const hasCache = codes.some(c => QC[c] && QC[c].px > 0);
    if (hasCache) drawMock(host, p, QC, "cache");
    let Q = {};
    try { const j = await fetch("/api/quote?s=" + codes.join(","), { cache: "no-store" }).then(r => r.json()); Q = j.q || {}; if (Object.keys(Q).length) { try { const c = JSON.parse(localStorage.getItem("ldg_qcache") || "{}"); Object.assign(c, Q); localStorage.setItem("ldg_qcache", JSON.stringify(c)); } catch (e) {} } } catch (e) {}
    if (Object.keys(Q).length) drawMock(host, p, Q, "live"); else if (!hasCache) drawMock(host, p, {}, "fail");
  }
  function drawMock(host, p, Q, mode) {
    const k = p.mock;
    let t = "";
    const px = r => { const q = Q[r.q]; if (q && q.px > 0) { t = t || q.t; return q.px; } return r.p0; };
    const live = mode === "live";
    let smv = 0;
    const A = k.a.map(r => { const p1 = px(r), mv = r.s * p1, pl = mv - r.s * r.cost; smv += mv;
      return { ...r, p: p1, mv, pl, pct: r.cost > 0 ? pl / (r.s * r.cost) * 100 : null }; }).sort((a, b) => b.mv - a.mv);
    const yp = px(k.yh), ymv = k.yh.s * yp; smv += ymv;
    const H = k.hk.map(r => { const p1 = px(r), mv = r.s * p1 * k.rate, pl = mv - r.s * r.cost * k.rate; smv += mv;
      return { ...r, mv, pl, pct: r.cost > 0 ? pl / (r.s * r.cost * k.rate) * 100 : null }; });
    const cash = k.xj * 1e4 - ymv, total = smv + cash;
    const cls = r => r.pl >= 0 ? "mk-up" : "mk-dn";
    const mm = r => r.m ? `<td class="mm" title="${esc(r.w || "")}">${MK[r.m] || ""}</td>` : `<td class="mm" style="color:#bbb">—</td>`;
    const pc = v => v == null ? "—" : v.toFixed(2);
    const rowsA = [{ code: k.yh.code, name: k.yh.name, s: k.yh.s, cost: k.yh.cost, p: yp, mv: ymv, pl: ymv - k.yh.s * k.yh.cost, pct: (yp / k.yh.cost - 1) * 100, q: k.yh.q }, ...A].sort((a, b) => b.mv - a.mv)
      .map(r => `<tr class="${cls(r)}${r.m ? " mk-chg" : ""}">${mm(r)}<td>${r.code}</td><td>${r.name}</td><td>${r.s}</td><td>${r.costText||f(r.cost)}</td><td>${f(r.p)}</td><td>${f(r.mv)}</td><td>${r.plText||f(r.pl)}</td><td>${r.plText?'—':pc(r.pct)}</td><td>${r.q.startsWith("sh") ? "上海A股" : "深圳A股"}</td></tr>`).join("")
      + (k.gone || []).map(g => `<tr class="mk-gone"><td class="mm">${MK[g.m] || ""}</td><td>——</td><td>${g.name}</td><td colspan="7" style="text-align:left">${esc(g.w)}</td></tr>`).join("");
    const rowsH = H.map(r => `<tr class="${cls(r)}${r.m ? " mk-chg" : ""}">${mm(r)}<td>${r.name}</td><td>${r.code}</td><td>${r.s}</td><td>${f(r.cost)}</td><td>${f(r.mv)}</td><td>${f(r.pl)}</td><td>${pc(r.pct)}</td></tr>`).join("");
    const CAT = { "神火股份": "电解铝", "云铝股份": "电解铝", "中孚实业": "电解铝", "长江电力": "水电", "陕西能源": "火电", "华能国际电力股份": "火电", "潞安环能": "煤炭", "陕西煤业": "煤炭", "山煤国际": "煤炭", "中煤能源": "煤炭", "紫金矿业": "其他", "宝丰能源": "其他", "新城发展": "其他", "中国海洋石油": "其他" };
    const OCT = { "电解铝": 33.2, "煤炭": 14.2, "火电": 12.3, "水电": 14.2, "其他": 10.5, "现金(仙晶)": 15.6 };
    const cs = {}; [...A, ...H].forEach(r => { const c = CAT[r.name] || "其他"; cs[c] = (cs[c] || 0) + r.mv; }); cs["现金(仙晶)"] = k.xj * 1e4;
    const catHTML = Object.keys(OCT).map(c => { const v = (cs[c] || 0) / total * 100, d = v - OCT[c]; return `<div><span>${c}</span><b>${v.toFixed(1)}%</b><i class="${d >= 0 ? "u" : "d"}">${d >= 0 ? "▲" : "▼"}${Math.abs(d).toFixed(1)}</i></div>`; }).join("");
    const chg = [...k.a, ...k.hk].filter(r => r.m).map(r => `${MK[r.m]} ${r.name}：${r.w}`);
    host.innerHTML = `<div class="mk-wrap"><div class="mk-cap">↓ 按交易软件截图样式还原的<b>实时预测持仓</b>（${mode === "live" ? "实时行情 " + esc(t) : mode === "cache" ? "先按上次价格显示（" + esc(t) + "）· 正在刷新" : "行情获取失败，暂用10/30收盘价"}）· 黄底=本月有变动 · 点表格放大</div>
      <div class="mk-scroll"><div class="mk">
       <div class="mk-tab">人民币</div>
       <div class="mk-sum"><div><span>资金余额</span><b>${f(cash, 2)}</b><span>可取金额</span><b>${f(cash, 2)}</b><em>预测更新:${p.asof}</em></div>
        <div><span>冻结金额</span><b>200.00</b><span>参考股票市值(含港股通)</span><b>${f(smv, 2)}</b></div>
        <div><span>可用金额</span><b>${f(cash, 2)}</b><span>参考总资产(含港股通)</span><b>${f(total, 2)}</b><i>修改成本价</i></div>
        <div class="mk-warn">提示：本表为根据他公开发言推算的预测持仓，并非真实截图；仙晶按他${md(p.cash.d)}公布的${k.xj}万（资金余额+银华日利）</div></div>
       <table class="mk-t"><tr><th>本月</th><th>证券代码</th><th>证券名称</th><th>股票余额</th><th>成本价</th><th>市价</th><th>市值</th><th>浮动盈亏</th><th>盈亏比例(%)</th><th>交易市场</th></tr>${rowsA}</table>
       <div class="mk-tab" style="margin-top:10px">港股通持仓</div>
       <table class="mk-t"><tr><th>本月</th><th>证券名称</th><th>证券代码</th><th>可用股份</th><th>参考成本价(港币)</th><th>最新市值(人民币)</th><th>参考盈亏(人民币)</th><th>盈亏比例(%)</th></tr>${rowsH}</table>
       <div class="mk-wm">${Array.from({ length: 60 }, () => "<span>非真实截图</span>").join("")}</div>
      </div></div>
      ${k.guess ? `<div class="pos-guess">🔍 <b>${esc(k.guess.t)}</b><div>${esc(k.guess.why)}</div></div>` : ""}<div class="pos-cat">${catHTML}</div><div class="cap" style="margin:-2px 0 6px">↑ 按上表推算的各类仓位占比，箭头＝比他10/30公布的变化（现金按他公布的仙晶）</div>
      <div class="cap">本月变动：${chg.map(esc).join("；")}。其余股数沿用10月底推测；港股按1港币≈${k.rate}人民币换算。</div></div>`;
    const fit = () => host.querySelectorAll(".mk-scroll").forEach(w => { if (w.classList.contains("big")) return; const mk = w.firstElementChild; const z = Math.min(1, w.clientWidth / 840); mk.style.transform = `scale(${z})`; w.style.height = (mk.offsetHeight * z) + "px"; });
    fit(); addEventListener("resize", fit);
    host.querySelectorAll(".mk-scroll").forEach(w => w.onclick = () => { w.classList.toggle("big"); if (!w.classList.contains("big")) fit(); });
  }
})();
