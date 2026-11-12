// 📝 操作日志、🗓 月度总结、🔎 按股票看、最后更新时间、分享单日
(function () {
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rich = s => esc(s).replace(/&lt;(\/?)b&gt;/g, "<$1b>");
  const plain = s => String(s ?? "").replace(/<\/?b>/g, "");
  const wlink = (b, s) => s === "xq" ? `https://xueqiu.com/8790885129/${b}` : `https://weibo.com/3962719063/${b}`;
  const md = d => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
  const WD = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const ACT = /(买入|买了|加仓|加了|增仓|建仓|减仓|减了|止盈|卖出|卖了|清仓|走人|割肉|做了两波|吸筹|换仓|调仓|重点加|抄底)/;

  const css = document.createElement("style");
  css.textContent = `
.upd{margin:6px 0 0;font-size:13px;color:var(--mute)}.upd b{color:var(--ink,#222)}.upd .late{color:var(--red,#d00)}
.ops-m{margin:14px 0 6px;font-weight:700}
.ops{border-left:2px solid var(--line,#e6e1d9);margin-left:6px;padding-left:12px}
.ops .it{position:relative;margin:0 0 10px}
.ops .it:before{content:"";position:absolute;left:-18px;top:6px;width:10px;height:10px;border-radius:50%;background:var(--red,#d00)}
.ops .it.lv:before{background:#9aa}
.ops .d{font-size:12px;color:var(--mute)}.ops .a{font-weight:700;margin-right:6px}
.mo h3{margin:12px 0 4px;font-size:15px}.mo .kv{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}
.mo .kv div{background:var(--chip,#f3f0ea);border-radius:8px;padding:6px 10px;font-size:13px}
.stk{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px}.stk button{border:1px solid var(--line,#e6e1d9);background:var(--card,#fff);border-radius:999px;padding:5px 11px;font-size:14px;cursor:pointer}
.stk button.on{background:var(--red,#d00);color:#fff;border-color:var(--red,#d00)}.stk small{opacity:.7;margin-left:3px}
.shr{margin-left:6px;border:1px solid var(--line,#e6e1d9);background:var(--card,#fff);border-radius:8px;padding:4px 9px;font-size:13px;cursor:pointer}`;
  document.head.appendChild(css);

  const loadAll = async () => {
    const IDX = window.__IDX, cache = window.__cache;
    return (await Promise.all(IDX.days.filter(d => !d.live).map(d => cache[d.date] ? cache[d.date] : window.__getJSON(`data/${d.date}.json`).then(j => (cache[d.date] = j)).catch(() => null)))).filter(Boolean);
  };

  // ---------- 最后更新时间 ----------
  window.renderUpdated = function (IDX) {
    const h = document.querySelector("header"); if (!h || h.querySelector(".upd")) return;
    const d0 = (IDX.days.find(d => !d.live) || {}).date; if (!d0) return;
    const now = new Date(Date.now() + 8 * 3600e3), today = now.toISOString().slice(0, 10);
    const lag = Math.round((new Date(today) - new Date(d0)) / 864e5);
    const wd = WD[new Date(d0 + "T12:00:00+08:00").getDay()];
    const el = document.createElement("div"); el.className = "upd";
    el.innerHTML = `📅 内容已更新到 <b>${+d0.slice(5, 7)}月${+d0.slice(8, 10)}日（${wd}）</b>${lag >= 2 ? ` <span class="late">· 最近几天更新稍有延迟，会尽快补上</span>` : ""}`;
    const sub = h.querySelector(".sub"); (sub || h.querySelector("h1")).after(el);
  };

  // ---------- 📝 操作日志 ----------
  window.renderOps = function (m, IDX) {
    const sel = window.__opsAll ? "all" : "act";
    let rows = (IDX.tracker || []).map(r => ({ ...r, act: ACT.test(plain(r.x)) }));
    if (sel === "act") rows = rows.filter(r => r.act);
    rows.sort((a, b) => b.d.localeCompare(a.d));
    const byM = {}; rows.forEach(r => (byM[r.d.slice(0, 7)] = byM[r.d.slice(0, 7)] || []).push(r));
    m.innerHTML = `<section class="box"><h2>📝 操作日志 <small>他说过的买卖动作 · 只记原话</small></h2>
      <div class="stk"><button data-o="act" class="${sel === "act" ? "on" : ""}">只看买卖动作</button><button data-o="all" class="${sel === "all" ? "on" : ""}">含价位、看法</button></div>
      ${Object.keys(byM).map(k => `<div class="ops-m">${+k.slice(5)}月</div><div class="ops">${byM[k].map(r => `<div class="it${r.act ? "" : " lv"}"><div class="d">${md(r.d)}</div><span class="a">${esc(r.a)}</span>${rich(r.x)} <a href="${wlink(r.b)}" target="_blank" rel="noopener">原文</a></div>`).join("")}</div>`).join("") || `<div class="empty">暂无</div>`}
      <div class="cap">来自每天整理时记下的仓位/价位变动；他没明说的操作不会出现在这里。</div></section>`;
    m.querySelectorAll("[data-o]").forEach(b => b.onclick = () => { window.__opsAll = b.dataset.o === "all"; window.renderOps(m, IDX); });
  };

  // ---------- 🗓 月度总结 ----------
  const num = (s, re) => { const r = plain(s).match(re); return r ? +r[1] : null; };
  window.renderMonthly = async function (m, IDX) {
    m.innerHTML = `<div class="empty">正在汇总…</div>`;
    const all = await loadAll();
    const months = {};
    all.forEach(D => { const k = D.date.slice(0, 7); (months[k] = months[k] || []).push(D); });
    const keys = Object.keys(months).sort().reverse();
    const html = keys.map(k => {
      const ds = months[k].sort((a, b) => a.date.localeCompare(b.date));
      const posts = ds.reduce((n, D) => n + D.posts.length, 0);
      const cats = {}; ds.forEach(D => D.posts.forEach(p => { if (p.c) cats[p.c] = (cats[p.c] || 0) + 1; }));
      const top = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const series = (re) => { const v = []; ds.forEach(D => D.posts.forEach(p => { const x = num(p.x, re) ?? num(p.src && p.src.x, re); if (x) v.push([D.date, x]); })); return v; };
      const cci = series(/5500(?:大卡|K)\s*(\d{3,4})/), al = series(/A?00铝锭\s*无锡\s*(\d{5})/);
      const rng = (v, u) => v.length ? `${md(v[0][0])} ${v[0][1]} → ${md(v[v.length - 1][0])} <b>${v[v.length - 1][1]}</b>${u}` : "—";
      const ops = (IDX.tracker || []).filter(r => r.d.startsWith(k) && ACT.test(plain(r.x))).sort((a, b) => a.d.localeCompare(b.d));
      const wk = (IDX.weeks || []).filter(w => { const a = w.range.split(/[–-]/)[0]; return +a.split("/")[0] === +k.slice(5); });
      return `<section class="box mo"><h2>🗓 ${+k.slice(5)}月总结 <small>${ds.length}天 · 收录${posts}条</small></h2>
        <div class="kv"><div>动力煤 5500大卡：${rng(cci, "")}</div><div>A00铝锭（无锡）：${rng(al, " 元/吨")}</div><div>聊得最多：${top.map(([c, n]) => `${esc(c)} ${n}`).join("、") || "—"}</div></div>
        ${ops.length ? `<h3>他说过的买卖动作</h3><ul>${ops.map(r => `<li>${md(r.d)} <b>${esc(r.a)}</b>：${rich(r.x)}</li>`).join("")}</ul>` : ""}
        ${wk.length ? `<h3>每周要点</h3>${wk.map(w => `<details><summary>${esc(w.range)}</summary><ol class="hl">${w.items.map(x => `<li>${rich(x)}</li>`).join("")}</ol></details>`).join("")}` : ""}
      </section>`;
    }).join("");
    m.innerHTML = html + `<div class="cap" style="margin:8px 4px">数字取自他当月微博里发的价格；月度持仓推测见「🗂 持仓PS图」。</div>`;
  };

  // ---------- 🔎 按股票看 ----------
  const STOCKS = [
    ["中国神华", ["神华", "正宫"]], ["中煤能源", ["中煤", "西宫"]], ["陕西煤业", ["陕煤", "旧爱"]], ["潞安环能", ["潞安", "喷吹", "山西煤"]],
    ["陕西能源", ["陕西能源", "西安电厂"]], ["内蒙华电", ["内蒙华电", "猛男", "猛电"]], ["华能国际", ["华能"]], ["长江电力", ["长江电力", "长电", "大水电", "类现金", "水电"]],
    ["云铝股份", ["云铝", "绿铝"]], ["神火股份", ["神火", "门窗"]], ["中孚实业", ["中孚", "易拉罐"]], ["电解铝", ["电解铝", "铝锭", "沪铝"]],
    ["紫金矿业", ["紫金"]], ["黄金", ["黄金", "金价"]], ["云天化", ["云天化", "磷肥", "磷化工"]], ["中远海控", ["中远海控", "海狗"]], ["券商", ["券商", "广发"]]];
  window.renderStock = async function (m, IDX, name) {
    name = name || window.__stock || "云铝股份"; window.__stock = name;
    try { history.replaceState(null, "", "#stock=" + encodeURIComponent(name)); } catch (e) {}
    const st = STOCKS.find(s => s[0] === name) || [name, [name]];
    m.innerHTML = `<section class="box"><h2>🔎 按股票看 <small>点一个，看他所有提到它的发言（含外号）</small></h2><div class="stk">${STOCKS.map(s => `<button data-s="${esc(s[0])}" class="${s[0] === name ? "on" : ""}">${esc(s[0])}</button>`).join("")}</div><div id="stk-r"><div class="empty">读取中…</div></div></section>`;
    m.querySelectorAll("[data-s]").forEach(b => b.onclick = () => window.renderStock(m, IDX, b.dataset.s));
    const all = await loadAll(); if (window.__stock !== name) return;
    const words = st[1].concat(st[0]);
    const re = new RegExp("(" + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "g");
    const hits = [];
    all.sort((a, b) => b.date.localeCompare(a.date)).forEach(D => D.posts.forEach(p => {
      const t = plain(p.x) + " " + plain(p.q) + " " + plain(p.note) + " " + plain(p.src && p.src.x);
      if (words.some(w => t.includes(w))) hits.push([D, p]);
    }));
    const hl = s => esc(plain(s)).replace(re, "<mark>$1</mark>");
    const lv = (IDX.levels || []).find(l => l.name === name || words.some(w => l.name.includes(w)));
    m.querySelector("#stk-r").innerHTML = (lv ? `<div class="ps-why">📌 他提过的价位：${lv.lv && lv.lv.length ? lv.lv.map(x => `${esc(x.a)} ${x.txt || x.p}${esc(lv.unit)}`).join("；") : esc(lv.cond || "")}（详见「📌 价位/仓位追踪」）</div>` : "") +
      `<div class="cap">共 ${hits.length} 条，新的在上</div>` +
      (hits.slice(0, 150).map(([D, p]) => `<div class="sr-hit"><div class="sr-m"><span><a href="#d${D.date.replace(/-/g, "")}" onclick="event.preventDefault();window.__goDay('${D.date}')">${md(D.date)}</a> ${esc(p.t)} · ${esc(p.c || "")}</span><a href="${wlink(p.b, p.s)}" target="_blank" rel="noopener">原文</a></div>${p.q ? `<div style="color:var(--mute)">问：${hl(p.q)}</div>` : ""}<div>${hl(p.x)}</div>${p.src ? `<div style="color:var(--mute);font-size:13px">${esc(p.src.u)}：${hl(String(p.src.x || "").slice(0, 200))}</div>` : ""}</div>`).join("") || `<div class="empty">还没有提到它的发言</div>`);
  };

  // ---------- 分享单日 ----------
  window.shareDay = async function (date) {
    const url = `${location.origin}/d/${date}`;
    try { if (navigator.share) { await navigator.share({ title: `鹿公微博汇总 · ${md(date)}`, url }); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(url); } catch (e) { prompt("复制这个链接", url); return; }
    const t = document.createElement("div"); t.textContent = "链接已复制，发给朋友就能打开这一天"; t.style.cssText = "position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:8px 14px;border-radius:20px;z-index:99;font-size:14px";
    document.body.appendChild(t); setTimeout(() => t.remove(), 2000);
  };
})();
