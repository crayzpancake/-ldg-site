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

// ---------- 📖 术语、📚 方法论合集、⚡ 30秒速览、🆕 更新说明 ----------
(function () {
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rich = s => esc(s).replace(/&lt;(\/?)b&gt;/g, "<$1b>");
  const plain = s => String(s ?? "").replace(/<\/?b>/g, "");
  const md = d => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
  const G = {
    "仙晶": "现金。他对现金类资产的叫法。",
    "正宫": "股票外号：中国神华。",
    "西宫": "股票外号：中煤能源。",
    "旧爱": "股票外号：陕西煤业。",
    "西安电厂": "股票外号：陕西能源。",
    "绿铝": "股票外号：云铝股份。",
    "门窗": "股票外号：神火股份。",
    "易拉罐": "股票外号：中孚实业。",
    "喷吹": "股票外号：潞安环能。",
    "类现金": "股票外号：长江电力。",
    "大水电": "股票外号：长江电力。",
    "海狗": "股票外号：中远海控。",
    "猛男": "股票外号：内蒙华电。",
    "游戏仓": "他公开晒持仓、每月做总结的那个账户（也是本站「持仓PS图」统计的账户）。",
    "主仓": "他的另一个主要账户，不公开具体持仓。",
    "某队": "网友对护盘资金（俗称“国家队”）的含蓄说法。",
    "三道关口": "他看下跌支撑的三个位置：0.618 位 → 腰斩（0.5）位 → 0.382 位。",
    "0.618": "黄金分割位：按前一波上涨的高低点算出的回撤位置，常被当作第一道支撑。",
    "0.382": "黄金分割位，他说的“最后防线”/第三关口。",
    "腰斩位": "从高点跌一半的位置，即 0.5 分割位。",
    "记号": "象征性的极少量仓位，只是“做个记号”方便跟踪，不算真正建仓。",
    "金字塔建仓": "越跌买得越多的分批买法；他补充：每次反弹把最后一笔的大部分卖掉。",
    "红利再投": "把收到的分红再买回这只股票。",
    "PS图": "他每月底晒的持仓截图（9月以后不再公开）。",
    "A00铝锭": "电解铝现货的标准品，他每天发的是无锡市场报价，单位元/吨。",
    "CCI": "中国电煤采购价格指数，他常发的是 5500 大卡动力煤价格，单位元/吨。",
  };
  const KEYS = Object.keys(G).sort((a, b) => b.length - a.length);
  const RE = new RegExp(KEYS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
  const css = `
.gl{border-bottom:1px dotted var(--mute);cursor:help}
#glpop{position:fixed;z-index:80;max-width:260px;background:var(--ink);color:var(--card);font-size:13px;line-height:1.55;padding:8px 10px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.2);display:none}
.disc{margin:6px 0 2px;font-size:12.5px;color:var(--mute);line-height:1.6}
.disc a{color:var(--mute)}
.hdr-links{display:flex;gap:10px;font-size:13px;margin-top:4px;flex-wrap:wrap}
.hdr-links a{color:var(--ink);cursor:pointer;text-decoration:none;background:var(--chip);padding:2px 10px;border-radius:999px}
.hdr-links a .dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--red);margin-left:4px;vertical-align:2px}
.gl-list{display:grid;gap:6px}.gl-list div{font-size:14px}.gl-list b{margin-right:6px}
.quick{border:2px solid var(--red)!important}
.quick ol{margin:6px 0 0;padding-left:20px}.quick li{margin:4px 0;font-size:14.5px}
.quick .qw{margin-top:8px;font-size:13.5px}
.quick .qw a{color:inherit}
.mt-chips{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px}
.mt-chips button{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:3px 12px;font-size:13px;cursor:pointer}
.mt-chips button.on{background:var(--ink);color:var(--card)}
.mt-i{padding:10px 12px;border-radius:10px;background:var(--chip);margin:8px 0;font-size:14.5px;line-height:1.7}
.mt-i .mt-m{font-size:12px;color:var(--mute);display:flex;justify-content:space-between}
.mt-i .mt-m a{color:var(--mute)}
.mt-i .mt-q{color:var(--mute);font-size:13.5px}
.nw{border-left:3px solid var(--red);padding:4px 0 4px 12px;margin:14px 0}
.nw h3{margin:0 0 4px;font-size:15px}.nw ul{margin:4px 0;padding-left:18px}.nw li{margin:3px 0;font-size:14px}
.nw button{border:0;border-radius:999px;padding:4px 12px;background:var(--red);color:#fff;font-size:12.5px;cursor:pointer;margin-top:4px}
`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // 术语自动标注
  const pop = document.createElement("div"); pop.id = "glpop"; document.body.appendChild(pop);
  const SKIP = /^(A|BUTTON|INPUT|TEXTAREA|SELECT|OPTION|SCRIPT|STYLE|MARK|svg|text)$/i;
  function annotate(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        for (let p = n.parentNode; p && p !== root; p = p.parentNode) { if (SKIP.test(p.nodeName) || (p.classList && (p.classList.contains("gl") || p.classList.contains("gl-list")))) return NodeFilter.FILTER_REJECT; }
        return RE.test(n.nodeValue) ? (RE.lastIndex = 0, NodeFilter.FILTER_ACCEPT) : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(n => {
      const f = document.createDocumentFragment(); let last = 0; const t = n.nodeValue; RE.lastIndex = 0; let m;
      while ((m = RE.exec(t))) {
        if (m.index > last) f.appendChild(document.createTextNode(t.slice(last, m.index)));
        const s = document.createElement("span"); s.className = "gl"; s.dataset.g = m[0]; s.textContent = m[0]; f.appendChild(s); last = m.index + m[0].length;
      }
      if (last < t.length) f.appendChild(document.createTextNode(t.slice(last)));
      n.parentNode.replaceChild(f, n);
    });
  }
  const show = (el, x, y) => { pop.innerHTML = `<b>${esc(el.dataset.g)}</b>：${esc(G[el.dataset.g])}`; pop.style.display = "block"; const r = pop.getBoundingClientRect(); pop.style.left = Math.min(x + 10, innerWidth - r.width - 8) + "px"; pop.style.top = Math.min(y + 14, innerHeight - r.height - 8) + "px"; };
  document.addEventListener("pointerover", e => { const g = e.target.closest && e.target.closest(".gl"); if (g && e.pointerType === "mouse") show(g, e.clientX, e.clientY); });
  document.addEventListener("pointerout", e => { if (e.target.closest && e.target.closest(".gl") && e.pointerType === "mouse") pop.style.display = "none"; });
  document.addEventListener("click", e => { const g = e.target.closest && e.target.closest(".gl"); if (g) { show(g, e.clientX, e.clientY); e.stopPropagation(); } else pop.style.display = "none"; }, true);
  let tm = null;
  const mo = new MutationObserver(() => { clearTimeout(tm); tm = setTimeout(() => { const m = document.getElementById("main"); mo.disconnect(); annotate(m); mo.observe(m, { childList: true, subtree: true }); }, 250); });
  function startGloss() { const m = document.getElementById("main"); if (m) mo.observe(m, { childList: true, subtree: true }); }

  function setView(html) {
    const m = document.getElementById("main");
    document.querySelectorAll("#tabs button").forEach(b => b.classList.remove("on"));
    m.innerHTML = html; window.scrollTo({ top: 0 });
    return m;
  }

  // 页头：声明 + 链接
  function header() {
    const h = document.querySelector("header"); if (!h || h.querySelector(".disc")) return;
    const d = document.createElement("div");
    d.className = "disc";
    d.innerHTML = `感谢鹿公一直以来的无私分享 🙏 这里是一位读者整理的回看笔记，并非 @挖地瓜的超级鹿鼎公 本人运营。文字和观点都属于鹿公，这里只是把他公开分享的投资内容按日期归拢，方便没空追微博的朋友。想看原汁原味、和鹿公交流，欢迎去 <a href="https://weibo.com/u/3962719063" target="_blank" rel="noopener">他的微博</a> 关注支持。鹿公如果觉得有任何不妥，留言一句，马上调整或下线。`;
    const l = document.createElement("div");
    l.className = "hdr-links";
    l.innerHTML = `<a data-go="news">🆕 更新说明<span class="dot"></span></a><a data-go="gloss">📖 术语表</a>`;
    l.onclick = e => { const a = e.target.closest("a"); if (!a) return; if (a.dataset.go === "news") window.renderNews(); else window.renderGloss(); };
    h.appendChild(d); h.appendChild(l);
  }

  window.renderGloss = function () {
    setView(`<section class="box"><h2>📖 术语表 <small>正文里带虚线下划线的词，点一下也能看解释</small></h2>
      <h3 style="margin:6px 0">股票外号</h3><div class="gl-list">${Object.entries(G).filter(([k, v]) => v.startsWith("股票外号")).map(([k, v]) => `<div><b>${esc(k)}</b>${esc(v.replace("股票外号：", ""))}</div>`).join("")}</div><h3 style="margin:14px 0 6px">常用说法</h3><div class="gl-list">${Object.entries(G).filter(([k, v]) => !v.startsWith("股票外号")).map(([k, v]) => `<div><b>${esc(k)}</b>${esc(v)}</div>`).join("")}</div>
      <div class="cap">解释是根据他的发言上下文整理的，若有不准确欢迎在留言板指出。</div></section>`);
    try { history.replaceState(null, "", "#gloss"); } catch (e) {}
  };

  // 🆕 更新说明
  window.renderNews = async function () {
    const m = setView(`<div class="empty">读取中…</div>`);
    try { history.replaceState(null, "", "#news"); } catch (e) {}
    let L = [];
    try { L = await getJSON("data/changelog.json"); } catch (e) {}
    m.innerHTML = `<section class="box"><h2>🆕 更新说明 <small>每次更新了什么 · 点“复制”可直接转发</small></h2>
      ${L.map((x, i) => `<div class="nw"><h3>${md(x.d)} ${esc(x.title)}</h3><ul>${x.items.map(t => `<li>${rich(t)}</li>`).join("")}</ul><button data-i="${i}">📋 复制这条</button></div>`).join("") || `<div class="empty">暂无</div>`}</section>`;
    m.querySelectorAll(".nw button").forEach(b => b.onclick = async () => {
      const x = L[+b.dataset.i];
      const txt = `【超级鹿鼎公微博汇总 · ${md(x.d)} 更新】${x.title}\n` + x.items.map((t, j) => `${j + 1}. ${plain(t)}`).join("\n") + `\n👉 https://ludinggongfans.netlify.app`;
      try { await navigator.clipboard.writeText(txt); b.textContent = "✅ 已复制"; } catch (e) { prompt("复制下面的文字：", txt); }
    });
    try { localStorage.setItem("ldg_news_seen", L[0] ? L[0].d + L[0].title : ""); } catch (e) {}
    document.querySelectorAll(".hdr-links .dot").forEach(d => d.remove());
  };
  async function newsDot() {
    try { const L = await getJSON("data/changelog.json"); const seen = localStorage.getItem("ldg_news_seen"); if (L[0] && seen === L[0].d + L[0].title) document.querySelectorAll(".hdr-links .dot").forEach(d => d.remove()); } catch (e) {}
  }

  // 📚 方法论合集
  const TOPICS = { "全部": null, "黄金分割/关口": /黄金分割|0\.618|0\.382|0\.5|关口|腰斩|支撑/, "估值/PE": /估值|PE|PB|市盈|便宜|低估/, "建仓与仓位": /建仓|加仓|减仓|仓位|金字塔|满仓|轻仓/, "分红/股息": /分红|股息|盒饭|红利|息/, "心态与原则": /原则|认错|错了|心态|耐心|拿着|不懂|教训/ };
  window.renderMethod = async function () {
    const m = document.getElementById("main");
    m.innerHTML = `<div class="empty">正在整理他讲过的方法…</div>`;
    const all = await Promise.all(IDX.days.map(d => cache[d.date] ? cache[d.date] : getJSON(`data/${d.date}.json`).then(j => (cache[d.date] = j)).catch(() => null)));
    const items = [];
    all.filter(Boolean).forEach(D => D.posts.forEach(p => { if (p.c === "方法论") items.push({ d: D.date, ...p }); }));
    items.sort((a, b) => (b.d + b.t).localeCompare(a.d + a.t));
    let sel = window.__mt || "全部";
    const draw = () => {
      const re = TOPICS[sel];
      const L = items.filter(p => !re || re.test(plain(p.x) + plain(p.q)));
      m.innerHTML = `<section class="box"><h2>📚 方法论合集 <small>他讲过的投资方法，${items.length} 条 · 按时间倒序</small></h2>
        <div class="mt-chips">${Object.keys(TOPICS).map(k => `<button class="${k === sel ? "on" : ""}" data-k="${k}">${k}</button>`).join("")}</div>
        ${L.map(p => `<div class="mt-i"><div class="mt-m"><span>${md(p.d)} ${esc(p.t)}${p.s === "xq" ? " · 雪球" : ""}</span><a href="${window.postLink(p.b, p.s)}" target="_blank" rel="noopener">原文</a></div>${p.q ? `<div class="mt-q">问：${rich(p.q)}</div>` : ""}<div>${rich(p.x)}</div></div>`).join("") || `<div class="empty">这个主题暂时没有</div>`}
        <div class="cap">按微博分类自动汇总；同一观点可能出现在多条回复里。</div></section>`;
      m.querySelectorAll(".mt-chips button").forEach(b => b.onclick = () => { sel = window.__mt = b.dataset.k; draw(); });
    };
    draw();
  };

  // ⚡ 30秒速览（图表页最上面）
  window.renderQuick = async function (main, IDX) {
    const root = main.querySelector(".viz-root"); if (!root || main.querySelector(".quick")) return;
    const D0 = IDX.days[0]; if (!D0) return;
    let D; try { D = cache[D0.date] || await getJSON(`data/${D0.date}.json`); } catch (e) { return; }
    const recent = new Date(D0.date); recent.setDate(recent.getDate() - 2);
    const r0 = recent.toISOString().slice(0, 10);
    const W = (IDX.watch || []).filter(w => w.d >= r0);
    const sec = document.createElement("section");
    sec.className = "box quick";
    sec.innerHTML = `<h2>⚡ 30秒速览 <small>${md(D0.date)} ${esc(D0.weekday || "")} · ${D0.count} 条</small></h2>
      <ol>${D.highlights.slice(0, 3).map(x => `<li>${rich(x)}</li>`).join("")}</ol>
      <div class="qw">${W.length ? `🎯 最近更新的想买/加仓：${W.map(w => `<b>${esc(w.name.replace(/（.*/, ""))}</b>（${esc(w.st)}）`).join("、")}` : "🎯 最近两天想买/加仓清单没有变化"} · <a href="#" onclick="event.preventDefault();window.__goDay('${D0.date}')">看当天全部 ›</a></div>`;
    root.prepend(sec);
  };

  function boot() { header(); startGloss(); newsDot(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
