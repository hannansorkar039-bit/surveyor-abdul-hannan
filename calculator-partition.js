

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
  const SIDE_KEYS=['north','east','south','west'];
  const qpState={q:null,splits:[]};
  const SAVE_KEY='sah_quad_partition_multi_v1';
  let splitSeq=0;

  function splitParent(rec){
    if(!rec.parentId) return qpState.q;
    const parent=qpState.splits.find(x=>x.id===rec.parentId);
    return parent && parent.part ? {pts:parent.part.remainPoly, area:polygonArea(parent.part.remainPoly), type:'convex'} : null;
  }
  function partSideValues(part){
    return [
      dist(part.targetPoly[0],part.targetPoly[1]),
      dist(part.targetPoly[1],part.targetPoly[2]),
      dist(part.targetPoly[2],part.targetPoly[3]),
      dist(part.targetPoly[3],part.targetPoly[0])
    ];
  }
  function makeEditedPart(parentQ, rec){
    if(!rec.editNext || !rec.editPrev) return null;
    const base=findPartition(parentQ,rec.targetArea,rec.direction);
    if(!base) return null;
    const vals=[dist(base.targetPoly[0],base.targetPoly[1]),rec.editNext,dist(base.targetPoly[2],base.targetPoly[3]),rec.editPrev];
    return partitionFromEditedBoundary(parentQ,base,vals);
  }

  // Apply edited adjacent side lengths to a parcel. The full selected side and
  // the new cut line remain derived geometry; the two adjacent boundary pieces
  // are directly editable. This is also used by every later split.
  function partitionFromEditedBoundary(q, part, vals){
    const meta=SIDE_META[part.direction] || SIDE_META.north;
    const i=meta.i, n=(i+1)%4, prev=(i+3)%4;
    const A=q.pts[i], B=q.pts[n], L=q.pts[prev], R=q.pts[(i+2)%4];
    const fullNext=dist(B,R), fullPrev=dist(A,L), fullSelected=dist(A,B);
    const wantedNext=Number(vals[1]), wantedPrev=Number(vals[3]);
    if(!(fullNext>EPS&&fullPrev>EPS&&fullSelected>EPS&&wantedNext>0&&wantedPrev>0)) return null;
    if(wantedNext>fullNext+1e-7 || wantedPrev>fullPrev+1e-7) return null;
    const Q=interpolate(B,R,wantedNext/fullNext), P=interpolate(A,L,wantedPrev/fullPrev);
    const targetPoly=[A,B,Q,P], remainPoly=[P,Q,R,L];
    if(!isSimpleQuad(targetPoly) || !isSimpleQuad(remainPoly)) return null;
    if(!polygonIsInside(targetPoly,q.pts) || !polygonIsInside(remainPoly,q.pts)) return null;
    if(!polygonEdgesInside(targetPoly,q.pts) || !polygonEdgesInside(remainPoly,q.pts) || !segmentInsidePolygon(P,Q,q.pts)) return null;
    const targetArea=polygonArea(targetPoly), remainArea=polygonArea(remainPoly);
    if(!(targetArea>EPS) || Math.abs(targetArea+remainArea-q.area)>Math.max(1e-4,q.area*1e-10)) return null;
    const names=['A','B','C','D'], aName=names[i], bName=names[n], pSideName=names[(i+3)%4], rName=names[(i+2)%4];
    const sideNames=['উত্তর','পূর্ব','দক্ষিণ','পশ্চিম'], sideKeys=['AB','BC','CD','DA'];
    const makeSeg=(name,label,value,extra={})=>({name,label,value,...extra});
    const targetSegments=[
      makeSeg(`${aName}–${bName}`,`${meta.label} ${meta.key} (পূর্ণ বাহু)`,dist(A,B)),
      makeSeg(`${bName}–Q`,`${sideNames[n]} ${sideKeys[n]} (ভাগ অংশ)`,dist(B,Q)),
      makeSeg('Q–P','নতুন ভাগরেখা PQ',dist(Q,P),{cut:true}),
      makeSeg(`P–${aName}`,`${sideNames[(i+3)%4]} ${sideKeys[(i+3)%4]} (ভাগ অংশ)`,dist(P,A)),
      makeSeg(`${aName}–Q`,`ভাগের কর্ণ ${aName}Q`,dist(A,Q),{diagonal:true}),
      makeSeg(`${bName}–P`,`ভাগের কর্ণ ${bName}P`,dist(B,P),{diagonal:true})
    ];
    const remainSegments=[
      makeSeg(`Q–${rName}`,`${sideNames[n]} ${sideKeys[n]} (অবশিষ্ট অংশ)`,dist(Q,R)),
      makeSeg(`${rName}–${pSideName}`,`${sideNames[(i+2)%4]} ${sideKeys[(i+2)%4]} (পূর্ণ বাহু)`,dist(R,L)),
      makeSeg(`${pSideName}–P`,`${sideNames[(i+3)%4]} ${sideKeys[(i+3)%4]} (অবশিষ্ট অংশ)`,dist(L,P)),
      makeSeg('P–Q','নতুন ভাগরেখা PQ',dist(P,Q),{cut:true}),
      makeSeg(`P–${rName}`,`অবশিষ্ট অংশের কর্ণ P${rName}`,dist(P,R),{diagonal:true}),
      makeSeg(`Q–${pSideName}`,`অবশিষ্ট অংশের কর্ণ Q${pSideName}`,dist(Q,L),{diagonal:true})
    ];
    return {...part,P,Q,targetPoly,remainPoly,partArea:targetArea,cutLength:dist(P,Q),targetSegments,remainSegments,
      editedTarget:{poly:targetPoly,area:targetArea,diagonal:dist(A,Q),sides:[dist(A,B),dist(B,Q),dist(Q,P),dist(P,A)]},
      editedTargetDiagonal:dist(A,Q),editedTargetSides:[dist(A,B),dist(B,Q),dist(Q,P),dist(P,A)],editedBoundary:true};
  }

  function dimensionTable(title,segments){
    return `<div class="qp-dimension-card"><h4>${esc(title)}</h4><div class="qp-dimension-list">${segments.map(s=>`<div class="qp-dimension-row"><span>${esc(s.label)}</span><strong>${ftIn(s.value)}</strong></div>`).join('')}</div></div>`;
  }

  function makePartEditor(rec, index){
    const part=rec.part, meta=SIDE_META[rec.direction]||SIDE_META.north, i=meta.i;
    const nextMeta=SIDE_META[SIDE_KEYS[(i+1)%4]], prevMeta=SIDE_META[SIDE_KEYS[(i+3)%4]];
    const vals=partSideValues(part);
    const next=rec.editNext ?? vals[1], prev=rec.editPrev ?? vals[3];
    const inputs=[
      {label:`${meta.label} • ${meta.start}${meta.end} (মূল সীমানা — স্বয়ংক্রিয়)`,v:vals[0],ro:true},
      {label:`${nextMeta.label} • ${meta.end}Q (এডিটযোগ্য)`,v:next,ro:false},
      {label:`ভাগরেখা • QP (স্বয়ংক্রিয়)`,v:vals[2],ro:true},
      {label:`${prevMeta.label} • P${meta.start} (এডিটযোগ্য)`,v:prev,ro:false}
    ];
    const fields=inputs.map((f,j)=>{let ft=Math.floor(f.v),inch=Number(((f.v-ft)*12).toFixed(2));if(inch>=11.995){ft++;inch=0;}return `<div class="qp-cut-field"><label>${esc(f.label)}</label><div class="fi-row"><input id="qpSplit${rec.id}_${j}ft" type="number" min="0" step="any" value="${ft}" placeholder="ফুট" ${f.ro?'readonly':''}><input id="qpSplit${rec.id}_${j}in" type="number" min="0" max="11.999" step="0.01" value="${inch||''}" placeholder="ইঞ্চি" ${f.ro?'readonly':''}></div></div>`}).join('');
    return `<div class="qp-cut-editor qp-split-editor" data-split-id="${rec.id}"><div class="qp-cut-editor-title">✂️ ${index+1} নং ভাগকৃত প্লট — ৪ দিকের ফুট–ইঞ্চি</div><div class="qp-cut-editor-note">${esc(meta.label)} দিকের মূল বাহু স্থির থাকবে। সংলগ্ন দুই অংশ সরাসরি এডিট করা যাবে। <strong>নতুন ক্ষেত্রফল</strong> চাপলে এই প্লটের Drawing ও ক্ষেত্রফল আপডেট হবে এবং এর পরের সব ভাগও একই Drawing-এ স্বয়ংক্রিয়ভাবে পুনর্গণনা হবে।</div><div class="qp-cut-grid">${fields}</div><div class="qp-cut-actions"><button id="qpRecalcSplit${rec.id}" type="button" class="calc-btn calc-primary">নতুন ক্ষেত্রফল</button></div><div id="qpLiveSplit${rec.id}" class="qp-cut-live"><span>${rec.notice?esc(rec.notice):'মাপ পরিবর্তন করে “নতুন ক্ষেত্রফল” চাপুন।'}</span></div></div>`;
  }

  function makeNextSplitControls(){
    const remain=qpState.splits.length?qpState.splits[qpState.splits.length-1].part?.remainPoly:null;
    if(!remain) return '';
    const area=polygonArea(remain), remainingAfter=area/SQFT_PER_DECIMAL;
    return `<div class="qp-multi-controls"><div class="qp-multi-title">➕ অবশিষ্ট জমি থেকে আরো প্লট / ভাগ যোগ করুন</div><div class="qp-multi-grid"><div class="calc-field"><label for="qpNextTarget">পরবর্তী ভাগের পরিমাণ</label><input id="qpNextTarget" type="number" min="0" step="any" placeholder="যেমন 2"></div><div class="calc-field"><label for="qpNextUnit">একক</label><select id="qpNextUnit"><option value="decimal">শতাংশ / ডেসিমেল</option><option value="sqft">বর্গফুট</option><option value="sqm">বর্গমিটার</option></select></div><div class="calc-field"><label for="qpNextDirection">পরবর্তী ভাগ কোন দিক থেকে হবে</label><select id="qpNextDirection"><option value="north">উত্তর দিক</option><option value="east">পূর্ব দিক</option><option value="south">দক্ষিণ দিক</option><option value="west">পশ্চিম দিক</option></select></div></div><div class="qp-multi-actions"><button id="qpAddSplit" type="button" class="calc-btn calc-primary">আরেকটি ভাগ যোগ করুন</button><button id="qpSave" type="button" class="calc-btn calc-secondary">💾 সেভ করুন</button><button id="qpPdf" type="button" class="calc-btn calc-secondary">📄 PDF করুন</button></div><div class="qp-multi-note">বর্তমান অবশিষ্ট জমি ≈ <strong>${bn(remainingAfter)} শতাংশ</strong>। নতুন ভাগ যোগ হলে আগের সব প্লট অপরিবর্তিত থাকবে। পরে আগের কোনো প্লটের মাপ বদলালে তার পরের প্লটগুলো স্বয়ংক্রিয়ভাবে নতুন Drawing অনুযায়ী বসবে।</div></div>`;
  }

  function makeMultiDrawing(){
    if(!qpState.q || !qpState.splits.length) return '';
    const q=qpState.q;
    const valid=qpState.splits.filter(r=>r.part);
    if(!valid.length) return '';
    const allPts=[...q.pts];
    valid.forEach(r=>{allPts.push(...r.part.targetPoly);});
    // Only the FINAL remaining parcel is dimensioned once. Earlier remaining
    // parcels are not separate plots and their dimensions must not overlap the
    // dimensions of later plots.
    const finalRemain=valid[valid.length-1].part.remainPoly;
    allPts.push(...finalRemain);

    const drawPts=allPts.map(p=>[p[0],-p[1]]);
    let minX=Math.min(...drawPts.map(p=>p[0])),maxX=Math.max(...drawPts.map(p=>p[0])),minY=Math.min(...drawPts.map(p=>p[1])),maxY=Math.max(...drawPts.map(p=>p[1]));
    const padX=Math.max((maxX-minX)*.09,55),padY=Math.max((maxY-minY)*.09,55);
    minX-=padX;maxX+=padX;minY-=padY;maxY+=padY;
    const W=2600,H=1750,scale=Math.min((W-260)/(maxX-minX),(H-260)/(maxY-minY));
    const tx=x=>130+(x-minX)*scale, ty=y=>H-130-((-y)-minY)*scale;
    const poly=pts=>pts.map(p=>`${tx(p[0]).toFixed(1)},${ty(p[1]).toFixed(1)}`).join(' ');
    const clampAngle=a=>a>90?a-180:(a<-90?a+180:a);
    const dimLine=(a,b,text,offset=48,sign=1,dotted=false,color='#526a73',font=40)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;
      const nx=-dy/len,ny=dx/len,ox=nx*offset*sign,oy=ny*offset*sign;
      const x1=a[0]+ox,y1=a[1]+oy,x2=b[0]+ox,y2=b[1]+oy,mx=(x1+x2)/2,my=(y1+y2)/2;
      const ang=clampAngle(Math.atan2(dy,dx)*180/Math.PI);
      const dash=dotted?' stroke-dasharray="12 10"':'';
      return `<g class="qp-dim-line"><line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${dotted?3:2.8}"${dash}/><line x1="${(a[0]+ox).toFixed(1)}" y1="${(a[1]+oy).toFixed(1)}" x2="${a[0].toFixed(1)}" y2="${a[1].toFixed(1)}" stroke="${color}" stroke-width="1.6" opacity=".7"/><line x1="${(b[0]+ox).toFixed(1)}" y1="${(b[1]+oy).toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${color}" stroke-width="1.6" opacity=".7"/><text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" transform="rotate(${ang.toFixed(2)} ${mx.toFixed(1)} ${my.toFixed(1)})" text-anchor="middle" dominant-baseline="central" font-size="${(font*0.5).toFixed(1)}" font-weight="900" fill="#082336" paint-order="stroke" stroke="#fff" stroke-width="4.5" stroke-linejoin="round">${esc(text)}</text></g>`;
    };
    const northArrow=`<g transform="translate(120 115)"><line x1="0" y1="62" x2="0" y2="0" stroke="#082336" stroke-width="6"/><path d="M0 0 L-14 22 L14 22 Z" fill="#082336"/><text x="0" y="92" text-anchor="middle" font-size="18" font-weight="900" fill="#082336">উত্তর</text></g>`;
    const colors=['#fff0bf','#e8f6e8','#eaf1ff','#f7eafa','#ffe9e0','#e9f7f7','#f3f0d9'];
    const layers=[],labels=[],dims=[];
    layers.push(`<polygon points="${poly(q.pts)}" fill="#f7fbfc" stroke="#08747b" stroke-width="7" stroke-linejoin="round"/>`);

    // Each split plot gets ONLY its own dimensions.
    valid.forEach((rec,idx)=>{
      const t=rec.part.targetPoly;
      layers.push(`<polygon points="${poly(t)}" fill="${colors[idx%colors.length]}" opacity=".92" stroke="#b27a1f" stroke-width="4" stroke-linejoin="round"/>`);
      const cx=t.reduce((s,p)=>s+p[0],0)/t.length, cy=t.reduce((s,p)=>s+p[1],0)/t.length;
      labels.push(`<text x="${tx(cx).toFixed(1)}" y="${ty(cy).toFixed(1)}" text-anchor="middle" font-size="18" font-weight="950" fill="#082336" paint-order="stroke" stroke="#fff" stroke-width="4.5">প্লট ${bn(idx+1)} — ${bn(rec.part.partArea/SQFT_PER_DECIMAL)} শতাংশ</text>`);
      const tp=t.map(p=>[tx(p[0]),ty(p[1])]);
      const sv=partSideValues(rec.part);
      const sideMeta=SIDE_META[rec.direction]||SIDE_META.north;
      dims.push(dimLine(tp[0],tp[1],`প্লট ${bn(idx+1)} ${sideMeta.label}: ${ftIn(sv[0])}`,55,-1,false,'#7b6b4b',40));
      dims.push(dimLine(tp[1],tp[2],`প্লট ${bn(idx+1)} পূর্ব: ${ftIn(sv[1])}`,48,-1,false,'#526a73',38));
      dims.push(dimLine(tp[2],tp[3],`প্লট ${bn(idx+1)} ভাগরেখা: ${ftIn(sv[2])}`,50,1,true,'#c44f2b',39));
      dims.push(dimLine(tp[3],tp[0],`প্লট ${bn(idx+1)} পশ্চিম: ${ftIn(sv[3])}`,48,1,false,'#526a73',38));
      dims.push(dimLine(tp[0],tp[2],`প্লট ${bn(idx+1)} কর্ণ: ${ftIn(dist(t[0],t[2]))}`,42,-1,true,'#75629b',37));
      dims.push(dimLine(tp[1],tp[3],`প্লট ${bn(idx+1)} কর্ণ: ${ftIn(dist(t[1],t[3]))}`,42,1,true,'#75629b',37));
      layers.push(`<line x1="${tp[2][0]}" y1="${tp[2][1]}" x2="${tp[3][0]}" y2="${tp[3][1]}" stroke="#c44f2b" stroke-width="7"/>`);
    });

    // Final remaining parcel gets its own separate dimension set, exactly once.
    const r=finalRemain, rp=r.map(p=>[tx(p[0]),ty(p[1])]);
    const finalArea=polygonArea(r);
    dims.push(dimLine(rp[0],rp[1],`অবশিষ্ট জমি উত্তর: ${ftIn(dist(r[0],r[1]))}`,72,1,false,'#08747b',42));
    dims.push(dimLine(rp[1],rp[2],`অবশিষ্ট জমি পূর্ব: ${ftIn(dist(r[1],r[2]))}`,64,1,false,'#08747b',40));
    dims.push(dimLine(rp[2],rp[3],`অবশিষ্ট জমি দক্ষিণ: ${ftIn(dist(r[2],r[3]))}`,72,-1,false,'#08747b',42));
    dims.push(dimLine(rp[3],rp[0],`অবশিষ্ট জমি পশ্চিম: ${ftIn(dist(r[3],r[0]))}`,64,-1,false,'#08747b',40));
    dims.push(dimLine(rp[0],rp[2],`অবশিষ্ট জমি কর্ণ: ${ftIn(dist(r[0],r[2]))}`,54,1,true,'#75629b',38));
    dims.push(dimLine(rp[1],rp[3],`অবশিষ্ট জমি কর্ণ: ${ftIn(dist(r[1],r[3]))}`,54,-1,true,'#75629b',38));
    labels.push(`<text x="${tx(r.reduce((s,p)=>s+p[0],0)/r.length).toFixed(1)}" y="${ty(r.reduce((s,p)=>s+p[1],0)/r.length).toFixed(1)}" text-anchor="middle" font-size="19" font-weight="950" fill="#08747b" paint-order="stroke" stroke="#fff" stroke-width="5">চূড়ান্ত অবশিষ্ট জমি — ${bn(finalArea/SQFT_PER_DECIMAL)} শতাংশ</text>`);

    const outerLabels=[['A',q.pts[0]],['B',q.pts[1]],['C',q.pts[2]],['D',q.pts[3]]].map(([n,p])=>`<circle cx="${tx(p[0]).toFixed(1)}" cy="${ty(p[1]).toFixed(1)}" r="9" fill="#08747b"/><text x="${(tx(p[0])+18).toFixed(1)}" y="${(ty(p[1])-18).toFixed(1)}" font-size="19" font-weight="950" fill="#082336" paint-order="stroke" stroke="#fff" stroke-width="4.5">${n}</text>`).join('');
    return `<div class="qp-drawing qp-multi-drawing"><div class="qp-drawing-head">📐 সবগুলো প্লট / ভাগ — একই মূল জমির Drawing (${bn(valid.length)}টি ভাগ)</div><div class="qp-drawing-meta">উত্তর উপরে • পূর্ব ডানে • দক্ষিণ নিচে • পশ্চিম বামে • প্রত্যেক প্লটের Dimension আলাদা • চূড়ান্ত অবশিষ্ট জমির Dimension আলাদা • কর্ণ ডটেড</div><div class="qp-svg-wrap"><svg id="qpMultiSvg" class="qp-svg qp-svg-large" viewBox="0 0 ${W} ${H}" role="img" aria-label="একই Drawing-এ একাধিক জমি ভাগ">${layers.join('')}${dims.join('')}${labels.join('')}${outerLabels}${northArrow}</svg></div><div class="qp-drawing-legend"><span>🟨/🟩/🟦/🟪 আলাদা প্লট</span><span>🟥 লাল রেখা = ভাগরেখা</span><span>┄ কর্ণ = ডটেড</span></div></div>`;
  }

  function renderMultiResult(message=''){
    if(!qpState.q) return;
    const valid=qpState.splits.filter(r=>r.part);
    const total=qpState.q.area, used=valid.reduce((s,r)=>s+r.part.partArea,0), remain=total-used;
    let html=`<div class="qp-ok">হিসাব সফল। মোট জমি ≈ <strong>${bn(total)} বর্গফুট (${bn(total/SQFT_PER_DECIMAL)} শতাংশ)</strong>। বর্তমানে <strong>${bn(valid.length)}টি প্লট/ভাগ</strong> তৈরি হয়েছে। মোট ভাগ ≈ ${bn(used/SQFT_PER_DECIMAL)} শতাংশ এবং অবশিষ্ট ≈ ${bn(remain/SQFT_PER_DECIMAL)} শতাংশ।</div>`;
    if(message) html+=`<div class="qp-warning" style="margin-top:10px">${esc(message)}</div>`;
    html+=`<div class="qp-split-list">`;
    valid.forEach((rec,idx)=>{
      const dec=rec.part.partArea/SQFT_PER_DECIMAL;
      html+=`<div class="qp-split-card" id="qpSplitCard${rec.id}"><div class="qp-split-card-head"><strong>✂️ প্লট / ভাগ ${bn(idx+1)}</strong><span>${esc(SIDE_META[rec.direction].label)} দিক থেকে • ${bn(dec)} শতাংশ</span></div><div class="result-list"><div class="result-item"><strong>${bn(rec.part.partArea)} বর্গফুট</strong><span>নতুন প্লটের ক্ষেত্রফল</span></div><div class="result-item"><strong>${ftIn(rec.part.cutLength)}</strong><span>নতুন ভাগরেখা PQ</span></div></div><div class="qp-dimensions">${dimensionTable(`প্লট ${bn(idx+1)} — ${bn(dec)} শতাংশ`,rec.part.targetSegments)}${dimensionTable(`এই ভাগের পর অবশিষ্ট অংশ`,rec.part.remainSegments)}</div>${makePartEditor(rec,idx)}</div>`;
    });
    html+=`</div>${makeNextSplitControls()}${makeMultiDrawing()}<div class="qp-save-status" id="qpSaveStatus">${localStorage.getItem(SAVE_KEY)?'💾 এই হিসাবের একটি সেভ কপি এই ডিভাইসে আছে।':'💾 সেভ করতে “সেভ করুন” চাপুন।'}</div>`;
    result.innerHTML=html;
    bindMultiButtons();
  }

  function bindMultiButtons(){
    qpState.splits.forEach((rec)=>{
      const b=$(`qpRecalcSplit${rec.id}`); if(b) b.onclick=()=>recalcSplit(rec.id);
    });
    const add=$('qpAddSplit'); if(add) add.onclick=addAnotherSplit;
    const save=$('qpSave'); if(save) save.onclick=saveMulti;
    const pdf=$('qpPdf'); if(pdf) pdf.onclick=pdfMulti;
  }

  function recalcSplit(id){
    const idx=qpState.splits.findIndex(r=>r.id===id); if(idx<0) return;
    const rec=qpState.splits[idx], parent=idx===0?qpState.q:qpState.splits[idx-1].part?{pts:qpState.splits[idx-1].part.remainPoly,area:polygonArea(qpState.splits[idx-1].part.remainPoly),type:'convex'}:null;
    if(!parent){renderMultiResult('আগের ভাগের জ্যামিতি সঠিক নেই, তাই এই ভাগ আপডেট করা যায়নি।');return;}
    const next=readFI(`qpSplit${id}_1ft`,`qpSplit${id}_1in`), prev=readFI(`qpSplit${id}_3ft`,`qpSplit${id}_3in`);
    if(next===null||prev===null||!(next>0)||!(prev>0)){renderMultiResult('এডিটযোগ্য দুই পাশের ফুট ও ইঞ্চির মান সঠিকভাবে দিন।');return;}
    rec.editNext=next; rec.editPrev=prev;
    const base=findPartition(parent,rec.targetArea,rec.direction);
    if(!base){renderMultiResult('এই ভাগের নির্ধারিত ক্ষেত্রফল বর্তমান অবশিষ্ট জমির মধ্যে আর বসানো যাচ্ছে না।');return;}
    const edited=partitionFromEditedBoundary(parent,base,[partSideValues(base)[0],next,partSideValues(base)[2],prev]);
    if(!edited){renderMultiResult('নতুন মাপ বর্তমান অবশিষ্ট জমির সীমানার মধ্যে বসানো যাচ্ছে না।');return;}
    rec.part=edited; rec.targetArea=edited.partArea; rec.notice='আপডেট হয়েছে। এর পরের ভাগগুলোও স্বয়ংক্রিয়ভাবে নতুন Drawing অনুযায়ী হিসাব হচ্ছে।';
    // Every later split is recalculated from the newly changed remaining parcel.
    let warningMsg='';
    for(let j=idx+1;j<qpState.splits.length;j++){
      const child=qpState.splits[j], p=qpState.splits[j-1].part?{pts:qpState.splits[j-1].part.remainPoly,area:polygonArea(qpState.splits[j-1].part.remainPoly),type:'convex'}:null;
      if(!p){child.part=null;warningMsg=`${j+1} নং ভাগের জন্য আগের অবশিষ্ট জমি পাওয়া যায়নি।`;break;}
      let np=null;
      if(child.editNext&&child.editPrev){const baseChild=findPartition(p,child.targetArea,child.direction);if(baseChild) np=partitionFromEditedBoundary(p,baseChild,[partSideValues(baseChild)[0],child.editNext,partSideValues(baseChild)[2],child.editPrev]);}
      if(!np) np=findPartition(p,child.targetArea,child.direction);
      if(!np){child.part=null;warningMsg=`${j+1} নং ভাগের ${bn(child.targetArea/SQFT_PER_DECIMAL)} শতাংশ বর্তমান অবশিষ্ট জমিতে বসানো যাচ্ছে না। আগের ভাগের মাপ ঠিক করুন।`;break;}
      child.part=np;
    }
    renderMultiResult(warningMsg);
  }

  function addAnotherSplit(){
    if(!qpState.splits.length) return;
    const input=$('qpNextTarget'), unit=$('qpNextUnit'), dir=$('qpNextDirection');
    const x=Number(input?.value||0); if(!(x>0)){renderMultiResult('পরবর্তী ভাগের পরিমাণ দিন।');return;}
    const remain=qpState.splits[qpState.splits.length-1].part?.remainPoly;
    if(!remain){renderMultiResult('বর্তমান অবশিষ্ট জমির Drawing সঠিক নয়।');return;}
    const area=polygonArea(remain), u=unit?.value||'decimal', target=u==='sqft'?x:u==='sqm'?x*10.763910416709722:x*SQFT_PER_DECIMAL;
    if(!(target>0) || target>=area-EPS){renderMultiResult(`পরবর্তী ভাগের পরিমাণ অবশিষ্ট জমির চেয়ে কম হতে হবে। অবশিষ্ট ≈ ${bn(area/SQFT_PER_DECIMAL)} শতাংশ।`);return;}
    const parent={pts:remain,area,type:'convex'}, direction=dir?.value||'north';
    const part=findPartition(parent,target,direction);
    if(!part){renderMultiResult('নির্বাচিত দিক থেকে এই পরিমাণ নতুন প্লট তৈরি করা যাচ্ছে না। অন্য দিক বা কম ক্ষেত্রফল দিন।');return;}
    const rec={id:++splitSeq,parentId:qpState.splits[qpState.splits.length-1].id,direction,targetArea:target,part,editNext:null,editPrev:null};
    qpState.splits.push(rec); renderMultiResult();
  }

  function saveMulti(){
    try{
      const data={
        version:2,
        savedAt:new Date().toISOString(),
        inputs:{
          ABft:$('qpABft')?.value||'',ABin:$('qpABin')?.value||'',
          BCft:$('qpBCft')?.value||'',BCin:$('qpBCin')?.value||'',
          CDft:$('qpCDft')?.value||'',CDin:$('qpCDin')?.value||'',
          DAft:$('qpDAft')?.value||'',DAin:$('qpDAin')?.value||'',
          ACft:$('qpACft')?.value||'',ACin:$('qpACin')?.value||'',
          shape:$('qpShapeType')?.value||'auto',
          target:$('qpTarget')?.value||'',
          targetUnit:$('qpTargetUnit')?.value||'decimal',
          direction:$('qpPartitionDirection')?.value||'north'
        },
        splits:qpState.splits.map(r=>({
          id:r.id,parentId:r.parentId,direction:r.direction,
          targetArea:r.targetArea,editNext:r.editNext,editPrev:r.editPrev
        }))
      };
      const json=JSON.stringify(data,null,2);
      localStorage.setItem(SAVE_KEY,json);

      // Also create a real file so “সেভ করুন” works as a downloadable backup.
      const blob=new Blob([json],{type:'application/json;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download='চতুর্ভূজ-ভাগ-বণ্টন-হিসাব.json';
      a.style.display='none';
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},1000);

      const status=$('qpSaveStatus');
      if(status) status.textContent='✅ হিসাব সেভ হয়েছে এবং একটি ব্যাকআপ ফাইল ডাউনলোড হয়েছে।';
    }catch(e){
      console.error(e);
      const s=$('qpSaveStatus');
      if(s)s.textContent='❌ সেভ করা যায়নি। আবার চেষ্টা করুন।';
    }
  }

  function pdfMulti(){
    try{
      const svg=$('qpMultiSvg');
      if(!svg){ alert('Drawing পাওয়া যায়নি। আগে ভাগের হিসাব করুন।'); return; }

      // Android Chrome-এর print engine অনেক সময় off-screen/hidden SVG render করে না।
      // তাই PDF-এর জন্য Drawing-টিকে একটি self-contained SVG data-image হিসেবে
      // আলাদা print window-তে পাঠানো হচ্ছে। মূল ওয়েবসাইট/Drawing অপরিবর্তিত থাকে।
      const svgClone=svg.cloneNode(true);
      svgClone.removeAttribute('id');
      svgClone.setAttribute('xmlns','http://www.w3.org/2000/svg');
      svgClone.setAttribute('xmlns:xlink','http://www.w3.org/1999/xlink');
      svgClone.setAttribute('width','100%');
      svgClone.setAttribute('height','100%');
      svgClone.setAttribute('preserveAspectRatio','xMidYMid meet');
      const svgText=new XMLSerializer().serializeToString(svgClone);
      const svgData='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgText);

      const total=qpState.q?.area||0;
      const valid=qpState.splits.filter(r=>r.part);
      const used=valid.reduce((sum,r)=>sum+r.part.partArea,0);
      const remain=Math.max(0,total-used);

      let partsHtml='';
      valid.forEach((rec,idx)=>{
        const dec=rec.part.partArea/SQFT_PER_DECIMAL;
        partsHtml+=`<section class="part"><h3>প্লট / ভাগ ${bn(idx+1)} — ${bn(dec)} শতাংশ — ${esc((SIDE_META[rec.direction]||SIDE_META.north).label)} দিক থেকে</h3>`;
        partsHtml+=`<div class="result"><div><b>ক্ষেত্রফল</b><span>${bn(rec.part.partArea)} বর্গফুট</span></div><div><b>ভাগরেখা PQ</b><span>${ftIn(rec.part.cutLength)}</span></div></div>`;
        partsHtml+=`<div class="dims"><h4>শুধু প্লট ${bn(idx+1)}-এর Dimension</h4>`;
        rec.part.targetSegments.forEach(seg=>{partsHtml+=`<div class="row"><span>${esc(seg.label)}</span><strong>${ftIn(seg.value)}</strong></div>`;});
        partsHtml+=`</div></section>`;
      });

      if(valid.length){
        const r=valid[valid.length-1].part.remainPoly;
        // Final remaining parcel only — it must not reuse any previous plot's dimensions.
        const rs=[
          ['উত্তর',dist(r[0],r[1])],['পূর্ব',dist(r[1],r[2])],
          ['দক্ষিণ',dist(r[2],r[3])],['পশ্চিম',dist(r[3],r[0])],
          ['কর্ণ ১',dist(r[0],r[2])],['কর্ণ ২',dist(r[1],r[3])]
        ];
        partsHtml+=`<section class="part remaining"><h3>চূড়ান্ত অবশিষ্ট জমি — ${bn(remain/SQFT_PER_DECIMAL)} শতাংশ</h3><div class="dims"><h4>অবশিষ্ট জমির আলাদা Dimension</h4>`;
        rs.forEach(([label,val])=>{partsHtml+=`<div class="row"><span>অবশিষ্ট জমি — ${esc(label)}</span><strong>${ftIn(val)}</strong></div>`;});
        partsHtml+=`</div></section>`;
      }

      const w=window.open('', '_blank');
      if(!w){
        alert('PDF পেজ খোলা যায়নি। ব্রাউজারের pop-up অনুমতি দিন এবং আবার PDF করুন চাপুন।');
        return;
      }

      const doc=w.document;
      doc.open();
      doc.write(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>চতুর্ভূজ জমি ভাগ-বণ্টন</title><style>
        @page{size:A4 portrait;margin:7mm}
        *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
        html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,'Noto Sans Bengali',sans-serif}
        .page{width:196mm;height:283mm;overflow:hidden;background:#fff;break-after:page;page-break-after:always;position:relative}
        .page:last-child{break-after:auto;page-break-after:auto}
        .title{font-size:18px;font-weight:800;text-align:center;margin:0 0 2mm;color:#082336}
        .sub{font-size:9px;text-align:center;margin-bottom:2mm;color:#526a73}
        .drawing{width:196mm;height:270mm;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff}
        .drawing img{display:block;width:196mm;height:270mm;object-fit:contain}
        .summary{font-size:10px;line-height:1.35;border:1px solid #999;padding:2mm;margin-bottom:2mm}
        .parts{display:grid;grid-template-columns:1fr 1fr;gap:2mm;align-items:start}
        .part{border:1px solid #999;padding:1.7mm;margin:0;break-inside:avoid;page-break-inside:avoid}
        .part h3{font-size:9.5px;line-height:1.25;margin:0 0 1.2mm}
        .result{display:grid;grid-template-columns:1fr 1fr;gap:1mm;margin-bottom:1mm}
        .result>div{border:1px solid #ddd;padding:1.2mm;display:flex;justify-content:space-between;gap:2mm;font-size:8px}
        .dims{border:1px solid #ddd;padding:1mm;margin-top:1mm;break-inside:avoid;page-break-inside:avoid}
        .dims h4{font-size:8.5px;margin:0 0 .5mm}
        .row{display:flex;justify-content:space-between;gap:2mm;padding:.65mm .5mm;border-top:1px solid #eee;font-size:7.5px;line-height:1.15}
        .row strong{white-space:nowrap;font-size:8px}
        .remaining{grid-column:1/-1}
        @media print{body{background:#fff}.page{height:283mm}}
      </style></head><body>
        <section class="page">
          <div class="title">চতুর্ভূজ জমি ভাগ-বণ্টন — সম্পূর্ণ Drawing</div>
          <div class="sub">উত্তর উপরে • পূর্ব ডানে • দক্ষিণ নিচে • পশ্চিম বামে</div>
          <div class="drawing"><img id="printDrawing" src="${svgData}" alt="সম্পূর্ণ জমি ভাগের Drawing"></div>
        </section>
        <section class="page">
          <div class="title">চতুর্ভূজ জমি ভাগ-বণ্টন — প্রত্যেক প্লটের আলাদা হিসাব</div>
          <div class="summary">মোট জমি: <b>${bn(total)} বর্গফুট (${bn(total/SQFT_PER_DECIMAL)} শতাংশ)</b> • মোট ভাগ: <b>${bn(valid.length)}টি</b> • ভাগকৃত: <b>${bn(used/SQFT_PER_DECIMAL)} শতাংশ</b> • চূড়ান্ত অবশিষ্ট: <b>${bn(remain/SQFT_PER_DECIMAL)} শতাংশ</b></div>
          <div class="parts">${partsHtml}</div>
        </section>
      </body></html>`);
      doc.close();

      const printNow=()=>{try{w.focus();setTimeout(()=>{w.print();},250);}catch(e){console.error(e);alert('PDF তৈরি করা যায়নি। আবার চেষ্টা করুন।')}};
      const img=doc.getElementById('printDrawing');
      if(img){
        if(img.complete) setTimeout(printNow,400);
        else {img.onload=()=>setTimeout(printNow,250);img.onerror=()=>setTimeout(printNow,400);}
      }else setTimeout(printNow,500);
    }catch(e){
      console.error(e);
      alert('PDF তৈরি করা যায়নি। আবার চেষ্টা করুন।');
    }
  }

  function calculate(){
    const v=sideValues();
    if(Object.values(v).some(x=>x===null||!(x>0))) return warning('উত্তর, পূর্ব, দক্ষিণ, পশ্চিম ও কর্ণ—সবগুলোর ফুট এবং ইঞ্চির সঠিক মান দিন। ইঞ্চি ০ থেকে ১১.৯৯-এর মধ্যে হতে হবে।');
    const wanted=$('qpShapeType')?.value||'auto', q=buildQuad(v,wanted);
    if(!q) return warning(wanted==='auto'?'দেওয়া চার বাহু ও AC কর্ণ দিয়ে বৈধ সরল অনিয়মিত চতুর্ভূজ তৈরি করা যাচ্ছে না।':'দেওয়া চার বাহু ও AC কর্ণ দিয়ে নির্বাচিত চতুর্ভূজ তৈরি করা যাচ্ছে না।');
    const target=targetSqft(); if(!(target>0)) return warning('যে পরিমাণ জমি ভাগ করবেন সেটি দিন।');
    if(target>=q.area-EPS) return warning(`ভাগের পরিমাণ মোট জমির চেয়ে কম হতে হবে। মোট জমি ≈ ${bn(q.area)} বর্গফুট।`);
    const direction=$('qpPartitionDirection')?.value||'north', part=findPartition(q,target,direction);
    if(!part){const m=SIDE_META[direction];return warning(`${m.label} দিক থেকে নির্বাচিত পরিমাণ ভাগ করা যাচ্ছে না। কম ক্ষেত্রফল বা অন্য দিক নির্বাচন করুন।`);}
    qpState.q=q; qpState.splits=[]; splitSeq=0;
    qpState.splits.push({id:++splitSeq,parentId:null,direction,targetArea:target,part,editNext:null,editPrev:null,notice:''});
    renderMultiResult();
  }

  function clear(){
    for(const k of ['AB','BC','CD','DA','AC']){const a=$(k==='AB'?'qpABft':`qp${k}ft`),b=$(k==='AB'?'qpABin':`qp${k}in`);if(a)a.value='';if(b)b.value='';}
    if($('qpTarget'))$('qpTarget').value=''; result.innerHTML=''; qpState.q=null;qpState.splits=[];splitSeq=0;
  }
  if(!$('qpCalc')||!result)return;
  $('qpCalc').onclick=calculate;
  document.querySelectorAll('[data-clear="quad-partition"]').forEach(b=>b.addEventListener('click',clear));
})();
