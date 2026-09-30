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
  function buildQuad(v) {
    const {AB:a,BC:b,CD:c,DA:d,AC:e} = v;
    const tABC = triangle(a,b,e), tACD = triangle(c,d,e);
    if (!tABC || !tACD) return null;
    const bx = a, by = 0;
    const cx = (a*a + e*e - b*b) / (2*a);
    const cy2 = e*e - cx*cx;
    if (!(cy2 > EPS)) return null;
    const cy = Math.sqrt(cy2);
    // B and D are placed on opposite sides of AC so ABCD is a convex quadrilateral.
    const dx = (d*d + e*e - c*c) / (2*e);
    const dy2 = d*d - dx*dx;
    if (!(dy2 > EPS)) return null;
    const dy = -Math.sqrt(dy2);
    const A = [0,0], B = [bx,by], C = [cx,cy], D = [dx,dy];
    const pts = [A,B,C,D];
    const area = tABC + tACD;
    const lens = [[A,B],[B,C],[C,D],[D,A]].map(([p,q])=>Math.hypot(q[0]-p[0],q[1]-p[1]));
    if (lens.some((x,i)=>Math.abs(x-[a,b,c,d][i]) > 1e-5)) return null;
    return {A,B,C,D,pts,tABC,tACD,area};
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
    const padX=Math.max((maxX-minX)*0.18, 35), padY=Math.max((maxY-minY)*0.22, 45);
    minX-=padX; maxX+=padX; minY-=padY; maxY+=padY;
    const W=760,H=430, scale=Math.min((W-30)/(maxX-minX),(H-30)/(maxY-minY));
    const tx=x=>15+(x-minX)*scale, ty=y=>15+(maxY-y)*scale;
    const P=q.pts.map(p=>[tx(p[0]),ty(p[1])]); const PP=[tx(part.P[0]),ty(part.P[1])];
    const poly=P.map(p=>p.join(',')).join(' ');
    const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
    const offset=(a,b,dx,dy)=>{const m=mid(a,b);return [m[0]+dx,m[1]+dy]};
    const pA=P[0],pB=P[1],pC=P[2],pD=P[3];
    const sAB=offset(pA,pB,0,-18), sBC=offset(pB,pC,18,0), sCD=offset(pC,pD,0,20), sDA=offset(pD,pA,-20,0);
    const sAC=offset(pA,pC,16,-12), sAP=offset(pA,PP,20,0);
    const sideLabels = `<g>${svgLabel(sAB[0],sAB[1],`উত্তর AB: ${ftIn(q.v.AB)}`)}${svgLabel(sBC[0],sBC[1],`পূর্ব BC: ${ftIn(q.v.BC)}`,'start')}${svgLabel(sCD[0],sCD[1],`দক্ষিণ CD: ${ftIn(q.v.CD)}`)}${svgLabel(sDA[0],sDA[1],`পশ্চিম DA: ${ftIn(q.v.DA)}`,'end')}${svgLabel(sAC[0],sAC[1],`কর্ণ AC: ${ftIn(q.v.AC)}`,'start')}${svgLabel(sAP[0],sAP[1],`ভাগরেখা AP: ${ftIn(part.AP)}`,'start')}</g>`;
    const verts=[['A',pA],['B',pB],['C',pC],['D',pD],['P',PP]].map(([n,p])=>`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#08747b"/><text x="${p[0]+8}" y="${p[1]-8}" font-size="15" font-weight="900" fill="#082336">${n}</text>`).join('');
    return `<div class="qp-drawing"><div class="qp-drawing-head">📐 ভাগের সীমারেখার Drawing — ফুট/ইঞ্চিসহ</div><div class="qp-svg-wrap"><svg class="qp-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="চতুর্ভুজ ভাগ-বণ্টনের চিত্র"><polygon points="${poly}" fill="#eaf5f6" stroke="#08747b" stroke-width="3"/><line x1="${pA[0]}" y1="${pA[1]}" x2="${pC[0]}" y2="${pC[1]}" stroke="#d9a441" stroke-width="2.5" stroke-dasharray="8 6"/><line x1="${pA[0]}" y1="${pA[1]}" x2="${PP[0]}" y2="${PP[1]}" stroke="#b84b2a" stroke-width="4"/><circle cx="${PP[0]}" cy="${PP[1]}" r="6" fill="#b84b2a"/>${sideLabels}${verts}</svg></div></div>`;
  }
  function calculate() {
    let v=sideValues();
    if (Object.values(v).some(x=>x===null || !(x>0))) return warning('উত্তর, পূর্ব, দক্ষিণ, পশ্চিম ও কর্ণ—সবগুলোর ফুট এবং ইঞ্চির সঠিক মান দিন। ইঞ্চি ০ থেকে ১১.৯৯-এর মধ্যে হতে হবে।');
    const q=buildQuad(v);
    if (!q) return warning('দেওয়া চার বাহু ও AC কর্ণ দিয়ে বৈধ উত্তল চতুর্ভুজ তৈরি হচ্ছে না। বিশেষ করে AB–BC–AC এবং AD–CD–AC—দুই ত্রিভুজের triangle inequality যাচাই করুন।');
    const target=targetSqft();
    if (!(target>0)) return warning('যে পরিমাণ জমি ভাগ করবেন সেটি দিন।');
    if (target >= q.area-EPS) return warning(`ভাগের পরিমাণ মোট জমির চেয়ে কম হতে হবে। মোট জমি ≈ ${bn(q.area)} বর্গফুট।`);
    const total=q.area, a1=q.tABC, a2=q.tACD;
    let part;
    if (target <= a2 + EPS) {
      const f=pointFractionOnSide(target,a2); const P=interpolate(q.D,q.C,f); part={P,AP:dist(q.A,P),side:'CD',fraction:f,partArea:target};
    } else if (target <= a1 + EPS) {
      const f=pointFractionOnSide(target,a1); const P=interpolate(q.B,q.C,f); part={P,AP:dist(q.A,P),side:'BC',fraction:f,partArea:target};
    } else {
      const remaining=total-target; const f=pointFractionOnSide(remaining,a2); const P=interpolate(q.D,q.C,f); part={P,AP:dist(q.A,P),side:'CD',fraction:f,partArea:target,complement:true};
    }
    q.v=v;
    const targetDecimal=target/SQFT_PER_DECIMAL, remainingDecimal=(total-target)/SQFT_PER_DECIMAL;
    result.innerHTML=`<div class="qp-ok">হিসাব সফল হয়েছে। মোট জমি ≈ ${bn(total)} বর্গফুট (${bn(total/SQFT_PER_DECIMAL)} শতাংশ)।</div>
      <div class="result-list"><div class="result-item result-item-primary"><strong>${bn(target)} বর্গফুট</strong><span>নির্ধারিত ভাগ = ${bn(targetDecimal)} শতাংশ</span></div><div class="result-item"><strong>${bn(remainingDecimal)} শতাংশ</strong><span>অবশিষ্ট জমি</span></div><div class="result-item"><strong>${ftIn(part.AP)}</strong><span>A থেকে P পর্যন্ত ভাগের সীমারেখা</span></div><div class="result-item"><strong>P বিন্দু: ${part.side} বাহু</strong><span>${part.complement?'অবশিষ্ট অংশকে আলাদা করে লক্ষ্য ভাগ নেওয়া হয়েছে':'লক্ষ্য ভাগ সরাসরি নির্ধারণ করা হয়েছে'}</span></div></div>
      ${editor(v)}${makeDrawing(q,part)}<p class="qp-note">⚠️ এটি প্রদত্ত বাহু ও কর্ণের জ্যামিতিক মাপের ভিত্তিতে গণনা। মাঠে দাগ কাটার আগে বাস্তব সীমানা, উত্তর দিক, দলিল/খতিয়ান এবং জরিপ মাপ যাচাই করুন।</p>`;
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
