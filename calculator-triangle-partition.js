if (window.__SAH_TRIANGLE_PARTITION_LOADED) {
} else {
window.__SAH_TRIANGLE_PARTITION_LOADED = true;
(() => {
  const $ = id => document.getElementById(id);
  const bn = (n,d=2) => Number(n).toLocaleString('bn-BD',{maximumFractionDigits:d});
  const EPS = 1e-8;
  const state = {
    mode:'horizontal', points:null, split:null, extraFraction:null,
    dragEdit:false, dragging:null, zoom:1, panX:0, panY:0,
    editBaseline:null, _editingSegmentIndex:null
  };

  function readFI(ftId,inId){
    const f=Number($(ftId)?.value), i=Number($(inId)?.value||0);
    if(!Number.isFinite(f)||f<0||!Number.isFinite(i)||i<0||i>=12) return NaN;
    return f+i/12;
  }
  function writeFI(ftId,inId,v){
    const x=Math.max(0,Number(v)||0), f=Math.floor(x+1e-9), i=Math.round((x-f)*100)/100;
    if($(ftId)) $(ftId).value=f;
    if($(inId)) $(inId).value=i;
  }
  function ftIn(v){
    if(!Number.isFinite(v)) return '—';
    const sign=v<0?'-':'', x=Math.abs(v);
    let totalIn=Math.round(x*12);
    let f=Math.floor(totalIn/12), i=totalIn%12;
    if(i>=12){f++;i=0;}
    // Drawing dimension: conventional feet-inch notation, e.g. ৬০'-৯".
    // Keep calculations at full precision; only the displayed dimension is
    // rounded to the nearest whole inch.
    return `${sign}${bn(f,0)}'-${bn(i,0)}\"`;
  }
  function sideInputs(){return {AB:readFI('tpAB','tpABIn'),BC:readFI('tpBC','tpBCIn'),CA:readFI('tpCA','tpCAIn')};}
  function triangleFromSides(s){
    if(Object.values(s).some(v=>!Number.isFinite(v)||v<=0)) return null;
    if(s.AB+s.BC<=s.CA+EPS || s.AB+s.CA<=s.BC+EPS || s.BC+s.CA<=s.AB+EPS) return null;
    const x=(s.AB*s.AB+s.BC*s.BC-s.CA*s.CA)/(2*s.BC), h2=s.AB*s.AB-x*x;
    if(!(h2>EPS)) return null;
    return {B:{x:0,y:0},C:{x:s.BC,y:0},A:{x,y:Math.sqrt(h2)}};
  }
  function area(s){
    const p=(s.AB+s.BC+s.CA)/2, z=p*(p-s.AB)*(p-s.BC)*(p-s.CA);
    return z>0?Math.sqrt(z):0;
  }
  function fmtArea(v){return `${bn(v,3)} বর্গফুট ≈ ${bn(v/435.6,4)} শতাংশ`;}
  function percentFromFraction(f){return Math.max(0,Math.min(100,f*100));}

  function setMode(mode){
    state.mode=mode;
    document.querySelectorAll('.tp-mode').forEach(b=>{
      const a=b.dataset.tpMode===mode; b.classList.toggle('active',a); b.setAttribute('aria-selected',a?'true':'false');
    });
    document.querySelectorAll('.tp-vertex-only').forEach(e=>e.hidden=mode!=='vertex');
    if($('tpModeHelp')) $('tpModeHelp').textContent=mode==='horizontal'?'BC-র সমান্তরাল একটি ভাগরেখা তৈরি হবে।':'নির্বাচিত শীর্ষবিন্দু থেকে বিপরীত বাহুতে একটি ভাগরেখা তৈরি হবে।';
    if($('tpModeNote')) $('tpModeNote').textContent=mode==='horizontal'?'প্রথম ভাগটি BC-র পাশের অংশ। ৫০% দিলে দুই অংশ সমান ক্ষেত্রফল হবে।':'প্রথম ভাগটি নির্বাচিত শীর্ষবিন্দুর বিপরীত বাহুর নির্বাচিত প্রান্তের পাশের অংশ।';
    if(mode!=='horizontal') state.extraFraction=null;
  }
  function getPartFraction(s){
    const type=$('tpPartType').value, v=Number($('tpPart').value), total=area(s);
    if(!Number.isFinite(v)||v<=0||!total) return NaN;
    if(type==='percent') return v/100;
    if(type==='decimal') return (v*435.6)/total;
    return v/total;
  }
  function computeSplit(s,fOverride){
    const f=Number.isFinite(fOverride)?fOverride:getPartFraction(s);
    if(!(f>0&&f<1)||!state.points) return null;
    if(state.mode==='horizontal'){
      // f is the area fraction of the B-C-side region. The remaining A-side
      // triangle is similar to ABC, so r=AP/AB=AQ/AC=PQ/BC=sqrt(1-f).
      const r=Math.sqrt(1-f), A=state.points.A,B=state.points.B,C=state.points.C;
      const P={x:A.x+(B.x-A.x)*r,y:A.y+(B.y-A.y)*r};
      const Q={x:A.x+(C.x-A.x)*r,y:A.y+(C.y-A.y)*r};
      return {type:'horizontal',fraction:f,r,P,Q,length:Math.hypot(Q.x-P.x,Q.y-P.y)};
    }
    const v=$('tpVertex').value, map={A:{V:'A',U:'B',W:'C'},B:{V:'B',U:'C',W:'A'},C:{V:'C',U:'A',W:'B'}}[v];
    const U=state.points[map.U],W=state.points[map.W],V=state.points[map.V];
    const D={x:U.x+(W.x-U.x)*f,y:U.y+(W.y-U.y)*f};
    return {type:'vertex',fraction:f,V,D,U,W,length:Math.hypot(D.x-V.x,D.y-V.y),vertex:v};
  }

  // One canonical geometry-derived boundary model. Every display/edit/drawing
  // function below reads from this model instead of maintaining separate numbers.
  function horizontalBoundaryRegions(){
    const p=state.points, cuts=[state.split,state.extraFraction!=null?computeSplit(sideInputs(),state.extraFraction):null].filter(Boolean).sort((a,b)=>a.fraction-b.fraction);
    if(!cuts.length) return [];
    if(cuts.length===1){
      const c=cuts[0];
      return [{id:'r1',title:'প্রথম/নিম্ন ক্ষেত্র',fraction:c.fraction,areaFraction:c.fraction,
        boundaries:[['BP',dist(p.B,c.P)],['PQ',c.length],['QC',dist(c.Q,p.C)],['BC',dist(p.B,p.C)]]},
        {id:'r2',title:'অবশিষ্ট/উপরের ক্ষেত্র',fraction:c.fraction,areaFraction:1-c.fraction,
        boundaries:[['AP',dist(p.A,c.P)],['PQ',c.length],['AQ',dist(p.A,c.Q)]]}];
    }
    const lo=cuts[0], hi=cuts[1];
    return [
      {id:'r1',title:'ক্ষেত্র ১ — BC পাশের অংশ',areaFraction:lo.fraction,boundaries:[['BP',dist(p.B,lo.P)],['P₁Q₁',lo.length],['Q₁C',dist(lo.Q,p.C)],['BC',dist(p.B,p.C)]]},
      {id:'r2',title:'ক্ষেত্র ২ — মধ্যবর্তী অংশ',areaFraction:hi.fraction-lo.fraction,boundaries:[['P₁P₂',dist(lo.P,hi.P)],['P₂Q₂',hi.length],['Q₂Q₁',dist(hi.Q,lo.Q)],['Q₁P₁',lo.length]]},
      {id:'r3',title:'ক্ষেত্র ৩ — A পাশের অংশ',areaFraction:1-hi.fraction,boundaries:[['AP₂',dist(p.A,hi.P)],['P₂Q₂',hi.length],['Q₂A',dist(hi.Q,p.A)]]}
    ];
  }
  function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}

  function currentSegments(sp){
    const p=state.points;
    if(sp.type==='horizontal') return {
      first:[['BP',dist(p.B,sp.P)],['PQ',sp.length],['QC',dist(sp.Q,p.C)],['BC',dist(p.B,p.C)]],
      remaining:[['AP',dist(p.A,sp.P)],['AQ',dist(p.A,sp.Q)],['PQ',sp.length]]
    };
    return {
      first:[[sp.vertex+sp.U,dist(sp.V,sp.U)],['U-D',dist(sp.U,sp.D)],['V-D',sp.length]],
      remaining:[[sp.vertex+sp.W,dist(sp.V,sp.W)],['D-W',dist(sp.D,sp.W)],['U-W',dist(sp.U,sp.W)]]
    };
  }
  function segmentLabels(sp){
    return sp.type==='horizontal'?{first:['BP','PQ','QC'],remaining:['AP','AQ','PQ']}:{first:[sp.vertex+sp.U,'U-D',sp.vertex+'-D'],remaining:[sp.vertex+sp.W,'D-W',sp.U+'-'+sp.W]};
  }
  function dimInputHTML(prefix,label){
    return `<div class="tp-dim-edit-item"><strong>${label}</strong><div class="tp-fi"><input id="${prefix}Ft" type="number" min="0" step="any" placeholder="ফুট"><input id="${prefix}In" type="number" min="0" max="11.999" step="0.01" placeholder="ইঞ্চি"></div></div>`;
  }
  function renderEditFields(sp){
    const seg=currentSegments(sp), labels=segmentLabels(sp), first=$('tpEditFirstFields'); if(!first)return;
    if(sp.type==='horizontal'){
      // Canonical first boundary is BP + PQ + QC + BC. BC is read-only because
      // it is an original triangle boundary, not an editable partition edge.
      first.innerHTML=seg.first.slice(0,3).map((x,i)=>dimInputHTML('tpEditF'+i,labels.first[i])).join('')+
        `<div class="tp-readonly-dim tp-fixed-base"><span>BC / সম্পূর্ণ ভিত্তি</span><b>${ftIn(seg.first[3][1])}</b></div>`;
      [0,1,2].forEach(i=>writeFI('tpEditF'+i+'Ft','tpEditF'+i+'In',seg.first[i][1]));
      state.editBaseline={0:seg.first[0][1],1:seg.first[1][1],2:seg.first[2][1]};
      if($('tpEditFirstTitle')) $('tpEditFirstTitle').textContent='যে ভাগটি আলাদা করছেন — BP + PQ + QC + BC';
      const help=document.querySelector('#tpEditor .tp-inline-help'); if(help) help.textContent='BP / PQ / QC-এর যেকোনো একটি মাপ পরিবর্তন করুন। BC হলো মূল ত্রিভুজের সম্পূর্ণ ভিত্তি—এটি Edit করা যাবে না। পরিবর্তনের পর একই geometry থেকে ভাগরেখা, সব Dimension, ক্ষেত্রফল ও অতিরিক্ত ভাগ পুনর্গণনা হবে।';
    } else {
      first.innerHTML=`<div class="tp-readonly-dim tp-fixed-base"><span>${labels.first[0]} / মূল বাহু</span><b>${ftIn(seg.first[0][1])}</b></div>`+
        seg.first.slice(1).map((x,i)=>dimInputHTML('tpEditF'+(i+1),labels.first[i+1])).join('');
      writeFI('tpEditF1Ft','tpEditF1In',seg.first[1][1]);writeFI('tpEditF2Ft','tpEditF2In',seg.first[2][1]);
      state.editBaseline={1:seg.first[1][1],2:seg.first[2][1]};
      if($('tpEditFirstTitle')) $('tpEditFirstTitle').textContent='যে ভাগটি আলাদা করছেন — মূল বাহু অপরিবর্তিত';
    }
    const rest=$('tpEditRestFields');
    if(rest) rest.innerHTML=seg.remaining.map((x,i)=>`<div class="tp-readonly-dim"><span>${labels.remaining[i]}</span><b>${ftIn(x[1])}</b></div>`).join('');
  }

  function renderMultiRegionPanel(total){
    const regions=horizontalBoundaryRegions();
    const box=$('tpExtraDemarcation'); if(!box)return;
    if(regions.length<3){box.hidden=true;return;}
    box.hidden=false;
    box.innerHTML=`<strong>৩টি ক্ষেত্রের পূর্ণ Boundary Dimension</strong>`+regions.map((r,i)=>`<div class="tp-region-boundary"><h5>${r.title} — ${fmtArea(total*r.areaFraction)}</h5>${r.boundaries.map(([n,v])=>`<div><span>${n}</span><b>${ftIn(v)}</b></div>`).join('')}</div>`).join('');
    const status=$('tpMultiStatus');
    if(status) status.textContent=regions.map((r,i)=>`ক্ষেত্র ${i+1}: ${bn(r.areaFraction*100,3)}% • ${fmtArea(total*r.areaFraction)}`).join('  |  ');
    if($('tpMoreAreaLabel')) $('tpMoreAreaLabel').textContent=state.extraFraction!=null?fmtArea(total*state.extraFraction):'—';
  }

  function draw(){
    const canvas=$('tpCanvas'); if(!canvas||!state.points)return;
    const wrap=canvas.parentElement,W=Math.max(700,Math.min(1200,wrap.clientWidth||1200)),H=Math.max(460,Math.min(720,Math.round(W*.6))),dpr=window.devicePixelRatio||1;
    canvas.style.width=W+'px';canvas.style.height=H+'px';canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
    const p=state.points, cuts=[state.split,state.extraFraction!=null?computeSplit(sideInputs(),state.extraFraction):null].filter(Boolean);
    const xs=[p.A.x,p.B.x,p.C.x],ys=[p.A.y,p.B.y,p.C.y];cuts.forEach(c=>[c.P,c.Q,c.D].forEach(q=>{if(q){xs.push(q.x);ys.push(q.y);}}));
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),pad=90,baseScale=Math.min((W-2*pad)/Math.max(1,maxX-minX),(H-2*pad)/Math.max(1,maxY-minY)),scale=baseScale*state.zoom,ox=(W-(maxX-minX)*scale)/2-minX*scale+state.panX,oy=H-55+minY*scale+state.panY,sc=q=>({x:ox+q.x*scale,y:oy-q.y*scale});
    const A=sc(p.A),B=sc(p.B),C=sc(p.C);
    const line=(a,b,dash=false)=>{ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.setLineDash(dash?[9,7]:[]);ctx.lineWidth=dash?3:4;ctx.strokeStyle=dash?'#c23b32':'#163b4d';ctx.stroke();ctx.restore();};
    line(A,B);line(B,C);line(C,A);
    const dim=(a,b,text,offset,cls='base')=>{const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,p1={x:a.x+nx*offset,y:a.y+ny*offset},q1={x:b.x+nx*offset,y:b.y+ny*offset};ctx.save();ctx.strokeStyle=cls==='split'?'#c23b32':'#71828a';ctx.lineWidth=1.4;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(p1.x,p1.y);ctx.moveTo(b.x,b.y);ctx.lineTo(q1.x,q1.y);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(q1.x,q1.y);ctx.stroke();ctx.fillStyle=cls==='split'?'#a62922':'#082336';ctx.font='700 14px Arial,"Noto Sans Bengali",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,(p1.x+q1.x)/2,(p1.y+q1.y)/2);ctx.restore();};
    dim(A,B,ftIn(dist(p.A,p.B)),28);dim(B,C,ftIn(dist(p.B,p.C)),30);dim(C,A,ftIn(dist(p.C,p.A)),28);

    // Draw region labels inside each partitioned area. These labels are
    // presentation-only; they do not change any geometry or calculation.
    const drawRegionLabel=(pts,text)=>{
      if(!pts||!pts.length)return;
      const cx=pts.reduce((s,q)=>s+q.x,0)/pts.length, cy=pts.reduce((s,q)=>s+q.y,0)/pts.length;
      ctx.save();
      ctx.font='800 17px Arial,"Noto Sans Bengali",sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      const m=ctx.measureText(text), padX=10,padY=6;
      const w=m.width+padX*2,h=26+padY;
      ctx.fillStyle='rgba(255,255,255,.92)';
      ctx.strokeStyle='#8a8a8a';ctx.lineWidth=1;
      ctx.fillRect(cx-w/2,cy-h/2,w,h);ctx.strokeRect(cx-w/2,cy-h/2,w,h);
      ctx.fillStyle='#082336';ctx.fillText(text,cx,cy);
      ctx.restore();
    };
    const regionPoint=q=>sc(q);
    if(state.mode==='horizontal'&&cuts.length){
      const sortedCuts=cuts.slice().sort((a,b)=>a.fraction-b.fraction);
      const first=sortedCuts[0];
      if(sortedCuts.length===1){
        drawRegionLabel([B,C,regionPoint(first.Q),regionPoint(first.P)],'১ম ভাগ');
        drawRegionLabel([A,regionPoint(first.P),regionPoint(first.Q)],'অবশিষ্ট ক্ষেত্র');
      }else{
        const second=sortedCuts[1];
        drawRegionLabel([B,C,regionPoint(first.Q),regionPoint(first.P)],'১ম ভাগ');
        drawRegionLabel([regionPoint(first.P),regionPoint(first.Q),regionPoint(second.Q),regionPoint(second.P)],'২য় ভাগ');
        drawRegionLabel([A,regionPoint(second.P),regionPoint(second.Q)],'অবশিষ্ট ক্ষেত্র');
      }
    }else if(state.mode==='vertex'&&state.split){
      const sp=state.split;
      drawRegionLabel([sc(sp.V),sc(sp.U),sc(sp.D)],'১ম ভাগ');
      drawRegionLabel([sc(sp.V),sc(sp.D),sc(sp.W)],'অবশিষ্ট ক্ষেত্র');
    }
    if(state.mode==='horizontal'){
      const sorted=cuts.sort((a,b)=>a.fraction-b.fraction);
      sorted.forEach((sp,idx)=>{const P=sc(sp.P),Q=sc(sp.Q),off=idx===0?-28:-58;line(P,Q,true);dim(P,Q,ftIn(sp.length),off,'split');});
      if(sorted.length===1){const sp=sorted[0];dim(B,sc(sp.P),ftIn(dist(p.B,sp.P)),-24,'split');dim(sc(sp.Q),C,ftIn(dist(sp.Q,p.C)),-24,'split');dim(A,sc(sp.P),ftIn(dist(p.A,sp.P)),22);dim(A,sc(sp.Q),ftIn(dist(p.A,sp.Q)),22);}
      if(sorted.length===2){const lo=sorted[0],hi=sorted[1];dim(B,sc(lo.P),ftIn(dist(p.B,lo.P)),-24,'split');dim(sc(lo.Q),C,ftIn(dist(lo.Q,p.C)),-24,'split');dim(A,sc(hi.P),ftIn(dist(p.A,hi.P)),22);dim(A,sc(hi.Q),ftIn(dist(p.A,hi.Q)),22);dim(sc(lo.P),sc(hi.P),ftIn(dist(lo.P,hi.P)),46);dim(sc(lo.Q),sc(hi.Q),ftIn(dist(lo.Q,hi.Q)),46);}
    } else if(state.split){const sp=state.split,V=sc(sp.V),D=sc(sp.D);line(V,D,true);dim(sc(sp.U),D,ftIn(dist(sp.U,sp.D)),-24,'split');dim(V,D,ftIn(sp.length),-28,'split');dim(D,sc(sp.W),ftIn(dist(sp.D,sp.W)),-24);}
    [['A',A],['B',B],['C',C]].forEach(([n,q])=>{ctx.beginPath();ctx.arc(q.x,q.y,9,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#0c516a';ctx.stroke();ctx.fillStyle='#082336';ctx.font='800 16px Arial';ctx.fillText(n,q.x+14,q.y-14);});
    if(state.mode==='horizontal') cuts.forEach(sp=>{[sc(sp.P),sc(sp.Q)].forEach(q=>{ctx.beginPath();ctx.arc(q.x,q.y,8,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#c23b32';ctx.stroke();});});
    else if(state.split){const q=sc(state.split.D);ctx.beginPath();ctx.arc(q.x,q.y,8,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#c23b32';ctx.stroke();}
  }

  function updateSegmentText(){
    const sp=state.split;if(!sp)return;const seg=currentSegments(sp),set=(id,v)=>{if($(id))$(id).textContent=ftIn(v);};
    if(sp.type==='horizontal'){set('tpSegBP',seg.first[0][1]);set('tpSegPQ',seg.first[1][1]);set('tpSegQC',seg.first[2][1]);set('tpSegBaseBC',seg.first[3][1]);set('tpSegAP',seg.remaining[0][1]);set('tpSegAQ',seg.remaining[1][1]);set('tpSegRestPQ',seg.remaining[2][1]);}
    else {set('tpSegVU',seg.first[0][1]);set('tpSegUD',seg.first[1][1]);set('tpSegVD',seg.first[2][1]);set('tpSegVW',seg.remaining[0][1]);set('tpSegDW',seg.remaining[1][1]);set('tpSegUW',seg.remaining[2][1]);}
  }

  function rebuildExtraGeometry(){
    if(state.mode!=='horizontal'||state.extraFraction==null){state.extraFraction=null;return;}
    if(!(state.extraFraction>0&&state.extraFraction<1)||Math.abs(state.extraFraction-state.split.fraction)<.0001){state.extraFraction=null;return;}
  }
  function renderResult(total){
    const sp=state.split,f=sp.fraction,a1=total*f,a2=total-a1;
    $('tpResult').innerHTML=`<div class="tp-result-main"><strong>মোট ক্ষেত্রফল: ${fmtArea(total)}</strong><span>${state.mode==='horizontal'?'হরিজন্টাল':'শীর্ষবিন্দু থেকে'} ভাগ • প্রথম ভাগ ${bn(percentFromFraction(f),3)}%</span></div><div class="tp-result-grid"><div><b>${fmtArea(a1)}</b><small>প্রথম ভাগ</small></div><div><b>${fmtArea(a2)}</b><small>অবশিষ্ট ক্ষেত্র</small></div><div><b>${ftIn(sp.length)}</b><small>ভাগরেখা</small></div></div>`;
    $('tpEditor').hidden=false;$('tpDrawingWrap').hidden=false;$('tpEditPart').value=Number(percentFromFraction(f).toFixed(3));
    if($('tpFirstAreaLabel'))$('tpFirstAreaLabel').textContent=fmtArea(a1);if($('tpRestAreaLabel'))$('tpRestAreaLabel').textContent=fmtArea(a2);
    document.querySelectorAll('.tp-demarcation-vertex').forEach(e=>e.hidden=state.mode!=='vertex');document.querySelectorAll('.tp-demarcation-first,.tp-demarcation-rest').forEach(e=>e.hidden=state.mode==='vertex');
    $('tpDimAB').textContent=ftIn(sideInputs().AB);$('tpDimBC').textContent=ftIn(sideInputs().BC);$('tpDimCA').textContent=ftIn(sideInputs().CA);$('tpDimSplit').textContent=ftIn(sp.length);
    $('tpDrawingMeta').textContent=`প্রথম ভাগ ${bn(percentFromFraction(f),2)}% • ${fmtArea(a1)} • অবশিষ্ট ${fmtArea(a2)}`;
    if($('tpMoreCard'))$('tpMoreCard').hidden=false;if($('tpMorePercent')&&state.extraFraction==null)$('tpMorePercent').value='';
    if($('tpExtraDemarcation')) $('tpExtraDemarcation').hidden=true;
    updateSegmentText();renderEditFields(sp);rebuildExtraGeometry();renderMultiRegionPanel(total);draw();
  }

  function render(fOverride,preserveExtra=false){
    const s=sideInputs(),q=triangleFromSides(s);
    if(!q){$('tpResult').innerHTML='<div class="warning">তিনটি বাহুর মাপ দিয়ে বৈধ বিষমবাহু ত্রিভুজ তৈরি করা যাচ্ছে না। প্রতিটি বাহু দিন এবং যেকোনো দুই বাহুর যোগফল তৃতীয় বাহুর চেয়ে বড় হতে হবে।</div>';$('tpEditor').hidden=true;$('tpDrawingWrap').hidden=true;return false;}
    const oldExtra=preserveExtra?state.extraFraction:null;state.points=q;const f=Number.isFinite(fOverride)?fOverride:getPartFraction(s);state.split=computeSplit(s,f);
    if(!state.split){$('tpResult').innerHTML='<div class="warning">প্রথম ভাগের পরিমাণ ০-এর বেশি এবং মোট ক্ষেত্রফলের ১০০%-এর কম দিন।</div>';return false;}
    state.extraFraction=oldExtra;state.panX=0;state.panY=0;const total=area(s);renderResult(total);return true;
  }
  function setFraction(f){if(!(f>0&&f<1)){alert('ভাগের পরিমাণ ০% থেকে ১০০%-এর মধ্যে দিন।');return false;}$('tpPartType').value='percent';$('tpPart').value=Number((f*100).toFixed(3));return true;}

  function applySplitLength(v){
    const s=sideInputs();if(!(v>0))return false;let f;
    const oldFirst=state.split?.fraction, extra=state.extraFraction, preservesPartitionOrder=f=>extra==null || (oldFirst<extra ? f<extra-EPS : f>extra+EPS);
    if(state.mode==='horizontal'){
      const changed=state._editingSegmentIndex;
      if(changed===0){if(v>=s.AB)return false;const r=1-v/s.AB;f=1-r*r;}
      else if(changed===1){if(v>=s.BC)return false;const r=v/s.BC;f=1-r*r;}
      else {if(v>=s.CA)return false;const r=1-v/s.CA;f=1-r*r;}
    } else {
      const sp=state.split,changed=state._editingSegmentIndex,baseOpposite=dist(sp.U,sp.W);
      if(changed===0)return false;
      if(changed===1){if(!(v>0&&v<baseOpposite))return false;f=v/baseOpposite;}
      else {const V=sp.V,U=sp.U,W=sp.W,a=dist(V,U),b=dist(V,W),c=dist(U,W),Aq=c*c,Bq=b*b-a*a-c*c,Cq=a*a-v*v,disc=Bq*Bq-4*Aq*Cq;if(disc<0)return false;const roots=[(-Bq-Math.sqrt(disc))/(2*Aq),(-Bq+Math.sqrt(disc))/(2*Aq)].filter(x=>x>EPS&&x<1-EPS);if(!roots.length)return false;f=roots.sort((x,y)=>Math.abs(x-sp.fraction)-Math.abs(y-sp.fraction))[0];}
    }
    if(!(f>0&&f<1))return false;
    if(state.extraFraction!=null&&!preservesPartitionOrder(f)){alert('প্রথম ভাগের সীমা দ্বিতীয় ভাগের সীমা অতিক্রম করতে পারবে না। আগে দ্বিতীয় ভাগের শতাংশ পরিবর্তন করুন।');return false;}
    setFraction(f);const keep=state.extraFraction!=null;state._editingSegmentIndex=null;return render(f,keep);
  }
  function silentMode(){return false;}
  function applySelectedDimension(index){const v=readFI('tpEditF'+index+'Ft','tpEditF'+index+'In');if(!Number.isFinite(v)||v<=0){alert('সঠিক ফুট–ইঞ্চি মাপ দিন।');return;}state._editingSegmentIndex=index;if(!applySplitLength(v))state._editingSegmentIndex=null;}
  function toggleDrag(){state.dragEdit=!state.dragEdit;if($('tpPointEdit'))$('tpPointEdit').textContent=state.dragEdit?'✋ Drawing Edit: ON':'✋ Drawing Edit: OFF';if($('tpEditStatus'))$('tpEditStatus').textContent=state.dragEdit?'লাল ভাগরেখার পয়েন্ট/রেখা Drag করুন। প্রথম ভাগের শতাংশ বদলালে দ্বিতীয় ভাগ থাকলে সেটি তার সংরক্ষিত শতাংশ অনুযায়ী নতুন করে তৈরি হবে।':'Drawing Edit চালু করলে শুধু নির্বাচিত ভাগের সীমারেখা Edit করা যাবে.';$('tpCanvas')?.classList.toggle('tp-editing',state.dragEdit);}

  function screenTransform(){
    const canvas=$('tpCanvas'),W=parseFloat(canvas.style.width)||canvas.clientWidth,H=parseFloat(canvas.style.height)||canvas.clientHeight,p=state.points,cuts=[state.split,state.extraFraction!=null?computeSplit(sideInputs(),state.extraFraction):null].filter(Boolean),xs=[p.A.x,p.B.x,p.C.x],ys=[p.A.y,p.B.y,p.C.y];cuts.forEach(c=>[c.P,c.Q,c.D].forEach(q=>{if(q){xs.push(q.x);ys.push(q.y);}}));const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),pad=90,base=Math.min((W-2*pad)/Math.max(1,maxX-minX),(H-2*pad)/Math.max(1,maxY-minY));const scale=base*state.zoom,ox=(W-(maxX-minX)*scale)/2-minX*scale+state.panX,oy=H-55+minY*scale+state.panY;return {scale,ox,oy};
  }
  function canvasPoint(e){const c=$('tpCanvas'),r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  function worldFromScreen(sp){const t=screenTransform();return{x:(sp.x-t.ox)/t.scale,y:(t.oy-sp.y)/t.scale};}
  function pointSegDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy||1;let t=((p.x-a.x)*dx+(p.y-a.y)*dy)/l2;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));}
  function nearestPartitionTarget(sp){
    if(!state.dragEdit||!state.split)return null;const t=screenTransform(),world=worldFromScreen(sp),d=p=>Math.hypot(sp.x-(t.ox+p.x*t.scale),sp.y-(t.oy-p.y*t.scale));
    if(state.split.type==='horizontal'){const dp=d(state.split.P),dq=d(state.split.Q),dl=pointSegDistance(world,state.split.P,state.split.Q)*t.scale;return Math.min(dp,dq,dl)<40?'H':null;}
    const dd=d(state.split.D),dl=pointSegDistance(world,state.split.V,state.split.D)*t.scale;return Math.min(dd,dl)<40?'D':null;
  }
  function dragMove(sp){
    const w=worldFromScreen(sp),spx=state.split,p=state.points;if(!spx)return;
    const oldFirst=spx.fraction, extra=state.extraFraction;
    const preservesPartitionOrder=f=>{if(extra==null)return true; return oldFirst<extra ? f<extra-EPS : f>extra+EPS;};
    if(state.dragging==='H'){
      const A=p.A,B=p.B,C=p.C,vx=B.x-A.x,vy=B.y-A.y,wx=C.x-A.x,wy=C.y-A.y,r1=((w.x-A.x)*vx+(w.y-A.y)*vy)/(vx*vx+vy*vy||1),r2=((w.x-A.x)*wx+(w.y-A.y)*wy)/(wx*wx+wy*wy||1),r=Math.max(.001,Math.min(.999,(r1+r2)/2)),f=1-r*r;
      if(f>0&&f<1&&preservesPartitionOrder(f)){setFraction(f);state.split=computeSplit(sideInputs(),f);renderResult(area(sideInputs()));}
    } else if(state.dragging==='D'){
      const U=spx.U,W=spx.W,dx=W.x-U.x,dy=W.y-U.y,L2=dx*dx+dy*dy||1;let f=((w.x-U.x)*dx+(w.y-U.y)*dy)/L2;f=Math.max(.001,Math.min(.999,f));if(preservesPartitionOrder(f)){setFraction(f);state.split=computeSplit(sideInputs(),f);renderResult(area(sideInputs()));}
    }
  }
  function panBy(dx,dy){state.panX+=dx;state.panY+=dy;if(state.points)draw();}
  function zoomBy(delta){state.zoom=Math.max(.7,Math.min(2.5,Number((state.zoom+delta).toFixed(2))));if(state.points)draw();if($('tpZoomValue'))$('tpZoomValue').textContent=`${Math.round(state.zoom*100)}%`;}
  function resetZoom(){state.zoom=1;state.panX=0;state.panY=0;if(state.points)draw();if($('tpZoomValue'))$('tpZoomValue').textContent='100%';}
  function downloadDrawing(){const c=$('tpCanvas');if(!c)return;const a=document.createElement('a');a.download='triangle-partition-drawing.png';a.href=c.toDataURL('image/png');a.click();}
  function addMorePart(){if(!state.points||!state.split){alert('আগে একটি ভাগের হিসাব ও Drawing তৈরি করুন।');return;}if($('tpMoreCard'))$('tpMoreCard').hidden=false;$('tpMorePercent')?.focus();}
  function applyExtraSplit(){
    if(!state.points||!state.split){alert('আগে প্রথম ভাগের হিসাব করুন।');return;}
    if(state.mode!=='horizontal'){alert('আরও আলাদা ক্ষেত্র যোগ করার জন্য হরিজন্টাল ভাগ পদ্ধতি ব্যবহার করুন।');return;}
    const pct=Number($('tpMorePercent')?.value);if(!(pct>0&&pct<100)){alert('নতুন ভাগের শতাংশ ০ থেকে ১০০-এর মধ্যে দিন।');return;}
    const f=pct/100;if(Math.abs(f-state.split.fraction)<.0001){alert('নতুন ভাগের শতাংশ প্রথম ভাগের সমান হতে পারবে না।');return;}
    state.extraFraction=f;renderResult(area(sideInputs()));
  }
  function removeExtraSplit(e){if(e){e.preventDefault();e.stopPropagation();}state.extraFraction=null;if($('tpMorePercent'))$('tpMorePercent').value='';if($('tpMoreAreaLabel'))$('tpMoreAreaLabel').textContent='—';if($('tpExtraDemarcation'))$('tpExtraDemarcation').hidden=true;if($('tpMultiStatus'))$('tpMultiStatus').textContent='অতিরিক্ত ভাগ সরানো হয়েছে। এখন শুধু প্রথম ভাগ ও অবশিষ্ট ক্ষেত্র দেখানো হচ্ছে।';if(state.points&&state.split){renderResult(area(sideInputs()));requestAnimationFrame(draw);}}

  document.querySelectorAll('.tp-mode').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.tpMode)));
  $('tpCalc')?.addEventListener('click',()=>render());
  function applyEditedFirstField(){
    const indices=state.mode==='horizontal'?[0,1,2]:[1,2],base=state.editBaseline||{};let changed=-1,count=0;
    indices.forEach(i=>{const v=readFI('tpEditF'+i+'Ft','tpEditF'+i+'In');if(Number.isFinite(v)&&Number.isFinite(base[i])&&Math.abs(v-base[i])>.0001){changed=i;count++;}});
    if(changed<0)return;
    if(count>1){alert('একবারে প্রথম ভাগের একটি বাহুর মাপ পরিবর্তন করুন।');renderEditFields(state.split);return;}
    applySelectedDimension(changed);
  }
  $('tpApplyEdit')?.addEventListener('click',applyEditedFirstField);
  $('tpPointEdit')?.addEventListener('click',toggleDrag);$('tpDownloadSvg')?.addEventListener('click',downloadDrawing);$('tpZoomIn')?.addEventListener('click',()=>zoomBy(.15));$('tpZoomOut')?.addEventListener('click',()=>zoomBy(-.15));$('tpZoomReset')?.addEventListener('click',resetZoom);$('tpMorePart')?.addEventListener('click',addMorePart);$('tpAddSplitApply')?.addEventListener('click',applyExtraSplit);$('tpRemoveExtra')?.addEventListener('click',removeExtraSplit);
  document.addEventListener('click',e=>{const btn=e.target?.closest?.('#tpRemoveExtra');if(btn)removeExtraSplit(e);});
  $('tpReset')?.addEventListener('click',()=>{['tpAB','tpABIn','tpBC','tpBCIn','tpCA','tpCAIn'].forEach(id=>{if($(id))$(id).value='';});if($('tpPart'))$('tpPart').value='50';if($('tpResult'))$('tpResult').innerHTML='<div class="small-note">তিন বাহুর ফুট–ইঞ্চি মাপ দিয়ে হিসাব শুরু করুন।</div>';if($('tpEditor'))$('tpEditor').hidden=true;if($('tpDrawingWrap'))$('tpDrawingWrap').hidden=true;state.points=null;state.split=null;state.extraFraction=null;state.dragEdit=false;state.zoom=1;state.panX=0;state.panY=0;state.editBaseline=null;if($('tpPointEdit'))$('tpPointEdit').textContent='✋ Drawing Edit: OFF';if($('tpMoreCard'))$('tpMoreCard').hidden=true;if($('tpExtraDemarcation'))$('tpExtraDemarcation').hidden=true;if($('tpZoomValue'))$('tpZoomValue').textContent='100%';});
  let down=false,lastPt=null,panMode=false;
  $('tpCanvas')?.addEventListener('pointerdown',e=>{if(!state.points)return;const target=nearestPartitionTarget(canvasPoint(e));if(target){down=true;panMode=false;state.dragging=target;e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();return;}panMode=true;lastPt=canvasPoint(e);e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();});
  $('tpCanvas')?.addEventListener('pointermove',e=>{if(!state.points)return;const p=canvasPoint(e);if(down){dragMove(p);e.preventDefault();}else if(panMode&&lastPt){panBy(p.x-lastPt.x,p.y-lastPt.y);lastPt=p;e.preventDefault();}});
  $('tpCanvas')?.addEventListener('pointerup',e=>{down=false;panMode=false;lastPt=null;state.dragging=null;try{e.currentTarget.releasePointerCapture(e.pointerId);}catch(_){}e.preventDefault();});
  $('tpCanvas')?.addEventListener('pointercancel',()=>{down=false;panMode=false;lastPt=null;state.dragging=null;});$('tpCanvas')?.addEventListener('wheel',e=>{if(!state.points)return;e.preventDefault();zoomBy(e.deltaY<0?.1:-.1);},{passive:false});window.addEventListener('resize',()=>{if(state.points)draw();});setMode('horizontal');
})();
}
