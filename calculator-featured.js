

(() => {
  const $ = id => document.getElementById(id);
  const fmt = (n,d=4) => Number(n).toLocaleString('en-US',{maximumFractionDigits:d});
  const bn = n => Number(n).toLocaleString('bn-BD',{maximumFractionDigits:6});
  const esc = s => String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const T=76800, G=4800, K=240, KR=60, TL=1;
  const unitSqft={decimal:435.6,sqft:1,sqm:10.763910416709722,acre:43560};
  const unitLabel={decimal:'শতাংশ',sqft:'বর্গফুট',sqm:'বর্গমিটার',acre:'একর'};
  const anaSymbols=['০','⁄','৵','৶','৷','৷⁄','৷৵','৷৶','৷৷','৷৷⁄','৷৷৵','৷৷৶','৸','৸⁄','৸৵','৸৶','১'];
  function err(el,msg){el.innerHTML='<div class="warning">'+esc(msg)+'</div>';}
  function readParts(ids){return ids.map(id=>Number($(id).value));}
  function validateParts(a,g,k,kr,t){
    if(!Number.isInteger(a)||a<0||a>15) return 'আনা ০ থেকে ১৫-এর মধ্যে পূর্ণসংখ্যা হতে হবে। ১৬ আনা পূর্ণ হিস্যা, তাই নিচের ঘরগুলো শূন্য থাকতে হবে।';
    if(!Number.isInteger(g)||g<0||g>19) return 'গণ্ডা ০ থেকে ১৯-এর মধ্যে পূর্ণসংখ্যা দিন।';
    if(!Number.isInteger(k)||k<0||k>3) return 'কড়া ০ থেকে ৩-এর মধ্যে পূর্ণসংখ্যা দিন।';
    if(!Number.isInteger(kr)||kr<0||kr>2) return 'ক্রান্তি ০ থেকে ২-এর মধ্যে পূর্ণসংখ্যা দিন।';
    if(!Number.isInteger(t)||t<0||t>19) return 'তিল ০ থেকে ১৯-এর মধ্যে পূর্ণসংখ্যা দিন।';
    const til=a*G+g*K+k*KR+kr*20+t;
    if(til<=0) return 'হিস্যার অন্তত একটি মান ০-এর বেশি দিন।';
    if(til>T) return 'প্রদত্ত হিস্যা পূর্ণ সম্পত্তির চেয়ে বেশি হয়েছে।';
    return '';
  }
  function partsToTil(a,g,k,kr,t){return a*G+g*K+k*KR+kr*20+t;}
  function renderLandResult(el,total,unit,til){
    const fraction=til/T, percent=fraction*100, totalSqft=total*unitSqft[unit], ownSqft=totalSqft*fraction, ownDecimal=ownSqft/435.6;
    const acre=ownSqft/43560, katha=ownSqft/720, bigha=ownSqft/14400, ayut=acre*10000;
    const ownInInput=total*fraction;
    const ana=Math.floor(til/G), remA=til-ana*G, g=Math.floor(remA/K), remG=remA-g*K, k=Math.floor(remG/KR), remK=remG-k*KR, kr=Math.floor(remK/20), t=remK-kr*20;
    el.innerHTML='<div class="result-main">আপনার হিস্যা = '+fmt(fraction,8)+' (পূর্ণ সম্পত্তির অংশ)</div>'+
      '<div class="result-list">'+
      '<div class="result-item result-item-primary"><strong>'+fmt(percent,6)+'%</strong><span>শতাংশ হারে হিস্যা</span></div>'+
      '<div class="result-item"><strong>'+fmt(ownInInput,6)+' '+unitLabel[unit]+'</strong><span>আপনার জমির পরিমাণ</span></div>'+
      '<div class="result-item"><strong>'+fmt(ownDecimal,6)+' শতাংশ</strong><span>ডেসিমেল</span></div>'+
      '<div class="result-item"><strong>'+fmt(ayut,4)+' অযুতাংশ</strong><span>১ একর = ১০,০০০ অযুতাংশ</span></div>'+
      '<div class="result-item"><strong>'+fmt(ownSqft,4)+' বর্গফুট</strong><span>ক্ষেত্রফল</span></div>'+
      '<div class="result-item"><strong>'+fmt(katha,6)+' কাঠা</strong><span>১ কাঠা = ৭২০ বর্গফুট</span></div>'+ 
      '<div class="result-item"><strong>'+fmt(bigha,6)+' বিঘা</strong><span>১ বিঘা = ১৪,৪০০ বর্গফুট</span></div>'+ 
      '<div class="result-item"><strong>'+ana+' আনা '+g+' গণ্ডা '+k+' কড়া '+kr+' ক্রান্তি '+t+' তিল</strong><span>নিকটতম তিল পর্যন্ত</span></div>'+ 
      '</div><p class="conversion-note">হিস্যা-রূপান্তর: ১৬ আনা = পূর্ণ সম্পত্তি; ১ আনা = ২০ গণ্ডা; ১ গণ্ডা = ৪ কড়া; ১ কড়া = ৩ ক্রান্তি; ১ ক্রান্তি = ২০ তিল। জমির পরিমাণের একক স্থানীয়/সরকারি রেকর্ডের সঙ্গে মিলিয়ে নিন।</p>';
  }

  // Fill symbolic selects.
  anaSymbols.forEach((sym,i)=>{const o=document.createElement('option');o.value=i;o.textContent=i+' আনা — '+sym;$('fsAnaSymbol').appendChild(o)});
  for(let i=0;i<=19;i++){const o=document.createElement('option');o.value=i;o.textContent=i+' গণ্ডা';$('fsGonda').appendChild(o);$('fsTil').appendChild(Object.assign(document.createElement('option'),{value:i,textContent:i+' তিল'}));}
  for(let i=0;i<=3;i++){const o=document.createElement('option');o.value=i;o.textContent=i+' কড়া';$('fsKora').appendChild(o)}
  for(let i=0;i<=2;i++){const o=document.createElement('option');o.value=i;o.textContent=i+' ক্রান্তি';$('fsKranti').appendChild(o)}
  $('fsCalc').onclick=()=>{
    const total=Number($('fsTotalLand').value), unit=$('fsLandUnit').value, a=Number($('fsAnaSymbol').value),g=Number($('fsGonda').value),k=Number($('fsKora').value),kr=Number($('fsKranti').value),t=Number($('fsTil').value),r=$('fsResult');
    if(!(total>0)) return err(r,'মোট জমির পরিমাণ ০-এর বেশি দিন।');
    if(a===16 && (g||k||kr||t)) return err(r,'১৬ আনা পূর্ণ হিস্যা; এর সঙ্গে গণ্ডা/কড়া/ক্রান্তি/তিল যোগ করা যাবে না।');
    if(a===16){renderLandResult(r,total,unit,T);return;}
    const msg=validateParts(a,g,k,kr,t);if(msg)return err(r,msg);renderLandResult(r,total,unit,partsToTil(a,g,k,kr,t));
  };
  $('fsReset').onclick=()=>{['fsTotalLand'].forEach(id=>$(id).value='');['fsAnaSymbol','fsGonda','fsKora','fsKranti','fsTil'].forEach(id=>$(id).value='0');$('fsResult').innerHTML='';};
  // Irregular quadrilateral: AC or BD diagonal, area + all four interior angles + live drawing.
  const tri=(a,b,c)=>{const s=(a+b+c)/2,z=s*(s-a)*(s-b)*(s-c);return z>1e-12?Math.sqrt(z):null};
  const angle=(x,y,z)=>{const den=2*x*y;if(!(den>0))return null;let c=(x*x+y*y-z*z)/den;c=Math.max(-1,Math.min(1,c));return Math.acos(c)*180/Math.PI};
  const readFeetInches=(ftId,inId)=>{
    const ftText=$(ftId)?.value.trim()||'', inText=$(inId)?.value.trim()||'';
    const ft=ftText===''?0:Number(ftText),inch=inText===''?0:Number(inText);
    if(!Number.isFinite(ft)||!Number.isFinite(inch)||ft<0||inch<0||inch>=12)return null;
    return ft+inch/12;
  };
  const fqInputs=['fqABft','fqABin','fqBCft','fqBCin','fqCDft','fqCDin','fqDAft','fqDAin','fqACft','fqACin','fqBDft','fqBDin'];
  const fqPoint=(base,fromStart,fromEnd)=>{
    if(!(base>0))return null;
    const x=(fromStart*fromStart+base*base-fromEnd*fromEnd)/(2*base), y2=fromStart*fromStart-x*x;
    if(y2 < -1e-7)return null;
    return {x,y:Math.sqrt(Math.max(0,y2))};
  };
  const fqTriangleValid=(a,b,c)=>a+b>c+1e-8&&a+c>b+1e-8&&b+c>a+1e-8;
  const fqDraw=()=>{
    const host=$('fqDrawing'); if(!host)return;
    const unit=$('fqUnit')?.value||'ft', which=$('fqDiagonalType')?.value==='BD'?'BD':'AC';
    const vals={AB:readFeetInches('fqABft','fqABin'),BC:readFeetInches('fqBCft','fqBCin'),CD:readFeetInches('fqCDft','fqCDin'),DA:readFeetInches('fqDAft','fqDAin'),AC:readFeetInches('fqACft','fqACin'),BD:readFeetInches('fqBDft','fqBDin')};
    const chosen=vals[which], all=[vals.AB,vals.BC,vals.CD,vals.DA,chosen];
    if(all.some(v=>v===null)){host.innerHTML='<div class="warning">ফুটের মান ০ বা তার বেশি এবং ইঞ্চি ০ থেকে ১১.৯৯৯-এর মধ্যে দিন।</div>';return;}
    if(all.some(v=>!(v>0))){host.innerHTML='<div class="calc-help">চার বাহু ও নির্বাচিত কর্ণের বৈধ ফুট–ইঞ্চি মাপ দিলে ড্রয়িং স্বয়ংক্রিয়ভাবে তৈরি হবে।</div>';return;}
    const factor=unit==='m'?0.3048:1, ab=vals.AB*factor,bc=vals.BC*factor,cd=vals.CD*factor,da=vals.DA*factor,diag=chosen*factor;
    let pts;
    if(which==='AC'){
      if(!fqTriangleValid(ab,bc,diag)||!fqTriangleValid(da,cd,diag)){host.innerHTML='<div class="warning">নির্বাচিত AC কর্ণ দিয়ে দুটি বৈধ ত্রিভুজ তৈরি হচ্ছে না। মাপ যাচাই করুন।</div>';return;}
      const b=fqPoint(diag,ab,bc),d=fqPoint(diag,da,cd);if(!b||!d){host.innerHTML='<div class="warning">প্রদত্ত মাপ জ্যামিতিকভাবে সামঞ্জস্যপূর্ণ নয়।</div>';return;}
      pts={A:{x:0,y:0},B:b,C:{x:diag,y:0},D:{x:d.x,y:-d.y}};
    } else {
      if(!fqTriangleValid(ab,da,diag)||!fqTriangleValid(bc,cd,diag)){host.innerHTML='<div class="warning">নির্বাচিত BD কর্ণ দিয়ে দুটি বৈধ ত্রিভুজ তৈরি হচ্ছে না। মাপ যাচাই করুন।</div>';return;}
      const a=fqPoint(diag,ab,da),c=fqPoint(diag,bc,cd);if(!a||!c){host.innerHTML='<div class="warning">প্রদত্ত মাপ জ্যামিতিকভাবে সামঞ্জস্যপূর্ণ নয়।</div>';return;}
      pts={B:{x:0,y:0},A:a,D:{x:diag,y:0},C:{x:c.x,y:-c.y}};
    }
    // Rotate the whole measured shape so AB (north) is horizontal; geometry and lengths remain unchanged.
    const dx=pts.B.x-pts.A.x,dy=pts.B.y-pts.A.y,base=Math.hypot(dx,dy),ux=dx/base,uy=dy/base;
    const rotated={};
    Object.keys(pts).forEach(k=>{const vx=pts[k].x-pts.A.x,vy=pts[k].y-pts.A.y;rotated[k]={x:vx*ux+vy*uy,y:-vx*uy+vy*ux};});
    const side=(rotated.C.y+rotated.D.y)/2;
    Object.keys(rotated).forEach(k=>{if(side>0)rotated[k].y=-rotated[k].y;});
    pts=rotated;
    const arr=Object.values(pts), minX=Math.min(...arr.map(p=>p.x)),maxX=Math.max(...arr.map(p=>p.x)),minY=Math.min(...arr.map(p=>p.y)),maxY=Math.max(...arr.map(p=>p.y));
    const W=720,H=440,padX=155,padY=105,scale=Math.min((W-2*padX)/Math.max(maxX-minX,1e-6),(H-2*padY)/Math.max(maxY-minY,1e-6)),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    const map=p=>({x:W/2+(p.x-cx)*scale,y:H/2-(p.y-cy)*scale}),P={A:map(pts.A),B:map(pts.B),C:map(pts.C),D:map(pts.D)};
    const poly=['A','B','C','D'].map(k=>`${P[k].x.toFixed(2)},${P[k].y.toFixed(2)}`).join(' '), mid=(a,b)=>({x:(P[a].x+P[b].x)/2,y:(P[a].y+P[b].y)/2});
    const lab=(a,b,t,offset=15)=>{const m=mid(a,b),p=P[a],q=P[b];let deg=Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI;if(deg>90)deg-=180;if(deg< -90)deg+=180;return `<text x="${m.x}" y="${m.y-offset}" transform="rotate(${deg} ${m.x} ${m.y-offset})" class="qd-dim" text-anchor="middle">${t}</text>`;};
    const f=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2}),len=v=>unit==='ft'?`${f(Math.floor(v))}′ ${f((v-Math.floor(v))*12)}″`:`${f(v*0.3048)} মি`;
    let ang;
    if(which==='AC') ang={A:angle(ab,diag,bc)+angle(da,diag,cd),B:angle(ab,bc,diag),C:angle(bc,diag,ab)+angle(cd,diag,da),D:angle(cd,da,diag)};
    else ang={A:angle(ab,da,diag),B:angle(ab,diag,da)+angle(bc,diag,cd),C:angle(bc,cd,diag),D:angle(da,diag,ab)+angle(cd,diag,bc)};
    // Angle values are highlighted OUTSIDE the plot and connected to their matching vertices.
    const centroid={x:(P.A.x+P.B.x+P.C.x+P.D.x)/4,y:(P.A.y+P.B.y+P.C.y+P.D.y)/4};
    const angleLabels=['A','B','C','D'].map(k=>{
      const p=P[k],dx=p.x-centroid.x,dy=p.y-centroid.y,n=Math.hypot(dx,dy)||1,ux=dx/n,uy=dy/n;
      const lx=p.x+ux*55,ly=p.y+uy*55,anchor=ux>0.28?'start':ux< -0.28?'end':'middle';
      const label=`∠${k} ${f(ang[k])}°`,width=Math.max(88,label.length*7.2+16);
      const left=anchor==='start'?lx-5:anchor==='end'?lx-width+5:lx-width/2,tx=anchor==='start'?lx+4:anchor==='end'?lx-4:lx;
      return `<g class="qd-angle-callout"><line x1="${p.x+ux*7}" y1="${p.y+uy*7}" x2="${lx}" y2="${ly}" class="qd-angle-leader"/><rect x="${left}" y="${ly-14}" width="${width}" height="28" rx="7" class="qd-angle-badge"/><text x="${tx}" y="${ly+4.5}" class="qd-angle-label" text-anchor="${anchor}">${label}</text></g>`;
    }).join('');
    host.innerHTML=`<div class="qd-drawing-head"><strong>প্লটের স্বয়ংক্রিয় ড্রয়িং</strong><span>উত্তর উপরে • কর্ণ ${which} • মাপ পরিবর্তনে আপডেট হবে</span></div><svg class="qd-plot-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="ইনপুট মাপ অনুযায়ী উত্তর উপরে রেখে আঁকা অনিয়মিত চতুর্ভুজের ড্রয়িং"><style>.qd-angle-badge{fill:#fff7cc;stroke:#b45309;stroke-width:1.8}.qd-angle-label{font-size:13px;font-weight:800;fill:#7c2d12;pointer-events:none}.qd-angle-leader{stroke:#b45309;stroke-width:1.6;stroke-dasharray:3 2}</style><polygon points="${poly}" fill="#dcefe6" fill-opacity=".75" stroke="#16794b" stroke-width="4" stroke-linejoin="round"/><line x1="${P[which[0]].x}" y1="${P[which[0]].y}" x2="${P[which[1]].x}" y2="${P[which[1]].y}" stroke="#c2410c" stroke-width="3" stroke-dasharray="9 7"/>${lab('A','B',`উত্তর ${len(vals.AB)}`)}${lab('B','C',`পূর্ব ${len(vals.BC)}`)}${lab('C','D',`দক্ষিণ ${len(vals.CD)}`)}${lab('D','A',`পশ্চিম ${len(vals.DA)}`)}<text x="${mid(which[0],which[1]).x+8}" y="${mid(which[0],which[1]).y-12}" class="qd-diag-label">${which} ${len(chosen)}</text>${angleLabels}${['A','B','C','D'].map(k=>`<circle cx="${P[k].x}" cy="${P[k].y}" r="5" fill="#14532d"/><text x="${P[k].x+9}" y="${P[k].y-9}" class="qd-point-label">${k}</text>`).join('')}</svg><p class="calc-help">বাহুর মাপের লেখা সংশ্লিষ্ট রেখার সমান্তরালে দেখানো হয়েছে। কোণগুলো নির্বাচিত কর্ণের ভিত্তিতে গণনা করা; এটি মাপভিত্তিক জ্যামিতিক স্কেচ, বাস্তব সীমানার সঙ্গে মিলিয়ে নিন।</p>`;
  };
  const fqCalc=()=>{
    const aFt=readFeetInches('fqABft','fqABin'),bFt=readFeetInches('fqBCft','fqBCin'),cFt=readFeetInches('fqCDft','fqCDin'),dFt=readFeetInches('fqDAft','fqDAin'),which=$('fqDiagonalType').value,diagFt=readFeetInches(which==='BD'?'fqBDft':'fqACft',which==='BD'?'fqBDin':'fqACin'),u=$('fqUnit').value,r=$('fqResult');
    if([aFt,bFt,cFt,dFt,diagFt].some(v=>v===null||!(v>0)))return err(r,`চারটি বাহু ও কর্ণ ${which}—সবগুলোর সঠিক ফুট ও ইঞ্চির মান দিন। ইঞ্চি ১২-এর কম হতে হবে।`);
    const scale=u==='m'?0.3048:1,a=aFt*scale,b=bFt*scale,c=cFt*scale,d=dFt*scale,diag=diagFt*scale;
    let t1,t2,A,B,C,D;
    if(which==='AC'){
      t1=tri(a,b,diag);t2=tri(c,d,diag);if(t1===null||t2===null)return err(r,'এই মাপগুলো দিয়ে কর্ণ AC-তে দুটি বৈধ ত্রিভুজ তৈরি হচ্ছে না। মাপ যাচাই করুন।');
      A=angle(a,diag,b)+angle(d,diag,c);B=angle(a,b,diag);C=angle(b,diag,a)+angle(c,diag,d);D=angle(c,d,diag);
    }else{
      t1=tri(a,d,diag);t2=tri(b,c,diag);if(t1===null||t2===null)return err(r,'এই মাপগুলো দিয়ে কর্ণ BD-তে দুটি বৈধ ত্রিভুজ তৈরি হচ্ছে না। মাপ যাচাই করুন।');
      A=angle(a,d,diag);B=angle(a,diag,d)+angle(b,diag,c);C=angle(b,c,diag);D=angle(d,diag,a)+angle(c,diag,b);
    }
    const sum=A+B+C+D;if(![A,B,C,D].every(Number.isFinite)||Math.abs(sum-360)>1e-7)return err(r,'কোণ নির্ণয়ে জ্যামিতিক অসামঞ্জস্য পাওয়া গেছে। মাঠের মাপ/কর্ণ পুনরায় যাচাই করুন।');
    const area=t1+t2,sqft=u==='ft'?area:area*10.763910416709722,dec=sqft/435.6;
    r.innerHTML='<div class="result-main">মোট ক্ষেত্রফল = '+fmt(area)+' '+(u==='ft'?'বর্গফুট':'বর্গমিটার')+'</div><div class="result-list"><div class="result-item result-item-primary"><strong>'+fmt(sqft,4)+' বর্গফুট</strong><span>মোট ক্ষেত্রফল</span></div><div class="result-item"><strong>'+fmt(dec,6)+' শতাংশ</strong><span>ডেসিমেল</span></div><div class="result-item"><strong>'+fmt(t1)+' '+(u==='ft'?'বর্গফুট':'বর্গমিটার')+'</strong><span>'+(which==='AC'?'△ABC':'△ABD')+'</span></div><div class="result-item"><strong>'+fmt(t2)+' '+(u==='ft'?'বর্গফুট':'বর্গমিটার')+'</strong><span>'+(which==='AC'?'△ACD':'△BCD')+'</span></div></div><div class="angle-grid"><div class="angle-box"><strong>'+fmt(A,6)+'°</strong><span>∠A</span></div><div class="angle-box"><strong>'+fmt(B,6)+'°</strong><span>∠B</span></div><div class="angle-box"><strong>'+fmt(C,6)+'°</strong><span>∠C</span></div><div class="angle-box"><strong>'+fmt(D,6)+'°</strong><span>∠D</span></div></div><p class="conversion-note">যাচাই: চার কোণের যোগফল ≈ ৩৬০°। হিসাবটি সরল উত্তল চতুর্ভুজ ও নির্বাচিত ${which} কর্ণের সঠিক মাপ ধরে করা হয়েছে।</p>';
  };
  $('fqCalc').onclick=fqCalc;
  fqInputs.concat(['fqDiagonalType','fqUnit']).forEach(id=>{const el=$(id);if(el){el.addEventListener('input',fqDraw);el.addEventListener('change',fqDraw);}});
  $('fqReset').onclick=()=>{fqInputs.forEach(id=>{if($(id))$(id).value='';});$('fqResult').innerHTML='';fqDraw();};
  fqDraw();
  // Reverse land -> hissa.
  function reverseHissa(){
    const total=Number($('frTotal').value),own=Number($('frOwn').value),u=$('frUnit').value,r=$('frResult');
    if(!(total>0&&own>=0))return err(r,'মোট জমি ০-এর বেশি এবং আপনার জমি ০ বা তার বেশি দিন।');if(own>total+1e-10)return err(r,'আপনার জমির পরিমাণ মোট জমির চেয়ে বেশি হতে পারবে না.');
    const ratio=own/total, raw=ratio*T, til=Math.round(raw);if(til>T)return err(r,'হিস্যা পূর্ণ সম্পত্তির বেশি হয়েছে।');
    const fractionalTil=raw-Math.floor(raw), roundingDelta=til-raw;
    const a=Math.floor(til/G),remA=til-a*G,g=Math.floor(remA/K),remG=remA-g*K,k=Math.floor(remG/KR),remK=remG-k*KR,kr=Math.floor(remK/20),t=remK-kr*20;
    const symbol=a<=16?anaSymbols[a]:'—';
    r.innerHTML='<div class="result-main">আপনার হিস্যা ≈ '+fmt(ratio,8)+'</div><div class="result-list"><div class="result-item result-item-primary"><strong>'+a+' আনা '+g+' গণ্ডা '+k+' কড়া '+kr+' ক্রান্তি '+t+' তিল</strong><span>নিকটতম পূর্ণ তিল অনুযায়ী হিস্যা</span></div><div class="result-item"><strong>'+symbol+'</strong><span>আনার সাংকেতিক চিহ্ন</span></div><div class="result-item"><strong>'+fmt(ratio*100,6)+'%</strong><span>মোট সম্পত্তির অংশ</span></div><div class="result-item"><strong>'+fmt(raw,6)+' তিল</strong><span>রাউন্ডিংয়ের আগের হিস্যা</span></div><div class="result-item"><strong>'+fmt(fractionalTil,6)+' তিল</strong><span>কাঁচা হিসাবে পূর্ণ তিলের পর ভগ্নাংশ</span></div><div class="result-item"><strong>'+(roundingDelta>0?'+':'')+fmt(roundingDelta,6)+' তিল</strong><span>নিকটতম পূর্ণ তিলে রাউন্ডিং পার্থক্য</span></div></div><p class="conversion-note">রূপান্তরের ভিত্তি: ১৬ আনা = ৭৬,৮০০ তিল। হিস্যার প্রচলিত এককে তিল পূর্ণসংখ্যা হওয়ায় ফল নিকটতম পূর্ণ তিলে দেখানো হয়েছে; ভগ্নাংশ ও রাউন্ডিং পার্থক্য আলাদাভাবে দেখানো হয়েছে।</p>';
  }
  $('frCalc').onclick=reverseHissa;$('frReset').onclick=()=>{['frTotal','frOwn'].forEach(id=>$(id).value='');$('frResult').innerHTML='';};
  // Featured calculator cards act as an accordion.
})();
