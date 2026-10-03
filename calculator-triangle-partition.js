if (window.__SAH_TRIANGLE_PARTITION_LOADED) {
} else {
window.__SAH_TRIANGLE_PARTITION_LOADED = true;
(() => {
  const $ = id => document.getElementById(id);
  const bn = (n,d=2) => Number(n).toLocaleString('bn-BD',{maximumFractionDigits:d});
  const EPS = 1e-8;
  const state = {
    mode:'horizontal', points:null, split:null, dragEdit:false, dragging:null,
    zoom:1, last:null
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
    const sign=v<0?'-':'', x=Math.abs(v); let f=Math.floor(x+1e-9), i=Math.round((x-f)*100)/100;
    if(i>=12){f++;i=0;}
    return `${sign}${bn(f,2)}′ ${bn(i,2)}″`;
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
    $('tpModeHelp').textContent=mode==='horizontal'?'BC-র সমান্তরাল একটি ভাগরেখা তৈরি হবে।':'নির্বাচিত শীর্ষবিন্দু থেকে বিপরীত বাহুতে একটি ভাগরেখা তৈরি হবে।';
    $('tpModeNote').textContent=mode==='horizontal'?'প্রথম ভাগটি BC-র পাশের অংশ। ৫০% দিলে দুই অংশ সমান ক্ষেত্রফল হবে।':'প্রথম ভাগটি নির্বাচিত শীর্ষবিন্দুর বিপরীত বাহুর নির্বাচিত প্রান্তের পাশের অংশ।';
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
      const t=Math.sqrt(1-f), A=state.points.A,B=state.points.B,C=state.points.C;
      const P={x:A.x+(B.x-A.x)*(1-t),y:A.y+(B.y-A.y)*(1-t)};
      const Q={x:A.x+(C.x-A.x)*(1-t),y:A.y+(C.y-A.y)*(1-t)};
      return {type:'horizontal',fraction:f,t,P,Q,length:Math.hypot(Q.x-P.x,Q.y-P.y)};
    }
    const v=$('tpVertex').value, map={A:{V:'A',U:'B',W:'C'},B:{V:'B',U:'C',W:'A'},C:{V:'C',U:'A',W:'B'}}[v];
    const U=state.points[map.U],W=state.points[map.W],V=state.points[map.V];
    const D={x:U.x+(W.x-U.x)*f,y:U.y+(W.y-U.y)*f};
    return {type:'vertex',fraction:f,V,D,U,W,length:Math.hypot(D.x-V.x,D.y-V.y),vertex:v};
  }
  function currentSegments(sp){
    const p=state.points;
    if(sp.type==='horizontal'){
      return {
        first:[['BP',Math.hypot(p.B.x-sp.P.x,p.B.y-sp.P.y)],['PQ',sp.length],['QC',Math.hypot(sp.Q.x-p.C.x,sp.Q.y-p.C.y)]],
        remaining:[['AP',Math.hypot(p.A.x-sp.P.x,p.A.y-sp.P.y)],['AQ',Math.hypot(p.A.x-sp.Q.x,p.A.y-sp.Q.y)],['BC',Math.hypot(p.B.x-p.C.x,p.B.y-p.C.y)]]
      };
    }
    return {
      first:[[sp.vertex+sp.U,Math.hypot(sp.V.x-sp.U.x,sp.V.y-sp.U.y)],['U-D',Math.hypot(sp.U.x-sp.D.x,sp.U.y-sp.D.y)],['V-D',sp.length]],
      remaining:[[sp.vertex+sp.W,Math.hypot(sp.V.x-sp.W.x,sp.V.y-sp.W.y)],['D-W',Math.hypot(sp.D.x-sp.W.x,sp.D.y-sp.W.y)],['U-W',Math.hypot(sp.U.x-sp.W.x,sp.U.y-sp.W.y)]]
    };
  }
  function draw(){
    const canvas=$('tpCanvas'); if(!canvas||!state.points) return;
    const wrap=canvas.parentElement, W=Math.max(700,Math.min(1200,wrap.clientWidth||1200)), H=Math.max(460,Math.min(720,Math.round(W*.6)));
    const dpr=window.devicePixelRatio||1; canvas.style.width=W+'px'; canvas.style.height=H+'px'; canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
    const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
    const p=state.points, xs=[p.A.x,p.B.x,p.C.x], ys=[p.A.y,p.B.y,p.C.y];
    if(state.split){[state.split.P,state.split.Q,state.split.D].forEach(q=>{if(q){xs.push(q.x);ys.push(q.y);}});}
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),pad=90;
    const baseScale=Math.min((W-2*pad)/Math.max(1,maxX-minX),(H-2*pad)/Math.max(1,maxY-minY));
    const scale=baseScale*state.zoom, ox=(W-(maxX-minX)*scale)/2-minX*scale, oy=H-55+minY*scale;
    const sc=q=>({x:ox+q.x*scale,y:oy-q.y*scale});
    const A=sc(p.A),B=sc(p.B),C=sc(p.C);
    const line=(a,b,dash=false)=>{ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.setLineDash(dash?[9,7]:[]);ctx.lineWidth=dash?3:4;ctx.strokeStyle=dash?'#c23b32':'#163b4d';ctx.stroke();ctx.restore();};
    line(A,B);line(B,C);line(C,A);
    const dim=(a,b,text,offset,cls='base')=>{
      const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,p1={x:a.x+nx*offset,y:a.y+ny*offset},q1={x:b.x+nx*offset,y:b.y+ny*offset};
      ctx.save();ctx.strokeStyle=cls==='split'?'#c23b32':'#71828a';ctx.lineWidth=1.4;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(p1.x,p1.y);ctx.moveTo(b.x,b.y);ctx.lineTo(q1.x,q1.y);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(q1.x,q1.y);ctx.stroke();
      ctx.fillStyle=cls==='split'?'#a62922':'#082336';ctx.font='700 14px Arial,"Noto Sans Bengali",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,(p1.x+q1.x)/2,(p1.y+q1.y)/2);ctx.restore();
    };
    // Whole sides are kept visible at the outside; segmented demarcations are drawn inside.
    dim(A,B,ftIn(Math.hypot(p.A.x-p.B.x,p.A.y-p.B.y)),28);
    dim(B,C,ftIn(Math.hypot(p.B.x-p.C.x,p.B.y-p.C.y)),30);
    dim(C,A,ftIn(Math.hypot(p.C.x-p.A.x,p.C.y-p.A.y)),28);
    if(state.split){
      const sp=state.split;
      if(sp.type==='horizontal'){
        const P=sc(sp.P),Q=sc(sp.Q); line(P,Q,true);
        dim(sc(p.B),P,ftIn(Math.hypot(p.B.x-sp.P.x,p.B.y-sp.P.y)),-24,'split');
        dim(P,Q,ftIn(sp.length),-28,'split');
        dim(Q,sc(p.C),ftIn(Math.hypot(sp.Q.x-p.C.x,sp.Q.y-p.C.y)),-24,'split');
        dim(sc(p.A),P,ftIn(Math.hypot(p.A.x-sp.P.x,p.A.y-sp.P.y)),22,'base');
        dim(sc(p.A),Q,ftIn(Math.hypot(p.A.x-sp.Q.x,p.A.y-sp.Q.y)),22,'base');
      } else {
        const V=sc(sp.V),D=sc(sp.D); line(V,D,true);
        dim(sc(sp.U),D,ftIn(Math.hypot(sp.U.x-sp.D.x,sp.U.y-sp.D.y)),-24,'split');
        dim(V,D,ftIn(sp.length),-28,'split');
        dim(D,sc(sp.W),ftIn(Math.hypot(sp.D.x-sp.W.x,sp.D.y-sp.W.y)),-24,'base');
      }
    }
    [['A',A],['B',B],['C',C]].forEach(([n,q])=>{ctx.beginPath();ctx.arc(q.x,q.y,9,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#0c516a';ctx.stroke();ctx.fillStyle='#082336';ctx.font='800 16px Arial';ctx.fillText(n,q.x+14,q.y-14);});
    if(state.split){const sp=state.split, pts=sp.type==='horizontal'?[sc(sp.P),sc(sp.Q)]:[sc(sp.D)];pts.forEach(q=>{ctx.beginPath();ctx.arc(q.x,q.y,8,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#c23b32';ctx.stroke();});}
  }
  function updateSegmentText(){
    const sp=state.split;if(!sp)return; const seg=currentSegments(sp);
    const set=(id,v)=>{if($(id))$(id).textContent=ftIn(v);};
    if(sp.type==='horizontal'){
      set('tpSegBP',seg.first[0][1]);set('tpSegPQ',seg.first[1][1]);set('tpSegQC',seg.first[2][1]);
      set('tpSegAP',seg.remaining[0][1]);set('tpSegAQ',seg.remaining[1][1]);set('tpSegBC',seg.remaining[2][1]);
    } else {
      set('tpSegVU',seg.first[0][1]);set('tpSegUD',seg.first[1][1]);set('tpSegVD',seg.first[2][1]);
      set('tpSegVW',seg.remaining[0][1]);set('tpSegDW',seg.remaining[1][1]);set('tpSegUW',seg.remaining[2][1]);
    }
  }
  function renderResult(total){
    const sp=state.split,f=sp.fraction,a1=total*f,a2=total-a1;
    $('tpResult').innerHTML=`<div class="tp-result-main"><strong>মোট ক্ষেত্রফল: ${fmtArea(total)}</strong><span>${state.mode==='horizontal'?'হরিজন্টাল':'শীর্ষবিন্দু থেকে'} ভাগ • প্রথম ভাগ ${bn(percentFromFraction(f),3)}%</span></div><div class="tp-result-grid"><div><b>${fmtArea(a1)}</b><small>প্রথম ভাগ</small></div><div><b>${fmtArea(a2)}</b><small>অবশিষ্ট ক্ষেত্র</small></div><div><b>${ftIn(sp.length)}</b><small>ভাগরেখা</small></div></div>`;
    $('tpEditor').hidden=false;$('tpDrawingWrap').hidden=false;
    $('tpEditPart').value=Number(percentFromFraction(f).toFixed(3));
    if($('tpFirstAreaLabel')) $('tpFirstAreaLabel').textContent=fmtArea(a1);
    if($('tpRestAreaLabel')) $('tpRestAreaLabel').textContent=fmtArea(a2);
    document.querySelectorAll('.tp-demarcation-vertex').forEach(e=>e.hidden=state.mode!=='vertex');
    document.querySelectorAll('.tp-demarcation-first,.tp-demarcation-rest').forEach(e=>e.hidden=state.mode==='vertex');
    writeFI('tpEditSplitFt','tpEditSplitIn',sp.length);
    $('tpDimAB').textContent=ftIn(sideInputs().AB);$('tpDimBC').textContent=ftIn(sideInputs().BC);$('tpDimCA').textContent=ftIn(sideInputs().CA);$('tpDimSplit').textContent=ftIn(sp.length);
    $('tpDrawingMeta').textContent=`প্রথম ভাগ ${bn(percentFromFraction(f),2)}% • ${fmtArea(a1)} • অবশিষ্ট ${fmtArea(a2)}`;
    updateSegmentText(); draw();
    state.last={s:sideInputs(),total,a1,a2};
  }
  function render(fOverride){
    const s=sideInputs(),q=triangleFromSides(s);
    if(!q){$('tpResult').innerHTML='<div class="warning">তিনটি বাহুর মাপ দিয়ে বৈধ বিষমবাহু ত্রিভুজ তৈরি করা যাচ্ছে না। প্রতিটি বাহু দিন এবং যেকোনো দুই বাহুর যোগফল তৃতীয় বাহুর চেয়ে বড় হতে হবে।';$('tpEditor').hidden=true;$('tpDrawingWrap').hidden=true;return;}
    state.points=q; const f=Number.isFinite(fOverride)?fOverride:getPartFraction(s); state.split=computeSplit(s,f);
    if(!state.split){$('tpResult').innerHTML='<div class="warning">প্রথম ভাগের পরিমাণ ০-এর বেশি এবং মোট ক্ষেত্রফলের ১০০%-এর কম দিন।</div>';return;}
    const total=area(s);renderResult(total);
  }
  function setFraction(f){
    if(!(f>0&&f<1)){alert('ভাগের পরিমাণ ০% থেকে ১০০%-এর মধ্যে দিন।');return false;}
    $('tpPartType').value='percent';$('tpPart').value=Number((f*100).toFixed(3)); return true;
  }
  function applySplitLength(v){
    const s=sideInputs(),total=area(s); if(!(v>0)) return false;
    let f;
    if(state.mode==='horizontal'){
      if(v>=s.BC) return false;
      const t=v/s.BC; f=1-t*t;
    } else {
      const sp=state.split, V=sp.V,U=sp.U,W=sp.W;
      const a=Math.hypot(V.x-U.x,V.y-U.y), b=Math.hypot(V.x-W.x,V.y-W.y), c=Math.hypot(U.x-W.x,U.y-W.y);
      const A=c*c, B=b*b-a*a-c*c, C=a*a-v*v, disc=B*B-4*A*C;
      if(disc<0) return false;
      const roots=[(-B-Math.sqrt(disc))/(2*A),(-B+Math.sqrt(disc))/(2*A)].filter(x=>x>EPS&&x<1-EPS);
      if(!roots.length)return false;
      f=roots.sort((x,y)=>Math.abs(x-sp.fraction)-Math.abs(y-sp.fraction))[0];
    }
    if(!(f>0&&f<1)) return false; setFraction(f); render(f); return true;
  }
  function applyEdit(){
    const v=readFI('tpEditSplitFt','tpEditSplitIn');
    if(!Number.isFinite(v)||v<=0){alert('ভাগরেখার সঠিক ফুট–ইঞ্চি মাপ দিন।');return;}
    if(!applySplitLength(v)){alert('এই ফুট–ইঞ্চি মাপে বর্তমান ত্রিভুজের মধ্যে বৈধ ভাগরেখা তৈরি করা যাচ্ছে না।');}
  }
  function toggleDrag(){
    state.dragEdit=!state.dragEdit; $('tpPointEdit').textContent=state.dragEdit?'✋ Drawing Edit: ON':'✋ Drawing Edit: OFF'; $('tpEditStatus').textContent=state.dragEdit?'লাল ভাগরেখার পয়েন্ট/রেখা Drag করুন। ছেড়ে দিলে নতুন ভাগের শতাংশ, ডিমার্কেশন ও ক্ষেত্রফল আপডেট হবে।':'Drawing Edit চালু করলে শুধু নির্বাচিত ভাগের সীমারেখা Edit করা যাবে।';
  }
  function screenTransform(){
    const canvas=$('tpCanvas'),W=parseFloat(canvas.style.width)||canvas.clientWidth,H=parseFloat(canvas.style.height)||canvas.clientHeight,p=state.points;
    const xs=[p.A.x,p.B.x,p.C.x],ys=[p.A.y,p.B.y,p.C.y];if(state.split){[state.split.P,state.split.Q,state.split.D].forEach(q=>{if(q){xs.push(q.x);ys.push(q.y);}})}
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),pad=90,base=Math.min((W-2*pad)/Math.max(1,maxX-minX),(H-2*pad)/Math.max(1,maxY-minY));
    const scale=base*state.zoom,ox=(W-(maxX-minX)*scale)/2-minX*scale,oy=H-55+minY*scale;return {scale,ox,oy};
  }
  function canvasPoint(e){const c=$('tpCanvas'),r=c.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  function worldFromScreen(sp){const t=screenTransform();return {x:(sp.x-t.ox)/t.scale,y:(t.oy-sp.y)/t.scale};}
  function pointSegDistance(p,a,b){
    const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy||1;
    let t=((p.x-a.x)*dx+(p.y-a.y)*dy)/l2;t=Math.max(0,Math.min(1,t));
    return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
  }
  function nearestPartitionTarget(sp){
    if(!state.dragEdit||!state.split)return null;
    const t=screenTransform(), world=worldFromScreen(sp), d=p=>Math.hypot(sp.x-(t.ox+p.x*t.scale),sp.y-(t.oy-p.y*t.scale));
    if(state.split.type==='horizontal'){
      const dp=d(state.split.P),dq=d(state.split.Q), dl=pointSegDistance(world,state.split.P,state.split.Q)*t.scale;
      return Math.min(dp,dq,dl)<40?'H':null;
    }
    const dd=d(state.split.D), dl=pointSegDistance(world,state.split.V,state.split.D)*t.scale;
    return Math.min(dd,dl)<40?'D':null;
  }
  function dragMove(sp){
    const w=worldFromScreen(sp),spx=state.split,p=state.points;if(!spx)return;
    if(state.dragging==='H'){
      const A=p.A,B=p.B,C=p.C, vx=B.x-A.x,vy=B.y-A.y, wx=C.x-A.x,wy=C.y-A.y;
      const denom=(vx*vx+vy*vy)+(wx*wx+wy*wy)||1;
      // Estimate t from the projection onto both sides; then clamp.
      const t1=((w.x-A.x)*vx+(w.y-A.y)*vy)/(vx*vx+vy*vy||1), t2=((w.x-A.x)*wx+(w.y-A.y)*wy)/(wx*wx+wy*wy||1);
      const t=Math.max(.001,Math.min(.999,(t1+t2)/2));
      const f=1-t*t; if(f>0&&f<1){state.split=computeSplit(sideInputs(),f);setFraction(f);render(f);}
    } else if(state.dragging==='D'){
      const U=spx.U,W=spx.W,dx=W.x-U.x,dy=W.y-U.y,L2=dx*dx+dy*dy||1;let f=((w.x-U.x)*dx+(w.y-U.y)*dy)/L2;f=Math.max(.001,Math.min(.999,f));setFraction(f);render(f);
    }
  }
  function zoomBy(delta){state.zoom=Math.max(.7,Math.min(2.5,Number((state.zoom+delta).toFixed(2))));if(state.points)draw();$('tpZoomValue').textContent=`${Math.round(state.zoom*100)}%`;}
  function resetZoom(){state.zoom=1;if(state.points)draw();$('tpZoomValue').textContent='100%';}
  function downloadDrawing(){const c=$('tpCanvas');if(!c)return;const a=document.createElement('a');a.download='triangle-partition-drawing.png';a.href=c.toDataURL('image/png');a.click();}

  document.querySelectorAll('.tp-mode').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.tpMode)));
  $('tpCalc')?.addEventListener('click',()=>render());
  $('tpApplyEdit')?.addEventListener('click',applyEdit);
  $('tpPointEdit')?.addEventListener('click',toggleDrag);
  $('tpDownloadSvg')?.addEventListener('click',downloadDrawing);
  $('tpZoomIn')?.addEventListener('click',()=>zoomBy(.15));
  $('tpZoomOut')?.addEventListener('click',()=>zoomBy(-.15));
  $('tpZoomReset')?.addEventListener('click',resetZoom);
  $('tpReset')?.addEventListener('click',()=>{['tpAB','tpABIn','tpBC','tpBCIn','tpCA','tpCAIn'].forEach(id=>$(id).value='');$('tpPart').value='50';$('tpResult').innerHTML='<div class="small-note">তিন বাহুর ফুট–ইঞ্চি মাপ দিয়ে হিসাব শুরু করুন।</div>';$('tpEditor').hidden=true;$('tpDrawingWrap').hidden=true;state.points=null;state.split=null;state.dragEdit=false;state.zoom=1; if($('tpPointEdit'))$('tpPointEdit').textContent='✋ Drawing Edit: OFF'; if($('tpZoomValue'))$('tpZoomValue').textContent='100%';});
  let down=false;
  $('tpCanvas')?.addEventListener('pointerdown',e=>{const target=nearestPartitionTarget(canvasPoint(e));if(target){down=true;state.dragging=target;$('tpCanvas').classList.add('tp-editing');e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();}});
  $('tpCanvas')?.addEventListener('pointermove',e=>{if(down){dragMove(canvasPoint(e));e.preventDefault();}});
  $('tpCanvas')?.addEventListener('pointerup',e=>{if(!down)return;down=false;state.dragging=null;$('tpCanvas').classList.remove('tp-editing');e.preventDefault();});
  $('tpCanvas')?.addEventListener('pointercancel',()=>{down=false;state.dragging=null;$('tpCanvas')?.classList.remove('tp-editing');});
  $('tpCanvas')?.addEventListener('wheel',e=>{if(!state.points)return;e.preventDefault();zoomBy(e.deltaY<0?.1:-.1);},{passive:false});
  window.addEventListener('resize',()=>{if(state.points)draw();});
  setMode('horizontal');
})();
}
