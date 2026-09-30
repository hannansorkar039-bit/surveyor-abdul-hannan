// Surveyor Abdul Hannan — Quadrilateral partition calculator
// চার বাহু + কর্ণ ভিত্তিক ভাগ-বণ্টন, editable dimensions এবং live SVG drawing.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const result = $('qpResult');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bn = n => Number(n || 0).toLocaleString('bn-BD', {maximumFractionDigits: 2});
  const EPS = 1e-8;
  const FT_PER_M = 3.280839895013123;
  const SQFT_PER_DECIMAL = 435.6;

  function readFI(ftId, inId) {
    const f = Number($(ftId)?.value || 0);
    const i = Number($(inId)?.value || 0);
    if (!Number.isFinite(f) || !Number.isFinite(i) || f < 0 || i < 0 || i >= 12) return null;
    return f + i / 12;
  }
  function setFI(ftId, inId, value) {
    const v = Math.max(0, Number(value) || 0);
    let ft = Math.floor(v + 1e-9);
    let inch = Number(((v - ft) * 12).toFixed(2));
    // Normalize rounding such as 69' 11.999" to 70' 0" rather than
    // accidentally writing 69' 0".
    if (inch >= 11.995) { ft += 1; inch = 0; }
    $(ftId).value = ft;
    $(inId).value = inch === 0 ? '' : inch;
  }
  // Display field dimensions in conventional survey notation: feet + whole inches.
  // Calculations retain full precision; only the visual dimension label is rounded to
  // the nearest inch so values such as 29' 1.09" are shown clearly as 29' 1".
  function ftIn(v) {
    const x = Math.max(0, Number(v) || 0);
    let totalIn = Math.round(x * 12);
    if (!Number.isFinite(totalIn)) totalIn = 0;
    const ft = Math.floor(totalIn / 12);
    const inch = totalIn % 12;
    return `${bn(ft)}′ ${bn(inch)}″`;
  }
  function sideValues() {
    return {
      AB: readFI('qpABft','qpABin'), BC: readFI('qpBCft','qpBCin'),
      CD: readFI('qpCDft','qpCDin'), DA: readFI('qpDAft','qpDAin'), AC: readFI('qpACft','qpACin')
    };
  }
  function triangle(a,b,c) {
    if (!(a > 0 && b > 0 && c > 0) || a+b <= c+EPS || a+c <= b+EPS || b+c <= a+EPS) return null;
    const s = (a+b+c)/2, z = s*(s-a)*(s-b)*(s-c);
    return z > EPS ? Math.sqrt(z) : null;
  }
  function cross(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
  function pointInTriangle(p,a,b,c){
    const c1=cross(a,b,p), c2=cross(b,c,p), c3=cross(c,a,p);
    const hasNeg=(c1<-EPS)||(c2<-EPS)||(c3<-EPS), hasPos=(c1>EPS)||(c2>EPS)||(c3>EPS);
    return !(hasNeg&&hasPos);
  }
  function pointStrictlyInTriangle(p,a,b,c){
    const c1=cross(a,b,p), c2=cross(b,c,p), c3=cross(c,a,p);
    return (c1>EPS&&c2>EPS&&c3>EPS) || (c1<-EPS&&c2<-EPS&&c3<-EPS);
  }
  function segmentIntersectionProper(a,b,c,d){
    const o1=cross(a,b,c), o2=cross(a,b,d), o3=cross(c,d,a), o4=cross(c,d,b);
    return ((o1>EPS&&o2<-EPS)||(o1<-EPS&&o2>EPS)) && ((o3>EPS&&o4<-EPS)||(o3<-EPS&&o4>EPS));
  }
  function polygonAreaSigned(pts){
    let z=0; for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length]; z+=p[0]*q[1]-q[0]*p[1];}
    return z/2;
  }
  function polygonArea(pts){return Math.abs(polygonAreaSigned(pts));}
  function lineIntersection(a,b,c,d) {
    const x1=a[0], y1=a[1], x2=b[0], y2=b[1], x3=c[0], y3=c[1], x4=d[0], y4=d[1];
    const den=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
    if(Math.abs(den)<EPS) return null;
    const t=((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/den;
    const u=-((x1-x2)*(y1-y3)-(y1-y2)*(x1-x3))/den;
    return [x1+t*(x2-x1),y1+t*(y2-y1),t,u];
  }
  function isSimpleQuad(pts) {
    return !(segmentIntersectionProper(pts[0],pts[1],pts[2],pts[3]) || segmentIntersectionProper(pts[1],pts[2],pts[3],pts[0]));
  }
  function classifyQuad(pts) {
    const cs=[];
    for(let i=0;i<4;i++) cs.push(cross(pts[i],pts[(i+1)%4],pts[(i+2)%4]));
    const pos=cs.some(x=>x>EPS), neg=cs.some(x=>x<-EPS);
    if(!(pos&&neg)) return {type:'convex',reflex:null,crosses:cs};
    // The unique turn whose sign differs from the other three is the reflex vertex.
    const signs=cs.map(x=>x>EPS?1:-1);
    const counts={pos:signs.filter(x=>x===1).length,neg:signs.filter(x=>x===-1).length};
    const majority=counts.pos>=counts.neg?1:-1;
    const idx=signs.findIndex(x=>x!==majority);
    return {type:'concave',reflex:idx===1?'B':idx===2?'C':idx===3?'D':'A',crosses:cs};
  }
  function buildQuad(v, wantedType='auto') {
    const {AB:a,BC:b,CD:c,DA:d,AC:e} = v;
    const tABC = triangle(a,b,e), tACD = triangle(c,d,e);
    if (!tABC || !tACD) return null;
    const cx = (a*a + e*e - b*b) / (2*a);
    const cy2 = e*e - cx*cx;
    if (!(cy2 > EPS)) return null;
    const cy = Math.sqrt(cy2);
    const A=[0,0], B=[a,0], C=[cx,cy];
    // D has two mathematically possible positions relative to diagonal AC.
    const ux=cx/e, uy=cy/e, px=-uy, py=ux;
    const proj=(d*d + e*e - c*c)/(2*e);
    const h2=d*d-proj*proj;
    if (!(h2 > EPS)) return null;
    const h=Math.sqrt(h2);
    const candidates=[1,-1].map(sign=>{
      const D=[proj*ux+sign*h*px, proj*uy+sign*h*py];
      const pts=[A,B,C,D];
      if(!isSimpleQuad(pts)) return null;
      const cls=classifyQuad(pts);
      if(wantedType!=='auto' && cls.type!==wantedType) return null;
      const area=polygonArea(pts);
      if(!(area>EPS)) return null;
      const lens=[[A,B],[B,C],[C,D],[D,A]].map(([p,q])=>Math.hypot(q[0]-p[0],q[1]-p[1]));
      if(lens.some((x,i)=>Math.abs(x-[a,b,c,d][i])>1e-5)) return null;
      return {A,B,C,D,pts,tABC,tACD,area,type:cls.type,reflex:cls.reflex};
    }).filter(Boolean);
    if(!candidates.length) return null;
    // Auto mode prefers the first geometrically valid configuration; the user can
    // explicitly choose উত্তল/অবতল when both configurations are mathematically possible.
    return candidates[0];
  }
  function interpolate(p,q,t) { return [p[0]+(q[0]-p[0])*t, p[1]+(q[1]-p[1])*t]; }
  function dist(a,b){return Math.hypot(b[0]-a[0],b[1]-a[1]);}
  function targetSqft() {
    const x = Number($('qpTarget')?.value || 0);
    const u = $('qpTargetUnit')?.value || 'decimal';
    if (!(x > 0)) return null;
    return u === 'sqft' ? x : u === 'sqm' ? x * 10.763910416709722 : x * SQFT_PER_DECIMAL;
  }
  function warning(msg) { result.innerHTML = `<div class="qp-warning">${esc(msg)}</div>`; }
  function editor(v, part, q) {
    const items = [['AB','উত্তর • AB'],['BC','পূর্ব • BC'],['CD','দক্ষিণ • CD'],['DA','পশ্চিম • DA'],['AC','কর্ণ • AC']];
    const targetSq = part ? part.partArea : null;
    const targetDec = targetSq == null ? null : targetSq / SQFT_PER_DECIMAL;
    const derived = part ? `
      <div class="qp-derived-card">
        <div class="qp-derived-title">✂️ ভাগকৃত জমির বর্তমান মাপ — এডিট করলে সঙ্গে সঙ্গে পুনঃহিসাব হবে</div>
        <div class="qp-derived-grid">
          ${dimensionTable(`নির্ধারিত ভাগ (${bn(targetDec)} শতাংশ)`, part.targetSegments)}
          ${dimensionTable(`অবশিষ্ট জমি (${bn((q.area-targetSq)/SQFT_PER_DECIMAL)} শতাংশ)`, part.remainSegments)}
        </div>
        <div class="qp-live-area is-match">
          <strong>বর্তমান ভাগকৃত ক্ষেত্রফল:</strong> ${bn(targetSq)} বর্গফুট = ${bn(targetDec)} শতাংশ
        </div>
      </div>` : '';
    return `<div class="qp-edit-card"><strong>ড্রয়িংয়ের মাপ সংশোধন করুন</strong><div class="qp-note">মূল জমির ফুট/ইঞ্চি পরিবর্তন করলে নিচের ভাগকৃত অংশ, অবশিষ্ট অংশ, কর্ণ, ভাগরেখা এবং ভাগকৃত ক্ষেত্রফল স্বয়ংক্রিয়ভাবে আপডেট হবে।</div></div>
      <div class="qp-editor">${items.map(([k,label])=>`<div class="qp-edit-card"><label>${label}</label><div class="fi-row"><input id="qpEdit${k}ft" type="number" min="0" step="any" placeholder="ফুট" value="${Math.floor(v[k])}"><input id="qpEdit${k}in" type="number" min="0" max="11.999" step="0.01" placeholder="ইঞ্চি" value="${Number(((v[k]-Math.floor(v[k]))*12).toFixed(2)) || ''}"></div></div>`).join('')}</div>
      ${derived}`;
  }
  function syncEditor(v) {
    if (!$('qpEditABft')) return;
    for (const k of ['AB','BC','CD','DA','AC']) setFI(`qpEdit${k}ft`,`qpEdit${k}in`,v[k]);
  }
  function readEditor() {
    const out={};
    for (const k of ['AB','BC','CD','DA','AC']) {
      out[k]=readFI(`qpEdit${k}ft`,`qpEdit${k}in`);
      if (out[k] === null) return null;
    }
    return out;
  }
  function svgLabel(x,y,text,anchor='middle') { return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-size="22" font-weight="800" fill="#082336" paint-order="stroke" stroke="#fff" stroke-width="4" stroke-linejoin="round">${esc(text)}</text>`; }
  function trianglePointsArea(a,b,c){return Math.abs(cross(a,b,c))/2;}
  function pointInPolygon(p, pts){
    let inside=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const a=pts[i],b=pts[j];
      const hit=((a[1]>p[1])!==(b[1]>p[1])) && (p[0] < (b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]);
      if(hit) inside=!inside;
    }
    return inside;
  }
  function pointOnSegment(p,a,b){
    return Math.abs(cross(a,b,p))<1e-6 && p[0]>=Math.min(a[0],b[0])-1e-6 && p[0]<=Math.max(a[0],b[0])+1e-6 && p[1]>=Math.min(a[1],b[1])-1e-6 && p[1]<=Math.max(a[1],b[1])+1e-6;
  }
  function pointInOrOnPolygon(p,pts){
    if(pointInPolygon(p,pts)) return true;
    for(let i=0;i<pts.length;i++) if(pointOnSegment(p,pts[i],pts[(i+1)%pts.length])) return true;
    return false;
  }
  function polygonIsInside(candidate, outer){
    return candidate.every((p,i)=>pointInOrOnPolygon(p,outer) || (i>0 && pointOnSegment(p,candidate[i-1],candidate[i])));
  }
  function segmentInsidePolygon(a,b,outer){
    const samples=[0.05,0.15,0.25,0.35,0.45,0.55,0.65,0.75,0.85,0.95].map(t=>interpolate(a,b,t));
    return samples.every(p=>pointInOrOnPolygon(p,outer));
  }
  function polygonEdgesInside(candidate,outer){
    for(let i=0;i<candidate.length;i++){
      if(!segmentInsidePolygon(candidate[i],candidate[(i+1)%candidate.length],outer)) return false;
    }
    return true;
  }
  function cutIsInside(q,P){
    const samples=[0.2,0.4,0.6,0.8].map(t=>interpolate(q.A,P,t));
    return samples.every(pt=>pointInOrOnPolygon(pt,q.pts));
  }
  function solveOnSegment(fn, p, q, target) {
    const f0=fn(p), f1=fn(q);
    const increasing=f1>=f0;
    if(target < Math.min(f0,f1)-1e-6 || target > Math.max(f0,f1)+1e-6) return null;
    let lo=0,hi=1;
    for(let i=0;i<100;i++){
      const m=(lo+hi)/2, P=interpolate(p,q,m), val=fn(P);
      if((increasing && val<target)||(!increasing && val>target)) lo=m; else hi=m;
    }
    const t=(lo+hi)/2, P=interpolate(p,q,t);
    return {P,t,value:fn(P)};
  }
  const SIDE_META={
    north:{key:'AB',i:0,label:'উত্তর',start:'A',end:'B',opposite:'C'},
    east:{key:'BC',i:1,label:'পূর্ব',start:'B',end:'C',opposite:'D'},
    south:{key:'CD',i:2,label:'দক্ষিণ',start:'C',end:'D',opposite:'A'},
    west:{key:'DA',i:3,label:'পশ্চিম',start:'D',end:'A',opposite:'B'}
  };
  function partitionForDirection(q,target,direction){
    const meta=SIDE_META[direction] || SIDE_META.north;
    const pts=q.pts;
    const i=meta.i;
    const n=(i+1)%4;
    const prev=(i+3)%4;
    const opposite=(i+2)%4;
    const A=pts[i], B=pts[n], L=pts[prev], R=pts[opposite];

    // The selected boundary A-B remains the complete boundary of the
    // separated parcel. P lies on A-L and Q lies on B-R. The cut P-Q is
    // therefore a straight boundary and both resulting parcels have four
    // vertices. For concave quadrilaterals the area(t) curve need not be
    // monotonic, so do NOT use a single binary search based on endpoint
    // monotonicity. Scan the full interval for every valid crossing, then
    // refine the first crossing (closest to the selected side).
    const areaAt=t=>{
      const P=interpolate(A,L,t);
      const Q=interpolate(B,R,t);
      return polygonArea([A,B,Q,P]);
    };
    const validAt=(t)=>{
      const P=interpolate(A,L,t);
      const Q=interpolate(B,R,t);
      const targetPoly=[A,B,Q,P];
      const remainPoly=[P,Q,R,L];
      if (!polygonIsInside(targetPoly,pts) || !polygonIsInside(remainPoly,pts)) return null;
      if (!polygonEdgesInside(targetPoly,pts) || !polygonEdgesInside(remainPoly,pts)) return null;
      if (!segmentInsidePolygon(P,Q,pts)) return null;
      const targetArea=polygonArea(targetPoly), remainArea=polygonArea(remainPoly);
      if (Math.abs(targetArea+remainArea-q.area)>1e-4) return null;
      return {P,Q,targetPoly,remainPoly,targetArea,remainArea};
    };

    const N=1200;
    const roots=[];
    let prevT=0, prevF=areaAt(0)-target;
    const tolerance=Math.max(1e-6, q.area*1e-10);
    if (Math.abs(prevF)<=tolerance) roots.push(0);
    for(let j=1;j<=N;j++){
      const t=j/N;
      const f=areaAt(t)-target;
      if (Math.abs(f)<=tolerance) roots.push(t);
      if ((prevF<0 && f>0) || (prevF>0 && f<0)) {
        let lo=prevT, hi=t, flo=prevF;
        for(let k=0;k<80;k++){
          const m=(lo+hi)/2, fm=areaAt(m)-target;
          if ((flo<0 && fm<=0) || (flo>0 && fm>=0)) { lo=m; flo=fm; }
          else hi=m;
        }
        roots.push((lo+hi)/2);
      }
      prevT=t; prevF=f;
    }
    // Remove near-duplicate roots while preserving order from the selected side.
    roots.sort((x,y)=>x-y);
    const uniqueRoots=[];
    for(const r of roots) if(!uniqueRoots.length || Math.abs(r-uniqueRoots[uniqueRoots.length-1])>1e-5) uniqueRoots.push(r);

    let solved=null;
    for(const t of uniqueRoots){
      const candidate=validAt(t);
      if(candidate && Math.abs(candidate.targetArea-target)<=Math.max(1e-4,q.area*1e-10)) {
        solved={t,...candidate};
        break;
      }
    }
    if(!solved) return null;

    const {t,P,Q,targetPoly,remainPoly,targetArea,remainArea}=solved;
    const names=['A','B','C','D'];
    const aName=names[i], bName=names[n], pSideName=names[prev], rName=names[opposite];
    const sideNames=['উত্তর','পূর্ব','দক্ষিণ','পশ্চিম'];
    const sideKeys=['AB','BC','CD','DA'];
    const cutName='P–Q';
    const makeSeg=(name,label,value,extra={})=>({name,label,value,...extra});
    const targetSegments=[
      makeSeg(`${aName}–${bName}`,`${meta.label} ${meta.key} (পূর্ণ বাহু)`,dist(A,B)),
      makeSeg(`${bName}–Q`,`${sideNames[n]} ${sideKeys[n]} (ভাগ অংশ)`,dist(B,Q)),
      makeSeg('Q–P','নতুন ভাগরেখা PQ',dist(Q,P),{cut:true}),
      makeSeg(`P–${aName}`,`${sideNames[prev]} ${sideKeys[prev]} (ভাগ অংশ)`,dist(P,A)),
      makeSeg(`${aName}–Q`,`ভাগের কর্ণ ${aName}Q`,dist(A,Q),{diagonal:true}),
      makeSeg(`${bName}–P`,`ভাগের কর্ণ ${bName}P`,dist(B,P),{diagonal:true})
    ];
    const remainSegments=[
      makeSeg(`Q–${rName}`,`${sideNames[n]} ${sideKeys[n]} (অবশিষ্ট অংশ)`,dist(Q,R)),
      makeSeg(`${rName}–${pSideName}`,`${sideNames[opposite]} ${sideKeys[opposite]} (পূর্ণ বাহু)`,dist(R,L)),
      makeSeg(`${pSideName}–P`,`${sideNames[prev]} ${sideKeys[prev]} (অবশিষ্ট অংশ)`,dist(L,P)),
      makeSeg('P–Q','নতুন ভাগরেখা PQ',dist(P,Q),{cut:true}),
      makeSeg(`P–${rName}`,`অবশিষ্ট অংশের কর্ণ P${rName}`,dist(P,R),{diagonal:true}),
      makeSeg(`Q–${pSideName}`,`অবশিষ্ট অংশের কর্ণ Q${pSideName}`,dist(Q,L),{diagonal:true})
    ];
    return {
      P,Q,t,direction,side:meta.key,sideLabel:meta.label,startLabel:meta.start,endLabel:meta.end,
      fraction:t,partArea:targetArea,cutName,cutLength:dist(P,Q),
      pSideIndex:prev,qSideIndex:n,oppositeIndex:opposite,targetPoly,remainPoly,
      targetSegments,remainSegments
    };
  }
  function findPartition(q,target,direction){
    // User-selected direction is authoritative. Do not silently switch to another side.
    return partitionForDirection(q,target,direction);
  }
  function dimensionTable(title,segments){
    return `<div class="qp-dimension-card"><h4>${esc(title)}</h4><div class="qp-dimension-list">${segments.map(s=>`<div class="qp-dimension-row"><span>${esc(s.label)}</span><strong>${ftIn(s.value)}</strong></div>`).join('')}</div></div>`;
  }
  const SIDE_KEYS=['north','east','south','west'];
  function cutEditor(part){
    const meta=SIDE_META[part.direction] || SIDE_META.north;
    const i=meta.i;
    const nextMeta=SIDE_META[SIDE_KEYS[(i+1)%4]];
    const prevMeta=SIDE_META[SIDE_KEYS[(i+3)%4]];
    const vals=[
      dist(part.targetPoly[0],part.targetPoly[1]),
      dist(part.targetPoly[1],part.targetPoly[2]),
      dist(part.targetPoly[2],part.targetPoly[3]),
      dist(part.targetPoly[3],part.targetPoly[0])
    ];
    const fields=[
      {label:`${meta.label} • ${meta.start}${meta.end} (মূল সীমানা — স্বয়ংক্রিয়)`,value:vals[0],readonly:true},
      {label:`${nextMeta.label} • ${meta.end}Q (এডিটযোগ্য)`,value:vals[1],readonly:false},
      {label:`ভাগরেখা • QP (স্বয়ংক্রিয়)`,value:vals[2],readonly:true},
      {label:`${prevMeta.label} • P${meta.start} (এডিটযোগ্য)`,value:vals[3],readonly:false}
    ];
    return `<div class="qp-cut-editor"><div class="qp-cut-editor-title">✂️ কর্তন/ভাগকৃত জমির ৪ দিকের ফুট–ইঞ্চি — সরাসরি এডিটযোগ্য</div><div class="qp-cut-editor-note">${esc(meta.label)} দিকের <strong>${esc(meta.start)}${esc(meta.end)}</strong> মূল জমির সীমানা থেকে স্বয়ংক্রিয়ভাবে থাকবে। <strong>${esc(meta.end)}–Q</strong> ও <strong>P–${esc(meta.start)}</strong> একসঙ্গে পরিবর্তন করা যাবে। তাদের নতুন অবস্থান মূল ${esc(nextMeta.key)} ও ${esc(prevMeta.key)} সীমানার ওপরই বসানো হবে। <strong>PQ</strong>, নতুন <strong>AQ</strong> এবং ক্ষেত্রফল স্বয়ংক্রিয়ভাবে পুনঃহিসাব হবে।</div><div class="qp-cut-grid">${fields.map((f,i)=>{const ft=Math.floor(f.value), inch=Number(((f.value-ft)*12).toFixed(2)); return `<div class="qp-cut-field"><label>${esc(f.label)}</label><div class="fi-row"><input id="qpCut${i}ft" type="number" min="0" step="any" value="${ft}" placeholder="ফুট" ${f.readonly?'readonly':''}><input id="qpCut${i}in" type="number" min="0" max="11.999" step="0.01" value="${inch || ''}" placeholder="ইঞ্চি" ${f.readonly?'readonly':''}></div></div>`}).join('')}</div><div class="qp-cut-actions"><button id="qpCutRecalc" type="button" class="calc-btn calc-primary">নতুন ক্ষেত্রফল</button></div><div id="qpCutLive" class="qp-cut-live"><span>মাপ পরিবর্তন করে “নতুন ক্ষেত্রফল” চাপুন।</span></div></div>`;
  }

  // Apply edited adjacent side lengths directly to the ORIGINAL parcel boundary.
  // This is the key geometry rule for the cut editor: the full selected side stays
  // fixed, Q stays on the next original boundary, P stays on the previous original
  // boundary, and PQ/AQ are derived from those two positions.
  function partitionFromEditedBoundary(q, part, vals){
    const meta=SIDE_META[part.direction] || SIDE_META.north;
    const i=meta.i, n=(i+1)%4, prev=(i+3)%4, opposite=(i+2)%4;
    const A=q.pts[i], B=q.pts[n], L=q.pts[prev], R=q.pts[opposite];
    const fullNext=dist(B,R), fullPrev=dist(A,L);
    const fullSelected=dist(A,B);
    const wantedNext=Number(vals[1]), wantedPrev=Number(vals[3]);
    if(!(fullNext>EPS&&fullPrev>EPS&&fullSelected>EPS&&wantedNext>0&&wantedPrev>0)) return null;
    if(wantedNext>fullNext+1e-7 || wantedPrev>fullPrev+1e-7) return null;

    const tq=wantedNext/fullNext;
    const tp=wantedPrev/fullPrev;
    const Q=interpolate(B,R,tq);
    const P=interpolate(A,L,tp);
    const targetPoly=[A,B,Q,P];
    const remainPoly=[P,Q,R,L];
    if(!isSimpleQuad(targetPoly) || !isSimpleQuad(remainPoly)) return null;
    if(!polygonIsInside(targetPoly,q.pts) || !polygonIsInside(remainPoly,q.pts)) return null;
    if(!polygonEdgesInside(targetPoly,q.pts) || !polygonEdgesInside(remainPoly,q.pts) || !segmentInsidePolygon(P,Q,q.pts)) return null;

    const targetArea=polygonArea(targetPoly), remainArea=polygonArea(remainPoly);
    if(!(targetArea>EPS) || Math.abs(targetArea+remainArea-q.area)>Math.max(1e-4,q.area*1e-10)) return null;

    const names=['A','B','C','D'];
    const aName=names[i], bName=names[n], pSideName=names[prev], rName=names[opposite];
    const sideNames=['উত্তর','পূর্ব','দক্ষিণ','পশ্চিম'];
    const sideKeys=['AB','BC','CD','DA'];
    const makeSeg=(name,label,value,extra={})=>({name,label,value,...extra});
    const targetSegments=[
      makeSeg(`${aName}–${bName}`,`${meta.label} ${meta.key} (পূর্ণ বাহু)`,dist(A,B)),
      makeSeg(`${bName}–Q`,`${sideNames[n]} ${sideKeys[n]} (ভাগ অংশ)`,dist(B,Q)),
      makeSeg('Q–P','নতুন ভাগরেখা PQ',dist(Q,P),{cut:true}),
      makeSeg(`P–${aName}`,`${sideNames[prev]} ${sideKeys[prev]} (ভাগ অংশ)`,dist(P,A)),
      makeSeg(`${aName}–Q`,`ভাগের কর্ণ ${aName}Q`,dist(A,Q),{diagonal:true}),
      makeSeg(`${bName}–P`,`ভাগের কর্ণ ${bName}P`,dist(B,P),{diagonal:true})
    ];
    const remainSegments=[
      makeSeg(`Q–${rName}`,`${sideNames[n]} ${sideKeys[n]} (অবশিষ্ট অংশ)`,dist(Q,R)),
      makeSeg(`${rName}–${pSideName}`,`${sideNames[opposite]} ${sideKeys[opposite]} (পূর্ণ বাহু)`,dist(R,L)),
      makeSeg(`${pSideName}–P`,`${sideNames[prev]} ${sideKeys[prev]} (অবশিষ্ট অংশ)`,dist(L,P)),
      makeSeg('P–Q','নতুন ভাগরেখা PQ',dist(P,Q),{cut:true}),
      makeSeg(`P–${rName}`,`অবশিষ্ট অংশের কর্ণ P${rName}`,dist(P,R),{diagonal:true}),
      makeSeg(`Q–${pSideName}`,`অবশিষ্ট অংশের কর্ণ Q${pSideName}`,dist(Q,L),{diagonal:true})
    ];
    return {
      ...part,
      P,Q,targetPoly,remainPoly,
      partArea:targetArea,cutLength:dist(P,Q),
      targetSegments,remainSegments,
      editedBoundary:true,
      editedTargetSides:[dist(A,B),dist(B,Q),dist(Q,P),dist(P,A)],
      editedTargetDiagonal:dist(A,Q),
      editedTarget:{poly:targetPoly,area:targetArea,diagonal:dist(A,Q),sides:[dist(A,B),dist(B,Q),dist(Q,P),dist(P,A)]}
    };
  }

  function bindCutEditor(part,q){
    const button=$('qpCutRecalc');
    const live=$('qpCutLive');
    if(!button) return;
    button.onclick=()=>{
      try{
        // Only the two boundary-adjacent lengths are user-editable. The full
        // selected side and PQ are derived geometry and therefore read-only.
        const next=readFI('qpCut1ft','qpCut1in');
        const prev=readFI('qpCut3ft','qpCut3in');
        if(next===null || prev===null || !(next>0) || !(prev>0)){
          if(live) live.innerHTML='<span class="qp-cut-error">এডিটযোগ্য দুই পাশের ফুট ও ইঞ্চির মান সঠিকভাবে দিন।</span>';
          return;
        }
        const vals=[dist(part.targetPoly[0],part.targetPoly[1]),next,dist(part.targetPoly[2],part.targetPoly[3]),prev];
        const recalculated=partitionFromEditedBoundary(q,part,vals);
        if(!recalculated){
          const meta=SIDE_META[part.direction] || SIDE_META.north;
          const fullNext=dist(q.pts[meta.i+1>3?0:meta.i+1],q.pts[(meta.i+2)%4]);
          const fullPrev=dist(q.pts[meta.i],q.pts[(meta.i+3)%4]);
          if(live) live.innerHTML=`<span class="qp-cut-error">নতুন মাপ মূল জমির সীমানার মধ্যে বসানো যাচ্ছে না। ${meta.label} দিকের সংলগ্ন দুই সীমানার সর্বোচ্চ মাপ যথাক্রমে ${ftIn(fullNext)} এবং ${ftIn(fullPrev)}।</span>`;
          return;
        }

        part.P=recalculated.P;
        part.Q=recalculated.Q;
        part.targetPoly=recalculated.targetPoly;
        part.remainPoly=recalculated.remainPoly;
        part.partArea=recalculated.partArea;
        part.cutLength=recalculated.cutLength;
        part.targetSegments=recalculated.targetSegments;
        part.remainSegments=recalculated.remainSegments;
        part.editedTarget=recalculated.editedTarget;
        part.editedTargetSides=recalculated.editedTargetSides;
        part.editedTargetArea=recalculated.partArea;
        part.editedTargetDiagonal=recalculated.editedTargetDiagonal;
        part.recalculatedPart=recalculated;

        const decimal=recalculated.partArea/SQFT_PER_DECIMAL;
        const liveArea=document.querySelector('.qp-live-area');
        if(liveArea) liveArea.innerHTML=`<strong>নতুন ক্ষেত্রফল:</strong> ${bn(recalculated.partArea)} বর্গফুট = ${bn(decimal)} শতাংশ<br><strong>নতুন কর্ণ AQ:</strong> ${ftIn(recalculated.editedTargetDiagonal)} &nbsp;•&nbsp; <strong>নতুন ভাগরেখা PQ:</strong> ${ftIn(recalculated.cutLength)}`;
        if(live) live.innerHTML=`<strong>নতুন ক্ষেত্রফল:</strong> ${bn(recalculated.partArea)} বর্গফুট = ${bn(decimal)} শতাংশ &nbsp;•&nbsp; <strong>নতুন AQ:</strong> ${ftIn(recalculated.editedTargetDiagonal)} &nbsp;•&nbsp; <strong>নতুন PQ:</strong> ${ftIn(recalculated.cutLength)}`;

        const cards=document.querySelectorAll('.qp-dimensions .qp-dimension-card');
        const remainingDecimal=(q.area-recalculated.partArea)/SQFT_PER_DECIMAL;
        if(cards[0]) cards[0].outerHTML=dimensionTable(`নতুন নির্ধারিত ভাগ (${bn(decimal)} শতাংশ)`,recalculated.targetSegments);
        if(cards[1]) cards[1].outerHTML=dimensionTable(`অবশিষ্ট জমি (${bn(remainingDecimal)} শতাংশ)`,recalculated.remainSegments);

        const oldDrawing=document.querySelector('.qp-drawing');
        if(oldDrawing) oldDrawing.outerHTML=makeDrawing(q,recalculated,recalculated.editedTarget);
      }catch(err){
        console.error('qpCutRecalc error:',err);
        if(live) live.innerHTML='<span class="qp-cut-error">নতুন ক্ষেত্রফল হিসাব করতে একটি সমস্যা হয়েছে। মাপগুলো আবার যাচাই করুন।</span>';
      }
    };
  }
  function makeDrawing(q, part, editedTarget=null) {
    // The calculation geometry is kept untouched. For Drawing only, reflect
    // mathematical Y so AB (North) is at the top, BC (East) is on the right,
    // CD (South) is at the bottom, and DA (West) is on the left.
    // After editing the four cut-parcel sides, the Drawing must use that exact
    // rebuilt target geometry; otherwise the labels are calculated from the old
    // P/Q positions and can show a different feet/inches value than the editor.
    const drawTargetPoly = editedTarget?.poly || part.targetPoly;
    const drawCutP = drawTargetPoly[3];
    const drawCutQ = drawTargetPoly[2];
    const all=[...q.pts, ...drawTargetPoly, part.P, part.Q].map(p=>[p[0],-p[1]]);
    let minX=Math.min(...all.map(p=>p[0])), maxX=Math.max(...all.map(p=>p[0])), minY=Math.min(...all.map(p=>p[1])), maxY=Math.max(...all.map(p=>p[1]));
    const padX=Math.max((maxX-minX)*0.045,18), padY=Math.max((maxY-minY)*0.055,18);
    minX-=padX; maxX+=padX; minY-=padY; maxY+=padY;
    const W=1200,H=820, scale=Math.min((W-90)/(maxX-minX),(H-90)/(maxY-minY));
    const tx=x=>35+(x-minX)*scale;
    const ty=y=>H-35-((-y)-minY)*scale;
    const P=q.pts.map(p=>[tx(p[0]),ty(p[1])]);
    const PP=[tx(drawCutP[0]),ty(drawCutP[1])], QQ=[tx(drawCutQ[0]),ty(drawCutQ[1])];
    const poly=P.map(p=>p.join(',')).join(' ');
    const [pA,pB,pC,pD]=P;
    const ts=drawTargetPoly.map(p=>[tx(p[0]),ty(p[1])]).map(p=>p.join(',')).join(' ');
    const rs=part.remainPoly.map(p=>[tx(p[0]),ty(p[1])]).map(p=>p.join(',')).join(' ');

    const clampAngle=a=>a>90?a-180:(a<-90?a+180:a);
    const dimLine=(a,b,text,offsetPx=24,opts={})=>{
      const dx=b[0]-a[0], dy=b[1]-a[1], len=Math.hypot(dx,dy)||1;
      const nx=-dy/len, ny=dx/len;
      const sign=opts.sideSign ?? 1;
      const ox=nx*offsetPx*sign, oy=ny*offsetPx*sign;
      const x1=a[0]+ox, y1=a[1]+oy, x2=b[0]+ox, y2=b[1]+oy;
      const mx=(x1+x2)/2, my=(y1+y2)/2;
      const ang=clampAngle(Math.atan2(dy,dx)*180/Math.PI);
      const dash=opts.dotted?' stroke-dasharray="7 6"':'';
      const lineColor=opts.color || '#58707a';
      const textColor=opts.textColor || '#082336';
      return `<g class="qp-dim-line"><line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${lineColor}" stroke-width="${opts.width||2}"${dash}/><line x1="${(a[0]+ox).toFixed(1)}" y1="${(a[1]+oy).toFixed(1)}" x2="${a[0].toFixed(1)}" y2="${a[1].toFixed(1)}" stroke="${lineColor}" stroke-width="1" opacity="0.65"/><line x1="${(b[0]+ox).toFixed(1)}" y1="${(b[1]+oy).toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${lineColor}" stroke-width="1" opacity="0.65"/><text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" transform="rotate(${ang.toFixed(2)} ${mx.toFixed(1)} ${my.toFixed(1)})" text-anchor="middle" dominant-baseline="central" font-size="21" font-weight="850" fill="${textColor}" paint-order="stroke" stroke="#fff" stroke-width="5" stroke-linejoin="round">${esc(text)}</text></g>`;
    };
    const sideLine=(a,b,label,value,offsetPx,sideSign=1)=>dimLine(a,b,`${label}: ${ftIn(value)}`,offsetPx,{sideSign,color:'#506d76'});
    const diagonalLine=(a,b,label,value,offsetPx,sideSign=1)=>dimLine(a,b,`${label}: ${ftIn(value)}`,offsetPx,{sideSign,dotted:true,color:'#7b6b9a',width:2});

    // Original parcel boundary and the two created parcels.
    const boundary=`<polygon points="${poly}" fill="#eef8f8" stroke="#08747b" stroke-width="3" stroke-linejoin="round"/>`;
    const targetFill=`<polygon points="${ts}" fill="#fff0bf" opacity="0.92" stroke="#d59b28" stroke-width="2" stroke-linejoin="round"/>`;
    const remainFill=`<polygon points="${rs}" fill="#eaf7f7" opacity="0.55" stroke="#08747b" stroke-width="1.5"/>`;
    const cut=`<line x1="${PP[0]}" y1="${PP[1]}" x2="${QQ[0]}" y2="${QQ[1]}" stroke="#c44f2b" stroke-width="4"/>`;

    // Draw ONLY the actual parcel boundary segments once. This prevents the
    // full BC/DA labels from sitting on top of their split segments.
    const dimParts=[];
    const addSeg=(a,b,label,value,off,sign=1)=>dimParts.push(sideLine(a,b,label,value,off,sign));
    const t=drawTargetPoly.map(p=>[tx(p[0]),ty(p[1])]);
    const r=part.remainPoly.map(p=>[tx(p[0]),ty(p[1])]);

    const meta=SIDE_META[part.direction] || SIDE_META.north;
    const i=meta.i;
    const nextMeta=SIDE_META[SIDE_KEYS[(i+1)%4]];
    const prevMeta=SIDE_META[SIDE_KEYS[(i+3)%4]];
    const oppositeMeta=SIDE_META[SIDE_KEYS[(i+2)%4]];
    const n0=meta.start, n1=meta.end;
    const nOppStart=oppositeMeta.start, nOppEnd=oppositeMeta.end;

    // Dimension text inside the Drawing contains only direction/segment names
    // and the actual feet/inches. No "অবশিষ্ট" wording is placed on the lines.
    // All four sides of the selected parcel are explicitly dimensioned.
    // The edited four lengths are the authoritative dimensions for the
    // selected parcel. Otherwise use the original calculated geometry.
    const targetSideValues=editedTarget?.sides || [
      dist(part.targetPoly[0],part.targetPoly[1]),
      dist(part.targetPoly[1],part.targetPoly[2]),
      part.cutLength,
      dist(part.targetPoly[3],part.targetPoly[0])
    ];
    addSeg(t[0],t[1],`${meta.label} ${meta.key}`,targetSideValues[0],24,-1);
    addSeg(t[1],t[2],`${nextMeta.label} ${n1}Q`,targetSideValues[1],22,-1);
    addSeg(t[2],t[3],`ভাগরেখা PQ`,targetSideValues[2],24,1);
    addSeg(t[3],t[0],`${prevMeta.label} P${n0}`,targetSideValues[3],22,1);

    // Remaining parcel boundary order is P-Q-R-L: PQ is the cut,
    // Q-R is on the next side, R-L is the opposite full side, and
    // L-P is on the previous side. Draw each actual outer segment once.
    addSeg(r[1],r[2],`${nextMeta.label} Q${nOppStart}`,dist(part.remainPoly[1],part.remainPoly[2]),22,-1);
    addSeg(r[2],r[3],`${oppositeMeta.label} ${nOppStart}${nOppEnd}`,dist(part.remainPoly[2],part.remainPoly[3]),24,1);
    addSeg(r[3],r[0],`${prevMeta.label} ${prevMeta.start}P`,dist(part.remainPoly[3],part.remainPoly[0]),22,1);

    // Original measured diagonals are reference lines; every diagonal is dotted
    // and carries a conventional feet/inches label aligned to that diagonal.
    const diagLines=[];
    diagLines.push(diagonalLine(pA,pC,'মূল কর্ণ AC',q.v.AC,28,-1));
    diagLines.push(diagonalLine(pB,pD,'মূল কর্ণ BD',dist(q.B,q.D),28,1));
    const A0=t[0], B0=t[1], Q0=t[2], P0=t[3];
    const aqValue=dist(part.targetPoly[0],part.targetPoly[2]);
    diagLines.push(diagonalLine(A0,Q0,editedTarget?'নতুন কর্ণ AQ':'৩% কর্ণ AQ',aqValue,20,-1));
    diagLines.push(diagonalLine(B0,P0,'৩% কর্ণ BP',dist(part.targetPoly[1],part.targetPoly[3]),20,1));
    const P1=r[0], Q1=r[1], R1=r[2], L1=r[3];
    diagLines.push(diagonalLine(P1,R1,'কর্ণ PC',dist(part.remainPoly[0],part.remainPoly[2]),20,1));
    diagLines.push(diagonalLine(Q1,L1,'কর্ণ QD',dist(part.remainPoly[1],part.remainPoly[3]),20,-1));

    const verts=[['A',pA],['B',pB],['C',pC],['D',pD],['P',PP],['Q',QQ]].map(([n,p])=>`<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#08747b"/><text x="${p[0]+9}" y="${p[1]-9}" font-size="24" font-weight="900" fill="#082336" paint-order="stroke" stroke="#fff" stroke-width="4">${n}</text>`).join('');
    const northArrow=`<g transform="translate(70 62)"><line x1="0" y1="30" x2="0" y2="0" stroke="#082336" stroke-width="3"/><path d="M0 0 L-7 11 L7 11 Z" fill="#082336"/><text x="0" y="48" text-anchor="middle" font-size="22" font-weight="900" fill="#082336">উত্তর</text></g>`;
    return `<div class="qp-drawing"><div class="qp-drawing-head">📐 ${q.type==='convex'?'উত্তল (Convex)':'অবতল (Concave)'} চতুর্ভূজ — ${esc(SIDE_META[part.direction].label)} দিক থেকে ${bn(part.partArea/SQFT_PER_DECIMAL)} শতাংশ ভাগের Drawing</div><div class="qp-drawing-meta">উত্তর উপরে • পূর্ব ডানে • দক্ষিণ নিচে • পশ্চিম বামে • প্রতিটি মাপ তার সংশ্লিষ্ট রেখার সমান্তরাল • কর্ণ ডটেড</div><div class="qp-svg-wrap"><svg class="qp-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="দিক নির্ধারণসহ দুইটি চতুর্ভূজে জমি ভাগের চিত্র">${boundary}${remainFill}${targetFill}${diagLines.join('')}${cut}${dimParts.join('')}${northArrow}${verts}</svg></div><div class="qp-drawing-legend"><span>🟨 নির্ধারিত ভাগ (${bn(part.partArea/SQFT_PER_DECIMAL)} শতাংশ)</span><span>⬜ অবশিষ্ট জমি (${bn((q.area-part.partArea)/SQFT_PER_DECIMAL)} শতাংশ)</span><span>┄ কর্ণ = ডটেড</span></div></div>`;
  }
  function calculate() {
    let v=sideValues();
    if (Object.values(v).some(x=>x===null || !(x>0))) return warning('উত্তর, পূর্ব, দক্ষিণ, পশ্চিম ও কর্ণ—সবগুলোর ফুট এবং ইঞ্চির সঠিক মান দিন। ইঞ্চি ০ থেকে ১১.৯৯-এর মধ্যে হতে হবে।');
    const wanted=$('qpShapeType')?.value || 'auto';
    const q=buildQuad(v,wanted);
    if (!q) return warning(wanted==='auto'
      ? 'দেওয়া চার বাহু ও AC কর্ণ দিয়ে বৈধ সরল অনিয়মিত চতুর্ভূজ তৈরি করা যাচ্ছে না। AB–BC–AC এবং AD–CD–AC—দুই ত্রিভুজের triangle inequality এবং জ্যামিতিক সংযোগ যাচাই করুন।'
      : `দেওয়া চার বাহু ও AC কর্ণ দিয়ে নির্বাচিত ${wanted==='convex'?'উত্তল':'অবতল'} চতুর্ভূজ তৈরি করা যাচ্ছে না। অন্য ধরনটি চেষ্টা করুন অথবা মাঠের মাপ পুনরায় যাচাই করুন।`);
    const target=targetSqft();
    if (!(target>0)) return warning('যে পরিমাণ জমি ভাগ করবেন সেটি দিন।');
    if (target >= q.area-EPS) return warning(`ভাগের পরিমাণ মোট জমির চেয়ে কম হতে হবে। মোট জমি ≈ ${bn(q.area)} বর্গফুট।`);
    const direction=$('qpPartitionDirection')?.value || 'north';
    const part=findPartition(q,target,direction);
    if(!part){
      const m=SIDE_META[direction];
      const max=trianglePointsArea(q.pts[m.i],q.pts[(m.i+1)%4],q.pts[(m.i+2)%4]);
      return warning(`${m.label} দিক থেকে নির্বাচিত পরিমাণ ভাগ করা যাচ্ছে না। ${m.label} দিকের এই ভাগ-পদ্ধতিতে সর্বোচ্চ প্রায় ${bn(max)} বর্গফুট (${bn(max/SQFT_PER_DECIMAL)} শতাংশ) পর্যন্ত নেওয়া যায়। প্রয়োজন হলে অন্য দিক নির্বাচন করুন বা মাঠের মাপ যাচাই করুন।`);
    }
    q.v=v;
    const targetDecimal=target/SQFT_PER_DECIMAL, remainingDecimal=(q.area-target)/SQFT_PER_DECIMAL;
    const typeBn=q.type==='convex'?'উত্তল (Convex)':'অবতল (Concave)';
    result.innerHTML=`<div class="qp-ok">হিসাব সফল হয়েছে। এটি <strong>অনিয়মিত ${typeBn} চতুর্ভূজ</strong> হিসেবে তৈরি করা হয়েছে। মোট জমি ≈ ${bn(q.area)} বর্গফুট (${bn(q.area/SQFT_PER_DECIMAL)} শতাংশ)। <strong>${esc(SIDE_META[direction].label)} দিক</strong> থেকে ${bn(targetDecimal)} শতাংশ আলাদা করা হয়েছে।</div>
      <div class="result-list"><div class="result-item result-item-primary"><strong>${bn(target)} বর্গফুট</strong><span>নির্ধারিত ভাগ = ${bn(targetDecimal)} শতাংশ</span></div><div class="result-item"><strong>${bn(remainingDecimal)} শতাংশ</strong><span>অবশিষ্ট জমি</span></div><div class="result-item"><strong>${ftIn(part.cutLength)}</strong><span>নতুন ভাগরেখা ${esc(part.cutName)}</span></div><div class="result-item"><strong>${esc(part.side)} বাহু</strong><span>P–Q নতুন ভাগরেখা দিয়ে সীমা নির্ধারিত হয়েছে</span></div></div>
      <div class="qp-dimensions"><div class="qp-dimensions-title">৩ শতাংশ/নির্ধারিত ভাগের আলাদা ফুট-ইঞ্চি মাপ — কর্ণ ও ভাগরেখাসহ</div>${dimensionTable(`নির্ধারিত ভাগ (${bn(targetDecimal)} শতাংশ)`,part.targetSegments)}${dimensionTable(`অবশিষ্ট জমি (${bn(remainingDecimal)} শতাংশ)`,part.remainSegments)}</div>
      ${editor(v,part,q)}${cutEditor(part)}${makeDrawing(q,part)}<p class="qp-note">⚠️ নির্বাচিত দিকের উপর P বিন্দু নির্ধারণ করে তার সংলগ্ন বিপরীত কোণে নতুন ভাগরেখা তৈরি করে নির্ধারিত ক্ষেত্রফল বের করা হয়েছে। Drawing-এ উত্তর উপরে, পূর্ব ডানে, দক্ষিণ নিচে এবং পশ্চিম বামে রাখা হয়েছে। নির্ধারিত ভাগ ও অবশিষ্ট জমির প্রতিটি অংশের আলাদা ফুট-ইঞ্চি মাপ এবং প্রযোজ্য কর্ণ দেখানো হয়েছে। মাঠে দাগ কাটার আগে বাস্তব সীমানা ও জরিপ মাপ যাচাই করুন।</p>`;
    bindEditor();
    bindCutEditor(part,q);
  }
  let editorTimer=null;
  function bindEditor(){
    for (const k of ['AB','BC','CD','DA','AC']) {
      [`qpEdit${k}ft`,`qpEdit${k}in`].forEach(id=>$(id)?.addEventListener('input',e=>{
        // Never redraw while the user is in the middle of typing. In particular,
        // 70 -> 7 -> 71 must not destroy the current drawing at the transient 7.
        clearTimeout(editorTimer);
        const active=e.currentTarget;
        const activeId=active.id;
        editorTimer=setTimeout(()=>{
          const v=readEditor();
          // Empty/temporary input keeps the existing drawing intact. The next
          // keystroke restarts the debounce timer.
          if(!v || Object.values(v).some(x=>x===null || !(x>0))) return;
          const selStart=active.selectionStart, selEnd=active.selectionEnd;
          for(const x of ['AB','BC','CD','DA','AC']) setFI(`qp${x}ft`,`qp${x}in`,v[x]);
          calculate();
          const next=$(activeId);
          if(next){ next.focus({preventScroll:true}); try{ next.setSelectionRange(selStart,selEnd); }catch(_){} }
        },700);
      }));
    }
  }
  function clear(){
    for(const k of ['AB','BC','CD','DA','AC']) { $(k==='AB'?'qpABft':`qp${k}ft`).value=''; $(k==='AB'?'qpABin':`qp${k}in`).value=''; }
    $('qpTarget').value=''; result.innerHTML='';
  }
  if (!$('qpCalc') || !result) return;
  $('qpCalc').onclick=calculate;
  document.querySelectorAll('[data-clear="quad-partition"]').forEach(b=>b.addEventListener('click',clear));
})();
