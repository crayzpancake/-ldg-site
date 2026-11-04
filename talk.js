// 💬 留言板：每 10 秒自动刷新新留言
(function () {
  const API = "/api/comments";
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fmt = ts => {
    const d = new Date(ts), s = (Date.now() - ts) / 1000;
    if (s < 60) return "刚刚";
    if (s < 3600) return Math.floor(s / 60) + " 分钟前";
    if (s < 86400) return Math.floor(s / 3600) + " 小时前";
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const LS = {
    get: k => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  let items = [], timer = null, last = 0;

  function css() {
    if (document.getElementById("talk-css")) return;
    const st = document.createElement("style");
    st.id = "talk-css";
    st.textContent = `
#talk .tk-form{display:grid;gap:8px}
#talk input,#talk textarea{font:inherit;padding:9px 10px;border:1px solid var(--line,#ddd);border-radius:8px;background:transparent;color:inherit;width:100%;box-sizing:border-box}
#talk textarea{min-height:84px;resize:vertical}
#talk .tk-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#talk .tk-row input{flex:1;min-width:120px}
#talk button.tk-send{padding:9px 18px;border:0;border-radius:8px;background:#d92b2b;color:#fff;font-weight:600;cursor:pointer}
#talk button.tk-send:disabled{opacity:.5}
#talk .tk-msg{font-size:12px;color:#888;min-height:16px}
#talk .tk-msg.err{color:#d92b2b}
#talk .tk-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
#talk .tk-list{display:grid;gap:10px;margin-top:4px}
#talk .tk-item{padding:10px 12px;border:1px solid var(--line,#eee);border-radius:10px}
#talk .tk-item.new{animation:tkfade 1.6s ease}
@keyframes tkfade{from{background:rgba(217,43,43,.12)}to{background:transparent}}
#talk .tk-h{display:flex;gap:8px;align-items:baseline;font-size:12px;color:#888;margin-bottom:4px}
#talk .tk-h b{color:inherit;font-size:13px}
#talk .tk-h .sp{flex:1}
#talk .tk-h a{color:#888;cursor:pointer;text-decoration:none}
#talk .tk-t{white-space:pre-wrap;word-break:break-word;line-height:1.6}
#talk .tk-re{color:#d92b2b;margin-right:4px}
#talk .tk-live{display:inline-block;width:7px;height:7px;border-radius:50%;background:#2fb344;margin-right:5px;vertical-align:1px}
#talk .tk-foot{font-size:12px;color:#999;margin-top:10px}
#talk .tk-foot a{color:#999;cursor:pointer}
`;
    document.head.appendChild(st);
  }

  function itemHTML(c, isNew) {
    const admin = !!LS.get("ldg_admin");
    return `<div class="tk-item${isNew ? " new" : ""}" data-id="${esc(c.id)}">
      <div class="tk-h"><b>${esc(c.name)}</b><span>${fmt(c.ts)}</span><span class="sp"></span>
        <a data-re="${esc(c.name)}">回复</a>${admin ? ` · <a data-del="${esc(c.id)}">删除</a>` : ""}</div>
      <div class="tk-t">${c.re ? `<span class="tk-re">@${esc(c.re)}</span>` : ""}${esc(c.text)}</div></div>`;
  }

  function paint(newIds) {
    const box = document.querySelector("#talk .tk-list");
    if (!box) return;
    const shown = items.slice().reverse();
    box.innerHTML = shown.length ? shown.map(c => itemHTML(c, newIds && newIds.has(c.id))).join("")
      : `<div class="empty">还没有留言，来写第一条吧</div>`;
    const n = document.querySelector("#talk .tk-n");
    if (n) n.textContent = items.length;
  }

  async function pull(first) {
    if (!document.getElementById("talk")) { clearInterval(timer); timer = null; return; }
    try {
      const r = await fetch(`${API}?since=${first ? 0 : last}`, { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      const fresh = j.items.filter(c => !items.some(x => x.id === c.id));
      if (first) items = j.items; else items.push(...fresh);
      if (j.items.length) last = Math.max(last, ...j.items.map(c => c.ts));
      if (first || fresh.length) paint(first ? null : new Set(fresh.map(c => c.id)));
    } catch (e) {
      if (first) {
        const box = document.querySelector("#talk .tk-list");
        if (box) box.innerHTML = `<div class="empty">留言板暂时连不上，请稍后刷新。<br><small>（留言板只在 ludinggongfans.netlify.app 上能用）</small></div>`;
      }
    }
  }

  function setMsg(t, err) {
    const m = document.querySelector("#talk .tk-msg");
    if (m) { m.textContent = t; m.className = "tk-msg" + (err ? " err" : ""); }
  }

  async function send(form) {
    const btn = form.querySelector(".tk-send");
    const name = form.elements.name.value.trim(), text = form.elements.text.value.trim();
    if (text.length < 2) return setMsg("内容至少 2 个字", true);
    btn.disabled = true; setMsg("发送中…");
    try {
      const r = await fetch(API, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, text, re: form.dataset.re || "", website: form.elements.website.value }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "发送失败，请稍后再试");
      LS.set("ldg_name", name);
      form.elements.text.value = ""; form.dataset.re = ""; form.elements.text.placeholder = "说点什么：意见、建议、看法都可以";
      if (j.item && !items.some(x => x.id === j.item.id)) { items.push(j.item); last = Math.max(last, j.item.ts); paint(new Set([j.item.id])); }
      setMsg("已发表 ✓");
    } catch (e) { setMsg(e.message, true); }
    btn.disabled = false;
  }

  async function del(id) {
    const key = LS.get("ldg_admin");
    const r = await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: { "x-admin-key": key } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setMsg(j.error || "删除失败", true);
    items = items.filter(c => c.id !== id); paint(); setMsg("已删除");
  }

  window.renderTalk = function (m) {
    css();
    m.innerHTML = `<section class="box" id="talk">
      <h2>💬 留言板 <small><span class="tk-live"></span>实时更新 · 共 <span class="tk-n">0</span> 条</small></h2>
      <form class="tk-form" autocomplete="off">
        <div class="tk-row"><input name="name" maxlength="20" placeholder="昵称（可不填，默认“匿名”）" value="${esc(LS.get("ldg_name"))}"></div>
        <textarea name="text" maxlength="500" placeholder="说点什么：意见、建议、看法都可以"></textarea>
        <input class="tk-hp" name="website" tabindex="-1" aria-hidden="true">
        <div class="tk-row"><button class="tk-send" type="submit">发表</button><span class="tk-msg"></span></div>
      </form>
      <div class="tk-list"><div class="empty">加载中…</div></div>
      <div class="tk-foot">请文明发言，不发广告和他人隐私；不当留言会被删除。每人 20 秒内只能发一条，最多 500 字。 <a class="tk-admin">管理</a></div>
      <div class="tk-adm" hidden><div class="tk-row" style="margin-top:8px"><input type="password" placeholder="管理密码"><button class="tk-send" type="button">保存</button></div></div>
    </section>`;
    const form = m.querySelector("form");
    form.onsubmit = e => { e.preventDefault(); send(form); };
    m.querySelector(".tk-list").onclick = e => {
      const re = e.target.dataset.re, d = e.target.dataset.del;
      if (re) { form.dataset.re = re; form.elements.text.placeholder = `回复 @${re}：`; form.elements.text.focus(); }
      if (d) del(d);
    };
    const adm = m.querySelector(".tk-adm");
    m.querySelector(".tk-admin").onclick = () => { adm.hidden = !adm.hidden; };
    adm.querySelector("button").onclick = () => { LS.set("ldg_admin", adm.querySelector("input").value.trim()); adm.hidden = true; paint(); setMsg("管理模式已开启，每条留言旁会出现“删除”"); };
    items = []; last = 0;
    pull(true);
    clearInterval(timer);
    timer = setInterval(() => pull(false), 10000);
  };
})();
