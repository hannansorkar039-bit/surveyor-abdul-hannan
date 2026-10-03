(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const bn = (n,d=2) => Number(n).toLocaleString('bn-BD',{maximumFractionDigits:d});
  const EPS=1e-8;
  const state={mode:'horizontal', p:50, points:null, split:null, pointEdit:false, dragging:null, last:null};

  function readFI(ftId,inId){
    const f=Number($(ftId)?.value), i=Number($(inId)?.value||0);
    if(!Number.isFinite(f)||f<0||!Number.isFinite(i)||i<0||i>=12) return NaN;
    return f+i/12;
  }
  function writeFI(ftId,inId,v){
    const feet=Math.floor(Math.max(0,v)+1e-9);
    const inch=Math.round((v-feet)*100)/100;
    $(ftId).value=feet;
    $(inId).value=inch;
  }
  function ftIn(v){
    if(!Number.isFinite(v)) return '—';
    const sign=v<0?'-':'', x=Math.abs(v);
    let f=Math.floor(x+1e-9), i=Math.round((x-f)*100)/100;
    if(i>=12){f++;i=0;}
    return `${sign}${bn(f,2)}′ ${bn(i,2)}″`;
  }
  function sideInputs(){
    return {
      AB:readFI('tpAB','tpABIn'),
      BC:readFI('tpBC','tpBCIn'),
      CA:readFI('tpCA','tpCAIn')
    };
  }
  function triangleFromSides(s){
    if(Object.values(s).some(v=>!Number.isFinite(v)||v<=0)) return null;
    if(s.AB+s.BC<=s.CA+EPS || s.AB+s.CA<=s.BC+EPS || s.BC+s.CA<=s.AB+EPS) return null;
    const x=(s.AB*s.AB+s.BC*s.BC-s.CA*s.CA)/(2*s.BC);
    const h2=s.AB*s.AB-x*x;
    if(!(h2>EPS)) return null;
    return {B:{x:0,y:0},C:{x:s.BC,y:0},A:{x,y:Math.sqrt(h2)}};
  }
  function area(s){
    const ss=(s.AB+s.BC+s.CA)/2, z=ss*(ss-s.AB)*(ss-s.BC)*(ss-s.CA);
    return z>0?Math.sqrt(z):0;
  }
  function fmtArea(v){
    return `${bn(v,3)} বর্গফুট ≈ ${bn(v/435.6,4)} শতাংশ`;
  }
  function setMode(mode){
    state.mode=mode;
    document.querySelectorAll('.tp-mode').forEach(b=>{
      const active=b.dataset.tpMode===mode;
      b.classList.toggle('active',active);
      b.setAttribute('aria-selected',active?'true':'false');
    });
    document.querySelectorAll('.tp-vertex-only').forEach(e=>e.hidden=mode!=='vertex');
    const help=$('tpModeHelp'), note=$('tpModeNote');
    if(mode==='horizontal'){
      help.textContent='BC-র সমান্তরাল একটি সরল ভাগরেখা তৈরি হবে।';
      note.textContent='প্রথম ভাগকে BC-র দিকের নিচের অংশ ধরা হবে। ৫০% দিলে দুই অংশ সমান ক্ষেত্রফল হবে।';
    }else{
      help.textContent='A/B/C থেকে বিপরীত বাহুতে একটি ভাগরেখা টানা হবে।';
      note.textContent='প্রথম ভাগ হবে বিপরীত বাহুর নির্বাচিত প্রান্তের দিকে। ৫০% দিলে দুই অংশের ক্ষেত্রফল সমান হবে।';
    }
  }
  function getPartFraction(s){
    const type=$('tpPartType').value, v=Number($('tpPart').value);
    if(!Number.isFinite(v)||v<=0) return NaN;
    const total=area(s);
    if(type==='percent') return v/100;
    if(type==='decimal') return (v*435.6)/total;
    return v/total;
  }
  function computeSplit(s){
    let f=getPartFraction(s);
    if(!Number.isFinite(f)||f<=0||f>=1) return null;
    if(state.mode==='horizontal'){
      const t=Math.sqrt(1-f); // top similarity ratio; lower/base fraction = 1-t^2
      const A=state.points.A, B=state.points.B, C=state.points.C;
      const P={x:A.x+(B.x-A.x)*(1-t),y:A.y+(B.y-A.y)*(1-t)};
      const Q={x:A.x+(C.x-A.x)*(1-t),y:A.y+(C.y-A.y)*(1-t)};
      return {type:'horizontal',fraction:f,P,Q,length:Math.hypot(Q.x-P.x,Q.y-P.y)};
    }
    const v=$('tpVertex').value;
    const map={
      A:{V:'A',U:'B',W:'C'},
      B:{V:'B',U:'C',W:'A'},
      C:{V:'C',U:'A',W:'B'}
    }[v];
    const U=state.points[map.U], W=state.points[map.W], V=state.points[map.V];
    // First part is adjacent to U. Area ratio equals U-D : D-W.
    const d=f;
    const D={x:U.x+(W.x-U.x)*d,y:U.y+(W.y-U.y)*d};
    return {type:'vertex',fraction:f,V,D,U,W,length:Math.hypot(D.x-V.x,D.y-V.y),vertex:v};
  }
  function draw(){
    const canvas=$('tpCanvas'), ctx=canvas.getContext('2d');
    const wrap=canvas.parentElement;
    const W=Math.max(700,Math.min(1200,wrap.clientWidth||1200)), H=Math.max(460,Math.min(720,Math.round(W*0.6)));
    const dpr=window.devicePixelRatio||1; canvas.style.width=W+'px';canvas.style.height=H+'px';canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
    if(!state.points) return;
    const pts=state.points, xs=[pts.A.x,pts.B.x,pts.C.x], ys=[pts.A.y,pts.B.y,pts.C.y];
    if(state.split){[state.split.P,state.split.Q,state.split.D].forEach(p=>{if(p){xs.push(p.x);ys.push(p.y)}})}
    const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
    const pad=90, sx=(W-2*pad)/Math.max(1,maxX-minX), sy=(H-2*pad)/Math.max(1,maxY-minY);
    const scale=Math.min(sx,sy);
    const ox=(W-(maxX-minX)*scale)/2-minX*scale;
    const oy=H-55+minY*scale; // mathematical y up; canvas y down
    const sc=p=>({x:ox+p.x*scale,y:oy-p.y*scale});
    const A=sc(pts.A),B=sc(pts.B),C=sc(pts.C);
    const line=(p,q,dash=false)=>{
      ctx.save();ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
      if(dash)ctx.setLineDash([9,7]);
      ctx.lineWidth=dash?3:4;ctx.strokeStyle=dash?'#c23b32':'#163b4d';ctx.stroke();ctx.restore();
    };
    line(A,B);line(B,C);line(C,A);
    if(state.split){
      const sp=state.split;
      if(sp.type==='horizontal') line(sc(sp.P),sc(sp.Q),true);
      else line(sc(sp.V),sc(sp.D),true);
    }
    // dimension labels
    const dim=(p,q,text,offset)=>{
      const dx=q.x-p.x,dy=q.y-p.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
      const p1={x:p.x+nx*offset,y:p.y+ny*offset},q1={x:q.x+nx*offset,y:q.y+ny*offset};
      ctx.save();ctx.strokeStyle='#5b6d75';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p1.x,p1.y);ctx.moveTo(q.x,q.y);ctx.lineTo(q1.x,q1.y);ctx.stroke();
      ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(q1.x,q1.y);ctx.stroke();
      ctx.fillStyle='#082336';ctx.font='700 15px Arial,"Noto Sans Bengali",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(text,(p1.x+q1.x)/2,(p1.y+q1.y)/2);
      ctx.restore();
    };
    dim(A,B,ftIn(Math.hypot(pts.A.x-pts.B.x,pts.A.y-pts.B.y)),22);
    dim(B,C,ftIn(Math.hypot(pts.B.x-pts.C.x,pts.B.y-pts.C.y)),28);
    dim(C,A,ftIn(Math.hypot(pts.C.x-pts.A.x,pts.C.y-pts.A.y)),22);
    if(state.split){
      const sp=state.split;
      const p=sp.type==='horizontal'?sc(sp.P):sc(sp.V),q=sp.type==='horizontal'?sc(sp.Q):sc(sp.D);
      dim(p,q,ftIn(sp.length),-24);
    }
    [['A',A],['B',B],['C',C]].forEach(([name,p])=>{
      ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#0c516a';ctx.stroke();
      ctx.fillStyle='#082336';ctx.font='800 16px Arial';ctx.fillText(name,p.x+14,p.y-14);
    });
    if(state.split){
      const sp=state.split;
      const d=sp.type==='horizontal' ? [sc(sp.P),sc(sp.Q)] : [sc(sp.D),sc(sp.V)];
      d.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle='#c23b32';ctx.stroke()});
    }
  }
  function render(){
    const s=sideInputs(), q=triangleFromSides(s);
    if(!q){ $('tpResult').innerHTML='<div class="warning">তিনটি বাহুর মাপ দিয়ে বৈধ বিষমবাহু ত্রিভুজ তৈরি করা যাচ্ছে না। প্রতিটি বাহু দিন এবং যেকোনো দুই বাহুর যোগফল তৃতীয় বাহুর চেয়ে বড় হতে হবে।'; $('tpEditor').hidden=true;$('tpDrawingWrap').hidden=true;return; }
    state.points=q; state.split=computeSplit(s);
    if(!state.split){$('tpResult').innerHTML='<div class="warning">প্রথম ভাগের পরিমাণ ০-এর বেশি এবং মোট ক্ষেত্রফলের ১০০%-এর কম দিন।</div>';return;}
    const total=area(s), f=state.split.fraction, a1=total*f, a2=total-a1;
    const splitText=state.mode==='horizontal'?'হরিজন্টাল':'শীর্ষবিন্দু থেকে';
    $('tpResult').innerHTML=`<div class="tp-result-main"><strong>মোট ক্ষেত্রফল: ${fmtArea(total)}</strong><span>${splitText} ভাগ • প্রথম ভাগ ${bn(f*100,3)}%</span></div>
      <div class="tp-result-grid"><div><b>${fmtArea(a1)}</b><small>প্রথম ভাগ</small></div><div><b>${fmtArea(a2)}</b><small>দ্বিতীয় ভাগ</small></div><div><b>${ftIn(state.split.length)}</b><small>ভাগরেখা</small></div></div>`;
    $('tpEditor').hidden=false;$('tpDrawingWrap').hidden=false;
    writeFI('tpEditABft','tpEditABin',s.AB);writeFI('tpEditBCft','tpEditBCin',s.BC);writeFI('tpEditCAft','tpEditCAin',s.CA);
    $('tpEditPart').value=bn(f*100,3);
    $('tpDimAB').textContent=ftIn(s.AB);$('tpDimBC').textContent=ftIn(s.BC);$('tpDimCA').textContent=ftIn(s.CA);$('tpDimSplit').textContent=ftIn(state.split.length);
    $('tpDrawingMeta').textContent=`মোট ${fmtArea(total)} • প্রথম ভাগ ${bn(f*100,2)}%`;
    draw();
    state.last={s,total,a1,a2};
  }
  function applyEdit(){
    const vals={
      AB:readFI('tpEditABft','tpEditABin'),
      BC:readFI('tpEditBCft','tpEditBCin'),
      CA:readFI('tpEditCAft','tpEditCAin')
    };
    if(Object.values(vals).some(v=>!Number.isFinite(v)||v<=0)){alert('AB, BC ও CA-এর সঠিক ফুট–ইঞ্চি মাপ দিন।');return;}
    const p=Number($('tpEditPart').value);
    if(!(p>0&&p<100)){alert('প্রথম ভাগের শতাংশ ০ থেকে ১০০-এর মধ্যে দিন।');return;}
    $('tpAB').value=Math.floor(vals.AB);$('tpABIn').value=Math.round((vals.AB-Math.floor(vals.AB))*100)/100;
    $('tpBC').value=Math.floor(vals.BC);$('tpBCIn').value=Math.round((vals.BC-Math.floor(vals.BC))*100)/100;
    $('tpCA').value=Math.floor(vals.CA);$('tpCAIn').value=Math.round((vals.CA-Math.floor(vals.CA))*100)/100;
    $('tpPartType').value='percent';$('tpPart').value=p;render();
  }
  function togglePointEdit(){
    state.pointEdit=!state.pointEdit;
    $('tpPointEdit').textContent=state.pointEdit?'✋ পয়েন্ট Edit: ON':'✋ পয়েন্ট Edit: OFF';
    $('tpEditStatus').textContent=state.pointEdit?'A/B/C বা ভাগের পয়েন্ট Drag করুন। ছেড়ে দিলে নতুন Dimension ও হিসাব আপডেট হবে।':'পয়েন্ট Edit চালু করলে A/B/C এবং ভাগের পয়েন্ট/রেখা Touch/Mouse দিয়ে সরানো যাবে।';
  }
  function canvasPoint(e){
    const c=$('tpCanvas'),r=c.getBoundingClientRect();
    return {x:(e.clientX-r.left)*(c.width/r.width)/(window.devicePixelRatio||1),y:(e.clientY-r.top)*(c.height/r.height)/(window.devicePixelRatio||1)};
  }
  // Reconstruct the same screen transform used by draw.
  function screenTransform(){
    const canvas=$('tpCanvas'),W=parseFloat(canvas.style.width)||canvas.clientWidth,H=parseFloat(canvas.style.height)||canvas.clientHeight;
    const pts=state.points, xs=[pts.A.x,pts.B.x,pts.C.x],ys=[pts.A.y,pts.B.y,pts.C.y];
    if(state.split){[state.split.P,state.split.Q,state.split.D].forEach(p=>{if(p){xs.push(p.x);ys.push(p.y)}})}
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),pad=90;
    const scale=Math.min((W-2*pad)/Math.max(1,maxX-minX),(H-2*pad)/Math.max(1,maxY-minY));
    const ox=(W-(maxX-minX)*scale)/2-minX*scale,oy=H-55+minY*scale;
    return {scale,ox,oy};
  }
  function worldFromScreen(sp){
    const t=screenTransform();
    return {x:(sp.x-t.ox)/t.scale,y:(t.oy-sp.y)/t.scale};
  }
  function nearestDragTarget(sp){
    if(!state.pointEdit||!state.points)return null;
    const t=screenTransform(), dist=(p)=>Math.hypot(sp.x-(t.ox+p.x*t.scale),sp.y-(t.oy-p.y*t.scale));
    let best=null,bd=28;
    for(const k of ['A','B','C']){const d=dist(state.points[k]);if(d<bd){bd=d;best=k;}}
    if(state.split){
      const candidates=state.split.type==='horizontal'?[['P',state.split.P],['Q',state.split.Q]]:[['D',state.split.D]];
      for(const [k,p] of candidates){const d=dist(p);if(d<bd){bd=d;best=k;}}
    }
    return best;
  }
  function dragMove(sp){
    const w=worldFromScreen(sp);
    if(['A','B','C'].includes(state.dragging)){
      state.points[state.dragging]=w;
      const p=state.points;
      const s={AB:Math.hypot(p.A.x-p.B.x,p.A.y-p.B.y),BC:Math.hypot(p.B.x-p.C.x,p.B.y-p.C.y),CA:Math.hypot(p.C.x-p.A.x,p.C.y-p.A.y)};
      if(s.AB>0&&s.BC>0&&s.CA>0){
        writeFI('tpEditABft','tpEditABin',s.AB);writeFI('tpEditBCft','tpEditBCin',s.BC);writeFI('tpEditCAft','tpEditCAin',s.CA);
        $('tpDimAB').textContent=ftIn(s.AB);$('tpDimBC').textContent=ftIn(s.BC);$('tpDimCA').textContent=ftIn(s.CA);
        state.last={s,total:area(s)};
      }
      draw();return;
    }
    if(state.dragging==='D'&&state.split.type==='vertex'){
      const U=state.split.U,W=state.split.W;
      const dx=W.x-U.x,dy=W.y-U.y,L2=dx*dx+dy*dy||1;
      let t=((w.x-U.x)*dx+(w.y-U.y)*dy)/L2;t=Math.max(.001,Math.min(.999,t));
      state.split.fraction=t;state.split.D={x:U.x+dx*t,y:U.y+dy*t};
      $('tpEditPart').value=bn(t*100,3);$('tpPart').value=bn(t*100,3);$('tpPartType').value='percent';
      const total=state.last?.total||area(sideInputs());state.split.length=Math.hypot(state.split.D.x-state.split.V.x,state.split.D.y-state.split.V.y);
      $('tpDimSplit').textContent=ftIn(state.split.length);$('tpResult').querySelector('.tp-result-main span').textContent=`শীর্ষবিন্দু থেকে ভাগ • প্রথম ভাগ ${bn(t*100,3)}%`;draw();
    }
  }
  function downloadDrawing(){
    const c=$('tpCanvas');const a=document.createElement('a');a.download='triangle-partition-drawing.png';a.href=c.toDataURL('image/png');a.click();
  }
  document.querySelectorAll('.tp-mode').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.tpMode)));
  $('tpCalc')?.addEventListener('click',render);
  $('tpApplyEdit')?.addEventListener('click',applyEdit);
  $('tpPointEdit')?.addEventListener('click',togglePointEdit);
  $('tpDownloadSvg')?.addEventListener('click',downloadDrawing);
  $('tpReset')?.addEventListener('click',()=>{
    ['tpAB','tpABIn','tpBC','tpBCIn','tpCA','tpCAIn'].forEach(id=>$(id).value='');
    $('tpPart').value='50';$('tpResult').innerHTML='<div class="small-note">তিন বাহুর ফুট–ইঞ্চি মাপ দিয়ে হিসাব শুরু করুন।</div>';
    $('tpEditor').hidden=true;$('tpDrawingWrap').hidden=true;state.points=null;state.split=null;draw();
  });
  $('tpPartType')?.addEventListener('change',()=>{});
  let down=false;
  $('tpCanvas')?.addEventListener('pointerdown',e=>{const sp=canvasPoint(e),t=nearestDragTarget(sp);if(t){down=true;state.dragging=t;e.currentTarget.setPointerCapture(e.pointerId);}});
  $('tpCanvas')?.addEventListener('pointermove',e=>{if(down)dragMove(canvasPoint(e));});
  $('tpCanvas')?.addEventListener('pointerup',e=>{
    if(!down)return;
    const dragged=state.dragging;
    down=false;state.dragging=null;
    if(['A','B','C'].includes(dragged)){
      const p=state.points;
      const s={AB:Math.hypot(p.A.x-p.B.x,p.A.y-p.B.y),BC:Math.hypot(p.B.x-p.C.x,p.B.y-p.C.y),CA:Math.hypot(p.C.x-p.A.x,p.C.y-p.A.y)};
      if(s.AB+s.BC>s.CA+EPS&&s.AB+s.CA>s.BC+EPS&&s.BC+s.CA>s.AB+EPS){
        writeFI('tpAB','tpABIn',s.AB);writeFI('tpBC','tpBCIn',s.BC);writeFI('tpCA','tpCAIn',s.CA);
        $('tpPartType').value='percent';
        render();
      }else{
        $('tpEditStatus').textContent='এই অবস্থায় বৈধ ত্রিভুজ হচ্ছে না। পয়েন্টটি একটু সরিয়ে আবার চেষ্টা করুন।';
      }
    }else if(dragged==='D'){
      render();
    }
  });
  $('tpCanvas')?.addEventListener('pointercancel',()=>{down=false;state.dragging=null;});
  window.addEventListener('resize',()=>{if(state.points)draw();});
  setMode('horizontal');
})();