/* Independent live-drawing safeguard for the diagonal quadrilateral calculator.
   This file only updates #qdDrawing; the existing calculator-core.js remains
   responsible for the area calculation and all other calculators. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fieldIds = ['qdAB','qdABIn','qdBC','qdBCIn','qdCD','qdCDIn','qdDA','qdDAIn','qdAC','qdACIn','qdBD','qdBDIn'];
  const help = 'চারটি বাহু ও নির্বাচিত কর্ণের সঠিক ফুট–ইঞ্চি মাপ দিলে এখানে প্লটের ড্রয়িং স্বয়ংক্রিয়ভাবে দেখা যাবে।';
  const fmt = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const lengthText = (v, unit) => {
    if (unit !== 'ft') return `${fmt(v)} মিটার`;
    let feet = Math.floor(v + 1e-9), inches = Math.round((v - feet) * 1200) / 100;
    if (inches >= 12) { feet++; inches = 0; }
    return `${feet} ফুট ${Number.isInteger(inches) ? inches : inches.toFixed(2)} ইঞ্চি`;
  };
  const read = (id, unit) => {
    const mainEl = $(id);
    if (!mainEl) return NaN;
    const mainText = mainEl.value.trim();
    const main = mainText === '' ? 0 : Number(mainText);
    if (!Number.isFinite(main) || main < 0) return NaN;
    if (unit !== 'ft') return main;
    const inchEl = $(`${id}In`);
    const inchText = inchEl ? inchEl.value.trim() : '';
    const inch = inchText === '' ? 0 : Number(inchText);
    if (!Number.isFinite(inch) || inch < 0 || inch >= 12) return NaN;
    return main + inch / 12;
  };
  const pointFromSides = (base, fromStart, fromEnd) => {
    if (!(base > 0)) return null;
    const x = (fromStart * fromStart + base * base - fromEnd * fromEnd) / (2 * base);
    const y2 = fromStart * fromStart - x * x;
    if (y2 < -1e-7) return null;
    return { x, y: Math.sqrt(Math.max(0, y2)) };
  };
  const triangleValid = (a, b, c) => a + b > c + 1e-8 && a + c > b + 1e-8 && b + c > a + 1e-8;
  const dotAngle = (v1, v2) => {
    const d = v1.x * v2.x + v1.y * v2.y;
    const m = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
    return m > 1e-10 ? Math.acos(Math.max(-1, Math.min(1, d / m))) * 180 / Math.PI : NaN;
  };
  const draw = () => {
    const host = $('qdDrawing');
    const selector = $('qdDiagonalType');
    const unitEl = $('qdUnit');
    if (!host || !selector || !unitEl) return;
    const unit = unitEl.value;
    const [ab, bc, cd, da] = ['qdAB','qdBC','qdCD','qdDA'].map(id => read(id, unit));
    const which = selector.value === 'BD' ? 'BD' : 'AC';
    const diag = read(which === 'BD' ? 'qdBD' : 'qdAC', unit);
    const all = [ab, bc, cd, da, diag];
    if (all.some(v => Number.isNaN(v))) {
      host.innerHTML = `<div class="calc-help">ফুটের মাপ ধনাত্মক/শূন্য এবং ইঞ্চি ০ থেকে ১১.৯৯৯-এর মধ্যে দিন।</div>`;
      return;
    }
    if (all.some(v => !(v > 0))) {
      host.innerHTML = `<div class="calc-help">${help}</div>`;
      return;
    }
    const valid = which === 'AC'
      ? triangleValid(ab, bc, diag) && triangleValid(da, cd, diag)
      : triangleValid(ab, da, diag) && triangleValid(bc, cd, diag);
    if (!valid) {
      host.innerHTML = '<div class="warning">এই বাহু ও কর্ণের মাপে দুটি বৈধ ত্রিভুজ তৈরি হচ্ছে না। প্রতিটি বাহু ও নির্বাচিত কর্ণের মাপ যাচাই করুন।</div>';
      return;
    }
    let g;
    if (which === 'BD') {
      const a = pointFromSides(diag, ab, da), c = pointFromSides(diag, bc, cd);
      if (!a || !c) { host.innerHTML = '<div class="warning">ড্রয়িংয়ের জন্য মাপগুলো জ্যামিতিকভাবে সামঞ্জস্যপূর্ণ নয়।</div>'; return; }
      g = { A:a, B:{x:0,y:0}, C:{x:c.x,y:-c.y}, D:{x:diag,y:0}, start:'B', end:'D' };
    } else {
      const b = pointFromSides(diag, ab, bc), d = pointFromSides(diag, da, cd);
      if (!b || !d) { host.innerHTML = '<div class="warning">ড্রয়িংয়ের জন্য মাপগুলো জ্যামিতিকভাবে সামঞ্জস্যপূর্ণ নয়।</div>'; return; }
      g = { A:{x:0,y:0}, B:{x:b.x,y:b.y}, C:{x:diag,y:0}, D:{x:d.x,y:-d.y}, start:'A', end:'C' };
    }
    // Display orientation only (no length/angle/area is changed):
    // AB on top, BC on right, CD at bottom, DA on left, plot kept upright.
    const keys=['A','B','C','D'];
    let rot={A:g.A,B:g.B,C:g.C,D:g.D};
    const area2=keys.reduce((sum,n,idx)=>{const a=rot[n],c=rot[keys[(idx+1)%4]];return sum+(a.x*c.y-c.x*a.y);},0);
    if(area2>1e-9) rot=Object.fromEntries(keys.map(n=>[n,{x:-rot[n].x,y:rot[n].y}]));
    let ux=(rot.B.x-rot.A.x)+(rot.C.x-rot.D.x), uy=(rot.B.y-rot.A.y)+(rot.C.y-rot.D.y), um=Math.hypot(ux,uy);
    if(um<1e-9){ux=rot.B.x-rot.A.x;uy=rot.B.y-rot.A.y;um=Math.hypot(ux,uy)||1;}
    ux/=um; uy/=um;
    rot=Object.fromEntries(keys.map(n=>[n,{x:rot[n].x*ux+rot[n].y*uy,y:-rot[n].x*uy+rot[n].y*ux}]));
    const pts = ['A','B','C','D'].map(k=>rot[k]), xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
    const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
    const spanX=Math.max(maxX-minX,1e-6), spanY=Math.max(maxY-minY,1e-6);
    const W=720,H=460,pad=82, scale=Math.min((W-pad*2)/spanX,(H-pad*2)/spanY);
    const cx=(minX+maxX)/2, cy=(minY+maxY)/2;
    const map=p=>({x:W/2+(p.x-cx)*scale,y:H/2-(p.y-cy)*scale});
    const P={A:map(rot.A),B:map(rot.B),C:map(rot.C),D:map(rot.D)};
    const polygon=['A','B','C','D'].map(k=>`${P[k].x.toFixed(2)},${P[k].y.toFixed(2)}`).join(' ');
    const mid=(a,b)=>({x:(P[a].x+P[b].x)/2,y:(P[a].y+P[b].y)/2});
    const centroid={x:(P.A.x+P.B.x+P.C.x+P.D.x)/4,y:(P.A.y+P.B.y+P.C.y+P.D.y)/4};
    const sideLabel=(a,b,t)=>{
      const m=mid(a,b), dx=P[b].x-P[a].x, dy=P[b].y-P[a].y;
      let angle=Math.atan2(dy,dx)*180/Math.PI;
      if(angle>90) angle-=180; if(angle< -90) angle+=180;
      // Offset labels outward from the polygon, keeping text parallel to its edge.
      let nx=-dy, ny=dx, nm=Math.hypot(nx,ny)||1; nx/=nm; ny/=nm;
      const outward=(m.x-centroid.x)*nx+(m.y-centroid.y)*ny;
      if(outward<0){nx=-nx;ny=-ny;}
      const x=m.x+nx*19, y=m.y+ny*19;
      return `<text x="${x}" y="${y}" class="qd-dim" text-anchor="middle" dominant-baseline="middle" transform="rotate(${angle.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})">${t}</text>`;
    };
    const angleLabel=k=>{
      const order=['A','B','C','D'],i=order.indexOf(k),prev=order[(i+3)%4],next=order[(i+1)%4];
      const v1={x:P[prev].x-P[k].x,y:P[prev].y-P[k].y},v2={x:P[next].x-P[k].x,y:P[next].y-P[k].y};
      const deg=dotAngle(v1,v2); if(!Number.isFinite(deg)) return '';
      let vx=v1.x+v2.x,vy=v1.y+v2.y,vm=Math.hypot(vx,vy);
      if(vm<1e-6){vx=centroid.x-P[k].x;vy=centroid.y-P[k].y;vm=Math.hypot(vx,vy)||1;}
      const x=P[k].x+vx/vm*28,y=P[k].y+vy/vm*28;
      return `<text x="${x}" y="${y}" class="qd-angle-label" fill="#7c2d12" font-size="14" font-weight="700" stroke="#fff" stroke-width="3" paint-order="stroke" text-anchor="middle" dominant-baseline="middle">${deg.toFixed(1)}°</text>`;
    };
    const pa=P[g.start], pb=P[g.end];
    host.innerHTML = `<div class="qd-drawing-head"><strong>প্লটের স্বয়ংক্রিয় ড্রয়িং</strong><span>কর্ণ ${which} • ইনপুটের সঙ্গে আপডেট হচ্ছে</span></div>
      <svg class="qd-plot-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="ইনপুট মাপ অনুযায়ী চতুর্ভুজ, বাহুর মাপ ও চার কোণের ডিগ্রি">
      <polygon points="${polygon}" fill="#dcefe6" fill-opacity=".75" stroke="#16794b" stroke-width="4" stroke-linejoin="round"/>
      <line x1="${pa.x}" y1="${pa.y}" x2="${pb.x}" y2="${pb.y}" stroke="#c2410c" stroke-width="3" stroke-dasharray="9 7"/>
      ${sideLabel('A','B',`AB ${lengthText(ab,unit)}`)}${sideLabel('B','C',`BC ${lengthText(bc,unit)}`)}${sideLabel('C','D',`CD ${lengthText(cd,unit)}`)}${sideLabel('D','A',`DA ${lengthText(da,unit)}`)}
      ${(() => { const mx=(pa.x+pb.x)/2, my=(pa.y+pb.y)/2, dx=pb.x-pa.x, dy=pb.y-pa.y; let ang=Math.atan2(dy,dx)*180/Math.PI; if(ang>90)ang-=180;if(ang< -90)ang+=180;return `<text x="${mx+8}" y="${my-10}" class="qd-diag-label" text-anchor="middle" transform="rotate(${ang.toFixed(2)} ${mx+8} ${my-10})">${which} ${lengthText(diag,unit)}</text>`; })()}
      ${['A','B','C','D'].map(k=>`${angleLabel(k)}<circle cx="${P[k].x}" cy="${P[k].y}" r="5.5" fill="#14532d"/><text x="${P[k].x+10}" y="${P[k].y-10}" class="qd-point-label">${k}</text>`).join('')}
      </svg><p class="calc-help">বাহুর মাপ সংশ্লিষ্ট রেখার সমান্তরালে এবং A, B, C, D-এর কোণ ডিগ্রিতে দেখানো হয়েছে। ড্রয়িং ইনপুট মাপ অনুযায়ী স্বয়ংক্রিয়ভাবে হালনাগাদ হয়। বাস্তব সীমানার সঙ্গে মাঠে মাপ মিলিয়ে নিন।</p>`;
  };
  const attach = () => {
    fieldIds.concat(['qdDiagonalType','qdUnit']).forEach(id => {
      const el = $(id);
      if (!el || el.dataset.qdAutoDrawBound === '1') return;
      el.dataset.qdAutoDrawBound = '1';
      el.addEventListener('input', draw);
      el.addEventListener('change', draw);
    });
    draw();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, { once:true });
  else attach();
})();
