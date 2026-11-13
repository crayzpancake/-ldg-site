/* 两种可视化：每日信息图 & 观点导图（都从数据现算，每天自动更新） */
(function(){
const STRIP=s=>String(s||"").replace(/<[^>]+>/g,"");
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const rich=s=>esc(s).replace(/&lt;(\/?)b&gt;/g,"<$1b>");
const link=(b,src)=>src==="xq"?`https://xueqiu.com/8790885129/${b}`:`https://weibo.com/3962719063/${b}`;
// 固定分类→颜色（颜色跟着分类走，不随排名变）
const CAT_COLOR={"电解铝":1,"煤炭":2,"持仓与收益":3,"黄金白银":4,"利率与宏观":5,"市场与大盘":6,"方法论":7,"水电":8};
const colorOf=c=>CAT_COLOR[c]?`var(--c${CAT_COLOR[c]})`:(c==="闲聊"?"var(--s0)":"var(--c0)");
const ICON={"电解铝":"🏭","煤炭":"⛏️","持仓与收益":"💼","黄金白银":"🥇","利率与宏观":"🏦","市场与大盘":"📈","方法论":"🧭","水电":"💧","火电":"⚡","铜":"🔶","券商银行":"🏛️","房地产":"🏠","石油化工":"🛢️","磷化工":"🧪","投资圈":"👥","其他个股":"📊"};

function donut(parts,total){
  const R=54,r=34,C=2*Math.PI;let a=-Math.PI/2;let s="";
  parts.forEach(p=>{const ang=C*p.v/total;if(ang<=0)return;const gap=parts.length>1?0.03:0;const a0=a+gap/2,a1=a+ang-gap/2;const L=a1-a0>Math.PI?1:0;
    const P=(rad,ang)=>[60+rad*Math.cos(ang),60+rad*Math.sin(ang)];
    const [x0,y0]=P(R,a0),[x1,y1]=P(R,a1),[x2,y2]=P(r,a1),[x3,y3]=P(r,a0);
    s+=`<path d="M${x0},${y0}A${R},${R} 0 ${L} 1 ${x1},${y1}L${x2},${y2}A${r},${r} 0 ${L} 0 ${x3},${y3}Z" fill="${p.color}"><title>${p.label} ${p.v}条</title></path>`;a+=ang;});
  return `<svg viewBox="0 0 120 120" width="120" height="120">${s}<text x="60" y="58" text-anchor="middle" class="dn-v">${total}</text><text x="60" y="74" text-anchor="middle" class="dn-l">条微博</text></svg>`;
}

window.renderInfographic=function(D){
  const counts={};D.posts.forEach(p=>{const c=p.c||"闲聊";counts[c]=(counts[c]||0)+1;});
  const inv=Object.entries(counts).filter(([c])=>c!=="闲聊").sort((a,b)=>b[1]-a[1]);
  const top=inv.slice(0,5),rest=inv.slice(5).reduce((s,x)=>s+x[1],0);
  const parts=top.map(([c,v])=>({label:c,v,color:colorOf(c)}));
  if(rest)parts.push({label:"其他投资话题",v:rest,color:"var(--c0)"});
  if(counts["闲聊"])parts.push({label:"闲聊",v:counts["闲聊"],color:"var(--s0)"});
  // 当天价格
  let alu=null,cci=null;
  D.posts.forEach(p=>{const t=STRIP(p.x);let m=t.match(/A00铝锭\s*无锡\s*(\d{4,6})\s*([+-]?\d+)?/);if(m)alu={v:m[1],c:m[2]};m=t.match(/CCI指数[\s\S]*?5500大卡\s*(\d{3,4})\s*[（(]\s*([+-]?\d+)/);if(m)cci={v:m[1],c:m[2]};});
  const chip=(name,o,unit)=>o?`<div class="ig-chip"><div class="ig-chip-l">${name}</div><div class="ig-chip-v">${o.v}<small>${unit}</small></div>${o.c!=null?`<div class="ig-chip-c ${+o.c>0?"up":+o.c<0?"dn":""}">${+o.c>0?"▲ +"+(+o.c):+o.c<0?"▼ "+o.c:"持平"}</div>`:""}</div>`:"";
  // 要点
  const hls=(D.highlights||[]).map(h=>{const m=h.match(/^［(.+?)］(.*)$/);return m?{c:m[1],x:m[2]}:{c:null,x:h};});
  // 一组精选问答
  const qa=D.posts.filter(p=>p.q&&p.c!=="闲聊"&&/<b>/.test(p.x)).sort((a,b)=>STRIP(b.x).length-STRIP(a.x).length).slice(0,2);
  return `<div class="ig">
   <div class="ig-head"><div><div class="ig-date">${+D.date.slice(5,7)}月${+D.date.slice(8)}日 <span>${D.weekday||""}</span></div><div class="ig-sub">挖地瓜的超级鹿鼎公 · 今日微博信息图</div></div></div>
   <div class="ig-top">
     <div class="ig-donut">${donut(parts,D.count)}</div>
     <div class="ig-legend">${parts.map(p=>`<div><i style="background:${p.color}"></i>${ICON[p.label]||""} ${esc(p.label)} <b class="n">${p.v}</b></div>`).join("")}</div>
   </div>
   ${alu||cci?`<div class="ig-chips">${chip("A00铝锭",alu,"元/吨")}${chip("动力煤CCI5500",cci,"元/吨")}</div>`:""}
   ${D.posts.some(p=>p.buy)?`<div class="ig-sec" style="color:var(--red)">🎯 想买 / 想加仓</div>${D.posts.filter(p=>p.buy).map(p=>`<div class="ig-card" style="--k:var(--red);background:var(--soft)"><div class="ig-num">🎯</div><div>${p.q?`<div class="ig-tag">${rich(p.q)}</div>`:""}<div class="ig-txt">${rich(p.x)}</div></div></div>`).join("")}`:""}
   <div class="ig-sec">今日要点</div>
   <div class="ig-cards">${hls.map((h,i)=>`<div class="ig-card" style="--k:${h.c?colorOf(h.c):"var(--red)"}"><div class="ig-num">${i+1}</div><div>${h.c?`<div class="ig-tag">${ICON[h.c]||""} ${esc(h.c)}</div>`:""}<div class="ig-txt">${rich(h.x)}</div></div></div>`).join("")}</div>
   ${qa.length?`<div class="ig-sec">网友问 · 他答</div>${qa.map(p=>`<div class="ig-qa"><div class="ig-q">${rich(p.q)}</div><div class="ig-a">${rich(p.x)}</div><a href="${link(p.b,p.s)}" target="_blank" rel="noopener">原文</a></div>`).join("")}`:""}
  </div>`;
};

window.renderTodayPaper=function(D,IDX){
  window.__today=D;
  const buys=(D.posts||[]).filter(p=>p.buy);
  const W=(IDX.watch||[]).slice().sort((a,b)=>b.d.localeCompare(a.d)).slice(0,3);
  const hero=`<section class="today-hero"><div class="th-top"><div class="today-seal">鹿</div><div><h1>今日一页纸</h1><div class="th-sub">${D.date} ${esc(D.weekday||"")} · 挖地瓜的超级鹿鼎公 · 共 ${D.count} 条微博</div></div><span class="today-status">${D.live?"实时更新中":"已整理"}</span></div>
  <div class="th-prices">
    <div class="th-price"><div class="l">云铝股份 · 现价</div><div class="v" data-today-code="sz000807">读取中</div><div class="s" data-today-sub="sz000807">电解铝代表标的</div></div>
    <div class="th-price"><div class="l">黄金 · 现价</div><div class="v" data-today-code="nf_AU0">读取中</div><div class="s" data-today-sub="nf_AU0">上期所黄金主力</div></div>
    <div class="th-price"><div class="l">紫金矿业 · 现价</div><div class="v" data-today-code="sh601899">读取中</div><div class="s" data-today-sub="sh601899">有色龙头</div></div>
  </div>
  <div class="th-watch">${buys.length?`🎯 <b>今天他说想买/想加仓 ${buys.length} 条</b>，往下翻信息图里有原文。`:`🎯 今天没有新的想买/想加仓表态。`}${W.length?`<br>最近关注清单：${W.map(w=>`<b>${esc(String(w.name||"").replace(/（.*/,""))}</b>（${esc(w.st||"")}）`).join("、")}`:""}</div>
  <div class="th-actions"><button type="button" onclick="window.makePoster&&window.makePoster()">🖼 生成转发图</button><button type="button" onclick="window.__dayMode='text';window.__go('${D.date}')">📝 看今日文字版</button><button type="button" class="alt" onclick="window.__go('track')">📌 看价位离多远</button><button type="button" class="alt" onclick="window.__go('charts')">📊 看图表</button></div></section>`;
  return hero+window.renderInfographic(D);
};
async function quoteJSON(codes){let err;for(let i=0;i<2;i++){try{const r=await fetch("/api/quote?s="+codes.join(","),{cache:"no-store"});if(!r.ok)throw new Error(r.status);return await r.json();}catch(e){err=e;if(!i)await new Promise(rs=>setTimeout(rs,1200));}}throw err;}
window.refreshTodayPaper=async function(){
  const els=[...document.querySelectorAll("[data-today-code]")];if(!els.length)return;
  const codes=[...new Set(els.map(e=>e.dataset.todayCode))];
  try{
    const j=await quoteJSON(codes),Q=j.q||{};
    els.forEach(e=>{const q=Q[e.dataset.todayCode];const sub=document.querySelector(`[data-today-sub="${e.dataset.todayCode}"]`);
      if(!q||!(q.px>0)){e.textContent="暂未刷到";return;}
      e.textContent=q.px.toFixed(2);
      if(sub)sub.textContent=`${q.chg!=null?(q.chg>=0?"+":"")+q.chg.toFixed(2)+"%":""}${q.t?" · "+q.t:""}`;});
  }catch(err){els.forEach(e=>e.textContent="暂未刷到");}
  if(window.__awayCheck)window.__awayCheck();
};
// 🔔 回访提醒：上次访问之后、到今天之间，有价位被触及过就提示一句
window.__awayCheck=async function(){
  if(window.__awayDone)return; window.__awayDone=true;
  try{
    const cn=new Date(Date.now()+8*3600e3), today=cn.toISOString().slice(0,10);
    const prev=localStorage.getItem("ldg_lastvisit"); localStorage.setItem("ldg_lastvisit",today);
    if(!prev||prev>=today||!window.LDGhits||!window.__IDX)return;
    const evs=await window.LDGhits(window.__IDX);
    const mine=evs.filter(e=>e.date>prev&&e.date<=today).slice(0,3);
    if(!mine.length)return;
    const hero=document.querySelector(".today-hero"); if(!hero)return;
    const div=document.createElement("div");
    div.style.cssText="margin:0 0 10px;padding:9px 12px;border-radius:10px;background:var(--soft);border:1px solid var(--red);font-size:13.5px;line-height:1.6";
    div.innerHTML="🔔 <b>你不在时到价了</b>："+mine.map(e=>`${e.name}「${e.a} ${e.p}${e.unit==="元/克"?" 元/克":" 元"}」${e.date.slice(5).replace("-","/")} 盘中触及`).join("；")+" <a href=\"#track\" style=\"color:var(--red)\">去价位页看 ›</a>";
    hero.parentNode.insertBefore(div,hero);
  }catch(e){}
};
// 🖼 今日转发图：把一页纸画成竖版长图，方便存图转发
window.makePoster=function(){
  const D=window.__today; if(!D)return;
  const W=1080,M=64,CW=W-M*2;
  const cv=document.createElement("canvas"); const ctx=cv.getContext("2d");
  const F=(px,w)=>`${w||400} ${px}px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif`;
  const wrap=(text,px,max)=>{ctx.font=F(px);const out=[];let line="";for(const ch of String(text||"")){if(ctx.measureText(line+ch).width>max&&line){out.push(line);line=ch;}else line+=ch;}if(line)out.push(line);return out;};
  const names={"sz000807":"云铝股份","nf_AU0":"黄金","sh601899":"紫金矿业"};
  const prices=Object.keys(names).map(c=>{const v=document.querySelector(`[data-today-code="${c}"]`),sub=document.querySelector(`[data-today-sub="${c}"]`);return{name:names[c],v:v?v.textContent.trim():"—",s:sub?sub.textContent.trim():""};});
  const hls=(D.highlights||[]).slice(0,3).map(h=>{const m=String(h).match(/^［(.+?)］(.*)$/);return m?{c:m[1],x:m[2]}:{c:"",x:String(h)};});
  const hlLines=hls.map(h=>wrap((h.c?h.c+" · ":"")+STRIP(h.x),40,CW-70));
  const buys=(D.posts||[]).filter(p=>p.buy).length;
  let H=64+92+16+44+30+prices.length*64+36+ (buys?52:0) + hlLines.reduce((a,l)=>a+l.length*58+18,0) + 130;
  cv.width=W; cv.height=H;
  ctx.fillStyle="#faf7f1"; ctx.fillRect(0,0,W,H);
  let y=64;
  ctx.fillStyle="#c0392b"; ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(M,y,92,92,14); else ctx.rect(M,y,92,92); ctx.fill();
  ctx.fillStyle="#fff"; ctx.font=F(58,700); ctx.textAlign="center"; ctx.fillText("鹿",M+46,y+66); ctx.textAlign="left";
  ctx.fillStyle="#1a1a1a"; ctx.font=F(56,700); ctx.fillText("今日一页纸",M+116,y+62);
  ctx.fillStyle="#6e6862"; ctx.font=F(30); ctx.fillText(`${D.date} ${D.weekday||""} · 挖地瓜的超级鹿鼎公 · 共 ${D.count} 条微博`,M+118,y+98-34+38);
  y+=92+30;
  ctx.strokeStyle="#e3ddd2"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(M,y); ctx.lineTo(W-M,y); ctx.stroke(); y+=26;
  prices.forEach(p=>{ ctx.fillStyle="#6e6862"; ctx.font=F(32); ctx.fillText(p.name,M,y+38);
    ctx.fillStyle="#1a1a1a"; ctx.font=F(44,700); const vw=ctx.measureText(p.v).width; ctx.fillText(p.v,W-M-vw,y+42);
    ctx.fillStyle=p.s.startsWith("-")?"#1a9a4a":(p.s.startsWith("+")?"#d00":"#6e6862"); ctx.font=F(28); const sw=ctx.measureText(p.s).width; ctx.fillText(p.s,W-M-vw-18-sw,y+42); y+=64; });
  y+=10;
  if(buys){ ctx.fillStyle="#c0392b"; ctx.font=F(34,700); ctx.fillText(`🎯 今天他说想买 / 想加仓 ${buys} 条`,M,y+36); y+=52; }
  ctx.fillStyle="#1a1a1a"; ctx.font=F(38,700); ctx.fillText("今日要点",M,y+40); y+=58;
  hlLines.forEach((lines,i)=>{ ctx.fillStyle="#c0392b"; ctx.font=F(40,700); ctx.fillText(String(i+1),M,y+42);
    ctx.fillStyle="#26221e"; ctx.font=F(40); lines.forEach((ln,j)=>ctx.fillText(ln,M+56,y+42+j*58)); y+=lines.length*58+18; });
  y+=26; ctx.strokeStyle="#e3ddd2"; ctx.beginPath(); ctx.moveTo(M,y); ctx.lineTo(W-M,y); ctx.stroke();
  ctx.fillStyle="#6e6862"; ctx.font=F(28); ctx.fillText("鹿鼎公日报 · ludinggongfans.netlify.app",M,y+48);
  ctx.fillStyle="#a39c92"; ctx.font=F(24); ctx.fillText("整理自公开微博，不构成投资建议",M,y+84);
  const url=cv.toDataURL("image/png");
  const ov=document.createElement("div");
  ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:18px";
  ov.innerHTML=`<img src="${url}" alt="今日转发图" style="max-width:min(92vw,430px);max-height:72vh;border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.4)"><div style="display:flex;gap:10px"><a href="${url}" download="鹿鼎公日报-${D.date}.png" style="background:#c0392b;color:#fff;padding:10px 20px;border-radius:999px;font-size:15px;text-decoration:none">保存图片</a><button type="button" style="background:#fff;color:#222;padding:10px 20px;border-radius:999px;font-size:15px;border:0">关闭</button></div><div style="color:#ddd;font-size:13px">手机上也可以长按图片保存，再发到微信群</div>`;
  ov.querySelector("button").onclick=()=>ov.remove(); ov.onclick=e=>{if(e.target===ov)ov.remove();};
  document.body.appendChild(ov);
};

window.renderMindmap=function(IDX){
  const groups={};(IDX.tracker||[]).forEach(r=>{(groups[r.a]=groups[r.a]||[]).push(r);});
  const order=["仓位结构","电解铝","煤炭","黄金","白银","水电","紫金","磷肥","铜","券商","利率","石油化工","方法论"];
  const names=Object.keys(groups).sort((a,b)=>(order.indexOf(a)<0?99:order.indexOf(a))-(order.indexOf(b)<0?99:order.indexOf(b)));
  const iconA={"仓位结构":"💼","电解铝":"🏭","煤炭":"⛏️","黄金":"🥇","白银":"🥈","水电":"💧","紫金":"⛰️","磷肥":"🧪","铜":"🔶","券商":"🏛️","利率":"🏦","石油化工":"🛢️","方法论":"🧭"};
  const colA={"仓位结构":3,"电解铝":1,"煤炭":2,"黄金":4,"白银":4,"利率":5,"方法论":7,"水电":8};
  return `<div class="mm">
    <div class="mm-root">🧠 超级鹿鼎公的观点地图<small>${names.length} 个主题 · 每个主题按时间排列，最新的在最下面</small></div>
    <div class="mm-branches">${names.map(n=>{const rows=groups[n].slice().sort((a,b)=>a.d.localeCompare(b.d));const shown=rows.slice(-5);
      const k=colA[n]?`var(--c${colA[n]})`:"var(--c0)";
      return `<details class="mm-b" style="--k:${k}" ${["仓位结构","电解铝","煤炭","黄金"].includes(n)?"open":""}><summary><span class="mm-node">${iconA[n]||"•"} ${esc(n)}</span><span class="mm-n">${rows.length}条</span></summary>
        <div class="mm-leaves">${rows.length>shown.length?`<div class="mm-more">更早还有 ${rows.length-shown.length} 条，见「📌 价位/仓位追踪」</div>`:""}${shown.map(r=>`<div class="mm-leaf"><span class="mm-d">${+r.d.slice(5,7)}/${+r.d.slice(8)}</span><span>${rich(r.x)} <a href="${link(r.b)}" target="_blank" rel="noopener">原文</a></span></div>`).join("")}</div></details>`;}).join("")}</div>
  </div>`;
};
})();
/* 🎯 想买/想加仓 关注清单 */
(function(){
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const rich=s=>esc(s).replace(/&lt;(\/?)b&gt;/g,"<$1b>");
// 旧数据没有 code 时按名字兜底（新数据在 index.json 的 watch 里带 code/rn：代表标的代码与简称）
const FALLBACK=[["电解铝","sz000807","云铝"],["山西煤","sh601699","潞安"],["云天化","sh600096","云天化"],["黄金","nf_AU0","金价"],["紫金","sh601899","紫金"],["火电","sh600011","华能"]];
const meta=w=>{if(w.code)return{code:w.code,rn:w.rn||""};const f=FALLBACK.find(x=>String(w.name||"").includes(x[0]));return f?{code:f[1],rn:f[2]}:{code:"",rn:""};};
const refOf=w=>{const all=String(w.px||"").match(/\d[\d,]*\.?\d*/g);return all?parseFloat(all[all.length-1].replace(/,/g,"")):null;}; // 取最后一个数字：px 形如「10/30 云铝 25.36」，日期在前、价格在最后
window.renderWatch=function(IDX){
  const W=(IDX.watch||[]).slice().sort((a,b)=>b.d.localeCompare(a.d));if(!W.length)return"";
  return `<section class="wl"><div class="wl-h">🎯 他想买 / 想加仓的 <small>重点关注 · ${W.length} 个</small></div>
  ${W.map(w=>{const mt=meta(w),ref=refOf(w);return `<article class="wl-i"><div class="wl-t"><b class="wl-n">${esc(w.name)}</b><span class="wl-s">${esc(w.st)}</span></div>
   ${w.lv?`<div class="wl-lv">🎯 ${esc(w.lv)}${w.px?` <span>· 参考 ${esc(w.px)}</span>`:""}</div>`:(w.px?`<div class="wl-lv"><span>参考 ${esc(w.px)}</span></div>`:"")}
   ${mt.code?`<div class="wl-live" data-code="${esc(mt.code)}" data-rn="${esc(mt.rn)}" data-ref="${ref==null?"":ref}">现价读取中…</div>`:""}
   <div class="wl-bar" data-bar="${esc(mt.code)}" hidden><i></i></div><div class="wl-spark" data-spark="${esc(mt.code)}"></div><div class="wl-x">${rich(w.x)}</div><div class="wl-d">${+w.d.slice(5,7)}/${+w.d.slice(8)} · <a href="https://weibo.com/3962719063/${w.b}" target="_blank" rel="noopener">原文 ›</a></div></article>`;}).join("")}</section>`;
};
window.refreshWatch=async function(){
  const els=[...document.querySelectorAll(".wl-live[data-code]")];if(!els.length)return;
  const codes=[...new Set(els.map(e=>e.dataset.code))];
  try{
    const j=await quoteJSON(codes),Q=j.q||{};
    els.forEach(e=>{
      const q=Q[e.dataset.code];
      if(!q||!(q.px>0)){e.textContent="现价暂时连不上";return;}
      const rn=e.dataset.rn||"代表标的",ref=parseFloat(e.dataset.ref);
      let t=`${rn}现价 <b>${q.px.toFixed(2)}</b>`;
      if(q.chg!=null)t+=`（${q.chg>=0?"+":""}${(+q.chg).toFixed(2)}%）`;
      if(ref>0){const d=(q.px/ref-1)*100;t+=` · 较参考价 ${d>=0?"+":""}${d.toFixed(1)}%`;}
      if(q.t)t+=` · ${q.t}`;
      e.innerHTML=t;
    });
    els.forEach(e=>{
      const bar=document.querySelector(`.wl-bar[data-bar="${e.dataset.code}"]`);
      if(!bar)return; const q=Q[e.dataset.code],ref=parseFloat(e.dataset.ref);
      if(!q||!(q.px>0)||!(ref>0)){bar.hidden=true;return;}
      const d=Math.abs(q.px/ref-1)*100;
      const i=bar.querySelector("i"); i.style.width=Math.max(4,100-Math.min(100,d*4))+"%"; i.style.background=q.px<=ref?"#1a9a4a":"var(--red)";
      bar.hidden=false;
    });
  }catch(err){els.forEach(e=>e.textContent="现价暂时连不上");}
};
const WSPARK={};
window.loadWatchSparks=async function(){
  const els=[...document.querySelectorAll(".wl-spark[data-spark]")].filter(e=>e.dataset.spark&&!e.dataset.done);
  if(!els.length)return;
  const codes=[...new Set(els.map(e=>e.dataset.spark))].filter(c=>c);
  try{
    const r=await fetch("/api/kline?s="+codes.join(",")+"&n=30");if(!r.ok)throw new Error(r.status);
    const j=await r.json(),K=j.k||{};
    els.forEach(e=>{
      e.dataset.done="1"; const rows=(K[e.dataset.spark]||[]).slice(-20);
      if(rows.length<3){e.innerHTML="";return;}
      if(!WSPARK[e.dataset.spark]){
        const ys=rows.map(x=>x[1]),lo=Math.min(...ys),hi=Math.max(...ys),W=260,H=30;
        const pts=rows.map((x,i)=>`${(i/(rows.length-1)*W).toFixed(1)},${(H-3-(x[1]-lo)/((hi-lo)||1)*(H-6)).toFixed(1)}`).join(" ");
        const up=ys[ys.length-1]>=ys[0];
        WSPARK[e.dataset.spark]=`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${up?"#d00":"#1a9a4a"}" stroke-width="1.6"/></svg><div class="wl-spark-s">${rows[0][0].slice(5)} – ${rows[rows.length-1][0].slice(5)} · 近20日</div>`;
      }
      e.innerHTML=WSPARK[e.dataset.spark];
    });
  }catch(err){els.forEach(e=>{e.dataset.done="1";e.innerHTML="";});}
};
})();
