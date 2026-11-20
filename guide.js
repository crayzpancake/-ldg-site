// 🧭 他现在怎么看 / 📚 新手必读（含 ⚠️ 他提醒过的风险）/ 今日一句（精选）
(function () {
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const wl = b => `https://weibo.com/3962719063/${b}`;
  const md = d => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
  const css = document.createElement("style");
  css.textContent = `
.gd-card{border:1px solid var(--line,#eee);border-radius:12px;padding:10px 12px;margin:8px 0;background:var(--card,#fff)}
.gd-card h3{margin:0 0 4px;font-size:16px;display:flex;align-items:center;gap:6px}
.gd-card h3 small{font-weight:400;color:var(--mute);font-size:12px;margin-left:auto}
.gd-sum{font-weight:700;color:var(--red,#d00);line-height:1.55;margin-bottom:4px}
.gd-ev{font-size:13.5px;line-height:1.6;margin:3px 0;color:var(--ink,#222)}
.gd-ev .d{color:var(--mute);font-size:12px;margin-right:4px}.gd-ev .gq{color:var(--mute);font-size:12.5px}
.gd-list{counter-reset:g;list-style:none;padding:0;margin:0}
.gd-list li{counter-increment:g;position:relative;padding:8px 0 8px 34px;border-top:1px solid var(--line,#eee)}
.gd-list li::before{content:counter(g);position:absolute;left:4px;top:9px;width:22px;height:22px;border-radius:50%;background:var(--red,#d00);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center}
.gd-list.risk li::before{content:"!";background:#e08a00}
.gd-list b{display:block;font-size:15px}
.gd-intro{font-size:13.5px;color:var(--mute);line-height:1.6;margin:4px 0 8px}
.gd-risk{border:2px solid #e08a00;border-radius:12px;padding:8px 12px;margin:8px 0;background:#fff8ec}
@media (prefers-color-scheme:dark){.gd-risk{background:#2e2410}}
:root[data-theme="dark"] .gd-risk{background:#2e2410}:root[data-theme="light"] .gd-risk{background:#fff8ec}
.gd-more{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.gd-more button{border:1px solid var(--line,#ddd);background:var(--chip,#f3f0ea);color:var(--ink,#222);border-radius:999px;padding:6px 12px;font-size:13.5px;cursor:pointer}`;
  document.head.appendChild(css);
  let G = null;
  const load = async () => G || (G = await fetch("data/guide.json?v=" + Date.now()).then(r => r.json()).catch(() => null));
  const ev = e => `<div class="gd-ev"><span class="d">${md(e.d)}</span>${e.q ? `<span class="gq">（问：${esc(e.q)}）</span>` : ""}“${esc(e.x)}” <a href="${wl(e.b)}" target="_blank" rel="noopener">原文</a></div>`;
  const more = btns => `<div class="gd-more">${btns.map(([v, t]) => `<button type="button" data-go="${v}">${t}</button>`).join("")}</div>`;
  const wire = m => m.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { window.__go && window.__go(b.dataset.go); scrollTo({ top: 0 }); });

  window.renderNow = async function (m) {
    m.innerHTML = `<div class="empty">读取中…</div>`;
    const g = await load(); if (!g) { m.innerHTML = `<div class="empty">读取失败，请刷新</div>`; return; }
    m.innerHTML = `<section class="box"><h2>🧭 他现在怎么看 <small>每个板块他最新的说法 · 更新到 ${md(g.asof)}</small></h2>
      <div class="gd-intro">红字是本站用一句话概括，下面是他的原话和原文链接；只摘录，不评价对错。观点会变，以他最新发言为准。</div>
      ${g.now.map(s => `<div class="gd-card"><h3>${s.e} ${esc(s.k)}<small>${md(s.ev[0].d)}</small></h3><div class="gd-sum">${esc(s.sum)}</div>${s.ev.map(ev).join("")}</div>`).join("")}
      ${more([["stock", "🔎 按股票看全部发言"], ["mind", "🧠 观点导图"], ["track", "📌 他提过的价位"]])}</section>`;
    wire(m);
  };

  window.renderStart = async function (m) {
    m.innerHTML = `<div class="empty">读取中…</div>`;
    const g = await load(); if (!g) { m.innerHTML = `<div class="empty">读取失败，请刷新</div>`; return; }
    const li = (x, i) => `<li><b>${esc(x.t)}</b>${ev(x.ev)}</li>`;
    m.innerHTML = `<section class="box"><h2>📚 新手必读 <small>先看这些，再看每日微博更容易懂</small></h2>
      <div class="gd-risk"><h3 style="margin:2px 0 4px;font-size:16px">⚠️ 他提醒过的风险 <small style="font-weight:400;color:var(--mute);font-size:12px">跟着看之前，先看这几条</small></h3>
        <ol class="gd-list risk">${g.risk.map(li).join("")}</ol></div>
      <h3 style="margin:14px 0 4px;font-size:16px">🧩 他反复讲的方法</h3>
      <ol class="gd-list">${g.start.map(li).join("")}</ol>
      ${more([["method", "📚 全部方法论原文"], ["gloss", "📖 术语表（盒饭、仙晶…）"], ["now", "🧭 他现在怎么看"]])}</section>`;
    m.querySelectorAll("[data-go]").forEach(b => b.onclick = () => {
      if (b.dataset.go === "gloss") { const x = document.querySelector('[data-mv="gloss"]'); if (x) x.click(); return; }
      window.__go && window.__go(b.dataset.go); scrollTo({ top: 0 });
    });
  };

  // 今日一句：从精选（新手必读+风险提醒）里按日期轮换，避免抓到没头没尾的配图评论
  window.renderQuote = async function () {
    const h = document.querySelector("header"); if (!h || h.querySelector(".quote")) return;
    const g = await load(); if (!g || !g.quotes || !g.quotes.length) return;
    const n = Math.floor((Date.now() + 8 * 3600e3) / 864e5);
    const q = g.quotes[n % g.quotes.length];
    const el = document.createElement("div"); el.className = "quote";
    const qx = q.q ? q.x.replace(/^[^，]{1,3}，/, "") : q.x;
    el.innerHTML = `💬 <b>今日一句</b>：“${esc(qx)}”<small>—— ${md(q.d)} <a href="${wl(q.b)}" target="_blank" rel="noopener">原文</a></small>`;
    const x = h.querySelector(".guide") || h.querySelector(".motto"); x ? x.after(el) : h.prepend(el);
  };
})();
