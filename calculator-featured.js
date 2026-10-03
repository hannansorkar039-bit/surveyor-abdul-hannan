

(() => {
  const $ = id => document.getElementById(id);
  const fmt = (n,d=4) => Number(n).toLocaleString('en-US',{maximumFractionDigits:d});
  const bn = n => Number(n).toLocaleString('bn-BD',{maximumFractionDigits:6});
  const esc = s => String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const T=76800, G=4800, K=240, KR=80, TL=1;
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
  function calcFromFields(prefix,resultId){
    const total=Number($(prefix+'TotalLand').value), unit=$(prefix+'LandUnit').value;
    const [a,g,k,kr,t]=readParts([prefix+'Ana',prefix+'Gonda',prefix+'Kora',prefix+'Kranti',prefix+'Til']);
    const r=$(resultId);
    if(!(total>0)) return err(r,'মোট জমির পরিমাণ ০-এর বেশি দিন।');
    const msg=validateParts(a,g,k,kr,t); if(msg) return err(r,msg);
    renderLandResult(r,total,unit,partsToTil(a,g,k,kr,t));
  }
  // Fill symbolic selects.
  anaSymbols.forEach((sym,i)=>{const o=document.createElement('option');o.value=i;o.textContent=i+' আনা — '+sym;$('fsAnaSymbol').appendChild(o)});
  for(let i=0;i<=19;i++){const o=document.createElement('option');o.value=i;o.textContent=i+' গণ্ডা';$('fsGonda').appendChild(o);$('fsTil').appendChild(Object.assign(document.createElement('option'),{value:i,textContent:i+' তিল'}));}
  for(let i=0;i<=3;i++){const o=document.createElement('option');o.value=i;o.textContent=i+' কড়া';$('fsKora').appendChild(o)}
  for(let i=0;i<=2;i++){const o=document.createElement('option');o.value=i;o.textContent=i+' ক্রান্তি';$('fsKranti').appendChild(o)}
  $('fhCalc').onclick=()=>calcFromFields('fh','fhResult');
  $('fhReset').onclick=()=>{['fhTotalLand','fhAna','fhGonda','fhKora','fhKranti','fhTil'].forEach(id=>$(id).value=id==='fhTotalLand'?'':'0');$('fhResult').innerHTML='';};
  $('fsCalc').onclick=()=>{
    const total=Number($('fsTotalLand').value), unit=$('fsLandUnit').value, a=Number($('fsAnaSymbol').value),g=Number($('fsGonda').value),k=Number($('fsKora').value),kr=Number($('fsKranti').value),t=Number($('fsTil').value),r=$('fsResult');
    if(!(total>0)) return err(r,'মোট জমির পরিমাণ ০-এর বেশি দিন।');
    if(a===16 && (g||k||kr||t)) return err(r,'১৬ আনা পূর্ণ হিস্যা; এর সঙ্গে গণ্ডা/কড়া/ক্রান্তি/তিল যোগ করা যাবে না।');
    if(a===16){renderLandResult(r,total,unit,T);return;}
    const msg=validateParts(a,g,k,kr,t);if(msg)return err(r,msg);renderLandResult(r,total,unit,partsToTil(a,g,k,kr,t));
  };
  $('fsReset').onclick=()=>{['fsTotalLand'].forEach(id=>$(id).value='');['fsAnaSymbol','fsGonda','fsKora','fsKranti','fsTil'].forEach(id=>$(id).value='0');$('fsResult').innerHTML='';};
  // Irregular quadrilateral: area + all four interior angles.
  const tri=(a,b,c)=>{const s=(a+b+c)/2,z=s*(s-a)*(s-b)*(s-c);return z>1e-12?Math.sqrt(z):null};
  const angle=(x,y,z)=>{const den=2*x*y;if(!(den>0))return null;let c=(x*x+y*y-z*z)/den;c=Math.max(-1,Math.min(1,c));return Math.acos(c)*180/Math.PI};
  const readFeetInches=(ftId,inId)=>{
    const ft=Number($(ftId).value),inch=Number($(inId).value||0);
    if(!Number.isFinite(ft)||!Number.isFinite(inch)||ft<0||inch<0||inch>=12)return null;
    return ft+inch/12;
  };
  $('fqCalc').onclick=()=>{
    const aFt=readFeetInches('fqABft','fqABin'),bFt=readFeetInches('fqBCft','fqBCin'),cFt=readFeetInches('fqCDft','fqCDin'),dFt=readFeetInches('fqDAft','fqDAin'),diagFt=readFeetInches('fqACft','fqACin'),u=$('fqUnit').value,r=$('fqResult');
    if([aFt,bFt,cFt,dFt,diagFt].some(v=>v===null||!(v>0)))return err(r,'চারটি বাহু ও কর্ণ AC—সবগুলোর সঠিক ফুট ও ইঞ্চির মান দিন। ইঞ্চি ১২-এর কম হতে হবে।');
    const scale=u==='m'?0.3048:1;
    const a=aFt*scale,b=bFt*scale,c=cFt*scale,d=dFt*scale,diag=diagFt*scale;
    const t1=tri(a,b,diag),t2=tri(c,d,diag);
    if(t1===null||t2===null)return err(r,'এই মাপগুলো দিয়ে দুটি বৈধ ত্রিভুজ তৈরি হচ্ছে না। কর্ণ AC অবশ্যই উভয় ত্রিভুজের triangle inequality পূরণ করবে।');
    // Triangle ABC: A1 + B + C1 = 180°. Triangle ACD: A2 + C2 + D = 180°.
    // The diagonal AC is shared, so the quadrilateral interior angles are:
    // A=A1+A2, B=B, C=C1+C2, D=D. This removes the previous incorrect C-angle formula.
    const A1=angle(a,diag,b),A2=angle(d,diag,c),A=A1+A2;
    const B=angle(a,b,diag);
    const C1=angle(b,diag,a),C2=angle(c,diag,d),C=C1+C2;
    const D=angle(c,d,diag);
    const sum=A+B+C+D;
    if(![A,B,C,D].every(Number.isFinite)||Math.abs(sum-360)>1e-8)return err(r,'কোণ নির্ণয়ে জ্যামিতিক অসামঞ্জস্য পাওয়া গেছে। মাঠের মাপ/কর্ণ পুনরায় যাচাই করুন।');
    const area=t1+t2, sqft=(u==='ft'?area:area*10.763910416709722), dec=sqft/435.6;
    r.innerHTML='<div class="result-main">মোট ক্ষেত্রফল = '+fmt(area)+' '+(u==='ft'?'বর্গফুট':'বর্গমিটার')+'</div><div class="result-list">'+
      '<div class="result-item result-item-primary"><strong>'+fmt(sqft,4)+' বর্গফুট</strong><span>মোট ক্ষেত্রফল</span></div><div class="result-item"><strong>'+fmt(dec,6)+' শতাংশ</strong><span>ডেসিমেল</span></div><div class="result-item"><strong>'+fmt(t1)+' '+(u==='ft'?'বর্গফুট':'বর্গমিটার')+'</strong><span>△ABC</span></div><div class="result-item"><strong>'+fmt(t2)+' '+(u==='ft'?'বর্গফুট':'বর্গমিটার')+'</strong><span>△ACD</span></div></div>'+ 
      '<div class="angle-grid"><div class="angle-box"><strong>'+fmt(A,6)+'°</strong><span>∠A</span></div><div class="angle-box"><strong>'+fmt(B,6)+'°</strong><span>∠B</span></div><div class="angle-box"><strong>'+fmt(C,6)+'°</strong><span>∠C</span></div><div class="angle-box"><strong>'+fmt(D,6)+'°</strong><span>∠D</span></div></div><p class="conversion-note">যাচাই: চার কোণের যোগফল ≈ ৩৬০°। এই হিসাব একটি সরল, উত্তল চতুর্ভুজ এবং সঠিক A–C কর্ণের মাপ ধরে করা হয়েছে।</p>';
  };
  $('fqReset').onclick=()=>{['fqABft','fqABin','fqBCft','fqBCin','fqCDft','fqCDin','fqDAft','fqDAin','fqACft','fqACin'].forEach(id=>$(id).value='');$('fqResult').innerHTML='';};
  // Exact rectangular separation.
  $('fsepCalc').onclick=()=>{
    const L=Number($('fsepLength').value),W=Number($('fsepWidth').value),p=Number($('fsepPercent').value),u=$('fsepUnit').value,r=$('fsepResult');
    if(!(L>0&&W>0))return err(r,'দৈর্ঘ্য ও প্রস্থ ০-এর বেশি দিন।');if(!(p>0&&p<100))return err(r,'পৃথক করার শতাংশ ০-এর বেশি এবং ১০০%-এর কম হতে হবে.');
    const cut=L*p/100, area=L*W, part=area*p/100;const areaSqft=u==='ft'?part:part*10.763910416709722;const partDec=areaSqft/435.6;
    r.innerHTML='<div class="result-main">বিভাজন রেখা = '+fmt(cut,6)+' '+(u==='ft'?'ফুট':'মিটার')+' (এক প্রান্ত থেকে)</div><div class="result-list"><div class="result-item result-item-primary"><strong>'+fmt(part,6)+' '+(u==='ft'?'বর্গফুট':'বর্গমিটার')+'</strong><span>পৃথক অংশ</span></div><div class="result-item"><strong>'+fmt(100-p,6)+'%</strong><span>অবশিষ্ট অংশ</span></div><div class="result-item"><strong>'+fmt(area,6)+' '+(u==='ft'?'বর্গফুট':'বর্গমিটার')+'</strong><span>মোট ক্ষেত্রফল</span></div><div class="result-item"><strong>'+fmt(partDec,6)+' শতাংশ</strong><span>পৃথক অংশের ডেসিমেল</span></div></div><p class="conversion-note">শর্ত: জমিটি আয়তক্ষেত্র/সমান প্রস্থের এবং বিভাজন রেখা দৈর্ঘ্যের উপর লম্ব ধরে নেওয়া হয়েছে। অনিয়মিত চতুর্ভুজে এই সূত্র ব্যবহার করবেন না।</p>';
  };
  $('fsepReset').onclick=()=>{['fsepLength','fsepWidth','fsepPercent'].forEach(id=>$(id).value='');$('fsepResult').innerHTML='';};
  // Reverse land -> hissa.
  function reverseHissa(){
    const total=Number($('frTotal').value),own=Number($('frOwn').value),u=$('frUnit').value,r=$('frResult');
    if(!(total>0&&own>=0))return err(r,'মোট জমি ০-এর বেশি এবং আপনার জমি ০ বা তার বেশি দিন।');if(own>total+1e-10)return err(r,'আপনার জমির পরিমাণ মোট জমির চেয়ে বেশি হতে পারবে না.');
    const ratio=own/total, raw=ratio*T, til=Math.round(raw);if(til>T)return err(r,'হিস্যা পূর্ণ সম্পত্তির বেশি হয়েছে।');
    const a=Math.floor(til/G),remA=til-a*G,g=Math.floor(remA/K),remG=remA-g*K,k=Math.floor(remG/KR),remK=remG-k*KR,kr=Math.floor(remK/20),t=remK-kr*20;
    const symbol=a<=16?anaSymbols[a]:'—';
    r.innerHTML='<div class="result-main">আপনার হিস্যা ≈ '+fmt(ratio,8)+'</div><div class="result-list"><div class="result-item result-item-primary"><strong>'+a+' আনা '+g+' গণ্ডা '+k+' কড়া '+kr+' ক্রান্তি '+t+' তিল</strong><span>নিকটতম তিল পর্যন্ত</span></div><div class="result-item"><strong>'+symbol+'</strong><span>আনার সাংকেতিক চিহ্ন</span></div><div class="result-item"><strong>'+fmt(ratio*100,6)+'%</strong><span>মোট সম্পত্তির অংশ</span></div><div class="result-item"><strong>'+fmt(raw,3)+' তিল → '+til+' তিল</strong><span>রাউন্ডিং যাচাই</span></div></div><p class="conversion-note">আপনার দেওয়া পরিমাণটি ৭৬,৮০০ তিলের পূর্ণ হিস্যার স্কেলে রূপান্তর করা হয়েছে। ফলে ভগ্নাংশের ক্ষেত্রে নিকটতম তিল পর্যন্ত সামান্য rounding হতে পারে।</p>';
  }
  $('frCalc').onclick=reverseHissa;$('frReset').onclick=()=>{['frTotal','frOwn'].forEach(id=>$(id).value='');$('frResult').innerHTML='';};
  // Featured calculator cards act as an accordion: only the selected calculator is open.
  const featureCards=[...document.querySelectorAll('[data-feature-target]')];
  const featurePanels=featureCards.map(btn=>$(btn.dataset.featureTarget)).filter(Boolean);
  const openFeature=(btn,scroll=true)=>{
    const target=$(btn.dataset.featureTarget);
    if(!target)return;
    featureCards.forEach(card=>{
      const active=card===btn;
      card.setAttribute('aria-expanded',active?'true':'false');
    });
    featurePanels.forEach(panel=>{
      const active=panel===target;
      panel.hidden=!active;
      panel.classList.toggle('is-active',active);
    });
    if(scroll) target.scrollIntoView({behavior:'smooth',block:'start'});
  };
  featureCards.forEach((btn,index)=>{
    btn.setAttribute('aria-expanded',index===0?'true':'false');
    btn.setAttribute('aria-controls',btn.dataset.featureTarget);
    btn.addEventListener('click',()=>openFeature(btn,true));
  });
  featurePanels.forEach((panel,index)=>{
    panel.hidden=index!==0;
    panel.classList.toggle('is-active',index===0);
  });
})();
