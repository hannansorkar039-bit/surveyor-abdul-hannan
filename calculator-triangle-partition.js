if (window.__SAH_TRIANGLE_PARTITION_LOADED) {
} else {
window.__SAH_TRIANGLE_PARTITION_LOADED = true;
(() => {
  const $ = id => document.getElementById(id);
  const bn = (n,d=2) => Number(n).toLocaleString('bn-BD',{maximumFractionDigits:d});
  const EPS = 1e-8;
  const SQFT_PER_DECIMAL = 435.6;
  const state = {
    points:null,
    remaining:null,
    parts:[],
    dragEdit:false,
    zoom:1,
    panX:0,
    panY:0,
    lastSplitLine:null
  };

  const partName = n => {
    const ord={1:'১ম',2:'২য়',3:'৩য়',4:'৪র্থ',5:'৫ম',6:'৬ষ্ঠ',7:'৭ম',8:'৮ম',9:'৯ম',10:'১০ম'};
    return `${ord[n]||`${bn(n,0)}তম`} ভাগ`;
  };
  const area = s => {
    if(!s) return 0;
    const p=(s.AB+s.BC+s.CA)/2, z=p*(p-s.AB)*(p-s.BC)*(p-s.CA);
    return z>0?Math.sqrt(z):0;
  };
  const polyArea = poly => {
    if(!poly || poly.length<3) return 0;
    let a=0;
    for(let i=0;i<poly.length;i++){
      const q=poly[(i+1)%poly.length];
      a += poly[i].x*q.y-q.x*poly[i].y;
    }
    return Math.abs(a)/2;
  };
  const fmtArea = v => `${bn(v,3)} বর্গফুট ≈ ${bn(v/SQFT_PER_DECIMAL,4)} শতাংশ`;
  const ftIn = v => {
    if(!Number.isFinite(v)) return '—';
    const sign=v<0?'-':'', totalIn=Math.round(Math.abs(v)*12);
    return `${sign}${bn(Math.floor(totalIn/12),0)}'-${bn(totalIn%12,0)}"`;
  };
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const readFI=(ftId,inId)=>{
    const f=Number($(ftId)?.value), i=Number($(inId)?.value||0);
    if(!Number.isFinite(f)||f<0||!Number.isFinite(i)||i<0||i>=12)return NaN;
    return f+i/12;
  };
  const sideInputs=()=>({AB:readFI('tpAB','tpABIn'),BC:readFI('tpBC','tpBCIn'),CA:readFI('tpCA','tpCAIn')});
  const triangleFromSides=s=>{
    if(Object.values(s).some(v=>!Number.isFinite(v)||v<=0))return null;
    if(s.AB+s.BC<=s.CA+EPS||s.AB+s.CA<=s.BC+EPS||s.BC+s.CA<=s.AB+EPS)return null;
    const x=(s.AB*s.AB+s.BC*s.BC-s.CA*s.CA)/(2*s.BC),h2=s.AB*s.AB-x*x;
    if(!(h2>EPS))return null;
    return {B:{x:0,y:0},C:{x:s.BC,y:0},A:{x,y:Math.sqrt(h2)}};
  };

  function getMethod(prefix){
    return $(prefix+'Method')?.value || 'horizontal';
  }
  function syncVertexVisibility(prefix){
    const wrap=$(prefix+'VertexWrap');
    if(wrap) wrap.hidden=getMethod(prefix)!=='vertex';
  }
  function getPartFraction(inputId,typeId,totalRemaining){
    const v=Number($(inputId)?.value), type=$(typeId)?.value;
    if(!Number.isFinite(v)||v<=0||!(totalRemaining>0))return NaN;
    return type==='sqft'?v/totalRemaining:v/100;
  }
  function validateFraction(f){
    return Number.isFinite(f)&&f>EPS&&f<1-EPS;
  }

  function clipHalfPlane(poly,p,d,keepSign){
    const out=[];
    if(!poly?.length)return out;
    const val=q=>keepSign*((q.x-p.x)*d.y-(q.y-p.y)*d.x);
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],va=val(a),vb=val(b);
      const ina=va>=-EPS,inb=vb>=-EPS;
      if(ina)out.push({...a});
      if(ina!==inb){
        const den=va-vb;
        if(Math.abs(den)>EPS){
          const t=va/den;
          out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
        }
      }
    }
    return out;
  }

  // Cut a fraction from the bottom of the current remaining polygon.
  // This makes every subsequent horizontal split operate on the CURRENT
  // remaining polygon, never on the original triangle.
  function splitHorizontal(poly,f){
    const total=polyArea(poly);
    if(!(total>EPS))return null;
    let lo=Math.min(...poly.map(p=>p.y)), hi=Math.max(...poly.map(p=>p.y));
    for(let i=0;i<70;i++){
      const y=(lo+hi)/2;
      const cut=clipHalfPlane(poly,{x:0,y},{x:1,y:0},1); // y <= threshold
      if(polyArea(cut)/total<f)lo=y; else hi=y;
    }
    const y=(lo+hi)/2;
    const cut=clipHalfPlane(poly,{x:0,y},{x:1,y:0},1);
    const rem=clipHalfPlane(poly,{x:0,y},{x:1,y:0},-1);
    if(polyArea(cut)<=EPS||polyArea(rem)<=EPS)return null;
    return {cut,remaining:rem,line:{type:'horizontal',y}};
  }

  function cross(a,b,c){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
  function pointNear(a,b){return Math.hypot(a.x-b.x,a.y-b.y)<1e-6;}

  // Cut a fraction from a selected triangle vertex. For a general convex
  // remaining polygon, try each non-incident boundary edge and both sides of
  // the vertex-to-boundary line, then solve for the requested area.
  function splitFromVertex(poly,f,vertexKey){
    const original=state.points;
    const V=original?.[vertexKey];
    if(!V)return null;
    const vi=poly.findIndex(p=>pointNear(p,V));
    if(vi<0)return {error:`${vertexKey} শীর্ষবিন্দুটি বর্তমানে অবশিষ্ট জমিতে নেই। অন্য শীর্ষবিন্দু নির্বাচন করুন।`};
    const total=polyArea(poly), candidates=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      if(pointNear(a,V)||pointNear(b,V))continue;
      for(const side of [1,-1]){
        const samples=[];
        for(let j=1;j<100;j++){
          const t=j/100,D={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
          const dx=D.x-V.x,dy=D.y-V.y;
          if(Math.hypot(dx,dy)<EPS)continue;
          const sa=cross(V,D,a), sb=cross(V,D,b);
          let sign=side;
          if(Math.abs(sa)>EPS)sign=Math.sign(sa)*side;
          else if(Math.abs(sb)>EPS)sign=Math.sign(sb)*side;
          else continue;
          const cut=clipHalfPlane(poly,V,{x:dx,y:dy},sign);
          const ar=polyArea(cut)/total;
          samples.push({t,ar,D});
        }
        for(let j=0;j<samples.length-1;j++){
          const s1=samples[j],s2=samples[j+1];
          if((s1.ar-f)*(s2.ar-f)>0)continue;
          let l=s1.t,r=s2.t, best=null;
          for(let k=0;k<55;k++){
            const t=(l+r)/2,D={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
            const dx=D.x-V.x,dy=D.y-V.y;
            const sa=cross(V,D,a),sb=cross(V,D,b);
            let sign=side;
            if(Math.abs(sa)>EPS)sign=Math.sign(sa)*side;
            else if(Math.abs(sb)>EPS)sign=Math.sign(sb)*side;
            const cut=clipHalfPlane(poly,V,{x:dx,y:dy},sign);
            const ar=polyArea(cut)/total;
            best={t,D,cut,ar,sign};
            if(Math.abs(ar-f)<1e-10)break;
            if((s1.ar-f)*(ar-f)<=0)r=t; else l=t;
          }
          if(best&&polyArea(best.cut)>EPS&&polyArea(best.cut)<total-EPS){
            candidates.push({error:Math.abs(best.ar-f),cut:best.cut,D:best.D,edge:[a,b]});
          }
        }
      }
    }
    if(!candidates.length)return {error:'এই শীর্ষবিন্দু থেকে চাওয়া পরিমাণের আলাদা ভাগরেখা তৈরি করা যাচ্ছে না। অন্য শীর্ষবিন্দু বা হরিজন্টাল ভাগ নির্বাচন করুন।'};
    candidates.sort((a,b)=>a.error-b.error);
    const best=candidates[0], rem=clipHalfPlane(poly,V,{x:best.D.x-V.x,y:best.D.y-V.y},-1);
    if(polyArea(rem)<=EPS)return null;
    return {cut:best.cut,remaining:rem,line:{type:'vertex',V:{...V},D:{...best.D},vertex:vertexKey}};
  }

  function applySplit(poly,method,f,vertexKey){
    return method==='horizontal'?splitHorizontal(poly,f):splitFromVertex(poly,f,vertexKey);
  }

  function resetState(){
    state.points=null;state.remaining=null;state.parts=[];state.lastSplitLine=null;
    state.zoom=1;state.panX=0;state.panY=0;state.dragEdit=false;
  }

  function updateModeUI(prefix){
    syncVertexVisibility(prefix);
    const method=getMethod(prefix);
    if(prefix==='tp'){
      const note=$('tpModeNote');
      if(note)note.textContent=method==='horizontal'
        ?'এই ভাগটি অবশিষ্ট জমির নিচের দিক থেকে হরিজন্টাল রেখায় আলাদা হবে।'
        :'এই ভাগটি অবশিষ্ট জমির নির্বাচিত শীর্ষবিন্দু থেকে বিপরীত সীমানায় ভাগ হবে।';
      const help=$('tpModeHelp');
      if(help)help.textContent=method==='horizontal'
        ?'হরিজন্টাল ভাগ — এবার যে পরিমাণ দেবেন তা বর্তমান অবশিষ্ট ক্ষেত্র থেকে কাটা হবে।'
        :'শীর্ষবিন্দু থেকে ভাগ — এবার যে পরিমাণ দেবেন তা বর্তমান অবশিষ্ট ক্ষেত্র থেকে কাটা হবে।';
    }
  }

  function updateMoreModeUI(){
    syncVertexVisibility('tpMore');
    const note=$('tpMoreModeNote');
    if(note)note.textContent=getMethod('tpMore')==='horizontal'
      ?'এই নতুন ভাগটি বর্তমান অবশিষ্ট ক্ষেত্রের নিচের দিক থেকে হবে।'
      :'এই নতুন ভাগটি বর্তমান অবশিষ্ট ক্ষেত্র থেকে নির্বাচিত শীর্ষবিন্দু দিয়ে হবে।';
  }

  function clearMoreInputs(){
    if($('tpMoreAmount'))$('tpMoreAmount').value='';
    if($('tpMoreType'))$('tpMoreType').value='decimal';
    if($('tpMoreMethod'))$('tpMoreMethod').value='horizontal';
    if($('tpMoreVertex'))$('tpMoreVertex').value='A';
    updateMoreModeUI();
  }

  function areaLabelForPart(p,total){
    return `${partName(p.index)} — ${fmtArea(total*p.fractionFromOriginal)}`;
  }

  function centroid(poly){
    let a=0,cx=0,cy=0;
    for(let i=0;i<poly.length;i++){
      const p=poly[i],q=poly[(i+1)%poly.length],cr=p.x*q.y-q.x*p.y;
      a+=cr;cx+=(p.x+q.x)*cr;cy+=(p.y+q.y)*cr;
    }
    a*=.5;
    if(Math.abs(a)<EPS){
      return {x:poly.reduce((s,p)=>s+p.x,0)/poly.length,y:poly.reduce((s,p)=>s+p.y,0)/poly.length};
    }
    return {x:cx/(6*a),y:cy/(6*a)};
  }

  function fitTransform(){
    const canvas=$('tpCanvas'),W=parseFloat(canvas.style.width)||canvas.clientWidth||1200,H=parseFloat(canvas.style.height)||canvas.clientHeight||720;
    const all=[state.points.A,state.points.B,state.points.C];
    state.parts.forEach(p=>all.push(...p.cut));
    if(state.remaining)all.push(...state.remaining);
    const xs=all.map(p=>p.x),ys=all.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const pad=110,scale=Math.min((W-2*pad)/Math.max(1,maxX-minX),(H-2*pad)/Math.max(1,maxY-minY))*state.zoom;
    const ox=(W-(maxX-minX)*scale)/2-minX*scale+state.panX;
    const oy=H-70+minY*scale+state.panY;
    return {scale,ox,oy,sc:q=>({x:ox+q.x*scale,y:oy-q.y*scale})};
  }

  function drawPolygon(ctx,poly,sc,fill,stroke='#163b4d',width=2.5){
    if(!poly||poly.length<3)return;
    ctx.beginPath();poly.forEach((p,i)=>{const q=sc(p);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.closePath();
    ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();
  }

  function drawDimension(ctx,a,b,text,offset,split=false){
    const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
    const p1={x:a.x+nx*offset,y:a.y+ny*offset},q1={x:b.x+nx*offset,y:b.y+ny*offset};
    ctx.save();ctx.strokeStyle=split?'#a62922':'#71828a';ctx.lineWidth=1.1;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(p1.x,p1.y);ctx.moveTo(b.x,b.y);ctx.lineTo(q1.x,q1.y);ctx.stroke();
    ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(q1.x,q1.y);ctx.stroke();
    ctx.fillStyle=split?'#8e251e':'#082336';ctx.font='700 15px Arial,"Noto Sans Bengali",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(text,(p1.x+q1.x)/2,(p1.y+q1.y)/2);ctx.restore();
  }

  function draw(){
    const canvas=$('tpCanvas');if(!canvas||!state.points)return;
    const wrap=canvas.parentElement,W=Math.max(780,Math.min(1400,wrap.clientWidth||1200)),H=Math.max(620,Math.min(900,Math.round(W*.72))),dpr=window.devicePixelRatio||1;
    canvas.style.width=W+'px';canvas.style.height=H+'px';canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
    const {sc}=fitTransform(),p=state.points;
    // Base triangle outline
    drawPolygon(ctx,[p.B,p.C,p.A],sc,'rgba(255,255,255,.98)','#163b4d',4);
    // Fill every separated part and the current remaining field.
    const fills=['rgba(194,59,50,.13)','rgba(12,81,106,.13)','rgba(122,90,0,.14)','rgba(94,65,145,.12)','rgba(18,125,91,.12)'];
    state.parts.forEach((part,i)=>drawPolygon(ctx,part.cut,sc,fills[i%fills.length],'#b43a32',2.2));
    if(state.remaining)drawPolygon(ctx,state.remaining,sc,'rgba(8,35,54,.035)','#0c516a',3);

    // Original side dimensions
    drawDimension(ctx,sc(p.A),sc(p.B),ftIn(dist(p.A,p.B)),30);
    drawDimension(ctx,sc(p.B),sc(p.C),ftIn(dist(p.B,p.C)),32);
    drawDimension(ctx,sc(p.C),sc(p.A),ftIn(dist(p.C,p.A)),30);

    // Draw every split boundary, clearly separated.
    state.parts.forEach((part,i)=>{
      const line=part.line;
      if(line.type==='horizontal'){
        const xs=line.points||[];
        if(xs.length===2)drawDimension(ctx,sc(xs[0]),sc(xs[1]),ftIn(dist(xs[0],xs[1])),-30,true);
      }else if(line.type==='vertex'){
        drawDimension(ctx,sc(line.V),sc(line.D),ftIn(dist(line.V,line.D)),-32,true);
      }
    });

    // Corner labels
    [['A',p.A],['B',p.B],['C',p.C]].forEach(([n,q])=>{
      const s=sc(q);ctx.beginPath();ctx.arc(s.x,s.y,10,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#0c516a';ctx.stroke();
      ctx.fillStyle='#082336';ctx.font='800 17px Arial';ctx.fillText(n,s.x+15,s.y-15);
    });

    // Part/remaining labels in the drawing
    state.parts.forEach(part=>{
      const c=sc(centroid(part.cut));
      ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='900 20px Arial,"Noto Sans Bengali",sans-serif';ctx.fillStyle='#8e251e';
      ctx.fillText(partName(part.index),c.x,c.y-10);
      ctx.font='700 14px Arial,"Noto Sans Bengali",sans-serif';ctx.fillText(fmtArea(part.area),c.x,c.y+16);ctx.restore();
    });
    if(state.remaining?.length>=3){
      const c=sc(centroid(state.remaining));
      ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 20px Arial,"Noto Sans Bengali",sans-serif';ctx.fillStyle='#0c516a';
      ctx.fillText('অবশিষ্ট ভাগ',c.x,c.y-10);ctx.font='700 14px Arial,"Noto Sans Bengali",sans-serif';ctx.fillText(fmtArea(polyArea(state.remaining)),c.x,c.y+16);ctx.restore();
    }
  }

  function updateResult(){
    const total=area(sideInputs()),used=state.parts.reduce((s,p)=>s+p.area,0),rem=polyArea(state.remaining);
    if(!total||!state.parts.length)return;
    const last=state.parts[state.parts.length-1];
    $('tpResult').innerHTML=
      `<div class="tp-result-main"><strong>মোট ক্ষেত্রফল: ${fmtArea(total)}</strong><span>${state.parts.length}টি ভাগ তৈরি হয়েছে • প্রতিটি নতুন ভাগ বর্তমান অবশিষ্ট ক্ষেত্র থেকে আলাদা করা হয়েছে</span></div>`+
      `<div class="tp-result-grid"><div><b>${fmtArea(last.area)}</b><small>${partName(last.index)}</small></div><div><b>${fmtArea(rem)}</b><small>অবশিষ্ট ভাগ</small></div><div><b>${bn((last.area/total)*100,3)}%</b><small>মোট ক্ষেত্রের তুলনায় সর্বশেষ ভাগ</small></div></div>`;
    $('tpEditor').hidden=false;$('tpDrawingWrap').hidden=false;
    $('tpDimAB').textContent=ftIn(total?sideInputs().AB:NaN);$('tpDimBC').textContent=ftIn(sideInputs().BC);$('tpDimCA').textContent=ftIn(sideInputs().CA);
    $('tpDimSplit').textContent=last.line.type==='horizontal'?'হরিজন্টাল':`শীর্ষবিন্দু ${last.line.vertex}`;
    $('tpDrawingMeta').textContent=`${state.parts.length}টি ভাগ • ${fmtArea(rem)} অবশিষ্ট`;
    updatePartCards(total);
    updateLegacyDemarcation(total);
    draw();
  }

  function updatePartCards(total){
    const box=$('tpPartSummary');
    if(!box)return;
    box.innerHTML=state.parts.map(p=>`<div class="tp-part-summary-row"><strong>${partName(p.index)}</strong><span>${p.method==='horizontal'?'হরিজন্টাল':'শীর্ষবিন্দু থেকে'} • ${fmtArea(p.area)}</span></div>`).join('')+
      `<div class="tp-part-summary-row tp-part-summary-remaining"><strong>অবশিষ্ট ভাগ</strong><span>${fmtArea(polyArea(state.remaining))}</span></div>`;
    if($('tpMultiStatus'))$('tpMultiStatus').textContent=`মোট ${state.parts.length}টি ভাগ • ${fmtArea(polyArea(state.remaining))} অবশিষ্ট। পরের ভাগও এখান থেকেই কাটা হবে।`;
  }

  function updateLegacyDemarcation(total){
    const first=state.parts[0], last=state.parts[state.parts.length-1];
    const set=(id,v)=>{if($(id))$(id).textContent=ftIn(v);};
    if(first?.line.type==='horizontal'){
      const cut=first.cut;
      const basePts=cut.filter(p=>Math.abs(p.y-Math.min(...cut.map(q=>q.y)))<1e-5);
      if(basePts.length>=2){
        const [a,b]=basePts.slice(0,2);set('tpSegPQ',dist(a,b));
      }
    }
    if($('tpFirstAreaLabel'))$('tpFirstAreaLabel').textContent=first?fmtArea(first.area):'—';
    if($('tpRestAreaLabel'))$('tpRestAreaLabel').textContent=fmtArea(polyArea(state.remaining));
    if($('tpSegBP'))$('tpSegBP').textContent='—';
    if($('tpSegQC'))$('tpSegQC').textContent='—';
    if($('tpSegBaseBC'))$('tpSegBaseBC').textContent=ftIn(sideInputs().BC);
    if($('tpSegAP'))$('tpSegAP').textContent='—';
    if($('tpSegAQ'))$('tpSegAQ').textContent='—';
    if($('tpSegRestPQ'))$('tpSegRestPQ').textContent='—';
    if($('tpExtraDemarcation')){
      $('tpExtraDemarcation').hidden=false;
      $('tpExtraDemarcation').innerHTML=state.parts.map(p=>`<div class="tp-region-boundary"><h5>${partName(p.index)} — ${fmtArea(p.area)}</h5><div><span>ভাগের ধরন</span><b>${p.method==='horizontal'?'হরিজন্টাল':'শীর্ষবিন্দু থেকে'}</b></div><div><span>ভাগরেখা</span><b>${p.line.type==='horizontal'?ftIn(Math.abs((p.line.points?.[0]?.x||0)-(p.line.points?.[1]?.x||0))):ftIn(dist(p.line.V,p.line.D))}</b></div></div>`).join('')+
        `<div class="tp-region-boundary"><h5>অবশিষ্ট ভাগ — ${fmtArea(polyArea(state.remaining))}</h5><div><span>বর্তমান অবশিষ্ট ক্ষেত্র</span><b>${fmtArea(polyArea(state.remaining))}</b></div></div>`;
    }
  }

  function rebuildAll(){
    const s=sideInputs(),q=triangleFromSides(s);
    if(!q){alert('তিনটি বাহুর সঠিক ফুট–ইঞ্চি মাপ দিন।');return false;}
    const total=area(s);
    const amountType=$('tpPartType')?.value||'decimal';
    const f=getPartFraction('tpPart', 'tpPartType', total);
    if(!validateFraction(f)){alert('প্রথম ভাগের পরিমাণ দিন। ভাগের ধরন ডেসিমেল / শতাংশ অথবা বর্গফুট হতে পারে।');return false;}
    const method=getMethod('tp'),vertex=$('tpVertex')?.value||'A';
    state.points=q;
    const result=applySplit([q.B,q.C,q.A],method,f,vertex);
    if(!result||result.error){alert(result?.error||'প্রথম ভাগ তৈরি করা যায়নি।');return false;}
    const firstArea=polyArea(result.cut);
    state.points=q;state.remaining=result.remaining;state.parts=[{
      index:1,method,vertex,remainingFraction:f,fractionFromOriginal:firstArea/total,area:firstArea,cut:result.cut,
      line:result.line
    }];
    state.lastSplitLine=result.line;
    // Add the actual horizontal endpoints for dimension drawing.
    if(result.line.type==='horizontal'){
      const y=result.line.y, pts=result.cut.filter(p=>Math.abs(p.y-y)<1e-5);
      if(pts.length>=2)result.line.points=[pts[0],pts[pts.length-1]];
    }
    state.panX=0;state.panY=0;state.zoom=1;
    updateResult();
    return true;
  }

  function addMoreSplit(){
    if(!state.remaining||!state.parts.length){alert('আগে প্রথম ভাগের হিসাব ও Drawing তৈরি করুন।');return;}
    const remainingArea=polyArea(state.remaining);
    const f=getPartFraction('tpMoreAmount','tpMoreType',remainingArea);
    if(!validateFraction(f)){alert('নতুন ভাগের পরিমাণ দিন। ডেসিমেল / শতাংশ অথবা বর্গফুট সঠিকভাবে দিন।');return;}
    const method=getMethod('tpMore'),vertex=$('tpMoreVertex')?.value||'A';
    const result=applySplit(state.remaining,method,f,vertex);
    if(!result||result.error){alert(result?.error||'নতুন ভাগটি অবশিষ্ট ক্ষেত্র থেকে তৈরি করা যাচ্ছে না।');return;}
    const total=area(sideInputs()),a=polyArea(result.cut);
    const part={index:state.parts.length+1,method,vertex,remainingFraction:f,fractionFromOriginal:a/total,area:a,cut:result.cut,line:result.line};
    if(result.line.type==='horizontal'){
      const y=result.line.y,pts=result.cut.filter(p=>Math.abs(p.y-y)<1e-5);
      if(pts.length>=2)result.line.points=[pts[0],pts[pts.length-1]];
    }
    state.parts.push(part);state.remaining=result.remaining;state.lastSplitLine=result.line;
    clearMoreInputs();updateResult();
  }

  function removeLastSplit(){
    if(state.parts.length<=1){alert('প্রথম ভাগ সরানো যাবে না। সব ভাগ নতুন করে শুরু করতে পরিষ্কার বাটন ব্যবহার করুন।');return;}
    state.parts.pop();
    const q=state.points,total=area(sideInputs());
    let rem=[q.B,q.C,q.A],rebuilt=[];
    for(const old of state.parts){
      const r=applySplit(rem,old.method,old.remainingFraction,old.vertex);
      if(!r||r.error)break;
      const a=polyArea(r.cut),np={...old,area:a,cut:r.cut,fractionFromOriginal:a/total,line:r.line};
      if(r.line.type==='horizontal'){
        const y=r.line.y,pts=r.cut.filter(p=>Math.abs(p.y-y)<1e-5);
        if(pts.length>=2)r.line.points=[pts[0],pts[pts.length-1]];
      }
      rebuilt.push(np);rem=r.remaining;
    }
    state.parts=rebuilt;state.remaining=rem;state.lastSplitLine=rebuilt.at(-1)?.line||null;updateResult();
  }

  function downloadDrawing(){
    const c=$('tpCanvas');if(!c)return;
    const a=document.createElement('a');a.download='triangle-partition-drawing.png';a.href=c.toDataURL('image/png');a.click();
  }

  function zoomBy(delta){
    state.zoom=Math.max(.65,Math.min(2.8,Number((state.zoom+delta).toFixed(2))));
    if($('tpZoomValue'))$('tpZoomValue').textContent=`${Math.round(state.zoom*100)}%`;
    draw();
  }
  function resetZoom(){state.zoom=1;state.panX=0;state.panY=0;if($('tpZoomValue'))$('tpZoomValue').textContent='100%';draw();}

  function toggleDrag(){
    state.dragEdit=!state.dragEdit;
    if($('tpPointEdit'))$('tpPointEdit').textContent=state.dragEdit?'✋ Drawing Edit: ON':'✋ Drawing Edit: OFF';
    if($('tpEditStatus'))$('tpEditStatus').textContent=state.dragEdit
      ?'সর্বশেষ ভাগের সীমারেখা Touch/Mouse দিয়ে সরানো যাবে।'
      :'Drawing Edit চালু করলে সর্বশেষ ভাগের সীমারেখা Edit করা যাবে।';
  }

  // Lightweight drawing edit: drag the latest horizontal cut up/down and
  // rebuild all later partitions from their saved remaining-area fractions.
  function worldFromScreen(sp){
    const canvas=$('tpCanvas'),r=canvas.getBoundingClientRect(),t=fitTransform();
    return {x:(sp.x-r.left-t.ox)/t.scale,y:(t.oy-(sp.y-r.top))/t.scale};
  }
  function canvasPoint(e){const r=$('tpCanvas').getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  function pointSegDistance(p,a,b){
    const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy||1;
    let t=((p.x-a.x)*dx+(p.y-a.y)*dy)/l2;t=Math.max(0,Math.min(1,t));
    return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
  }
  let dragging=false,lastPt=null;
  $('tpCanvas')?.addEventListener('pointerdown',e=>{
    if(!state.dragEdit||!state.lastSplitLine)return;
    const sp=canvasPoint(e),t=fitTransform();
    if(state.lastSplitLine.type==='horizontal'&&state.lastSplitLine.points){
      const a=t.sc(state.lastSplitLine.points[0]),b=t.sc(state.lastSplitLine.points[1]);
      if(pointSegDistance(sp,a,b)<35){dragging=true;e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();}
    }
  });
  $('tpCanvas')?.addEventListener('pointermove',e=>{
    if(!dragging||!state.lastSplitLine||state.lastSplitLine.type!=='horizontal')return;
    const w=worldFromScreen(canvasPoint(e)), last=state.parts[state.parts.length-1], remBefore=state.parts.length===1?[state.points.B,state.points.C,state.points.A]:null;
    // Dragging is intentionally limited to the latest horizontal boundary;
    // rebuild the latest split as a fraction of its current remaining polygon.
    const basePoly=state.parts.length===1?[state.points.B,state.points.C,state.points.A]:state.parts[state.parts.length-2]?state.parts[state.parts.length-2].cut:null;
    if(!basePoly)return;
    const total=polyArea(basePoly),cut=clipHalfPlane(basePoly,{x:0,y:w.y},{x:1,y:0},1),f=polyArea(cut)/total;
    if(validateFraction(f)){
      const result=splitHorizontal(basePoly,f);if(!result)return;
      last.cut=result.cut;last.area=polyArea(result.cut);last.line=result.line;state.remaining=result.remaining;state.lastSplitLine=result.line;
      if(result.line.type==='horizontal'){const y=result.line.y,pts=result.cut.filter(p=>Math.abs(p.y-y)<1e-5);if(pts.length>=2)result.line.points=[pts[0],pts[pts.length-1]];}
      updateResult();
    }
    e.preventDefault();
  });
  $('tpCanvas')?.addEventListener('pointerup',e=>{dragging=false;try{e.currentTarget.releasePointerCapture(e.pointerId);}catch(_){}});
  $('tpCanvas')?.addEventListener('pointercancel',()=>{dragging=false;});

  // UI events
  $('tpMethod')?.addEventListener('change',()=>updateModeUI('tp'));
  $('tpVertex')?.addEventListener('change',()=>updateModeUI('tp'));
  $('tpMoreMethod')?.addEventListener('change',()=>updateMoreModeUI());
  $('tpMoreVertex')?.addEventListener('change',()=>updateMoreModeUI());
  $('tpCalc')?.addEventListener('click',rebuildAll);
  $('tpAddSplitApply')?.addEventListener('click',addMoreSplit);
  $('tpRemoveExtra')?.addEventListener('click',removeLastSplit);
  $('tpMorePart')?.addEventListener('click',()=>{$('tpMoreCard').hidden=false;$('tpMoreAmount')?.focus();});
  $('tpPointEdit')?.addEventListener('click',toggleDrag);
  $('tpDownloadSvg')?.addEventListener('click',downloadDrawing);
  $('tpZoomIn')?.addEventListener('click',()=>zoomBy(.15));
  $('tpZoomOut')?.addEventListener('click',()=>zoomBy(-.15));
  $('tpZoomReset')?.addEventListener('click',resetZoom);
  $('tpReset')?.addEventListener('click',()=>{
    ['tpAB','tpABIn','tpBC','tpBCIn','tpCA','tpCAIn','tpPart','tpMoreAmount'].forEach(id=>{if($(id))$(id).value='';});
    if($('tpPartType'))$('tpPartType').value='decimal';
    if($('tpMethod'))$('tpMethod').value='horizontal';
    if($('tpVertex'))$('tpVertex').value='A';
    clearMoreInputs();resetState();
    if($('tpResult'))$('tpResult').innerHTML='<div class="small-note">তিন বাহুর ফুট–ইঞ্চি মাপ দিয়ে হিসাব শুরু করুন।</div>';
    if($('tpEditor'))$('tpEditor').hidden=true;if($('tpDrawingWrap'))$('tpDrawingWrap').hidden=true;
    if($('tpExtraDemarcation'))$('tpExtraDemarcation').hidden=true;
    if($('tpMoreCard'))$('tpMoreCard').hidden=true;
    if($('tpZoomValue'))$('tpZoomValue').textContent='100%';
    updateModeUI('tp');
  });
  window.addEventListener('resize',()=>{if(state.points)draw();});
  $('tpCanvas')?.addEventListener('wheel',e=>{if(!state.points)return;e.preventDefault();zoomBy(e.deltaY<0?.1:-.1);},{passive:false});

  updateModeUI('tp');updateMoreModeUI();
})();
}
