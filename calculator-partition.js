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
    const ft = Math.floor(v + 1e-9);
    const inch = Number(((v - ft) * 12).toFixed(2));
    $(ftId).value = ft;
    $(inId).value = inch >= 11.995 ? 0 : inch;
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
  function pointFractionOnSide(areaPart, triangleArea) { return Math.max(0, Math.min(1, areaPart / triangleArea)); }
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
  function makeDrawing(q, part) {
    const all=[...q.pts, part.P];
    let minX=Math.min(...all.map(p=>p[0])), maxX=Math.max(...all.map(p=>p[0])), minY=Math.min(...all.map(p=>p[1])), maxY=Math.max(...all.map(p=>p[1]));
    const padX=Math.max((maxX-minX)*0.20, 45), padY=Math.max((maxY-minY)*0.24, 55);
    minX-=padX; maxX+=padX; minY-=padY; maxY+=padY;
    const W=800,H=460, scale=Math.min((W-40)/(maxX-minX),(H-40)/(maxY-minY));
    const tx=x=>20+(x-minX)*scale, ty=y=>20+(maxY-y)*scale;
    const P=q.pts.map(p=>[tx(p[0]),ty(p[1])]); const PP=[tx(part.P[0]),ty(part.P[1])];
    const poly=P.map(p=>p.join(',')).join(' ');
    const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
    const offset=(a,b,dx,dy)=>{const m=mid(a,b);return [m[0]+dx,m[1]+dy]};
    const pA=P[0],pB=P[1],pC=P[2],pD=P[3];
    const sAB=offset(pA,pB,0,-20), sBC=offset(pB,pC,22,0), sCD=offset(pC,pD,0,24), sDA=offset(pD,pA,-22,0);
    const sAC=offset(pA,pC,18,-14), sAP=offset(pA,PP,22,0);
    const sideLabels = `<g>${svgLabel(sAB[0],sAB[1],`উত্তর AB: ${ftIn(q.v.AB)}`)}${svgLabel(sBC[0],sBC[1],`পূর্ব BC: ${ftIn(q.v.BC)}`,'start')}${svgLabel(sCD[0],sCD[1],`দক্ষিণ CD: ${ftIn(q.v.CD)}`)}${svgLabel(sDA[0],sDA[1],`পশ্চিম DA: ${ftIn(q.v.DA)}`,'end')}${svgLabel(sAC[0],sAC[1],`কর্ণ AC: ${ftIn(q.v.AC)}`,'start')}${svgLabel(sAP[0],sAP[1],`ভাগরেখা AP: ${ftIn(part.AP)}`,'start')}</g>`;
    const verts=[['A',pA],['B',pB],['C',pC],['D',pD],['P',PP]].map(([n,p])=>`<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#08747b"/><text x="${p[0]+9}" y="${p[1]-9}" font-size="15" font-weight="900" fill="#082336">${n}</text>`).join('');
    const splitInfo=part.side==='BC' ? `P বিন্দু পূর্ব (BC) বাহুতে` : `P বিন্দু দক্ষিণ (CD) বাহুতে`;
    return `<div class="qp-drawing"><div class="qp-drawing-head">📐 অনিয়মিত ${q.type==='convex'?'উত্তল (Convex)':'অবতল (Concave)'} চতুর্ভূজ — ভাগের সীমারেখার Drawing</div><div class="qp-drawing-meta">${splitInfo} • উত্তর/পূর্ব/দক্ষিণ/পশ্চিম/কর্ণের ফুট-ইঞ্চি ও ভাগরেখার মাপ দেখানো হয়েছে</div><div class="qp-svg-wrap"><svg class="qp-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="অনিয়মিত চতুর্ভুজ ভাগ-বণ্টনের চিত্র"><polygon points="${poly}" fill="#eaf5f6" stroke="#08747b" stroke-width="3"/><line x1="${pA[0]}" y1="${pA[1]}" x2="${pC[0]}" y2="${pC[1]}" stroke="#d9a441" stroke-width="2.5" stroke-dasharray="8 6"/><line x1="${pA[0]}" y1="${pA[1]}" x2="${PP[0]}" y2="${PP[1]}" stroke="#b84b2a" stroke-width="4"/><circle cx="${PP[0]}" cy="${PP[1]}" r="6" fill="#b84b2a"/>${sideLabels}${verts}</svg></div></div>`;
  }

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
  function cutIsInside(q,P){
    const samples=[0.25,0.5,0.75].map(t=>interpolate(q.A,P,t));
    return samples.every(pt=>pointInPolygon(pt,q.pts) || Math.abs(cross(q.A,P,pt))<EPS);
  }
  function solveOnSegment(fn, p, q, target) {
    const f0=fn(p), f1=fn(q);
    const increasing=f1>=f0;
    if(target < Math.min(f0,f1)-1e-6 || target > Math.max(f0,f1)+1e-6) return null;
    let lo=0,hi=1;
    for(let i=0;i<90;i++){
      const m=(lo+hi)/2, P=interpolate(p,q,m), val=fn(P);
      if((increasing && val<target)||(!increasing && val>target)) lo=m; else hi=m;
    }
    const t=(lo+hi)/2, P=interpolate(p,q,t);
    return {P,t,value:fn(P)};
  }
  function findPartition(q,target){
    const total=q.area;
    if(!(target>EPS && target<total-EPS)) return null;
    const A=q.A,B=q.B,C=q.C,D=q.D;
    if(q.type==='convex'){
      const areaABC=trianglePointsArea(A,B,C);
      if(target<=areaABC+1e-6){
        const sol=solveOnSegment(P=>trianglePointsArea(A,B,P),B,C,target);
        return sol ? {P:sol.P,AP:dist(A,sol.P),side:'BC',fraction:sol.t,partArea:sol.value} : null;
      }
      const sol=solveOnSegment(P=>polygonArea([A,B,C,P]),C,D,target);
      return sol ? {P:sol.P,AP:dist(A,sol.P),side:'CD',fraction:sol.t,partArea:sol.value} : null;
    }
    // Concave case: the reflex vertex determines which opposite side can be
    // reached from A without crossing the indentation. The maximum prefix
    // area is exactly the full quadrilateral area.
    if(q.reflex==='D'){
      const hit=lineIntersection(A,D,B,C);
      if(!hit || hit[2]<-EPS || hit[3]<-EPS || hit[3]>1+EPS) return null;
      const Q=[hit[0],hit[1]];
      const sol=solveOnSegment(P=>trianglePointsArea(A,B,P),B,Q,target);
      return sol ? {P:sol.P,AP:dist(A,sol.P),side:'BC',fraction:sol.t*(dist(B,Q)/Math.max(dist(B,C),EPS)),partArea:sol.value} : null;
    }
    if(q.reflex==='B'){
      const hit=lineIntersection(A,B,C,D);
      if(!hit || hit[2]<-EPS || hit[3]<-EPS || hit[3]>1+EPS) return null;
      const Q=[hit[0],hit[1]];
      const sol=solveOnSegment(P=>polygonArea([A,B,C,P]),C,Q,target);
      return sol ? {P:sol.P,AP:dist(A,sol.P),side:'CD',fraction:sol.t*(dist(C,Q)/Math.max(dist(C,D),EPS)),partArea:sol.value} : null;
    }
    return null;
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
    const part=findPartition(q,target);
    if(!part) return warning('এই মাপ দিয়ে নির্ধারিত ভাগের জন্য বৈধ অভ্যন্তরীণ সীমারেখা তৈরি করা যায়নি। বাহু/কর্ণের মাঠমাপ এবং চতুর্ভূজের ধরন পুনরায় যাচাই করুন।');
    q.v=v;
    const targetDecimal=target/SQFT_PER_DECIMAL, remainingDecimal=(q.area-target)/SQFT_PER_DECIMAL;
    const typeBn=q.type==='convex'?'উত্তল (Convex)':'অবতল (Concave)';
    result.innerHTML=`<div class="qp-ok">হিসাব সফল হয়েছে। এটি <strong>অনিয়মিত ${typeBn} চতুর্ভূজ</strong> হিসেবে তৈরি করা হয়েছে। মোট জমি ≈ ${bn(q.area)} বর্গফুট (${bn(q.area/SQFT_PER_DECIMAL)} শতাংশ)।</div>
      <div class="result-list"><div class="result-item result-item-primary"><strong>${bn(target)} বর্গফুট</strong><span>নির্ধারিত ভাগ = ${bn(targetDecimal)} শতাংশ</span></div><div class="result-item"><strong>${bn(remainingDecimal)} শতাংশ</strong><span>অবশিষ্ট জমি</span></div><div class="result-item"><strong>${ftIn(part.AP)}</strong><span>A থেকে P পর্যন্ত ভাগের সীমারেখা</span></div><div class="result-item"><strong>${part.side} বাহু</strong><span>P বিন্দুতে সীমারেখা শেষ হয়েছে</span></div></div>
      ${editor(v)}${makeDrawing(q,part)}<p class="qp-note">⚠️ চিত্রটি প্রদত্ত ফুট-ইঞ্চি ও AC কর্ণের জ্যামিতিক মাপ অনুযায়ী তৈরি। সম্পাদক অংশে উত্তর/পূর্ব/দক্ষিণ/পশ্চিম/কর্ণের মাপ পরিবর্তন করলে নতুন জ্যামিতি, মোট ক্ষেত্রফল, ভাগরেখা ও Drawing পুনরায় হিসাব হবে। মাঠে দাগ কাটার আগে বাস্তব সীমানা ও জরিপ মাপ যাচাই করুন।</p>`;
    bindEditor();
  }
  function bindEditor(){
    for (const k of ['AB','BC','CD','DA','AC']) {
      [`qpEdit${k}ft`,`qpEdit${k}in`].forEach(id=>$(id)?.addEventListener('input',e=>{
        const activeId=e.currentTarget.id;
        const pos=typeof e.currentTarget.selectionStart==='number'?e.currentTarget.selectionStart:null;
        const v=readEditor(); if(!v) return;
        for(const x of ['AB','BC','CD','DA','AC']) setFI(`qp${x}ft`,`qp${x}in`,v[x]);
        calculate();
        const next=$(activeId);
        if(next){ next.focus(); if(pos!==null && next.setSelectionRange){ const p=Math.min(pos,String(next.value).length); next.setSelectionRange(p,p); } }
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
