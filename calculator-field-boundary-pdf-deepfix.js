(() => {
  'use strict';
  // Standalone Field Boundary Calculator.
  // This file intentionally does not read/write any existing calculator state.
  const $ = id => document.getElementById(id);
  const EPS = 1e-8;
  const getFbcReferenceMode = () => { const v = $('fbcReferenceMode')?.value; return v === 'two' ? 'two' : 'one'; };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  const bn = n => Number(n || 0).toLocaleString('bn-BD', {
    maximumFractionDigits: 2
  });

  const ftIn = v => {
    let totalIn = Math.round(Math.max(0, Number(v) || 0) * 12);
    const ft = Math.floor(totalIn / 12);
    const inch = totalIn % 12;
    return `${bn(ft)}′ ${bn(inch)}″`;
  };

  const readFI = (ftId, inId) => {
    const f = Number($(ftId)?.value || 0);
    const i = Number($(inId)?.value || 0);
    if (!Number.isFinite(f) || !Number.isFinite(i) || f < 0 || i < 0 || i >= 12) return null;
    return f + i / 12;
  };

  const writeFI = (ftId, inId, value) => {
    const x = Math.max(0, Number(value) || 0);
    let ft = Math.floor(x + 1e-9);
    let inch = Number(((x - ft) * 12).toFixed(2));
    if (inch >= 11.995) { ft += 1; inch = 0; }
    $(ftId).value = ft;
    $(inId).value = inch ? inch : '';
  };

  function triangleArea(a,b,c) {
    if (!(a > 0 && b > 0 && c > 0)) return null;
    if (a + b <= c + EPS || a + c <= b + EPS || b + c <= a + EPS) return null;
    const s = (a+b+c)/2;
    const z = s*(s-a)*(s-b)*(s-c);
    return z > EPS ? Math.sqrt(z) : null;
  }

  function cross(a,b,c) {
    return (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]);
  }

  function polygonArea(p) {
    let s = 0;
    for (let i=0;i<p.length;i++) {
      const q = p[(i+1)%p.length];
      s += p[i][0]*q[1] - q[0]*p[i][1];
    }
    return Math.abs(s)/2;
  }

  function properCross(a,b,c,d) {
    const o1=cross(a,b,c), o2=cross(a,b,d), o3=cross(c,d,a), o4=cross(c,d,b);
    return ((o1>EPS&&o2<-EPS)||(o1<-EPS&&o2>EPS)) &&
           ((o3>EPS&&o4<-EPS)||(o3<-EPS&&o4>EPS));
  }

  function simpleQuad(p) {
    return !properCross(p[0],p[1],p[2],p[3]) &&
           !properCross(p[1],p[2],p[3],p[0]);
  }

  function classify(p) {
    const c = [];
    for (let i=0;i<4;i++) c.push(cross(p[i],p[(i+1)%4],p[(i+2)%4]));
    const pos=c.some(x=>x>EPS), neg=c.some(x=>x<-EPS);
    return pos && neg ? 'concave' : 'convex';
  }

  function sideDiff(actual, reference) {
    if (!(actual > 0) || !(reference > 0)) return null;
    return actual-reference;
  }

  function areaUnits(sqft) {
    return {
      sqft,
      decimal: sqft/435.6,
      shotok: sqft/435.6,
      katha: sqft/720,
      acre: sqft/43560,
      sqm: sqft/10.7639104167
    };
  }

  function renderUnits(area) {
    const u = areaUnits(area);
    return `
      <div class="fbc-unit-grid">
        <div><strong>${bn(u.sqft)}</strong><span>বর্গফুট</span></div>
        <div><strong>${bn(u.decimal)}</strong><span>শতাংশ / Decimal</span></div>
        <div><strong>${bn(u.katha)}</strong><span>কাঠা (৭২০ বর্গফুট)</span></div>
        <div><strong>${bn(u.acre)}</strong><span>একর</span></div>
        <div><strong>${bn(u.sqm)}</strong><span>বর্গমিটার</span></div>
      </div>`;
  }

  function getSet(prefix) {
    const shape = $('fbcShape').value;
    const out = {
      AB: readFI(prefix+'ABft',prefix+'ABin'),
      BC: readFI(prefix+'BCft',prefix+'BCin'),
      CD: shape==='quad' ? readFI(prefix+'CDft',prefix+'CDin') : null,
      DA: shape==='quad' ? readFI(prefix+'DAft',prefix+'DAin') : null,
      diag: readFI(prefix+'Diagft',prefix+'Diagin')
    };
    return out;
  }

  function validateSet(v) {
    const shape = $('fbcShape').value;
    const needed = shape==='tri'
      ? [['AB','AB'],['BC','BC'],['diag','CA']]
      : [['AB','AB'],['BC','BC'],['CD','CD'],['DA','DA'],['diag','diagonal']];
    const missing = needed.filter(x => !(v[x[0]] > 0)).map(x=>x[1]);
    return missing;
  }

  function buildTriangle(v) {
    // A=(0,0), B=(AB,0), C is determined by AB, BC and CA.
    const a=v.AB,b=v.BC,c=v.diag;
    const area=triangleArea(a,b,c);
    if (!area) return {error:'AB, BC এবং CA/কর্ণের মাপ দিয়ে বৈধ ত্রিভুজ তৈরি হচ্ছে না। মাপগুলো আবার যাচাই করুন।'};
    const x=(a*a+c*c-b*b)/(2*a);
    const y2=c*c-x*x;
    if (y2 <= EPS) return {error:'ত্রিভুজটি প্রায় সরলরেখায় চলে গেছে; অতিরিক্ত/ভুল মাপ থাকতে পারে।'};
    const y=Math.sqrt(y2);
    return {points:[[0,0],[a,0],[x,y]],area,classification:'triangle'};
  }

  function buildQuad(v, diagName, wanted) {
    const a=v.AB,b=v.BC,c=v.CD,d=v.DA,e=v.diag;
    const t1=diagName==='AC' ? triangleArea(a,b,e) : triangleArea(b,c,e);
    const t2=diagName==='AC' ? triangleArea(c,d,e) : triangleArea(d,a,e);
    if (!t1 || !t2) return {error:`${diagName} কর্ণের সাথে দেওয়া বাহুগুলোর জ্যামিতিক সামঞ্জস্য নেই। কর্ণ/বাহুর মাপ যাচাই করুন।`};

    let pts;
    if (diagName==='AC') {
      const bx=(a*a+e*e-b*b)/(2*e);
      const by2=a*a-bx*bx;
      const dx=(d*d+e*e-c*c)/(2*e);
      const dy2=d*d-dx*dx;
      if (by2<=EPS || dy2<=EPS) return {error:'AC কর্ণ থেকে B/D পয়েন্ট নির্ণয় করা যাচ্ছে না।'};
      const by=Math.sqrt(by2), dy=Math.sqrt(dy2);
      const A=[0,0], C=[e,0], B=[bx,by];
      const candidates = [
        [A,B,C,[dx,-dy]],
        [A,B,C,[dx,dy]]
      ].map(p=>[p[0],p[1],p[2],p[3]]);
      const valid=candidates.filter(p=>simpleQuad(p));
      if (!valid.length) return {error:'এই মাপগুলো দিয়ে একটি সরল boundary তৈরি করা যাচ্ছে না।'};
      const selected = wanted==='auto'
        ? (valid.find(p=>classify(p)==='convex') || valid[0])
        : (valid.find(p=>classify(p)===wanted) || valid[0]);
      pts=selected;
    } else {
      // BD as x-axis: B=(0,0), D=(BD,0); A and C are reconstructed.
      const bx=0, dx=e;
      const ax=(a*a+e*e-d*d)/(2*e);
      const ay2=a*a-ax*ax;
      const cx=(b*b+e*e-c*c)/(2*e);
      const cy2=b*b-cx*cx;
      if (ay2<=EPS || cy2<=EPS) return {error:'BD কর্ণ থেকে A/C পয়েন্ট নির্ণয় করা যাচ্ছে না।'};
      const ay=Math.sqrt(ay2), cy=Math.sqrt(cy2);
      const B=[bx,0], D=[dx,0], A=[ax,ay];
      const candidates = [
        [A,B,[cx,-cy],D],
        [A,B,[cx,cy],D]
      ];
      const valid=candidates.filter(p=>simpleQuad(p));
      if (!valid.length) return {error:'এই মাপগুলো দিয়ে একটি সরল boundary তৈরি করা যাচ্ছে না।'};
      const selected = wanted==='auto'
        ? (valid.find(p=>classify(p)==='convex') || valid[0])
        : (valid.find(p=>classify(p)===wanted) || valid[0]);
      pts=selected;
    }
    return {points:pts, area:polygonArea(pts), classification:classify(pts)};
  }

  function calculateSet(v) {
    const shape=$('fbcShape').value;
    if (shape==='tri') return buildTriangle(v);
    return buildQuad(v,$('fbcDiagonal').value,$('fbcShapeType').value);
  }

  let fbcView = {scale:1, panX:0, panY:0};
  let fbcBase = null;
  let fbcPointers = new Map();
  let fbcGesture = null;

  function resetFbcView(){
    fbcView = {scale:1, panX:0, panY:0};
    fbcGesture = null;
  }

  function prepareFbcDrawing(field, reference, overlay=true, canvas){
    if(!canvas) return null;
    const rect=canvas.getBoundingClientRect();
    const dpr=window.devicePixelRatio||1;
    const w=Math.max(320, Math.round((rect.width||900)*dpr));
    const h=Math.max(520, Math.round((rect.height||760)*dpr));
    if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}

    const selectedAnchor = $('fbcReferencePoint')?.value || 'A';
    const selectedAnchor2 = $('fbcReferencePoint2')?.value || '';
    const labels=field?.points?.length===3?['A','B','C']:['A','B','C','D'];
    const pointIndex = label => Math.max(0, Math.min(labels.length-1, label.charCodeAt(0)-65));
    const alignPoints = pts => {
      if (!pts || !pts.length) return pts;
      const i1=pointIndex(selectedAnchor);
      const p1=pts[i1];
      let out=pts.map(q=>[q[0]-p1[0],q[1]-p1[1]]);
      if(getFbcReferenceMode()==='two' && selectedAnchor2 && selectedAnchor2!==selectedAnchor){
        const i2=pointIndex(selectedAnchor2);
        const p2=out[i2];
        const ang=Math.atan2(p2[1],p2[0]);
        const ca=Math.cos(-ang), sa=Math.sin(-ang);
        out=out.map(q=>[q[0]*ca-q[1]*sa,q[0]*sa+q[1]*ca]);
      }
      return out;
    };

    const sets=[];
    if(field?.points) sets.push({calc:{...field,points:alignPoints(field.points)},kind:'field'});
    if(overlay && reference?.points) sets.push({calc:{...reference,points:alignPoints(reference.points)},kind:'reference'});
    if(!sets.length) return null;

    const all=sets.flatMap(x=>x.calc.points);
    const xs=all.map(x=>x[0]), ys=all.map(x=>x[1]);
    const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
    const rangeX=Math.max(1,maxX-minX), rangeY=Math.max(1,maxY-minY);
    const pad=92*dpr;
    const baseScale=Math.max(0.01,Math.min((w-2*pad)/rangeX,(h-2*pad)/rangeY));
    fbcBase={sets,w,h,dpr,baseScale,selectedAnchor,selectedAnchor2,labels:field?.points?.length===3?['A','B','C']:['A','B','C','D']};
    return fbcBase;
  }

  function draw(canvas, field, reference, overlay=true) {
    if (!canvas) return;
    const base=prepareFbcDrawing(field,reference,overlay,canvas);
    if(!base) return;
    const {sets,w,h,dpr,baseScale,selectedAnchor,selectedAnchor2,labels}=base;
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,w,h);

    const viewScale=baseScale*fbcView.scale;
    // The selected reference point is always the common anchor at the center.
    const ox=w/2 + fbcView.panX*dpr;
    const oy=h/2 + fbcView.panY*dpr;
    const project=p=>p.map(q=>[ox+q[0]*viewScale,oy-q[1]*viewScale]);

    const strokeBoundary=(points,kind)=>{
      const P=project(points);
      ctx.save();
      ctx.lineJoin='round'; ctx.lineCap='round';
      ctx.lineWidth=(kind==='field'?3.6:2.4)*dpr;
      ctx.strokeStyle=kind==='field'?'#08747b':'#d26a00';
      ctx.fillStyle=kind==='field'?'rgba(8,116,123,.09)':'rgba(210,106,0,.045)';
      ctx.beginPath();
      P.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));
      ctx.closePath(); ctx.fill(); ctx.stroke();

      if(points.length===4){
        const diag=$('fbcDiagonal').value==='AC';
        const ii=diag?[0,2]:[1,3];
        ctx.setLineDash([7*dpr,6*dpr]);
        ctx.lineWidth=1.5*dpr;
        ctx.strokeStyle=kind==='field'?'rgba(8,116,123,.70)':'rgba(210,106,0,.70)';
        ctx.beginPath();ctx.moveTo(P[ii[0]][0],P[ii[0]][1]);ctx.lineTo(P[ii[1]][0],P[ii[1]][1]);ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.font=`800 ${14*dpr}px Arial`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      P.forEach((q,i)=>{
        ctx.beginPath();ctx.arc(q[0],q[1],kind==='field'?6*dpr:5*dpr,0,Math.PI*2);
        ctx.fillStyle=kind==='field'?'#08747b':'#d26a00';ctx.fill();
        ctx.fillStyle=kind==='field'?'#07575d':'#8a4300';
        const isAnchor=labels[i]===selectedAnchor;
        ctx.font=`${isAnchor?'900':'800'} ${(isAnchor?16:14)*dpr}px Arial`;
        ctx.fillText(labels[i],q[0],q[1]-(kind==='field'?18:34)*dpr);
        if(isAnchor){
          ctx.strokeStyle=kind==='field'?'#07575d':'#8a4300';
          ctx.lineWidth=1.5*dpr;
          ctx.beginPath();ctx.arc(q[0],q[1],12*dpr,0,Math.PI*2);ctx.stroke();
        }
      });

      // Dimension text is deliberately large (3×) and rotated parallel to each boundary line.
      ctx.fillStyle=kind==='field'?'#07575d':'#8a4300';
      for(let i=0;i<points.length;i++){
        const j=(i+1)%points.length;
        const x1=P[i][0], y1=P[i][1], x2=P[j][0], y2=P[j][1];
        const mx=(x1+x2)/2, my=(y1+y2)/2;
        const dist=Math.hypot(points[j][0]-points[i][0],points[j][1]-points[i][1]);
        let angle=Math.atan2(y2-y1,x2-x1);
        // Keep the label upright while preserving parallel alignment.
        if(angle > Math.PI/2 || angle < -Math.PI/2) angle += Math.PI;
        const nx=-Math.sin(angle), ny=Math.cos(angle);
        // Keep the two overlaid measurements on opposite sides of the same boundary.
        // This prevents the enlarged 3× labels from stacking/overlapping while both
        // labels remain exactly parallel to their corresponding boundary line.
        const offset=(kind==='field'?30:-46)*dpr;
        ctx.save();
        ctx.translate(mx+nx*offset,my+ny*offset);
        ctx.rotate(angle);
        ctx.font=`900 ${33*dpr}px Arial`;
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.lineWidth=4*dpr;
        ctx.strokeStyle='rgba(255,255,255,.92)';
        ctx.strokeText(ftIn(dist),0,0);
        ctx.fillStyle=kind==='field'?'#07575d':'#8a4300';
        ctx.fillText(ftIn(dist),0,0);
        ctx.restore();
      }
      ctx.restore();
    };

    // Draw Reference first, Field second so the field remains prominent.
    const ref=sets.find(s=>s.kind==='reference');
    const fld=sets.find(s=>s.kind==='field');
    if(ref) strokeBoundary(ref.calc.points,'reference');
    if(fld) strokeBoundary(fld.calc.points,'field');

    // Crosshair marks the selected common reference point; in 2-point mode the second point defines the common baseline.
    ctx.save();
    ctx.strokeStyle='rgba(23,52,68,.28)';ctx.lineWidth=1*dpr;
    ctx.setLineDash([4*dpr,4*dpr]);
    ctx.beginPath();ctx.moveTo(ox-18*dpr,oy);ctx.lineTo(ox+18*dpr,oy);ctx.moveTo(ox,oy-18*dpr);ctx.lineTo(ox,oy+18*dpr);ctx.stroke();
    ctx.setLineDash([]);
    ctx.font=`800 ${12*dpr}px Arial`;ctx.fillStyle='#173444';ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillText(getFbcReferenceMode()==='two' ? `${selectedAnchor} = Point 1 / Anchor` : `${selectedAnchor} = Reference / Anchor`,ox+10*dpr,oy+10*dpr);
    if(getFbcReferenceMode()==='two' && selectedAnchor2 && selectedAnchor2!==selectedAnchor){
      const idx2=labels.indexOf(selectedAnchor2);
      const fld=sets.find(s=>s.kind==='field');
      if(fld && idx2>=0){
        const q=project(fld.calc.points[idx2]);
        ctx.strokeStyle='rgba(23,52,68,.42)';ctx.lineWidth=2*dpr;ctx.setLineDash([9*dpr,6*dpr]);
        ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(q[0],q[1]);ctx.stroke();ctx.setLineDash([]);
        ctx.beginPath();ctx.arc(q[0],q[1],7*dpr,0,Math.PI*2);ctx.stroke();
        ctx.font=`800 ${12*dpr}px Arial`;ctx.fillStyle='#173444';ctx.textAlign='center';ctx.textBaseline='bottom';
        ctx.fillText(`${selectedAnchor2} = Point 2 / Baseline`,q[0],q[1]-10*dpr);
        ctx.font=`700 ${11*dpr}px Arial`;ctx.fillText(`Common Baseline: ${ftIn(Math.hypot(fld.calc.points[idx2][0],fld.calc.points[idx2][1]))}`, (ox+q[0])/2, (oy+q[1])/2-8*dpr);
      }
    }
    ctx.font=`700 ${11*dpr}px Arial`;ctx.fillStyle='#52656f';ctx.textAlign='right';ctx.textBaseline='bottom';
    ctx.fillText(`Zoom ${Math.round(fbcView.scale*100)}%`,w-12*dpr,h-12*dpr);
    ctx.font=`800 ${13*dpr}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#173444';
    const title=ref ? (getFbcReferenceMode()==='two' ? `Reference বনাম Field — ${selectedAnchor} + ${selectedAnchor2} Common Baseline, একই Scale Overlay` : `Reference বনাম Field — ${selectedAnchor} Reference Point, একই Scale Overlay`) : (getFbcReferenceMode()==='two' ? `Field Boundary Drawing — ${selectedAnchor} + ${selectedAnchor2} Baseline` : `Field Boundary Drawing — ${selectedAnchor} Reference Point`);
    ctx.fillText(title,w/2,h-22*dpr);
    ctx.restore();
  }

  function installFbcCanvasGestures(canvas){
    if(!canvas || canvas.dataset.gesturesReady==='1') return;
    canvas.dataset.gesturesReady='1';
    canvas.style.touchAction='none';
    canvas.addEventListener('pointerdown',e=>{
      canvas.setPointerCapture?.(e.pointerId);
      fbcPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(fbcPointers.size===1){
        fbcGesture={mode:'pan',startX:e.clientX,startY:e.clientY,basePanX:fbcView.panX,basePanY:fbcView.panY};
      } else if(fbcPointers.size===2){
        const pts=[...fbcPointers.values()];
        const dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y;
        fbcGesture={mode:'pinch',startDist:Math.hypot(dx,dy),baseScale:fbcView.scale,basePanX:fbcView.panX,basePanY:fbcView.panY,startMidX:(pts[0].x+pts[1].x)/2,startMidY:(pts[0].y+pts[1].y)/2};
      }
    });
    canvas.addEventListener('pointermove',e=>{
      if(!fbcPointers.has(e.pointerId)) return;
      fbcPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(fbcPointers.size===1 && fbcGesture?.mode==='pan'){
        fbcView.panX=fbcGesture.basePanX+(e.clientX-fbcGesture.startX);
        fbcView.panY=fbcGesture.basePanY+(e.clientY-fbcGesture.startY);
      } else if(fbcPointers.size>=2 && fbcGesture?.mode==='pinch'){
        const pts=[...fbcPointers.values()];
        const dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y;
        const dist=Math.max(20,Math.hypot(dx,dy));
        const factor=dist/fbcGesture.startDist;
        fbcView.scale=Math.min(5,Math.max(.45,fbcGesture.baseScale*factor));
        const midX=(pts[0].x+pts[1].x)/2,midY=(pts[0].y+pts[1].y)/2;
        fbcView.panX=fbcGesture.basePanX+(midX-fbcGesture.startMidX);
        fbcView.panY=fbcGesture.basePanY+(midY-fbcGesture.startMidY);
      }
      if(fieldCalc) draw(canvas,fieldCalc,refCalc,$('fbcOverlay').checked);
    });
    const end=e=>{fbcPointers.delete(e.pointerId);if(fbcPointers.size===0)fbcGesture=null;};
    canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')end(e);});
  }

  function compareHtml(field, ref) {
    if (!field || !ref) return '';
    const keys=['AB','BC','CD','DA','diag'];
    const names={AB:'AB',BC:'BC',CD:'CD',DA:'DA',diag:$('fbcDiagonal').value};
    let rows='';
    keys.forEach(k=>{
      if(field[k]>0 && ref[k]>0){
        const d=field[k]-ref[k];
        rows+=`<tr><td>${names[k]}</td><td>${ftIn(ref[k])}</td><td>${ftIn(field[k])}</td><td class="${Math.abs(d)>0.1?'fbc-diff-warn':''}">${d>=0?'+':''}${ftIn(Math.abs(d))}${d<0?' কম':''}</td></tr>`;
      }
    });
    if(!rows) return '';
    return `<div class="fbc-compare"><h4>📋 Reference বনাম Field</h4>
      <div class="fbc-table-wrap"><table><thead><tr><th>মাপ</th><th>Reference</th><th>Field</th><th>পার্থক্য</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${fieldCalc?.area && refCalc?.area ? `<div class="fbc-area-diff">ক্ষেত্রফলের পার্থক্য: <strong>${bn(Math.abs(fieldCalc.area-refCalc.area))} বর্গফুট</strong></div>`:''}
    </div>`;
  }

  let fieldCalc=null, refCalc=null;

  function render() {
    const shape=$('fbcShape').value;
    $('fbcQuadFields').hidden=shape!=='quad';
    $('fbcQuadFields2').hidden=shape!=='quad';
    $('fbcTriDiagLabel').hidden=shape!=='tri';
    $('fbcQuadDiagLabel').hidden=shape==='tri';
    $('fbcShapeTypeWrap').hidden=shape!=='quad';
    $('fbcDiagonal').disabled=shape==='tri';
    if(shape==='tri') $('fbcDiagonal').value='AC';
    const refPoint=$('fbcReferencePoint');
    const refPoint2=$('fbcReferencePoint2');
    const refMode=$('fbcReferenceMode');
    const refPoint2Wrap=$('fbcReferencePoint2Wrap');
    if(refMode && refPoint2Wrap) refPoint2Wrap.hidden=refMode.value!=='two';
    if(refPoint || refPoint2){
      [refPoint,refPoint2].forEach(el=>{
        if(!el) return;
        const d=el.querySelector('option[value="D"]');
        if(d) d.hidden=shape==='tri';
        if(shape==='tri' && el.value==='D') el.value=el.id==='fbcReferencePoint2'?'B':'A';
      });
      if(refMode?.value==='two' && refPoint2?.value===refPoint?.value){
        refPoint2.value = refPoint?.value==='A' ? 'B' : 'A';
      }
    }
    const r=$('fbcResult');
    const field=getSet('fbcF');
    const missing=validateSet(field);
    if(missing.length){
      r.innerHTML=`<div class="fbc-alert">⚠️ ${shape==='tri'?'ত্রিভুজের':'চতুর্ভুজের'} প্রয়োজনীয় মাপ দিন: <strong>${missing.join(', ')}</strong></div>`;
      fieldCalc=null; return;
    }
    fieldCalc=calculateSet(field);
    if(fieldCalc.error){
      r.innerHTML=`<div class="fbc-alert">⚠️ ${esc(fieldCalc.error)}</div>`;
      return;
    }

    refCalc=null;
    let refHtml='';
    if($('fbcCompare').checked){
      const ref=getSet('fbcR');
      const rm=validateSet(ref);
      if(!rm.length){
        refCalc=calculateSet(ref);
        if(!refCalc.error){
          refHtml=`<div class="fbc-reference-result"><strong>Reference Area:</strong> ${bn(refCalc.area)} বর্গফুট<br>${renderUnits(refCalc.area)}</div>`;
        }
      }
    }

    r.innerHTML=`
      <div class="fbc-success">✓ মাপগুলো জ্যামিতিকভাবে সামঞ্জস্যপূর্ণ।</div>
      <div class="fbc-main-result"><span>মাঠের হিসাবকৃত ক্ষেত্রফল</span><strong>${bn(fieldCalc.area)} বর্গফুট</strong></div>
      <div class="fbc-meta-grid">
        <div><strong>আকৃতি</strong><span>${shape==='tri'?'ত্রিভুজ':'চতুর্ভুজ — '+(fieldCalc.classification==='concave'?'Concave':'Convex')}</span></div>
        <div><strong>জ্যামিতিক অবস্থা</strong><span>✓ Valid</span></div>
        <div><strong>Reference Basis</strong><span>${esc($('fbcReferencePoint').value)}${$('fbcReferenceMode')?.value==='two' ? ' + '+esc($('fbcReferencePoint2').value)+' Baseline' : ' — 1 Point'}</span></div><div><strong>Closure</strong><span>✓ Drawing closes</span></div>
      </div>
      ${renderUnits(fieldCalc.area)}
      ${refHtml}
      ${refCalc?compareHtml(field, getSet('fbcR')):''}
      <div class="fbc-note">এটি মাপের ভিত্তিতে গাণিতিক boundary reconstruction। Reference ও Field উভয়টি থাকলে একই scale/reference basis-এ overlay করে তুলনা করা হয়। এটি দলিল, খতিয়ান, সরকারি জরিপ নকশা বা আইনগত সীমানার বিকল্প নয়।</div>`;
    draw($('fbcCanvas'),fieldCalc,refCalc,$('fbcOverlay').checked);
  }

  function clearSet(prefix) {
    ['AB','BC','CD','DA','Diag'].forEach(k=>{
      const ft=$(prefix+k+'ft'), ins=$(prefix+k+'in');
      if(ft) ft.value='';
      if(ins) ins.value='';
    });
  }

  function syncCompare() {
    // Reference inputs remain visible so field users can enter deed/map data at any time.
    $('fbcReferenceCard').hidden=false;
  }

  function fbcPdfEscape(s){ return String(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)'); }
  function fbcDataUrlToBytes(dataUrl){
    const b64=dataUrl.split(',')[1]||'';
    const bin=atob(b64); const out=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
    return out;
  }
  function fbcBuildImagePdf(pageImages, width, height, pageW=595, pageH=842){
    const objects=[]; const offsets=[];
    const enc=new TextEncoder();
    const addObj=(body)=>{objects.push(body); return objects.length;};
    const catalogId=addObj('');
    const pagesId=addObj('');
    const pageIds=[];
    const imageIds=[];
    const contentIds=[];
    pageImages.forEach((dataUrl)=>{
      const jpg=fbcDataUrlToBytes(dataUrl);
      const imgId=objects.length+1;
      objects.push({binary:jpg,dict:`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>`});
      imageIds.push(imgId);
      const stream=`q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im1 Do\nQ\n`;
      contentIds.push(addObj({stream,dict:`<< /Length ${enc.encode(stream).length} >>`}));
      pageIds.push(addObj(''));
    });
    const kids=pageIds.map(id=>`${id} 0 R`).join(' ');
    objects[catalogId-1]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId-1]=`<< /Type /Pages /Count ${pageIds.length} /Kids [${kids}] >>`;
    pageIds.forEach((id,i)=>{
      objects[id-1]=`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im1 ${imageIds[i]} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;
    });
    let chunks=[]; let pos=0;
    const pushText=(t)=>{const b=enc.encode(t); chunks.push(b); pos+=b.length;};
    pushText('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');
    const xref=[0];
    objects.forEach((obj,idx)=>{
      xref.push(pos); pushText(`${idx+1} 0 obj\n`);
      if(typeof obj==='string'){ pushText(obj+'\nendobj\n'); }
      else if(obj.binary){
        pushText(obj.dict+'\nstream\n'); chunks.push(obj.binary); pos+=obj.binary.length; pushText('\nendstream\nendobj\n');
      } else { pushText(obj.dict+'\nstream\n'); const b=enc.encode(obj.stream); chunks.push(b); pos+=b.length; pushText('endstream\nendobj\n'); }
    });
    const xrefPos=pos; pushText(`xref\n0 ${objects.length+1}\n`); pushText('0000000000 65535 f \n');
    for(let i=1;i<=objects.length;i++) pushText(String(xref[i]).padStart(10,'0')+' 00000 n \n');
    pushText(`trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);
    const total=chunks.reduce((n,b)=>n+b.length,0); const out=new Uint8Array(total); let o=0;
    chunks.forEach(b=>{out.set(b,o);o+=b.length;});
    return out;
  }
  function fbcReportCanvas(title, field, ref, drawingData){
    const W=1240,H=1754, pages=[];
    const makePage=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.fillStyle='#17313d';x.textBaseline='top';return [c,x];};
    const [c1,x1]=makePage();
    const font='"Noto Sans Bengali", "Lohit Bengali", Arial, sans-serif';
    x1.font=`bold 34px ${font}`; x1.fillText(title,60,55);
    x1.font=`22px ${font}`; x1.fillText('মাঠের পরিমাপ ও Reference/নকশার মাপের গাণিতিক তুলনা',60,105);
    x1.font=`20px ${font}`; x1.fillText(`Reference Point: ${$('fbcReferencePoint').value}${$('fbcReferenceMode')?.value==='two' ? ' + '+$('fbcReferencePoint2').value+' (Common Baseline)' : ' (1 Point)'}`,60,150);
    x1.font=`bold 26px ${font}`; x1.fillText('Reference বনাম Field',60,215);
    const cols=[60,280,570,860,1160], y0=270, rh=62;
    x1.fillStyle='#eef5f6';x1.fillRect(60,y0,1120,rh);x1.fillStyle='#17313d';x1.font=`bold 20px ${font}`;
    ['মাপ','Reference','Field','পার্থক্য'].forEach((v,i)=>x1.fillText(v,cols[i]+10,y0+18));
    const keys=['AB','BC','CD','DA','diag']; const names={AB:'AB',BC:'BC',CD:'CD',DA:'DA',diag:$('fbcDiagonal').value||'কর্ণ'};
    x1.font=`20px ${font}`; let y=y0+rh;
    keys.filter(k=>field[k]>0||ref[k]>0).forEach((k,ri)=>{if(ri%2===0){x1.fillStyle='#fbfcfd';x1.fillRect(60,y,1120,rh);}x1.fillStyle='#17313d'; const rv=ref[k]>0?ftIn(ref[k]):'—',fv=field[k]>0?ftIn(field[k]):'—',d=(field[k]>0&&ref[k]>0)?field[k]-ref[k]:null,dv=d===null?'—':(d>=0?'+':'−')+ftIn(Math.abs(d));[names[k],rv,fv,dv].forEach((v,i)=>x1.fillText(String(v),cols[i]+10,y+18));x1.strokeStyle='#d9e2e6';x1.strokeRect(60,y,1120,rh);y+=rh;});
    x1.font=`22px ${font}`; y+=35; x1.fillText(`Field ক্ষেত্রফল: ${bn(fieldCalc.area)} বর্গফুট`,60,y); if(refCalc?.area){y+=38;x1.fillText(`Reference ক্ষেত্রফল: ${bn(refCalc.area)} বর্গফুট`,60,y);y+=38;x1.fillText(`ক্ষেত্রফলের পার্থক্য: ${bn(Math.abs(fieldCalc.area-refCalc.area))} বর্গফুট`,60,y);}
    pages.push(c1.toDataURL('image/jpeg',0.92));
    const [c2,x2]=makePage();x2.font=`bold 34px ${font}`;x2.fillStyle='#17313d';x2.fillText('Boundary Drawing',60,55);
    if(drawingData){
      const sourceCanvas=$('fbcCanvas');
      if(sourceCanvas && sourceCanvas.width && sourceCanvas.height){
        const iw=sourceCanvas.width, ih=sourceCanvas.height;
        const maxW=1120,maxH=1510,ratio=Math.min(maxW/iw,maxH/ih);
        const w=iw*ratio,h=ih*ratio;
        x2.drawImage(sourceCanvas,(W-w)/2,125,w,h);
      }
    }
    x2.font=`18px ${font}`;x2.fillStyle='#52656d';x2.fillText('নোট: এটি গাণিতিক/টপোগ্রাফিক সহায়ক যাচাই; আইনগত boundary determination-এর বিকল্প নয়।',60,1670);
    pages.push(c2.toDataURL('image/jpeg',0.92));
    return {pages,width:W,height:H};
  }
  async function printReport() {
    let url = null;
    let modal = null;
    try {
      if(!fieldCalc) { render(); }
      if(!fieldCalc) { alert('প্রথমে “হিসাব ও Drawing” সম্পন্ন করুন। তারপর Field Report / PDF চাপুন।'); return; }
      const canvas=$('fbcCanvas');
      if(!canvas || !canvas.width || !canvas.height) { alert('Drawing পাওয়া যায়নি। প্রথমে “হিসাব ও Drawing” চাপুন।'); return; }
      draw(canvas,fieldCalc,refCalc,$('fbcOverlay').checked);
      const drawingData=canvas.toDataURL('image/png',1.0);
      if(!drawingData || drawingData.indexOf('data:image/png')!==0) throw new Error('Drawing image could not be captured');
      const title='সীমানা পরিমাপ ও যাচাই (টপোগ্রাফি)';
      const field=getSet('fbcF'), ref=getSet('fbcR');
      const report=fbcReportCanvas(title,field,ref,drawingData);
      if(!report || !Array.isArray(report.pages) || report.pages.length<2) throw new Error('Report pages could not be created');
      const bytes=fbcBuildImagePdf(report.pages,report.width,report.height,595,842);
      if(!bytes || bytes.byteLength<5000) throw new Error('Generated PDF is empty or incomplete');
      const header=new TextDecoder().decode(bytes.slice(0,8));
      const tail=new TextDecoder().decode(bytes.slice(Math.max(0,bytes.length-64)));
      if(header.indexOf('%PDF-')!==0 || tail.indexOf('%%EOF')===-1) throw new Error('Generated PDF structure is invalid');
      const blob=new Blob([bytes],{type:'application/pdf'});
      if(!blob.size) throw new Error('PDF Blob is empty');
      url=URL.createObjectURL(blob);
      const filename=`seemaana-porimap-o-yaachai-${new Date().toISOString().slice(0,10)}.pdf`;

      // Do NOT use window.open() here. Android/PWA can navigate the current page.
      const old=$('fbcPdfModal'); if(old) old.remove();
      modal=document.createElement('div');
      modal.id='fbcPdfModal';
      modal.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.72);display:flex;flex-direction:column;padding:12px;box-sizing:border-box;';
      modal.innerHTML=`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#fff;border-radius:10px 10px 0 0;padding:10px;box-sizing:border-box;"><strong style="flex:1;font-size:16px;color:#17313d">📄 Field Report / PDF প্রস্তুত</strong><a id="fbcPdfDownload" href="${url}" download="${filename}" style="display:inline-block;text-decoration:none;background:#08747b;color:#fff;padding:9px 13px;border-radius:7px;font-weight:700">⬇️ PDF Download</a><button type="button" id="fbcPdfOpen" style="background:#17313d;color:#fff;border:0;padding:9px 13px;border-radius:7px;font-weight:700">↗️ PDF খুলুন</button><button type="button" id="fbcPdfClose" style="background:#e9eef0;color:#17313d;border:0;padding:9px 13px;border-radius:7px;font-weight:700">✕ বন্ধ</button></div><iframe id="fbcPdfFrame" title="Field Report PDF" style="width:100%;flex:1;border:0;background:#fff;border-radius:0 0 10px 10px" src="${url}"></iframe>`;
      document.body.appendChild(modal);
      const close=()=>{ try{modal.remove();}catch(_){} if(url){try{URL.revokeObjectURL(url);}catch(_){} url=null;} };
      $('fbcPdfClose').addEventListener('click',close);
      modal.addEventListener('click',e=>{if(e.target===modal) close();});
      $('fbcPdfOpen').addEventListener('click',()=>{ const a=document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; document.body.appendChild(a); a.click(); a.remove(); });
      try { const a=document.createElement('a'); a.href=url; a.download=filename; a.style.display='none'; document.body.appendChild(a); a.click(); a.remove(); } catch(_) {}
    } catch(err) {
      console.error('Field Boundary PDF generation failed:',err);
      if(modal) { try{modal.remove();}catch(_){} }
      if(url) { try{URL.revokeObjectURL(url);}catch(_){} }
      alert('Field Report / PDF তৈরি করা যায়নি। প্রথমে “হিসাব ও Drawing” সম্পন্ন করে আবার চেষ্টা করুন।\n\nসমস্যা: '+(err?.message||'অজানা ত্রুটি'));
    }
  }

  function init() {
    if(window.__FBC_DEEPFIX_INIT__) return;
    if(!$('fbcShape')) return;
    window.__FBC_DEEPFIX_INIT__=true;
    $('fbcShape').addEventListener('change',render);
    $('fbcDiagonal').addEventListener('change',()=>{ resetFbcView(); render(); });
    $('fbcShapeType').addEventListener('change',render);
    $('fbcReferencePoint').addEventListener('change',()=>{ resetFbcView(); render(); });
    $('fbcReferenceMode').addEventListener('change',()=>{ resetFbcView(); render(); });
    $('fbcReferencePoint2').addEventListener('change',()=>{ resetFbcView(); render(); });
    $('fbcCompare').addEventListener('change',render);
    $('fbcOverlay').addEventListener('change',()=>{ resetFbcView(); if(fieldCalc) draw($('fbcCanvas'),fieldCalc,refCalc,$('fbcOverlay').checked); });
    installFbcCanvasGestures($('fbcCanvas'));
    document.querySelectorAll('#panel-field-boundary input').forEach(i=>i.addEventListener('input',()=>{}));
    $('fbcCalculate').addEventListener('click',()=>{ resetFbcView(); render(); });
    $('fbcReset').addEventListener('click',()=>{
      clearSet('fbcF'); clearSet('fbcR'); $('fbcResult').innerHTML=''; fieldCalc=null; refCalc=null; resetFbcView();
      $('fbcCompare').checked=true; $('fbcOverlay').checked=true; $('fbcReferenceMode').value='two'; $('fbcReferencePoint').value='A'; $('fbcReferencePoint2').value='B'; syncCompare();
      const c=$('fbcCanvas'); c.getContext('2d').clearRect(0,0,c.width,c.height);
    });
    const oldPrint = $('fbcPrint');
    if(oldPrint){
      const cleanPrint = oldPrint.cloneNode(true);
      oldPrint.replaceWith(cleanPrint);
      cleanPrint.addEventListener('click', (ev)=>{ ev.preventDefault(); ev.stopImmediatePropagation(); printReport(); });
    }
    syncCompare();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
