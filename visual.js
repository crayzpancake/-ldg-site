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
  ${W.map(w=>{const mt=meta(w),ref=refOf(w);return `<a class="wl-i" href="https://weibo.com/3962719063/${w.b}" target="_blank" rel="noopener"><div class="wl-t"><b class="wl-n">${esc(w.name)}</b><span class="wl-s">${esc(w.st)}</span></div>
   ${w.lv?`<div class="wl-lv">🎯 ${esc(w.lv)}${w.px?` <span>· 参考 ${esc(w.px)}</span>`:""}</div>`:(w.px?`<div class="wl-lv"><span>参考 ${esc(w.px)}</span></div>`:"")}
   ${mt.code?`<div class="wl-live" data-code="${esc(mt.code)}" data-rn="${esc(mt.rn)}" data-ref="${ref==null?"":ref}">现价读取中…</div>`:""}
   <div class="wl-x">${rich(w.x)}</div><div class="wl-d">${+w.d.slice(5,7)}/${+w.d.slice(8)} · 原文 ›</div></a>`;}).join("")}</section>`;
};
window.refreshWatch=async function(){
  const els=[...document.querySelectorAll(".wl-live[data-code]")];if(!els.length)return;
  const codes=[...new Set(els.map(e=>e.dataset.code))];
  try{
    const r=await fetch("/api/quote?s="+codes.join(","),{cache:"no-store"});if(!r.ok)throw new Error(r.status);
    const j=await r.json(),Q=j.q||{};
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
  }catch(err){els.forEach(e=>e.textContent="现价暂时连不上");}
};
})();
