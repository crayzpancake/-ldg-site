/* 持仓PS图视图 */
(function(){
const NS="http://www.w3.org/2000/svg";
const el=(t,a,p)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;};
const SHORT={"中国海洋石油":"中海油","现金（仙晶）":"现金","华能国际电力股份":"华能国际"};const nm=n=>SHORT[n]||n;
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;");
const CATS=["电解铝","水电","煤炭","火电","其他","现金类"];
const COL={"电解铝":"var(--c1)","水电":"var(--c3)","煤炭":"var(--c2)","火电":"var(--c4)","其他":"var(--c7)","现金类":"var(--s0)"};
function tip(node,html){node.addEventListener("pointermove",e=>{let t=document.getElementById("vtip");if(!t){t=document.createElement("div");t.id="vtip";t.className="vtip";document.body.appendChild(t);}t.innerHTML=html;t.style.display="block";const r=t.getBoundingClientRect();let x=e.clientX+12,y=e.clientY+12;if(x+r.width>innerWidth-8)x=e.clientX-r.width-12;if(y+r.height>innerHeight-8)y=e.clientY-r.height-12;t.style.left=x+"px";t.style.top=y+"px";});node.addEventListener("pointerleave",()=>{const t=document.getElementById("vtip");if(t)t.style.display="none";});}
const lab=ym=>`${ym.slice(2,4)}/${+ym.slice(5)}`;
function pct(m){const s=Object.values(m.cats).reduce((a,b)=>a+b,0);const o={};CATS.forEach(c=>o[c]=(m.cats[c]||0)/s*100);return o;}
function stack(host,cols,onPick,sel){
  /* 小卡片：每类一张，大数字=最新占比，折线=一年走势 */
  host.innerHTML=`<div class="sm">${CATS.map(k=>`<div class="sm-c" data-k="${k}"></div>`).join("")}</div>`;
  const real=cols.filter(c=>!c.est),est=cols.find(c=>c.est);
  const mxAll=Math.max(...cols.flatMap(c=>CATS.map(k=>c.p[k])));
  CATS.forEach(k=>{
    const card=host.querySelector(`[data-k="${k}"]`);const first=real[0].p[k],last=(est||real[real.length-1]).p[k],d=last-first;
    const peak=real.reduce((a,c)=>c.p[k]>a.p[k]?c:a,real[0]);
    card.innerHTML=`<div class="sm-h"><span><i class="sw" style="background:${COL[k]}"></i>${k}</span><span class="sm-d ${d>=0?"up":"dn"}">${d>=0?"▲":"▼"}${Math.abs(d).toFixed(0)}</span></div><div class="sm-v">${last.toFixed(0)}<small>%</small></div><div class="sm-s">一年前 ${first.toFixed(0)}% · 最高 ${peak.p[k].toFixed(0)}%（${lab(peak.ym)}）</div><div class="sm-g"></div>`;
    const g=card.querySelector(".sm-g");const W=Math.max(120,g.clientWidth),H=54;
    const svg=el("svg",{viewBox:`0 0 ${W} ${H}`,width:"100%",height:H},g);
    const X=i=>4+(W-8)*i/(cols.length-1),Y=v=>H-4-(H-10)*v/mxAll;
    el("path",{d:real.map((c,i)=>(i?"L":"M")+X(i)+","+Y(c.p[k])).join("")+`L${X(real.length-1)},${H-2}L${X(0)},${H-2}Z`,fill:COL[k],opacity:.15},svg);
    el("path",{d:real.map((c,i)=>(i?"L":"M")+X(i)+","+Y(c.p[k])).join(""),fill:"none",stroke:COL[k],"stroke-width":2,"stroke-linejoin":"round"},svg);
    if(est)el("path",{d:`M${X(real.length-1)},${Y(real[real.length-1].p[k])}L${X(cols.length-1)},${Y(est.p[k])}`,fill:"none",stroke:COL[k],"stroke-width":2,"stroke-dasharray":"3 3"},svg);
    el("circle",{cx:X(cols.length-1),cy:Y(last),r:3.5,fill:COL[k],stroke:"var(--card)","stroke-width":1.5},svg);
    const si=cols.findIndex(c=>c.ym===sel);if(si>=0)el("line",{x1:X(si),x2:X(si),y1:2,y2:H-2,stroke:"var(--ink)","stroke-width":1,opacity:.35},svg);
    cols.forEach((c,i)=>{const h=el("rect",{x:X(i)-(W/cols.length)/2,y:0,width:W/cols.length,height:H,fill:"transparent",style:"cursor:pointer"},svg);
      tip(h,`<div class="tt-d">${c.est?"10月（估算）":c.ym.replace("-","年")+"月底"}</div><div class="tt-v">${k} ${c.p[k].toFixed(1)}%</div>`);h.addEventListener("click",()=>onPick(c.ym));});
  });
}
function totalLine(host,ms){
  host.innerHTML="";const W=Math.max(300,host.clientWidth),H=150,m={l:40,r:30,t:16,b:22};
  const svg=el("svg",{viewBox:`0 0 ${W} ${H}`,width:"100%",height:H},host);
  const vs=ms.map(x=>x.total);const lo=Math.floor((Math.min(...vs)-50)/100)*100,hi=Math.ceil((Math.max(...vs)+30)/100)*100;
  const X=i=>m.l+(W-m.l-m.r)*i/(ms.length-1),Y=v=>m.t+(H-m.t-m.b)*(1-(v-lo)/(hi-lo));
  for(let v=lo;v<=hi;v+=100){el("line",{x1:m.l,x2:W-m.r,y1:Y(v),y2:Y(v),class:"grid"},svg);const t=el("text",{x:m.l-4,y:Y(v)+4,class:"ax","text-anchor":"end"},svg);t.textContent=v;}
  const realN=ms.filter(x=>!x.est).length;el("path",{d:ms.slice(0,realN).map((x,i)=>(i?"L":"M")+X(i)+","+Y(x.total)).join(""),class:"ln"},svg);if(realN<ms.length)el("path",{d:`M${X(realN-1)},${Y(ms[realN-1].total)}L${X(ms.length-1)},${Y(ms[ms.length-1].total)}`,class:"ln","stroke-dasharray":"4 4"},svg);
  ms.forEach((x,i)=>{el("circle",{cx:X(i),cy:Y(x.total),r:3.5,class:"dot"},svg);if(i%3===0||i===ms.length-1){const t=el("text",{x:X(i),y:H-6,class:"ax","text-anchor":"middle"},svg);t.textContent=x.est?"10月*":lab(x.ym);}
    const h=el("circle",{cx:X(i),cy:Y(x.total),r:12,fill:"transparent"},svg);tip(h,`<div class="tt-d">${x.ym.replace("-","年")}月底${x.est?"（预测）":""}</div><div class="tt-v">${x.total.toFixed(1)} 万</div>`);});
  const L=ms[ms.length-1];const t=el("text",{x:X(ms.length-1)-6,y:Y(L.total)-9,class:"lbl halo","text-anchor":"end"},svg);t.textContent=L.total.toFixed(0)+"万";
  const mi=ms.reduce((a,b)=>a.total<b.total?a:b);const k=ms.indexOf(mi);const t2=el("text",{x:X(k),y:Y(mi.total)+16,class:"ax halo","text-anchor":"middle"},svg);t2.textContent=mi.total.toFixed(0);
}
function holdings(m,prev){
  const pm={};(prev?prev.h:[]).forEach(x=>pm[x.n]=x);
  const rows=m.h.filter(x=>x.v>0).sort((a,b)=>b.v-a.v);const mx=rows[0].v;
  const notin=m.est?(m.notin||[]):[];
  const gone=m.est?(m.gone||[]).map(g=>({...g,v:0})):(prev?prev.h.filter(x=>x.v>0&&!m.h.some(y=>y.n===x.n&&y.v>0)):[]);
  const tot=m.h.reduce((a,x)=>a+x.v,0)+(m.est?0:m.cash);
  const pv=n=>{if(pm[n])return pm[n].v;if(n.startsWith("现金"))return (pm["银华日利"]?pm["银华日利"].v:0)+(prev?prev.cash:0);if(n.startsWith("山西煤"))return pm["山煤国际"]?pm["山煤国际"].v:0;return null;};
  const tag=x=>{if(m.est&&m.changes){const c=m.changes.find(c=>c.n===x.n);if(!c)return x.n.startsWith("现金")?"":`<span class="ps-t dn">股数不变</span>`;if(c.act==="新建仓")return`<span class="ps-t new">新建仓</span>`;const w=Math.abs(c.ds)/1e4;return c.ds>0?`<span class="ps-t up">▲${w}万股</span>`:`<span class="ps-t dn" style="color:var(--ink)">▼${w}万股${c.sure==="低"?"?":""}</span>`;}
    if(m.est){const p0=pv(x.n);if(!p0)return`<span class="ps-t new">新建仓</span>`;const d=x.v-p0;if(Math.abs(d)<8)return`<span class="ps-t dn">≈不变</span>`;return d>0?`<span class="ps-t up">▲约${d.toFixed(0)}万</span>`:`<span class="ps-t dn" style="color:var(--ink)">▼约${(-d).toFixed(0)}万</span>`;}
    const p=pm[x.n];if(!prev)return"";if(!p||!p.v)return`<span class="ps-t new">新买</span>`;const d=x.s-p.s;if(d>0)return`<span class="ps-t up">▲${(d/1e4).toFixed(d%1e4?1:0)}万股</span>`;if(d<0)return`<span class="ps-t dn">▼${(-d/1e4).toFixed(-d%1e4?1:0)}万股</span>`;return"";};
  return `<div class="ps-h">${rows.map(x=>`<div class="ps-r"${x.note?` data-note="${esc(x.note)}"`:""}><div class="ps-n"><i class="sw" style="background:${COL[x.c]}"></i>${esc(nm(x.n))}</div><div class="ps-tr"><div class="ps-b" style="width:${(x.v/mx*100).toFixed(1)}%;background:${COL[x.c]}"></div></div><div class="ps-v">${m.est?"≈":""}${x.v.toFixed(0)}万<small>${(x.v/tot*100).toFixed(1)}%</small></div><div class="ps-c">${tag(x)}</div></div>`).join("")}
  ${notin.map(x=>`<div class="ps-r gone" data-note="${esc(x.note)}"><div class="ps-n"><i class="sw" style="background:var(--line)"></i>${esc(x.n)}</div><div class="ps-tr"></div><div class="ps-v">—</div><div class="ps-c"><span class="ps-t dn">主仓记号</span></div></div>`).join("")}${gone.map(x=>`<div class="ps-r gone"${x.note?` data-note="${esc(x.note)}"`:""}><div class="ps-n"><i class="sw" style="background:${COL[x.c]}"></i>${esc(nm(x.n))}</div><div class="ps-tr"></div><div class="ps-v">0</div><div class="ps-c"><span class="ps-t out">清仓</span></div></div>`).join("")}</div>`;
}
function fmt(n,d=3){return Number(n).toFixed(d);}
function changesHTML(m){
  if(!m.changes)return"";
  const col=a=>/新建|加仓/.test(a)?"up":/减|清/.test(a)?"dn":"na";
  return `<div class="cg"><div class="cg-h">10月调仓明细（推算）<small>可信度：高 / 中 / 低</small></div>${m.changes.map(c=>`<div class="cg-i ${col(c.act)}">
   <div class="cg-t"><b class="cg-n">${esc(c.n)}</b><span class="cg-a">${esc(c.act)}</span><span class="cg-s">可信度 ${c.sure}</span></div>
   <div class="cg-m">${c.from} → <b>${c.to}</b>${c.amt?`<span>（${c.amt>0?"+":""}${c.amt}万元）</span>`:""}</div>
   <ul class="cg-w">${c.why.map(w=>`<li>${w.replace(/&/g,"&amp;").replace(/<(?!\/?b>)/g,"&lt;")}</li>`).join("")}</ul></div>`).join("")}</div>`;
}
function mockHTML(k){
  const cls=v=>v>=0?"mk-up":"mk-dn";
  const A=k.a.map(r=>`<tr class="${cls(r.pl)}"><td>${r.code}</td><td>${r.name}</td><td>${r.s}</td><td>${r.s}</td><td>${fmt(r.cost)}</td><td>${fmt(r.p)}</td><td>${fmt(r.mv)}</td><td>${fmt(r.pl)}</td><td>${r.pct.toFixed(2)}</td><td>${r.mk}</td></tr>`).join("");
  const H=k.hk.map(r=>`<tr class="${cls(r.pl)}"><td>${r.name}</td><td>${r.code}</td><td>${r.s}</td><td>${fmt(r.cost)}</td><td>${fmt(r.mv)}</td><td>${fmt(r.pl)}</td><td>${r.pct.toFixed(3)}</td></tr>`).join("");
  return `<div class="mk-wrap"><div class="mk-cap">↓ 按交易软件截图样式还原的 10 月底持仓（预测）· 点表格放大</div>
  <div class="mk-scroll"><div class="mk">
   <div class="mk-tab">人民币</div>
   <div class="mk-sum"><div><span>资金余额</span><b>${fmt(k.cash,2)}</b><span>可取金额</span><b>${fmt(k.cash,2)}</b><em>最近查询时间:${k.asof}</em></div>
    <div><span>冻结金额</span><b>200.00</b><span>参考股票市值(含港股通)</span><b>${fmt(k.stockmv,2)}</b></div>
    <div><span>可用金额</span><b>${fmt(k.cash,2)}</b><span>参考总资产(含港股通)</span><b>${fmt(k.total,2)}</b><i>修改成本价</i></div>
    <div class="mk-warn">提示：本表为根据10月月度总结推算的预测持仓，并非真实截图</div></div>
   <table class="mk-t"><tr><th>证券代码</th><th>证券名称</th><th>股票余额</th><th>可用余额</th><th>成本价</th><th>市价</th><th>市值</th><th>浮动盈亏</th><th>盈亏比例(%)</th><th>交易市场</th></tr>${A}</table>
   <div class="mk-tab" style="margin-top:10px">股票持仓</div>
   <table class="mk-t"><tr><th>证券名称</th><th>证券代码</th><th>可用股份</th><th>参考成本价(港币)</th><th>最新市值(人民币)</th><th>参考盈亏(人民币)</th><th>盈亏比例(%)</th></tr>${H}</table>
   <div class="mk-wm"></div>
  </div></div><div class="cap">市价为 2026-10-30 收盘价；港股按 1港币≈${k.rate}人民币换算；成本价沿用9月底截图，新买入的为估计值。</div></div>`;
}
window.renderPS=async function(main,getJSON){
  main.innerHTML=`<div class="empty">加载中…</div>`;
  let D;try{D=await getJSON("data/ps.json");}catch(e){main.innerHTML=`<div class="empty">读取失败</div>`;return;}
  const ms=D.months;let sel=window.__psSel||ms[ms.length-1].ym;
  const draw=()=>{
    const i=ms.findIndex(x=>x.ym===sel),m=ms[i],prev=ms[i-1];
    const cols=ms.map(x=>({ym:x.ym,est:!!x.est,p:pct(x)}));
    main.innerHTML=`<div class="viz-root">
     <section class="box"><h2>近一年仓位变化 <small>大数字=10月（预测）占比 · 箭头=比一年前</small></h2><div id="ps-stack"></div>
      <div class="cap">折线是2025年10月→2026年10月每月底的占比，虚线段是10月估算（10月起不再发PS图）。点折线可切换下面的月份。</div></section>
     <section class="box"><h2>游戏仓总资产 <small>万元，每月底</small></h2><div id="ps-total"></div></section>
     <section class="box"><h2>${m.ym.slice(0,4)}年${+m.ym.slice(5)}月底持仓${m.est?`<span class="ps-t new" style="margin-left:6px;vertical-align:3px">预测</span>`:""} <small>市值，万元 · ${m.est?"对比9月底市值":"对比上月股数"}</small></h2>
      <div class="chips ps-chips">${ms.map(x=>`<button data-ym="${x.ym}" class="${x.ym===sel?"on":""}">${x.est?"26/10 预测":lab(x.ym)}</button>`).join("")}</div>
      <div class="ps-kpi"><div><b>${m.est?"≈":""}${m.total.toFixed(1)}</b><span>总资产（万）</span></div><div><b style="color:${m.pl>=0?"var(--red)":"var(--ink)"}">${m.pl>=0?"+":""}${m.pl}</b><span>本月盈亏（万）</span></div><div><b>${m.h.filter(x=>x.v>0).length}</b><span>只持股</span></div></div>
      ${m.est?`<div class="ps-note">${esc(m.note)}</div>`+changesHTML(m):""}${holdings(m,prev)}
      ${m.est?(m.mock?mockHTML(m.mock):""):`<div class="ps-imgs">${m.imgs.map(s=>`<img src="${s}" alt="${m.ym} 持仓截图" loading="lazy">`).join("")}</div>`}
      <a class="cap" href="https://xueqiu.com/8790885129/${m.id}" target="_blank" rel="noopener">雪球原帖：${esc(m.title)}</a></section></div>`;
    stack(main.querySelector("#ps-stack"),cols,ym=>{sel=window.__psSel=ym;draw();},sel);
    totalLine(main.querySelector("#ps-total"),ms);
    main.querySelectorAll(".mk-wm").forEach(w=>{w.innerHTML=Array.from({length:60},()=>"<span>非真实截图</span>").join("");});
    const fit=()=>main.querySelectorAll(".mk-scroll").forEach(w=>{if(w.classList.contains("big"))return;const m=w.firstElementChild;const k=Math.min(1,w.clientWidth/840);m.style.transform=`scale(${k})`;w.style.height=(m.offsetHeight*k)+"px";});fit();window.addEventListener("resize",fit);main.querySelectorAll(".mk-scroll").forEach(w=>w.onclick=()=>{w.classList.toggle("big");if(!w.classList.contains("big"))fit();});
    main.querySelectorAll(".ps-r[data-note]").forEach(r=>tip(r,`<div class="tt-m">${r.dataset.note}</div>`));
    main.querySelectorAll(".ps-chips button").forEach(b=>b.onclick=()=>{sel=window.__psSel=b.dataset.ym;draw();});
  };
  draw();
};
})();
