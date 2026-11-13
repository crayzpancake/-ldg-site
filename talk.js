// 💬 留言板：大屏放在右侧空白处，手机上是右下角的“留言”按钮 + 底部抽屉。匿名，不用昵称，每 10 秒自动刷新。
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
  let items = [], last = 0, re = 0, unread = 0, ok = true;

  const st = document.createElement("style");
  st.textContent = `
#tk{position:fixed;z-index:50;background:var(--card,#fff);color:var(--ink,#222);border:1px solid var(--line,#e6e1d9);display:flex;flex-direction:column;font-size:13px;line-height:1.55;box-shadow:0 6px 24px rgba(0,0,0,.08)}
#tk .tk-hd{display:flex;align-items:center;gap:6px;padding:9px 12px 6px;font-weight:700;font-size:14px}
#tk .tk-hd small{font-weight:400;color:var(--mute,#888);font-size:12px}
#tk .tk-hd .sp{flex:1}
#tk .tk-x{display:none;border:0;background:none;color:var(--mute,#888);font-size:20px;cursor:pointer;line-height:1}
#tk .tk-live{display:inline-block;width:7px;height:7px;border-radius:50%;background:#2fb344;margin-right:4px;vertical-align:1px}
#tk .tk-list{flex:1;overflow-y:auto;padding:2px 12px 6px;display:flex;flex-direction:column;gap:6px;min-height:60px}
#tk .tk-item{padding:6px 9px;border-radius:8px;background:var(--chip,#f3f0ea)}
#tk .tk-item.new{animation:tkfade 1.8s ease}
@keyframes tkfade{from{box-shadow:inset 0 0 0 2px var(--red,#d00)}to{box-shadow:inset 0 0 0 0 transparent}}
#tk .tk-h{display:flex;gap:6px;font-size:11px;color:var(--mute,#888)}
#tk .tk-h .sp{flex:1}
#tk .tk-h a{color:var(--mute,#888);cursor:pointer}
#tk .tk-t{white-space:pre-wrap;word-break:break-word}
#tk .tk-item.adm{background:#fdecec;border-left:3px solid var(--red,#d00)}
#tk .tk-item.adm .tk-t{color:var(--red,#d00);font-weight:600}
#tk .tk-badge{background:var(--red,#d00);color:#fff;border-radius:4px;padding:0 5px;font-size:10px;font-weight:700}
#tk .tk-re{color:var(--red,#d00);margin-right:4px;cursor:pointer}
#tk .tk-empty{color:var(--mute,#888);font-size:13px;text-align:center;padding:24px 0}
#tk form{border-top:1px solid var(--line,#e6e1d9);padding:8px 12px 8px;display:grid;gap:5px}
#tk .tk-reply{font-size:12px;color:var(--red,#d00);display:none}
#tk .tk-reply a{color:var(--mute,#888);cursor:pointer;margin-left:6px}
#tk textarea{font:inherit;padding:6px 8px;border:1px solid var(--line,#ddd);border-radius:7px;background:transparent;color:inherit;resize:none;height:44px;box-sizing:border-box;width:100%}
#tk .tk-row{display:flex;gap:8px;align-items:center}
#tk .tk-send{padding:4px 12px;border:0;border-radius:8px;background:var(--red,#d00);color:#fff;font-weight:600;cursor:pointer;font-size:13px}
#tk .tk-send:disabled{opacity:.5}
#tk .tk-msg{font-size:12px;color:var(--mute,#888);flex:1}
#tk .tk-msg.err{color:var(--red,#d00)}
#tk .tk-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
#tk .tk-ft{font-size:10.5px;color:var(--mute,#999);padding:0 12px 8px;line-height:1.4}
#tk .tk-ft a{color:var(--mute,#999);cursor:pointer}
#tk .tk-adm input{font:inherit;font-size:13px;padding:5px 8px;border:1px solid var(--line,#ddd);border-radius:6px;background:transparent;color:inherit;flex:1}
#tkbtn{display:none;position:fixed;right:14px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:49;border:0;border-radius:999px;padding:10px 16px;background:var(--red,#d00);color:#fff;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(0,0,0,.2);cursor:pointer}
#tkbtn b{display:none;margin-left:6px;background:#fff;color:var(--red,#d00);border-radius:999px;padding:0 7px;font-size:12px}
/* 宽屏：放在正文右侧空白处 */
@media (min-width:1360px){#tk{top:16px;left:calc(50% + 396px);width:260px;max-height:min(680px,calc(100vh - 32px));border-radius:12px}}
/* 中等屏：正文和留言栏一起居中 */
@media (min-width:1080px) and (max-width:1359px){.wrap{margin-left:calc((100vw - 1036px)/2)!important}#tk{top:16px;left:calc((100vw - 1036px)/2 + 776px);width:260px;max-height:min(680px,calc(100vh - 32px));border-radius:12px}}
/* 手机/窄屏：右下角按钮 + 底部抽屉 */
@media (max-width:1079px){
 #tk{left:0;right:0;bottom:0;height:min(86vh,680px);padding-bottom:env(safe-area-inset-bottom,0px);border-radius:16px 16px 0 0;transform:translateY(105%);transition:transform .25s ease}
 #tk.open{transform:none}
 #tk .tk-x{display:block}
 #tkbtn{display:block}
 #tk.open ~ #tkbtn{display:none}
}`;
  document.head.appendChild(st);

  const box = document.createElement("aside");
  box.id = "tk";
  box.innerHTML = `
    <div class="tk-hd">💬 留言板 <small><span class="tk-live"></span>实时 · <span class="tk-n">0</span> 条</small><span class="sp"></span><button class="tk-x" aria-label="收起">×</button></div>
    <div class="tk-list"><div class="tk-empty">加载中…</div></div>
    <form autocomplete="off">
      <div class="tk-reply"></div>
      <textarea name="text" maxlength="500" placeholder="匿名留言：意见、建议、看法都可以"></textarea>
      <input class="tk-hp" name="website" tabindex="-1" aria-hidden="true">
      <div class="tk-row"><span class="tk-msg"></span><button class="tk-send" type="submit">发表</button></div>
    </form>
    <div class="tk-ft">匿名发言，请文明；不当留言会被删除。 <a class="tk-admin">管理</a></div>
    <div class="tk-ft tk-adm" hidden><div class="tk-row"><input type="password" placeholder="管理密码"><button class="tk-send" type="button">保存</button></div></div>`;
  const btn = document.createElement("button");
  btn.id = "tkbtn";
  btn.innerHTML = `💬 留言<b></b>`;
  document.body.append(box, btn);

  const $ = s => box.querySelector(s);
  const form = $("form"), list = $(".tk-list"), msg = $(".tk-msg");
  const isDrawer = () => matchMedia("(max-width:1079px)").matches;
  const setMsg = (t, err) => { msg.textContent = t; msg.className = "tk-msg" + (err ? " err" : ""); };
  const badge = () => { const b = btn.querySelector("b"); b.textContent = unread; b.style.display = unread ? "inline-block" : "none"; };

  function itemHTML(c, isNew) {
    const admin = !!LS.get("ldg_admin");
    return `<div class="tk-item${isNew ? " new" : ""}${c.admin ? " adm" : ""}">
      <div class="tk-h"><span>#${c.n || ""}</span>${c.admin ? `<span class="tk-badge">管理员</span>` : ""}<span>${fmt(c.ts)}</span><span class="sp"></span><a data-re="${c.n || ""}">回复</a>${admin ? ` · <a data-del="${esc(c.id)}">删除</a>` : ""}</div>
      <div class="tk-t">${c.re ? `<span class="tk-re" data-go="${c.re}">回复 #${c.re}</span>` : ""}${esc(c.text)}</div></div>`;
  }
  function paint(newIds) {
    const atTop = list.scrollTop < 40;
    list.innerHTML = items.length ? items.slice().reverse().map(c => itemHTML(c, newIds && newIds.has(c.id))).join("")
      : `<div class="tk-empty">还没有留言，来写第一条吧</div>`;
    $(".tk-n").textContent = items.length;
    if (atTop) list.scrollTop = 0;
  }
  function setReply(n) {
    re = n || 0;
    const r = $(".tk-reply");
    r.style.display = re ? "block" : "none";
    r.innerHTML = re ? `回复 #${re}<a>取消</a>` : "";
    if (re) form.elements.text.focus();
  }

  async function pull(first) {
    try {
      const r = await fetch(`${API}?since=${first ? 0 : last}`, { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      const fresh = j.items.filter(c => !items.some(x => x.id === c.id));
      if (first) items = j.items; else items.push(...fresh);
      if (j.items.length) last = Math.max(last, ...j.items.map(c => c.ts));
      if (first || fresh.length) paint(first ? null : new Set(fresh.map(c => c.id)));
      if (!first && fresh.length && isDrawer() && !box.classList.contains("open")) { unread += fresh.length; badge(); }
      ok = true;
    } catch (e) {
      ok = false;
      if (first) list.innerHTML = `<div class="tk-empty">留言板暂时连不上，请稍后刷新<br><small>（只在 ludinggongfans.netlify.app 上可用）</small></div>`;
    }
  }

  form.onsubmit = async e => {
    e.preventDefault();
    const text = form.elements.text.value.trim();
    if (text.length < 2) return setMsg("至少写 2 个字", true);
    const sb = $(".tk-send"); sb.disabled = true; setMsg("发送中…");
    try {
      const hd = { "content-type": "application/json" }; if (LS.get("ldg_admin")) hd["x-admin-key"] = LS.get("ldg_admin");
      const r = await fetch(API, { method: "POST", headers: hd,
        body: JSON.stringify({ text, re, website: form.elements.website.value }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "发送失败，请稍后再试");
      form.elements.text.value = ""; setReply(0);
      if (j.item && !items.some(x => x.id === j.item.id)) { items.push(j.item); last = Math.max(last, j.item.ts); paint(new Set([j.item.id])); list.scrollTop = 0; }
      setMsg("已发表 ✓");
    } catch (err) { setMsg(err.message, true); }
    sb.disabled = false;
  };
  form.elements.text.onkeydown = e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) form.requestSubmit(); };

  list.onclick = async e => {
    const t = e.target;
    if (t.dataset.re) setReply(Number(t.dataset.re));
    if (t.dataset.go) {
      const i = items.findIndex(c => c.n === Number(t.dataset.go));
      const el = list.children[items.length - 1 - i];
      if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.classList.remove("new"); void el.offsetWidth; el.classList.add("new"); }
    }
    if (t.dataset.del) {
      const r = await fetch(`${API}?id=${encodeURIComponent(t.dataset.del)}`, { method: "DELETE", headers: { "x-admin-key": LS.get("ldg_admin") } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j.error || "删除失败", true);
      items = items.filter(c => c.id !== t.dataset.del); paint(); setMsg("已删除");
    }
  };
  $(".tk-reply").onclick = e => { if (e.target.tagName === "A") setReply(0); };
  $(".tk-admin").onclick = () => { const a = $(".tk-adm"); a.hidden = !a.hidden; };
  $(".tk-adm button").onclick = () => { LS.set("ldg_admin", $(".tk-adm input").value.trim()); $(".tk-adm").hidden = true; paint(); setMsg("管理模式已开启"); };
  const open = () => { if (isDrawer()) box.classList.add("open"); else box.scrollIntoView({ block: "nearest" }); unread = 0; badge(); setTimeout(() => form.elements.text.focus({ preventScroll: true }), 300); };
  window.openTalk = open;
  btn.onclick = open;
  $(".tk-x").onclick = () => box.classList.remove("open");

  pull(true);
  setInterval(() => { if (!document.hidden) pull(false); }, 10000);
})();
