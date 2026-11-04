/* 图表视图：全部从 data/*.json 现算，新的一天加入后自动更新 */
(function(){
const NS="http://www.w3.org/2000/svg";
const css=v=>getComputedStyle(document.querySelector(".viz-root")||document.body).getPropertyValue(v).trim();
const tip=()=>{let t=document.getElementById("vtip");if(!t){t=document.createElement("div");t.id="vtip";t.className="vtip";document.body.appendChild(t);}return t;};
function showTip(html,ev){const t=tip();t.innerHTML=html;t.style.display="block";const r=t.getBoundingClientRect();let x=ev.clientX+12,y=ev.clientY+12;if(x+r.width>innerWidth-8)x=ev.clientX-r.width-12;if(y+r.height>innerHeight-8)y=ev.clientY-r.height-12;t.style.left=x+"px";t.style.top=y+"px";}
function hideTip(){const t=document.getElementById("vtip");if(t)t.style.display="none";}
function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;}
const fmtD=d=>`${+d.slice(5,7)}/${+d.slice(8)}`;
const nice=(lo,hi,n=4)=>{const span=hi-lo||1;const step0=span/n;const p=Math.pow(10,Math.floor(Math.log10(step0)));const step=[1,2,2.5,5,10].map(m=>m*p).find(s=>s>=step0);const a=Math.floor(lo/step)*step,b=Math.ceil(hi/step)*step;const t=[];for(let v=a;v<=b+1e-9;v+=step)t.push(+v.toFixed(6));return t;};

/* ---------- line chart (single series, time on x) ---------- */
function lineChart(host,pts,{unit="",dom,xs,noLine}){
  host.innerHTML="";const W=Math.max(300,host.clientWidth),H=220,m={l:44,r:14,t:12,b:26};
  const svg=el("svg",{viewBox:`0 0 ${W} ${H}`,width:"100%",height:H,role:"img"},host);
  const xs0=xs||pts.map(p=>p.d);const t0=new Date(xs0[0]),t1=new Date(xs0[xs0.length-1]);
  const X=d=>m.l+(W-m.l-m.r)*((new Date(d)-t0)/((t1-t0)||1));
  const ys=pts.map(p=>p.y);const ticks=nice(Math.min(...ys),Math.max(...ys));const y0=ticks[0],y1=ticks[ticks.length-1];
  const Y=v=>m.t+(H-m.t-m.b)*(1-(v-y0)/((y1-y0)||1));
  ticks.forEach(v=>{el("line",{x1:m.l,x2:W-m.r,y1:Y(v),y2:Y(v),class:"grid"},svg);const t=el("text",{x:m.l-6,y:Y(v)+4,class:"ax","text-anchor":"end"},svg);t.textContent=v;});
  // month ticks
  const months=[...new Set(xs0.map(d=>d.slice(0,7)))];
  months.forEach(mo=>{const d=mo+"-01";if(new Date(d)<t0)return;const x=X(d);el("line",{x1:x,x2:x,y1:H-m.b,y2:H-m.b+4,class:"axl"},svg);const t=el("text",{x:x+3,y:H-8,class:"ax"},svg);t.textContent=+mo.slice(5)+"月";});
  el("line",{x1:m.l,x2:W-m.r,y1:H-m.b,y2:H-m.b,class:"axl"},svg);
  const path=pts.map((p,i)=>(i?"L":"M")+X(p.d).toFixed(1)+","+Y(p.y).toFixed(1)).join("");
  if(!noLine)el("path",{d:path,class:"ln"},svg);
  pts.forEach(p=>el("circle",{cx:X(p.d),cy:Y(p.y),r:noLine?5:3,class:"dot"},svg));
  // last value label
  const L=pts[pts.length-1];const lt=el("text",{x:X(L.d)-8,y:Y(L.y)-10,class:"lbl halo","text-anchor":"end"},svg);lt.textContent=L.y+unit;
  // hover
  const cross=el("line",{y1:m.t,y2:H-m.b,class:"cross",visibility:"hidden"},svg);
  const hot=el("circle",{r:6,class:"hot",visibility:"hidden"},svg);
  const hit=el("rect",{x:m.l,y:m.t,width:W-m.l-m.r,height:H-m.t-m.b,fill:"transparent"},svg);
  const move=ev=>{const r=svg.getBoundingClientRect();const sx=(ev.clientX-r.left)*W/r.width;let best=pts[0],bd=1e9;pts.forEach(p=>{const dd=Math.abs(X(p.d)-sx);if(dd<bd){bd=dd;best=p;}});
    cross.setAttribute("x1",X(best.d));cross.setAttribute("x2",X(best.d));cross.setAttribute("visibility","visible");hot.setAttribute("cx",X(best.d));hot.setAttribute("cy",Y(best.y));hot.setAttribute("visibility","visible");
    showTip(`<div class="tt-d">${fmtD(best.d)}</div><div class="tt-v">${best.y}${unit}${best.chg!=null?` <span class="tt-m">（${best.chg>0?"+":""}${best.chg}）</span>`:""}</div>${best.note?`<div class="tt-m">${best.note}</div>`:""}`,ev);};
  hit.addEventListener("pointermove",move);hit.addEventListener("pointerdown",move);
  hit.addEventListener("pointerleave",()=>{cross.setAttribute("visibility","hidden");hot.setAttribute("visibility","hidden");hideTip();});
}

/* ---------- horizontal bars ---------- */
function hbars(host,items,{unit="%",max,prev}){
  host.innerHTML="";const mx=max||Math.max(...items.map(i=>Math.max(i.v,prev&&prev[i.label]!=null?prev[i.label]:0)));
  if(prev){host.innerHTML=`<div class="hb">${items.map(i=>{const pv=prev[i.label];const d=pv!=null?(i.v-pv):null;return `<div class="hb-row" data-tip="${i.label}：${i.v}${unit}${pv!=null?`（9月底约 ${pv}${unit}，${d>=0?"+":""}${d.toFixed(1)}）`:""}"><div class="hb-l">${i.label}</div><div class="hb-track" style="position:relative"><div class="hb-bar" style="width:${(i.v/mx*100).toFixed(1)}%"></div>${pv!=null?`<div class="hb-prev" style="left:${(pv/mx*100).toFixed(1)}%"></div>`:""}</div><div class="hb-v">${i.v}${unit}${d!=null?`<div class="hb-d">${d>=0?"+":""}${d.toFixed(1)}</div>`:""}</div></div>`}).join("")}</div>`;
    host.querySelectorAll(".hb-row").forEach(r=>{r.onpointermove=e=>showTip(r.dataset.tip,e);r.onpointerleave=hideTip;});return;}
  host.innerHTML=`<div class="hb">${items.map(i=>`<div class="hb-row" data-tip="${i.label}：${i.v}${unit}${i.note?"（"+i.note+"）":""}"><div class="hb-l">${i.label}</div><div class="hb-track"><div class="hb-bar${i.muted?" muted":""}" style="width:${(i.v/mx*100).toFixed(1)}%"></div></div><div class="hb-v">${i.v}${unit}</div></div>`).join("")}</div>`;
  host.querySelectorAll(".hb-row").forEach(r=>{r.onpointermove=e=>showTip(r.dataset.tip,e);r.onpointerleave=hideTip;});
}

/* ---------- stacked daily bars ---------- */
function stackBars(host,days){
  host.innerHTML="";const W=Math.max(300,host.clientWidth),H=200,m={l:34,r:8,t:10,b:26};
  const svg=el("svg",{viewBox:`0 0 ${W} ${H}`,width:"100%",height:H},host);
  const mx=Math.max(...days.map(d=>d.count));const ticks=nice(0,mx,3);const y1=ticks[ticks.length-1];
  const Y=v=>m.t+(H-m.t-m.b)*(1-v/y1);
  ticks.forEach(v=>{el("line",{x1:m.l,x2:W-m.r,y1:Y(v),y2:Y(v),class:"grid"},svg);const t=el("text",{x:m.l-5,y:Y(v)+4,class:"ax","text-anchor":"end"},svg);t.textContent=v;});
  const n=days.length,slot=(W-m.l-m.r)/n,bw=Math.max(2,slot-2);
  days.forEach((d,i)=>{const x=m.l+i*slot+1;const inv=d.inv||0,chat=d.count-inv;
    const g=el("g",{},svg);
    if(inv){el("rect",{x,y:Y(inv),width:bw,height:Y(0)-Y(inv),class:"s1",rx:Math.min(2,bw/2)},g);}
    if(chat){el("rect",{x,y:Y(d.count),width:bw,height:Math.max(0,Y(inv)-Y(d.count)-1.5),class:"s0",rx:Math.min(2,bw/2)},g);}
    const hit=el("rect",{x:m.l+i*slot,y:m.t,width:slot,height:H-m.t-m.b,fill:"transparent"},g);
    hit.onpointermove=e=>showTip(`<div class="tt-d">${fmtD(d.date)} ${d.weekday||""}</div><div class="tt-v">共 ${d.count} 条</div><div class="tt-m">点击查看这一天</div>`,e);
    hit.onpointerleave=hideTip;hit.onclick=()=>{hideTip();window.__goDay&&window.__goDay(d.date);};
    if(d.date.slice(8)==="01"||i===0){const t=el("text",{x:x,y:H-8,class:"ax"},svg);t.textContent=+d.date.slice(5,7)+"月";}
  });
  el("line",{x1:m.l,x2:W-m.r,y1:Y(0),y2:Y(0),class:"axl"},svg);
}

/* ---------- heatmap: topics × weeks ---------- */
function heat(host,rows,cols,val,colLabel,onClickCell){
  host.innerHTML="";const mx=Math.max(1,...rows.flatMap(r=>cols.map(c=>val(r,c))));
  const ramp=["--seq-100","--seq-200","--seq-300","--seq-400","--seq-500","--seq-600","--seq-700"].map(css);
  const color=v=>v?ramp[Math.min(ramp.length-1,Math.floor((v/mx)*(ramp.length-1)+0.0001))]:"transparent";
  const ink=v=>v/mx>0.5?"#fff":css("--ink");
  let h=`<div class="hm" style="grid-template-columns:5.2em repeat(${cols.length},1fr)"><div></div>${cols.map(c=>`<div class="hm-c">${colLabel(c)}</div>`).join("")}`;
  rows.forEach(r=>{h+=`<div class="hm-r">${r}</div>`+cols.map(c=>{const v=val(r,c);return `<div class="hm-cell${v?"":" z"}" style="background:${color(v)};color:${ink(v)}" data-r="${r}" data-c="${c}" data-v="${v}">${v||""}</div>`;}).join("");});
  host.innerHTML=h+`</div>`;
  host.querySelectorAll(".hm-cell").forEach(c=>{c.onpointermove=e=>showTip(`<div class="tt-d">${c.dataset.r} · ${colLabel(c.dataset.c,true)}</div><div class="tt-v">${c.dataset.v} 条</div>`,e);c.onpointerleave=hideTip;});
}

/* ---------- gold level ladder ---------- */
function ladder(host,levels,cur){
  host.innerHTML="";const W=Math.max(300,host.clientWidth),H=210,m={l:12,r:12,t:26,b:12};
  const svg=el("svg",{viewBox:`0 0 ${W} ${H}`,width:"100%",height:H},host);
  const vs=levels.map(l=>l.v).concat(cur.v);const lo=Math.min(...vs)-10,hi=Math.max(...vs)+5;
  const Y=v=>m.t+(H-m.t-m.b)*(1-(v-lo)/(hi-lo));
  const mains=levels.filter(l=>l.main).sort((a,b)=>b.v-a.v);
  if(mains.length>=2)el("rect",{x:m.l,y:Y(mains[0].v),width:W-m.l-m.r,height:Y(mains[1].v)-Y(mains[0].v),class:"zone"},svg);
  mains.forEach(l=>{const y=Y(l.v);el("line",{x1:m.l,x2:W-m.r,y1:y,y2:y,class:"lv-main"},svg);
    const t=el("text",{x:m.l+4,y:y-6,class:"lbl halo"},svg);t.textContent=`${l.name} ${l.v}`;
    if(l.sub){const s2=el("text",{x:W-m.r-4,y:y-6,class:"ax halo","text-anchor":"end"},svg);s2.textContent=l.sub;}});
  const y=Y(cur.v);el("line",{x1:m.l,x2:W-m.r,y1:y,y2:y,class:"lv-cur"},svg);
  el("circle",{cx:W-m.r-8,cy:y,r:5,class:"dot-cur"},svg);
  const t=el("text",{x:m.l+4,y:y-7,class:"lbl halo"},svg);t.textContent=`${cur.name} ${cur.v}`;
  if(mains.length>=2){const d1=((cur.v-mains[0].v)/cur.v*100).toFixed(1),d2=((cur.v-mains[1].v)/cur.v*100).toFixed(1);
    const z=el("text",{x:m.l+4,y:(Y(mains[0].v)+Y(mains[1].v))/2+4,class:"ax"},svg);z.textContent=`距第一防线还要跌 ${d1}%，距第二防线 ${d2}%`;}
}

/* ---------- main ---------- */
const STRIP=s=>String(s||"").replace(/<[^>]+>/g,"");
window.lineChart=lineChart;
window.renderCharts=async function(main,IDX,getJSON,cache){
  main.innerHTML=`<div class="empty">正在汇总 ${IDX.days.length} 天的数据…</div>`;
  const days=[...IDX.days].sort((a,b)=>a.date.localeCompare(b.date));
  const all=await Promise.all(days.map(d=>cache[d.date]?Promise.resolve(cache[d.date]):getJSON(`data/${d.date}.json`).then(j=>(cache[d.date]=j)).catch(()=>null)));
  const D=all.filter(Boolean);
  // price series parsed from his own posts
  const alu={},alo={},cci={};
  D.forEach(day=>day.posts.forEach(p=>{const t=STRIP(p.x);
    let m=t.match(/A00铝锭\s*无锡\s*(\d{4,6})\s*([+-]?\d+)?\s*(\d{1,2})-(\d{1,2})/);
    if(m){const d=`${day.date.slice(0,4)}-${m[3].padStart(2,"0")}-${m[4].padStart(2,"0")}`;alu[d]={d,y:+m[1],chg:m[2]!=null?+m[2]:null,b:p.b};
      const o=t.match(/氧化铝\s*山西\s*(\d{3,5})\s*([+-]?\d+)?/);if(o)alo[d]={d,y:+o[1],chg:o[2]!=null?+o[2]:null};}
    m=t.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*CCI指数[\s\S]*?5500大卡\s*(\d{3,4})\s*[（(]\s*([+-]?\d+)/);
    if(m){const d=`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;cci[d]={d,y:+m[4],chg:+m[5]};}
  }));
  const ser=o=>Object.values(o).sort((a,b)=>a.d.localeCompare(b.d));
  const A=ser(alu),O=ser(alo),C=ser(cci);
  // topic counts
  const CHAT="闲聊";const topicTot={};let invTot=0,tot=0;
  const wk=d=>{const t=new Date(d+"T00:00:00Z");const dow=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-dow);return t.toISOString().slice(0,10);};
  const weekTopic={};
  D.forEach(day=>{tot+=day.posts.length;day.posts.forEach(p=>{const c=p.c||CHAT;if(c===CHAT)return;invTot++;topicTot[c]=(topicTot[c]||0)+1;const w=wk(day.date);(weekTopic[w]=weekTopic[w]||{})[c]=(weekTopic[w][c]||0)+1;});});
  const topics=Object.entries(topicTot).sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,10);
  const weeks=Object.keys(weekTopic).sort();
  const ch=IDX.charts||{};
  const first=days[0].date,last=days[days.length-1].date;
  const lastA=A[A.length-1],lastC=C[C.length-1];
  const tile=(v,l,s)=>`<div class="tile"><div class="tile-v">${v}</div><div class="tile-l">${l}</div>${s?`<div class="tile-s">${s}</div>`:""}</div>`;
  main.innerHTML=`<div class="viz-root">
   <div class="tiles">
    ${tile(tot,"条投资相关发言",`${fmtD(first)} – ${fmtD(last)}，${days.length} 天`)}
    ${tile(Object.keys(topicTot).length,"个话题",`最多：${topics.slice(0,2).join("、")}`)}
    ${lastA?tile(lastA.y,"A00铝锭（元/吨）",`${fmtD(lastA.d)} 他发的最新价`):""}
    ${lastC?tile(lastC.y,"动力煤 CCI 5500",`${fmtD(lastC.d)} 他发的最新价`):""}
   </div>
   ${ch.alloc?`<section class="box"><h2>仓位结构 <small>${ch.alloc.date} 他公布的月度总结${ch.alloc.prev?` · 对比${ch.alloc.prev.date}`:""}</small></h2><div id="c-alloc"></div><div class="cap">${ch.alloc.note||""}</div></section>`:""}
   <section class="box"><h2>电解铝 A00 铝锭价格 <small>无锡，元/吨 · ${A.length} 个报价日</small></h2><div id="c-alu"></div><div class="cap">他的判断：26年中枢 <b>2.3万上下</b>，27年 <b>2.2–2.3万</b>，后几年大概率守不住 2.4 万。</div></section>
   ${O.length>2?`<section class="box"><h2>氧化铝价格 <small>山西，元/吨</small></h2><div id="c-alo"></div></section>`:""}
   <section class="box"><h2>动力煤 CCI 5500 大卡 <small>元/吨 · ${C.length} 个报价日</small></h2><div id="c-cci"></div><div class="cap">他的判断：这波煤价差不多见顶，但 <b>880 很难跌破</b>。</div></section>
   ${ch.gold?`<section class="box"><h2>黄金（人民币计价）防线 <small>${ch.gold.date} 他给的位置，元/克</small></h2><div id="c-gold"></div><div class="cap">${ch.gold.note||""}</div></section>`:""}
   ${ch.cash&&ch.cash.length?`<section class="box"><h2>“仙晶”（可用现金）变化 <small>他自己报的数，单位“个”</small></h2><div id="c-cash"></div><div class="cap">口径不完全一致：有的已扣除10月提现的50个，有的没扣，看趋势即可。</div></section>`:""}
   <section class="box"><h2>每天发了多少条 <small>只统计投资相关 · 点柱子看当天</small></h2><div id="c-days"></div></section>
   <section class="box"><h2>话题热度（按周） <small>每格 = 那一周该话题的条数，颜色越深越多</small></h2><div id="c-heat"></div></section>
   <section class="box"><h2>投资话题占比 <small>全部 ${invTot} 条投资相关微博</small></h2><div id="c-topics"></div></section>
   <details class="box tbl"><summary>看数据表</summary><div id="c-table"></div></details>
  </div>`;
  const draw=()=>{
    if(ch.alloc)hbars(main.querySelector("#c-alloc"),ch.alloc.items,{unit:"%",prev:ch.alloc.prev&&ch.alloc.prev.items});
    if(A.length)lineChart(main.querySelector("#c-alu"),A,{unit:""});
    if(O.length>2)lineChart(main.querySelector("#c-alo"),O,{unit:""});
    if(C.length)lineChart(main.querySelector("#c-cci"),C,{unit:""});
    if(ch.gold)ladder(main.querySelector("#c-gold"),ch.gold.levels,ch.gold.cur);
    if(ch.cash&&ch.cash.length)lineChart(main.querySelector("#c-cash"),ch.cash.map(c=>({d:c.d,y:c.v,note:c.note})),{unit:"个",noLine:true});
    stackBars(main.querySelector("#c-days"),days);
    heat(main.querySelector("#c-heat"),topics,weeks,(r,c)=>(weekTopic[c]||{})[r]||0,(c,long)=>long?`${fmtD(c)} 那周`:fmtD(c));
    hbars(main.querySelector("#c-topics"),topics.map(t=>({label:t,v:topicTot[t]})),{unit:" 条"});
  };
  draw();
  main.querySelector("#c-table").innerHTML=`<table><tr><td class="a">日期</td><td>A00铝锭</td><td>氧化铝</td><td>CCI5500</td></tr>${[...new Set([...A,...C].map(p=>p.d))].sort().reverse().map(d=>`<tr><td class="d">${fmtD(d)}</td><td>${alu[d]?alu[d].y:""}</td><td>${alo[d]?alo[d].y:""}</td><td>${cci[d]?cci[d].y:""}</td></tr>`).join("")}</table>`;
  let rt;window.onresize=()=>{clearTimeout(rt);rt=setTimeout(()=>{if(main.querySelector(".viz-root"))draw();},150);};
};
})();
/* 10月仓位推算：两张图 */
(function(){
const NS="http://www.w3.org/2000/svg";
function el(t,a,p){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;}
function tipOn(node,html){node.addEventListener("pointermove",e=>{let t=document.getElementById("vtip");if(!t){t=document.createElement("div");t.id="vtip";t.className="vtip";document.body.appendChild(t);}t.innerHTML=html;t.style.display="block";const r=t.getBoundingClientRect();let x=e.clientX+12,y=e.clientY+12;if(x+r.width>innerWidth-8)x=e.clientX-r.width-12;t.style.left=x+"px";t.style.top=y+"px";});node.addEventListener("pointerleave",()=>{const t=document.getElementById("vtip");if(t)t.style.display="none";});}
window.renderRebal=function(host,R){
  host.innerHTML=`<div class="rb-sec">占比变化 <span class="legend"><span><i class="sw" style="background:var(--s0)"></i>${R.from}</span><span><i class="sw s1"></i>${R.to}</span></span></div><div class="rb1"></div><div class="rb-sec">资金流向（万元，推算）<span class="legend"><span><i class="sw" style="background:var(--c2)"></i>减少</span><span><i class="sw s1"></i>增加</span></span></div><div class="rb2"></div>`;
  const items=[...R.items].sort((a,b)=>b.b-a.b);
  // chart 1: paired bars
  {const h=host.querySelector(".rb1");const W=Math.max(300,h.clientWidth),row=40,H=items.length*row+8,L=78,Rm=96;
   const svg=el("svg",{viewBox:`0 0 ${W} ${H}`,width:"100%",height:H},h);const mx=Math.max(...items.map(i=>Math.max(i.a,i.b)));const X=v=>L+(W-L-Rm)*v/mx;
   items.forEach((it,k)=>{const y=k*row+4;const g=el("g",{},svg);
     const t=el("text",{x:0,y:y+20,class:"lbl"},g);t.textContent=it.label;
     el("rect",{x:L,y:y+3,width:Math.max(2,X(it.a)-L),height:12,rx:3,fill:"var(--s0)"},g);
     el("rect",{x:L,y:y+18,width:Math.max(2,X(it.b)-L),height:14,rx:3,class:"s1"},g);
     const v=el("text",{x:X(it.b)+5,y:y+30,class:"lbl"},g);v.textContent=it.b+"%";
     const d=it.b-it.a;const dv=el("text",{x:X(it.a)+5,y:y+13,class:"ax"},g);dv.textContent=`${it.a}% → ${d>=0?"+":""}${d.toFixed(1)}`;
     const hit=el("rect",{x:0,y,width:W,height:row,fill:"transparent"},g);
     tipOn(hit,`<div class="tt-d">${it.label}</div><div class="tt-v">${it.a}% → ${it.b}%</div><div class="tt-m">${it.tip||""}</div>`);});}
  // chart 2: diverging amounts
  {const h=host.querySelector(".rb2");const its=[...R.items].sort((a,b)=>a.amt-b.amt);const W=Math.max(300,h.clientWidth),row=30,H=its.length*row+24,L=78;
   const svg=el("svg",{viewBox:`0 0 ${W} ${H}`,width:"100%",height:H},h);const mn=Math.min(0,...its.map(i=>i.amt)),mx=Math.max(0,...its.map(i=>i.amt));const pad=40;
   const X=v=>L+pad+(W-L-2*pad)*(v-mn)/(mx-mn);
   el("line",{x1:X(0),x2:X(0),y1:2,y2:H-20,class:"axl"},svg);const z=el("text",{x:X(0),y:H-6,class:"ax","text-anchor":"middle"},svg);z.textContent="0";
   its.forEach((it,k)=>{const y=k*row+4;const g=el("g",{},svg);
     const t=el("text",{x:0,y:y+15,class:"lbl"},g);t.textContent=it.label;
     const x0=X(Math.min(0,it.amt)),x1=X(Math.max(0,it.amt));
     el("rect",{x:x0,y:y+3,width:Math.max(2,x1-x0),height:16,rx:3,fill:it.amt<0?"var(--c2)":"var(--s1)"},g);
     const v=el("text",{x:it.amt<0?x0-5:x1+5,y:y+15,class:"lbl","text-anchor":it.amt<0?"end":"start"},g);v.textContent=(it.amt>0?"+":"")+it.amt+"万";
     const hit=el("rect",{x:0,y,width:W,height:row,fill:"transparent"},g);
     tipOn(hit,`<div class="tt-d">${it.label}</div><div class="tt-v">${it.amt>0?"+":""}${it.amt} 万元</div><div class="tt-m">${it.tip||""}</div>`);});}
};
})();
