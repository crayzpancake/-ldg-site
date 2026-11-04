// 附加功能：🔍 搜索、铜价走势、📈 回看他的判断
(function () {
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rich = s => esc(s).replace(/&lt;(\/?)b&gt;/g, "<$1b>");
  const plain = s => String(s ?? "").replace(/<\/?b>/g, "");
  const wlink = (b, s) => s === "xq" ? `https://xueqiu.com/8790885129/${b}` : `https://weibo.com/3962719063/${b}`;
  window.postLink = wlink;
  const md = d => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
  const kcache = {};
  async function kline(codes, n) {
    const need = codes.filter(c => !kcache[c]);
    if (need.length) {
      const r = await fetch(`/api/kline?s=${need.join(",")}&n=${n || 160}`);
      const j = await r.json();
      Object.assign(kcache, j.k || {});
    }
    return kcache;
  }

  const css = `
.srch{display:flex;gap:6px;margin:8px 0 2px}
.srch input{flex:1;font:inherit;font-size:14px;padding:7px 10px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--ink);min-width:0}
.srch button{border:0;border-radius:999px;padding:6px 14px;background:var(--chip);color:var(--ink);cursor:pointer;font-size:14px}
.sr-hit{padding:8px 10px;border-radius:8px;background:var(--chip);margin:6px 0;font-size:14px;line-height:1.6}
.sr-hit .sr-m{font-size:12px;color:var(--mute);display:flex;gap:8px}
.sr-hit .sr-m a{color:var(--mute)}
.sr-hit mark{background:#ffe08a;color:#000;border-radius:2px;padding:0 1px}
.sr-day{font-weight:700;margin:14px 0 2px;font-size:14px}
.sr-day a{color:inherit}
.rv-t{width:100%;border-collapse:collapse;font-size:13.5px}
.rv-t td,.rv-t th{padding:7px 6px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}
.rv-t th{font-size:12px;color:var(--mute);font-weight:400}
.rv-t .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.rv-t .up{color:#d00}.rv-t .dn{color:#1a9a4a}
.rv-t small{color:var(--mute)}
.rv-k{display:inline-block;font-size:11px;padding:0 6px;border-radius:999px;color:#fff;margin-right:4px}
.rv-k.buy{background:#1a9a4a}.rv-k.sell{background:#d00}.rv-k.support{background:#2f6fd6}.rv-k.view{background:#8a6bd1}
@media (max-width:640px){.rv-t .hide-m{display:none}}
`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // ---------- 🔍 搜索 ----------
  function addSearchBox() {
    const h = document.querySelector("header");
    if (!h || document.querySelector(".srch")) return;
    const f = document.createElement("form");
    f.className = "srch";
    f.innerHTML = `<input type="search" placeholder="搜他说过的话：云铝、0.618、黄金防线…" enterkeyhint="search"><button>🔍 搜索</button>`;
    f.onsubmit = e => { e.preventDefault(); const q = f.querySelector("input").value.trim(); if (q) window.doSearch(q); };
    h.appendChild(f);
  }
  window.doSearch = async function (q) {
    const m = document.getElementById("main");
    document.querySelectorAll("#tabs button").forEach(b => b.classList.remove("on"));
    try { history.replaceState(null, "", "#s=" + encodeURIComponent(q)); } catch (e) {}
    const inp = document.querySelector(".srch input"); if (inp) inp.value = q;
    m.innerHTML = `<div class="empty">正在搜索 ${IDX.days.length} 天的微博…</div>`;
    const all = await Promise.all(IDX.days.map(d => cache[d.date] ? cache[d.date] : getJSON(`data/${d.date}.json`).then(j => (cache[d.date] = j)).catch(() => null)));
    const words = q.split(/\s+/).filter(Boolean).map(w => w.toLowerCase());
    const re = new RegExp("(" + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
    const hl = s => esc(plain(s)).replace(re, "<mark>$1</mark>");
    const groups = [];
    let n = 0;
    all.filter(Boolean).sort((a, b) => b.date.localeCompare(a.date)).forEach(D => {
      const hits = D.posts.filter(p => {
        const t = (plain(p.x) + " " + plain(p.q) + " " + plain(p.note) + " " + plain(p.src && p.src.x)).toLowerCase();
        return words.every(w => t.includes(w));
      });
      if (hits.length) { groups.push([D, hits]); n += hits.length; }
    });
    m.innerHTML = `<section class="box"><h2>🔍 “${esc(q)}” <small>找到 ${n} 条，${groups.length} 天</small></h2>
      ${groups.length ? groups.slice(0, 60).map(([D, hs]) => `<div class="sr-day"><a href="#d${D.date.replace(/-/g, "")}" onclick="event.preventDefault();window.__goDay('${D.date}')">${md(D.date)} ${esc(D.weekday || "")}</a> · ${hs.length}条</div>
        ${hs.map(p => `<div class="sr-hit"><div class="sr-m"><span>${esc(p.t)} · ${esc(p.c || "")}${p.s === "xq" ? " · 雪球" : ""}</span><a href="${wlink(p.b, p.s)}" target="_blank" rel="noopener">原文</a></div>
          ${p.q ? `<div style="color:var(--mute)">问：${hl(p.q)}</div>` : ""}<div>${hl(p.x)}</div>${p.src ? `<div style="color:var(--mute);font-size:13px">${esc(p.src.u)}：${hl(String(p.src.x || "").slice(0, 200))}</div>` : ""}</div>`).join("")}`).join("")
        : `<div class="empty">没找到，换个词试试（可以用空格分开多个词，比如“云铝 分红”）</div>`}
    </section>`;
  };

  // ---------- 铜价走势 ----------
  window.renderCopper = async function (main, IDX, cache) {
    const root = main.querySelector(".viz-root"); if (!root) return;
    const anchor = main.querySelector("#c-cci")?.closest("section") || root.lastElementChild;
    const sec = document.createElement("section");
    sec.className = "box";
    sec.innerHTML = `<h2>铜价走势 <small>上期所铜主力合约，元/吨 · 每日收盘</small></h2><div id="c-cu"><div class="empty">读取中…</div></div><div class="cap" id="c-cu-say"></div>`;
    anchor.after(sec);
    const says = [];
    Object.values(cache || {}).forEach(D => D && D.posts.forEach(p => { if (p.c === "铜" || /铜价|沪铜|伦铜|精炼铜/.test(plain(p.x))) says.push({ d: D.date, b: p.b, s: p.s, x: plain(p.x).replace(/\s+/g, " ").slice(0, 60) }); }));
    says.sort((a, b) => b.d.localeCompare(a.d));
    sec.querySelector("#c-cu-say").innerHTML = says.length ? `他说过的铜（${says.length}条）：` + says.slice(0, 4).map(s => `${md(s.d)} ${esc(s.x)}… <a href="${wlink(s.b, s.s)}" target="_blank" rel="noopener">原文</a>`).join("；") : "";
    try {
      const k = await kline(["nf_CU0"], 160);
      const pts = (k.nf_CU0 || []).filter(r => r[0] >= "2026-09-01").map(r => ({ d: r[0], y: Math.round(r[1]) }));
      if (pts.length < 3) throw 0;
      const host = sec.querySelector("#c-cu");
      window.lineChart(host, pts, { unit: "" });
    } catch (e) { sec.querySelector("#c-cu").innerHTML = `<div class="empty">铜价暂时读不到，稍后刷新</div>`; }
  };

  document.addEventListener("DOMContentLoaded", addSearchBox);
  if (document.readyState !== "loading") addSearchBox();
})();
