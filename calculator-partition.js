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
  function ftIn(v) {
    let x = Math.max(0, Number(v) || 0), ft = Math.floor(x + 1e-9), inch = Math.round((x - ft) * 12 * 100) / 100;
    if (inch >= 12) { ft++; inch = 0; }
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
  function editor(v) {
    const items = [['AB','উত্তর • AB'],['BC','পূর্ব • BC'],['CD','দক্ষিণ • CD'],['DA','পশ্চিম • DA'],['AC','কর্ণ • AC']];
    return `<div class="qp-edit-card"><strong>ড্রয়িংয়ের মাপ সংশোধন করুন</strong><div class="qp-note">নিচের ফুট/ইঞ্চি পরিবর্তন করলেই হিসাব ও চিত্র সঙ্গে সঙ্গে নতুন মাপে আপডেট হবে।</div></div>
      <div class="qp-editor">${items.map(([k,label])=>`<div class="qp-edit-card"><label>${label}</label><div class="fi-row"><input id="qpEdit${k}ft" type="number" min="0" step="any" placeholder="ফুট" value="${Math.floor(v[k])}"><input id="qpEdit${k}in" type="number" min="0" max="11.999" step="0.01" placeholder="ইঞ্চি" value="${Number(((v[k]-Math.floor(v[k]))*12).toFixed(2)) || ''}"></div></div>`).join('')}</div>`;
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
  function svgLabel(x,y,text,anchor='middle') { return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-size="14" font-weight="800" fill="#082336" paint-order="stroke" stroke="#fff" stroke-width="4" stroke-linejoin="round">${esc(text)}</text>`; }
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
    const n=(i+1)%4;              // next vertex along the selected side
    const prev=(i+3)%4;           // adjacent vertex before the selected side
    const opposite=(i+2)%4;       // far-side opposite vertex
    const A=pts[i], B=pts[n], L=pts[prev], R=pts[opposite];

    // Professional, deterministic quadrilateral partition:
    // the selected side remains a full boundary of the separated plot;
    // P and Q are placed at the same proportional distance on the two
    // adjacent sides.  The cut P-Q therefore divides the original
    // quadrilateral into TWO quadrilaterals (never a triangle).
    // This construction works for convex and concave inputs when the
    // resulting polygons remain inside the original parcel.
    const areaAt=t=>{
      const P=interpolate(A,L,t);
      const Q=interpolate(B,R,t);
      return polygonArea([A,B,Q,P]);
    };
    const f0=areaAt(0), f1=areaAt(1);
    const minA=Math.min(f0,f1), maxA=Math.max(f0,f1);
    if(target < minA-EPS || target > maxA+1e-6) return null;
    let lo=0,hi=1;
    const increasing=f1>=f0;
    for(let k=0;k<100;k++){
      const m=(lo+hi)/2, val=areaAt(m);
      if((increasing && val<target)||(!increasing && val>target)) lo=m; else hi=m;
    }
    const t=(lo+hi)/2;
    const P=interpolate(A,L,t);
    const Q=interpolate(B,R,t);
    const targetPoly=[A,B,Q,P];
    const remainPoly=[P,Q,R,L];

    if(!polygonIsInside(targetPoly,pts) || !polygonIsInside(remainPoly,pts)) return null;
    if(!polygonEdgesInside(targetPoly,pts) || !polygonEdgesInside(remainPoly,pts)) return null;
    if(!segmentInsidePolygon(P,Q,pts)) return null;
    const targetArea=polygonArea(targetPoly);
    const remainArea=polygonArea(remainPoly);
    if(Math.abs(targetArea-target)>1e-4 || Math.abs((targetArea+remainArea)-q.area)>1e-4) return null;

    const names=['A','B','C','D'];
    const aName=names[i], bName=names[n], pSideName=names[prev], rName=names[opposite];
    const sideNames=['উত্তর','পূর্ব','দক্ষিণ','পশ্চিম'];
    const sideKeys=['AB','BC','CD','DA'];
    const cutName=`P–Q`;
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
      fraction:t,partArea:target,cutName,cutLength:dist(P,Q),
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
  function makeDrawing(q, part) {
    const all=[...q.pts, part.P, part.Q];
    let minX=Math.min(...all.map(p=>p[0])), maxX=Math.max(...all.map(p=>p[0])), minY=Math.min(...all.map(p=>p[1])), maxY=Math.max(...all.map(p=>p[1]));
    const padX=Math.max((maxX-minX)*0.20,45), padY=Math.max((maxY-minY)*0.24,55);
    minX-=padX; maxX+=padX; minY-=padY; maxY+=padY;
    const W=800,H=500, scale=Math.min((W-40)/(maxX-minX),(H-40)/(maxY-minY));
    // Coordinate convention: north is UP, east RIGHT, south DOWN, west LEFT.
    const tx=x=>20+(x-minX)*scale, ty=y=>20+(y-minY)*scale;
    const P=q.pts.map(p=>[tx(p[0]),ty(p[1])]);
    const PP=[tx(part.P[0]),ty(part.P[1])], QQ=[tx(part.Q[0]),ty(part.Q[1])];
    const poly=P.map(p=>p.join(',')).join(' ');
    const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
    const offset=(a,b,dx,dy)=>{const m=mid(a,b);return [m[0]+dx,m[1]+dy]};
    const [pA,pB,pC,pD]=P;
    const sAB=offset(pA,pB,0,-22), sBC=offset(pB,pC,24,0), sCD=offset(pC,pD,0,25), sDA=offset(pD,pA,-25,0);
    const sAC=offset(pA,pC,20,0), sBD=offset(pB,pD,-20,0);
    const sPQ=offset(PP,QQ,0,-18);
    const sideLabels=`<g>${svgLabel(sAB[0],sAB[1],`উত্তর AB: ${ftIn(q.v.AB)}`)}${svgLabel(sBC[0],sBC[1],`পূর্ব BC: ${ftIn(q.v.BC)}`,'start')}${svgLabel(sCD[0],sCD[1],`দক্ষিণ CD: ${ftIn(q.v.CD)}`)}${svgLabel(sDA[0],sDA[1],`পশ্চিম DA: ${ftIn(q.v.DA)}`,'end')}${svgLabel(sAC[0],sAC[1],`কর্ণ AC: ${ftIn(q.v.AC)}`,'start')}${svgLabel(sBD[0],sBD[1],`কর্ণ BD: ${ftIn(dist(q.B,q.D))}`,'end')}${svgLabel(sPQ[0],sPQ[1],`ভাগরেখা PQ: ${ftIn(part.cutLength)}`,'middle')}</g>`;
    const ts=part.targetPoly.map(p=>[tx(p[0]),ty(p[1])]).map(p=>p.join(',')).join(' ');
    const rs=part.remainPoly.map(p=>[tx(p[0]),ty(p[1])]).map(p=>p.join(',')).join(' ');
    const verts=[['A',pA],['B',pB],['C',pC],['D',pD],['P',PP],['Q',QQ]].map(([n,p])=>`<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#08747b"/><text x="${p[0]+9}" y="${p[1]-9}" font-size="15" font-weight="900" fill="#082336">${n}</text>`).join('');
    return `<div class="qp-drawing"><div class="qp-drawing-head">📐 ${q.type==='convex'?'উত্তল (Convex)':'অবতল (Concave)'} চতুর্ভূজ — ${esc(SIDE_META[part.direction].label)} দিক থেকে ${bn(part.partArea/SQFT_PER_DECIMAL)} শতাংশ ভাগের Drawing</div><div class="qp-drawing-meta">উত্তর উপরে • পূর্ব ডানে • দক্ষিণ নিচে • পশ্চিম বামে • P ও Q = ভাগরেখার দুই প্রান্ত • PQ = নতুন ভাগরেখা</div><div class="qp-svg-wrap"><svg class="qp-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="দিক নির্ধারণসহ দুইটি চতুর্ভূজে জমি ভাগের চিত্র"><polygon points="${poly}" fill="#eaf5f6" stroke="#08747b" stroke-width="3"/><polygon points="${ts}" fill="#fff4d6" opacity="0.95" stroke="#d9a441" stroke-width="2"/><polygon points="${rs}" fill="#eef8f8" opacity="0.35" stroke="#08747b" stroke-width="1"/><line x1="${PP[0]}" y1="${PP[1]}" x2="${QQ[0]}" y2="${QQ[1]}" stroke="#b84b2a" stroke-width="4"/><circle cx="${PP[0]}" cy="${PP[1]}" r="6" fill="#b84b2a"/><circle cx="${QQ[0]}" cy="${QQ[1]}" r="6" fill="#b84b2a"/>${sideLabels}${verts}</svg></div><div class="qp-drawing-legend"><span>🟨 নির্ধারিত ভাগ (${bn(part.partArea/SQFT_PER_DECIMAL)} শতাংশ)</span><span>⬜ অবশিষ্ট জমি (${bn((q.area-part.partArea)/SQFT_PER_DECIMAL)} শতাংশ)</span></div></div>`;
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
      ${editor(v)}${makeDrawing(q,part)}<p class="qp-note">⚠️ নির্বাচিত দিকের উপর P বিন্দু নির্ধারণ করে তার সংলগ্ন বিপরীত কোণে নতুন ভাগরেখা তৈরি করে নির্ধারিত ক্ষেত্রফল বের করা হয়েছে। Drawing-এ উত্তর উপরে, পূর্ব ডানে, দক্ষিণ নিচে এবং পশ্চিম বামে রাখা হয়েছে। নির্ধারিত ভাগ ও অবশিষ্ট জমির প্রতিটি অংশের আলাদা ফুট-ইঞ্চি মাপ এবং প্রযোজ্য কর্ণ দেখানো হয়েছে। মাঠে দাগ কাটার আগে বাস্তব সীমানা ও জরিপ মাপ যাচাই করুন।</p>`;
    bindEditor();
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
