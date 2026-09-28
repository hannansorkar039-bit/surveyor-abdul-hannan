// Surveyor Abdul Hannan — modular calculator component

(() => {
  const $ = id => document.getElementById(id);
  const fmt = (n, d=4) => Number(n).toLocaleString('en-US',{maximumFractionDigits:d});
  const esc = s => String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const sq = (value, unit) => {
    if (unit === 'ft') return {primary:value, primaryUnit:'sq ft', sqft:value, sqm:value*0.09290304};
    return {primary:value, primaryUnit:'sq m', sqft:value*10.763910416709722, sqm:value};
  };
  const landLines = (x, unit) => {
    const r=sq(x,unit);
    const decimal=r.sqft/435.6;
    const katha=r.sqft/720;
    const bigha=r.sqft/14400;
    const acre=r.sqft/43560;
    return `<div class="result-list">
      <div class="result-item result-item-primary"><strong>${fmt(r.primary)} ${r.primaryUnit}</strong><span>মূল ক্ষেত্রফল</span></div>
      <div class="result-item"><strong>${fmt(r.sqft)} sq ft</strong><span>বর্গফুট</span></div>
      <div class="result-item"><strong>${fmt(r.sqm)} sq m</strong><span>বর্গমিটার</span></div>
      <div class="result-item"><strong>${fmt(decimal)} শতক / ডেসিমেল</strong><span>১ শতক = ৪৩৫.৬ sq ft</span></div>
      <div class="result-item"><strong>${fmt(katha)} কাঠা</strong><span>বাংলাদেশে প্রচলিত: ১ কাঠা = ৭২০ sq ft</span></div>
      <div class="result-item"><strong>${fmt(bigha)} বিঘা</strong><span>১ বিঘা = ২০ কাঠা = ১৪,৪০০ sq ft</span></div>
      <div class="result-item"><strong>${fmt(acre)} একর</strong><span>১ একর = ৪৩,৫৬০ sq ft</span></div>
    </div><p class="conversion-note">একক রূপান্তরগুলো বাংলাদেশে প্রচলিত মান ধরে দেখানো হয়েছে। দলিল/রেকর্ডে ভিন্ন স্থানীয় মান থাকলে সংশ্লিষ্ট সরকারি/জরিপ মান অনুসরণ করুন।</p>`;
  };
  function err(el,msg){el.innerHTML=`<div class="warning">${esc(msg)}</div>`}
  document.querySelectorAll('.calc-tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.calc-tab').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.calc-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active'); $('panel-'+btn.dataset.tab).classList.add('active');
      document.querySelectorAll('.calc-tab').forEach(b=>b.setAttribute('aria-selected', b===btn ? 'true' : 'false'));
    });
  });
  const triangleArea=(a,b,c)=>{
    const s=(a+b+c)/2, z=s*(s-a)*(s-b)*(s-c);
    if(!(z>0)) return null;
    return Math.sqrt(z);
  };
  const ftIn=(v)=>{
    const sign=v<0?'-':''; v=Math.abs(v); const feet=Math.floor(v+1e-10); let inches=(v-feet)*12;
    let f=feet, i=Math.round(inches*100)/100;
    if(i>=12){f+=1;i=0;}
    const inText=(Math.abs(i-Math.round(i))<1e-9?String(Math.round(i)):i.toFixed(2));
    return `${sign}${f} ফুট ${inText} ইঞ্চি`;
  };
  const fmtAreaResult=(area,u,title,extra='')=>`<div class="result-main">${title} = ${fmt(area)} ${u==='ft'?'sq ft':'sq m'}</div>${extra}${landLines(area,u)}`;
  function readQuad(prefix){
    return ['AB','BC','CD','DA'].map(k=>+$(prefix+k).value);
  }
  function quadDiagonalArea(ab,bc,cd,da,diag){
    const t1=triangleArea(ab,bc,diag), t2=triangleArea(cd,da,diag);
    return t1&&t2?{t1,t2,area:t1+t2}:null;
  }
  $('qdCalc').onclick=()=>{
    const [ab,bc,cd,da]=readQuad('qd'), diag=+$('qdAC').value, u=$('qdUnit').value, r=$('qdResult');
    if(![ab,bc,cd,da,diag].every(v=>v>0)) return err(r,'চারটি বাহু ও কর্ণ AC—সবগুলোই শূন্যের চেয়ে বেশি দিন।');
    const q=quadDiagonalArea(ab,bc,cd,da,diag);
    if(!q) return err(r,'এই মাপগুলো দিয়ে দুটি বৈধ ত্রিভুজ গঠন হচ্ছে না। AC কর্ণটি AB–BC এবং AD–CD—উভয় ত্রিভুজের triangle inequality পূরণ করতে হবে।');
    const sq= sqrAreaForDisplay(q.area,u);
    r.innerHTML=fmtAreaResult(q.area,u,'মোট চতুর্ভুজের ক্ষেত্রফল',`<p>△ABC = ${fmt(q.t1)} ${u==='ft'?'sq ft':'sq m'} &nbsp;•&nbsp; △ACD = ${fmt(q.t2)} ${u==='ft'?'sq ft':'sq m'}</p><p>কর্ণ AC = ${fmt(diag)} ${u==='ft'?'ফুট':'মিটার'}</p>`);
  };
  function sqrAreaForDisplay(area,u){return u==='ft'?area:area;}
  $('qaCalc').onclick=()=>{
    const [ab,bc,cd,da]=readQuad('qa'), angle=+$('qaAngle').value, u=$('qaUnit').value, r=$('qaResult');
    if(![ab,bc,cd,da,angle].every(v=>v>0)) return err(r,'চারটি বাহু ও A কোণের সঠিক মান দিন।');
    if(!(angle>0&&angle<180)) return err(r,'A কোণ ০°-এর বেশি এবং ১৮০°-এর কম হতে হবে।');
    const rad=angle*Math.PI/180;
    const diag=Math.sqrt(ab*ab+da*da-2*ab*da*Math.cos(rad));
    const q=quadDiagonalArea(ab,bc,cd,da,diag);
    if(!q) return err(r,'দেওয়া বাহু ও কোণের সমন্বয়ে বৈধ চতুর্ভুজ গঠন হচ্ছে না। অনুগ্রহ করে মাঠের মাপগুলো পুনরায় যাচাই করুন।');
    r.innerHTML=fmtAreaResult(q.area,u,'মোট চতুর্ভুজের ক্ষেত্রফল',`<p>গাণিতিকভাবে নির্ণীত কর্ণ AC = ${fmt(diag)} ${u==='ft'?'ফুট':'মিটার'}</p><p>A কোণ = ${fmt(angle,6)}°</p>`);
  };
  $('qpCalc').onclick=()=>{
    const [ab,bc,cd,da]=readQuad('qp'), diag=+$('qpAC').value, totalUnit=$('qpTotalUnit').value, target=+$('qpTarget').value, targetUnit=$('qpTargetUnit').value, r=$('qpResult');
    if(![ab,bc,cd,da,diag,target].every(v=>v>0)) return err(r,'চারটি বাহু, কর্ণ AC এবং যে পরিমাণ জমি ভাগ করবেন—সবগুলোর সঠিক মান দিন।');
    const q=quadDiagonalArea(ab,bc,cd,da,diag);
    if(!q) return err(r,'দেওয়া বাহু ও কর্ণ দিয়ে বৈধ চতুর্ভুজ গঠন হচ্ছে না।');
    const totalSqft=totalUnit==='ft'?q.area:q.area*10.763910416709722;
    const targetSqft=targetUnit==='sqft'?target:targetUnit==='sqm'?target*10.763910416709722:target*435.6;
    if(targetSqft>=totalSqft-1e-8) return err(r,'ভাগের পরিমাণ মোট জমির চেয়ে কম হতে হবে।');
    const triACDsqft=totalUnit==='ft'?q.t2:q.t2*10.763910416709722;
    const wantTriangle=targetSqft<=triACDsqft+1e-8;
    const triangleTarget=wantTriangle?targetSqft:totalSqft-targetSqft;
    if(triangleTarget>triACDsqft+1e-8) return err(r,'এই নির্দিষ্ট A→CD ভাগরেখা দিয়ে চাওয়া পরিমাণ আলাদা করা সম্ভব নয়। অন্য একটি ভাগের দিক/বিন্দু নির্বাচন করতে হবে।');
    const fraction=triangleTarget/triACDsqft;
    const dp=cd*fraction;
    const cp=cd-dp;
    // Reconstruct D coordinates with A=(0,0), C=(diag,0).
    const dx=(da*da+diag*diag-cd*cd)/(2*diag);
    const dy2=da*da-dx*dx;
    if(!(dy2>=-1e-7)) return err(r,'জ্যামিতিকভাবে D-এর অবস্থান নির্ণয় করা যাচ্ছে না; মাপ যাচাই করুন।');
    const dy=Math.sqrt(Math.max(0,dy2));
    const px=dx+(diag-dx)*fraction, py=dy*(1-fraction);
    const ap=Math.hypot(px,py);
    const lengthToFt=v=>totalUnit==='ft'?v:v*3.280839895013123;
    const dpFt=lengthToFt(dp), cpFt=lengthToFt(cp), apFt=lengthToFt(ap);
    const targetDecimal=targetUnit==='decimal'?target:targetSqft/435.6;
    const otherDecimal=totalSqft/435.6-targetDecimal;
    const sideName=wantTriangle?'△ADP অংশ':'বাকি AB–BC–P অংশ';
    r.innerHTML=`<div class="result-main">মোট জমি = ${fmt(totalSqft)} sq ft</div>
      <div class="result-list">
        <div class="result-item result-item-primary"><strong>${fmt(targetSqft)} sq ft</strong><span>নির্ধারিত ভাগ = ${fmt(targetDecimal)} শতাংশ</span></div>
        <div class="result-item"><strong>${fmt(otherDecimal)} শতাংশ</strong><span>অবশিষ্ট ভাগ</span></div>
        <div class="result-item"><strong>${ftIn(dpFt)}</strong><span>D থেকে CD বাহুর উপর P পর্যন্ত</span></div>
        <div class="result-item"><strong>${ftIn(cpFt)}</strong><span>P থেকে C পর্যন্ত</span></div>
        <div class="result-item"><strong>${ftIn(apFt)}</strong><span>A থেকে ভাগ-বিন্দু P পর্যন্ত ভাগরেখা</span></div>
        <div class="result-item"><strong>${fmt(fraction*100,6)}%</strong><span>CD বাহুর D→C অংশের অনুপাত</span></div>
      </div>
      <p class="conversion-note"><strong>${sideName}</strong>-কে নির্ধারিত ভাগ হিসেবে নেওয়া হয়েছে। P বিন্দু CD বাহুর উপর বসবে এবং A–P হবে ভাগরেখা। ফলাফল জ্যামিতিকভাবে মাপ-ভিত্তিক; মাঠে দাগ টানার আগে বাস্তব সীমানা/দিক যাচাই করুন।</p>`;
  };
  $('heronCalc').onclick=()=>{
    const a=+$('heronA').value,b=+$('heronB').value,c=+$('heronC').value,u=$('heronUnit').value,r=$('heronResult');
    if(!(a>0&&b>0&&c>0)) return err(r,'তিনটি বাহুর মানই শূন্যের চেয়ে বেশি দিন।');
    if(a+b<=c||a+c<=b||b+c<=a) return err(r,'এই তিন বাহু দিয়ে বৈধ ত্রিভুজ তৈরি হয় না। যেকোনো দুই বাহুর যোগফল তৃতীয় বাহুর চেয়ে বেশি হতে হবে।');
    const s=(a+b+c)/2, area=Math.sqrt(s*(s-a)*(s-b)*(s-c));
    r.innerHTML=`<div class="result-main">ক্ষেত্রফল = ${fmt(area)} ${u==='ft'?'sq ft':'sq m'}</div><p>অর্ধপরিসীমা (s) = ${fmt(s)} ${u}</p>${landLines(area,u)}`;
  };
  $('braCalc').onclick=()=>{
    const a=+$('braA').value,b=+$('braB').value,c=+$('braC').value,d=+$('braD').value,u=$('braUnit').value,r=$('braResult');
    if(!(a>0&&b>0&&c>0&&d>0)) return err(r,'চারটি বাহুর মানই শূন্যের চেয়ে বেশি দিন।');
    const s=(a+b+c+d)/2, inside=(s-a)*(s-b)*(s-c)*(s-d);
    if(inside<0) return err(r,'দেওয়া চার বাহু দিয়ে এমন চতুর্ভুজ গঠন সম্ভব নয়।');
    const area=Math.sqrt(inside);
    r.innerHTML=`<div class="result-main">ব্রহ্মগুপ্ত ক্ষেত্রফল = ${fmt(area)} ${u==='ft'?'sq ft':'sq m'}</div><p>অর্ধপরিসীমা (s) = ${fmt(s)} ${u}</p><div class="warning">এই ফলটি ব্রহ্মগুপ্তের সূত্রের শর্ত অনুযায়ী <strong>cyclic quadrilateral</strong>-এর জন্য প্রযোজ্য। সাধারণ চতুর্ভুজে শুধু চার বাহু থেকে প্রকৃত ক্ষেত্রফল নিশ্চিত করা যায় না।</div>${landLines(area,u)}`;
  };

  const money=n=>'৳ '+Number(n||0).toLocaleString('bn-BD',{minimumFractionDigits:2,maximumFractionDigits:2});
  const frac=n=>{const k=[[1,2,'১/২'],[1,3,'১/৩'],[1,4,'১/৪'],[1,6,'১/৬'],[1,8,'১/৮'],[2,3,'২/৩'],[1,12,'১/১২'],[1,24,'১/২৪']];for(const [a,b,t] of k)if(Math.abs(n-a/b)<1e-8)return t;return (n*100).toFixed(2)+'%';};
  const F=[
    ['wives','জীবিত স্ত্রী','core'],['husband','জীবিত স্বামী','core'],['sons','জীবিত পুত্র','core'],['deceasedSons','মৃত পুত্র','core'],['daughters','জীবিত কন্যা','core'],['deceasedDaughters','মৃত কন্যা','core'],
    ['deadSonSons','মৃত পুত্রের পুত্র','descendants'],['deadSonDaughters','মৃত পুত্রের কন্যা','descendants'],['deadDaughterSons','মৃত কন্যার পুত্র','descendants'],['deadDaughterDaughters','মৃত কন্যার কন্যা','descendants'],['sonsons','পুত্রের পুত্র','descendants'],['sondaughters','পুত্রের কন্যা','descendants'],
    ['father','পিতা','ascendants'],['mother','মাতা','ascendants'],['grandfather','দাদা (পিতার পিতা)','ascendants'],['paternalGrandmother','দাদি (পিতার মাতা)','ascendants'],['maternalGrandmother','নানি (মাতার মাতা)','ascendants'],
    ['fullBrothers','সহোদর ভাই','siblings'],['fullSisters','সহোদর বোন','siblings'],['paternalHalfBrothers','সৎ ভাই (বৈমাত্রেয়)','siblings'],['paternalHalfSisters','সৎ বোন (বৈমাত্রেয়)','siblings'],['maternalBrothers','সৎ ভাই (বৈপিত্রেয়)','siblings'],['maternalSisters','সৎ বোন (বৈপিত্রেয়)','siblings'],['brotherSons','সহোদর ভাইয়ের পুত্র','siblings'],['paternalBrotherSons','সৎ ভাই (বৈমাত্রেয়)-এর পুত্র','siblings'],['brotherSonSons','সহোদর ভাইয়ের পুত্রের পুত্র','siblings'],['paternalBrotherSonSons','সৎ ভাই (বৈমাত্রেয়)-এর পুত্রের পুত্র','siblings'],
    ['paternalUncles','চাচা','uncles'],['paternalHalfUncles','চাচা (বৈমাত্রেয়)','uncles'],['paternalCousins','চাচাতো ভাই','uncles'],['paternalHalfCousins','চাচাতো ভাই (বৈমাত্রেয়)','uncles'],['paternalCousinSons','চাচাতো ভাইয়ের পুত্র','uncles'],['paternalHalfCousinSons','চাচাতো ভাই (বৈমাত্রেয়)-এর পুত্র','uncles'],['paternalCousinSonSons','চাচাতো ভাইয়ের পুত্রের পুত্র','uncles'],['paternalHalfCousinSonSons','চাচাতো ভাই (বৈমাত্রেয়)-এর পুত্রের পুত্র','uncles']
  ];
  const labels=Object.fromEntries(F.map(x=>[x[0],x[1]]));
  ['core','descendants','ascendants','siblings','uncles'].forEach(g=>{const box=$('heirs-'+g);F.filter(x=>x[2]===g).forEach(([id,label])=>{const max=id==='wives'?4:99;box.insertAdjacentHTML('beforeend',`<div class="heir-field"><label for="${id}">${label}</label><div class="heir-counter"><button type="button" data-minus="${id}" aria-label="${label} কমান">−</button><input id="${id}" type="number" min="0" max="${max}" step="1" value="0"><button type="button" data-plus="${id}" aria-label="${label} বাড়ান">+</button></div></div>`);});});
  document.querySelectorAll('[data-plus],[data-minus]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.plus||b.dataset.minus,i=$(id);let v=Math.max(0,Math.floor(+i.value||0));v+=b.dataset.plus?1:-1;v=Math.max(0,Math.min(+i.max||99,v));i.value=v;toggleGender();}));
  function toggleGender(){const male=$('deceasedGender').value==='male';$('wives').closest('.heir-field').style.display=male?'block':'none';$('husband').closest('.heir-field').style.display=male?'none':'block';if(male)$('husband').value=0;else $('wives').value=0;}
  $('deceasedGender').addEventListener('change',toggleGender);toggleGender();

  function v(id){return Math.max(0,Math.floor(+$(id).value||0));}
  function add(rows,name,count,share,reason,branchKey){if(share>1e-10)rows.push({name,count,share,each:share/(count||1),reason,branchKey});}
  function sum(o){return Object.values(o).reduce((a,b)=>a+b,0);}
  function computeShares(){
    const male=$('deceasedGender').value==='male', wives=v('wives'), husband=v('husband');
    const sons=v('sons'), deadSons=v('deceasedSons'), daughters=v('daughters'), deadDaughters=v('deceasedDaughters');
    const father=v('father'), mother=v('mother'), grandfather=v('grandfather'), pgm=v('paternalGrandmother'), mgm=v('maternalGrandmother');
    const fullB=v('fullBrothers'), fullS=v('fullSisters'), patB=v('paternalHalfBrothers'), patS=v('paternalHalfSisters'), matB=v('maternalBrothers'), matS=v('maternalSisters');
    const ss=v('sonsons'), sd=v('sondaughters');
    const statutoryDesc=deadSons+deadDaughters, hasDesc=(sons+daughters+deadSons+deadDaughters+ss+sd)>0;
    const hasMaleDesc=sons>0||ss>0;
    const rows=[],notes=[];
    function push(name,count,share,reason){if(share>1e-10)rows.push({name,count,share,each:share/(count||1),reason});}
    if(male&&wives)push(wives===1?'স্ত্রী':'স্ত্রীগণ',wives,hasDesc?1/8:1/4,hasDesc?'সন্তান/পুত্রের সন্তান থাকায় ১/৮':'সন্তান/পুত্রের সন্তান না থাকায় ১/৪');
    if(!male&&husband)push('স্বামী',1,hasDesc?1/4:1/2,hasDesc?'সন্তান/পুত্রের সন্তান থাকায় ১/৪':'সন্তান/পুত্রের সন্তান না থাকায় ১/২');
    const spouseShare=male?(wives?(hasDesc?1/8:1/4):0):(husband?(hasDesc?1/4:1/2):0);
    const siblingCount=fullB+fullS+patB+patS+matB+matS;
    if(mother){
      let ms=(father&&!hasDesc&&spouseShare)?(1-spouseShare)/3:((hasDesc||siblingCount>=2)?1/6:1/3);
      push('মাতা',1,ms,father&&!hasDesc&&spouseShare?'উমরিয়াতাইন: অবশিষ্টের ১/৩':((hasDesc||siblingCount>=2)?'সন্তান/বংশধর বা ২+ ভাই-বোন থাকায় ১/৬':'অন্যথায় ১/৩'));
    }
    if(!mother){
      const gs=[]; if(pgm)gs.push(['দাদি',pgm]); if(mgm)gs.push(['নানি',mgm]);
      if(gs.length)push(gs.length===1?gs[0][0]:'দাদি/নানি (সমষ্টিগত)',gs.reduce((a,x)=>a+x[1],0),1/6,'যোগ্য দাদি/নানি মিলিয়ে ১/৬');
    }
    if(father){
      if(hasMaleDesc)push('পিতা',1,1/6,'পুত্র/পুত্রের পুত্র থাকায় ১/৬');
      else if(hasDesc)push('পিতা',1,1/6,'কন্যা/পুত্রের কন্যা থাকায় ১/৬ এবং অবশিষ্টের দাবিদার');
    } else if(grandfather&&hasDesc) push('দাদা',1,1/6,'পিতা অনুপস্থিত; যোগ্য দাদা ১/৬ এবং অবশিষ্টের দাবিদার');
    // Direct children, including a deceased son/daughter as a statutory branch under section 4.
    const childSonBranches=sons+deadSons, childDaughterBranches=daughters+deadDaughters;
    if(childSonBranches>0){
      const fixedBeforeChildren=rows.reduce((a,x)=>a+x.share,0);
      const residueForChildren=Math.max(0,1-fixedBeforeChildren);
      const units=childSonBranches*2+childDaughterBranches, per=residueForChildren/(units||1);
      if(sons)push(sons===1?'পুত্র':'পুত্রগণ',sons,per*2*sons,'অবশিষ্ট অংশ; পুত্র-কন্যা ২:১ অনুপাতে');
      if(daughters)push(daughters===1?'কন্যা':'কন্যাগণ',daughters,per*daughters,'পুত্রের সঙ্গে অবশিষ্ট অংশে ২:১ অনুপাত');
      if(deadSons&&(v('deadSonSons')+v('deadSonDaughters'))){push('মৃত পুত্রের সন্তান (ধারা ৪)',v('deadSonSons')+v('deadSonDaughters'),per*2*deadSons,'MFLO 1961 ধারা ৪: মৃত পুত্র জীবিত থাকলে যে অংশ পেতেন, সেই শাখার সমপরিমাণ অংশ');notes.push('পূর্বমৃত পুত্রের সন্তানদের অংশ ধারা ৪-এর statutory representation হিসেবে দেখানো হয়েছে।');}
      if(deadDaughters&&(v('deadDaughterSons')+v('deadDaughterDaughters'))){push('মৃত কন্যার সন্তান (ধারা ৪)',v('deadDaughterSons')+v('deadDaughterDaughters'),per*deadDaughters,'MFLO 1961 ধারা ৪: মৃত কন্যা জীবিত থাকলে যে অংশ পেতেন, সেই শাখার সমপরিমাণ অংশ');notes.push('পূর্বমৃত কন্যার সন্তানদের অংশ ধারা ৪-এর statutory representation হিসেবে দেখানো হয়েছে।');}
      return {rows,notes,fixedTotal:rows.reduce((a,x)=>a+x.share,0),male,wives,husband,sons,deadSons,daughters,deadDaughters,ss,sd,father,mother,grandfather,fullB,fullS,patB,patS,matB,matS,hasDesc,hasMaleDesc,childSonBranches,childDaughterBranches,childrenConsumed:true};
    }
    // No direct son branch. Daughters/deceased daughters get fixed 1/2 or 2/3 collectively.
    if(childDaughterBranches>0){
      const ds=childDaughterBranches===1?1/2:2/3;
      if(daughters)push(daughters===1?'কন্যা':'কন্যাগণ',daughters,ds*(daughters/childDaughterBranches),childDaughterBranches===1?'একজন কন্যা: ১/২':'দুই বা ততোধিক কন্যা: ২/৩');
      if(deadDaughters&&(v('deadDaughterSons')+v('deadDaughterDaughters')))push('মৃত কন্যার সন্তান (ধারা ৪)',v('deadDaughterSons')+v('deadDaughterDaughters'),ds*(deadDaughters/childDaughterBranches),'MFLO 1961 ধারা ৪: মৃত কন্যা জীবিত থাকলে যে অংশ পেতেন');
    }
    // Son's descendants.
    if(sons===0&&ss===0&&sd>0){
      const before=rows.reduce((a,x)=>a+x.share,0);
      if(childDaughterBranches===0)push(sd===1?'পুত্রের কন্যা':'পুত্রের কন্যাগণ',sd,sd===1?1/2:2/3,sd===1?'একজন পুত্রের কন্যা: ১/২':'দুই বা ততোধিক পুত্রের কন্যা: ২/৩');
      else if(childDaughterBranches===1)push('পুত্রের কন্যা',sd,1/6,'একজন কন্যার সঙ্গে পরিপূরক ১/৬');
    }
    if(!hasDesc&&!father&&!grandfather&&(matB+matS)>0){
      const n=matB+matS; push(n===1?(matB?'বৈপিত্রেয় ভাই':'বৈপিত্রেয় বোন'):'বৈপিত্রেয় ভাই-বোন (সমষ্টিগত)',n,n===1?1/6:1/3,'বৈপিত্রেয় ভাই-বোনের নির্ধারিত অংশ');
    }
    const noNear=!hasDesc&&!father&&!grandfather;
    if(noNear&&fullB===0&&patB===0&&fullS>0){
      push(fullS===1?'সহোদর বোন':'সহোদর বোনগণ',fullS,fullS===1?1/2:2/3,fullS===1?'একজন সহোদর বোন: ১/২':'দুই বা ততোধিক সহোদর বোন: ২/৩');
      if(patS&&fullS===1)push('বৈমাত্রেয় বোন',patS,1/6,'একজন সহোদর বোনের সঙ্গে পরিপূরক ১/৬');
    } else if(noNear&&fullB===0&&patB===0&&patS>0){
      push(patS===1?'বৈমাত্রেয় বোন':'বৈমাত্রেয় বোনগণ',patS,patS===1?1/2:2/3,'বৈমাত্রেয় বোনের নির্ধারিত অংশ');
    }
    return {rows,notes,fixedTotal:rows.reduce((a,x)=>a+x.share,0),male,wives,husband,sons,deadSons,daughters,deadDaughters,ss,sd,father,mother,grandfather,fullB,fullS,patB,patS,matB,matS,hasDesc,hasMaleDesc,childSonBranches,childDaughterBranches,childrenConsumed:false};
  }
  $('inheritCalc').onclick=()=>{
    const r=$('inheritResult'),land=Math.max(0,+$('estateLand').value||0),estate=Math.max(0,+$('estateMoney').value||0),gold=Math.max(0,+$('estateGold').value||0);
    if(!(land||estate||gold))return err(r,'কমপক্ষে জমি, মুদ্রা বা স্বর্ণের একটি পরিমাণ দিন।');
    const c=computeShares(); let rows=c.rows.slice(), notes=c.notes.slice();
    const activeCount=F.reduce((n,[id])=>n+v(id),0);
    if(!activeCount)return err(r,'কমপক্ষে একজন জীবিত উত্তরাধিকারী নির্বাচন করুন।');
    let fixed=rows.reduce((a,x)=>a+x.share,0);
    if(fixed>1+1e-9){const scale=1/fixed;rows.forEach(x=>{x.share*=scale;x.each=x.share/(x.count||1);});fixed=1;notes.push('আউলনীতি: নির্ধারিত অংশের যোগফল ১-এর বেশি হওয়ায় আনুপাতিকভাবে সমন্বয় করা হয়েছে।');}
    let residue=Math.max(0,1-fixed),method='ফারায়েজ';
    if(!c.childrenConsumed){
      if(c.ss>0){
        const units=c.ss*2+c.sd,per=residue/units;pushRows();
        function pushRows(){rows.push({name:c.ss===1?'পুত্রের পুত্র':'পুত্রের পুত্রগণ',count:c.ss,share:per*2*c.ss,each:per*2,reason:'অবশিষ্টভোগী; পুত্রের পুত্র-কন্যা ২:১'});if(c.sd)rows.push({name:c.sd===1?'পুত্রের কন্যা':'পুত্রের কন্যাগণ',count:c.sd,share:per*c.sd,each:per,reason:'পুত্রের পুত্রের সঙ্গে অবশিষ্টে ২:১'});}
        residue=0;method='আসাবা — পুত্রের বংশধর';
      } else if(c.father){
        const row=rows.find(x=>x.name==='পিতা');if(row){row.share+=residue;row.each=row.share;row.reason+=(residue?' এবং অবশিষ্ট অংশ':'');}else rows.push({name:'পিতা',count:1,share:residue,each:residue,reason:'অবশিষ্টভোগী পিতা'});residue=0;method='আসাবা — পিতা';
      } else if(c.grandfather){
        const row=rows.find(x=>x.name==='দাদা');if(row){row.share+=residue;row.each=row.share;row.reason+=(residue?' এবং অবশিষ্ট অংশ':'');}else rows.push({name:'দাদা',count:1,share:residue,each:residue,reason:'অবশিষ্টভোগী দাদা'});residue=0;method='আসাবা — দাদা';
      } else {
        const candidates=[['সহোদর ভাই',c.fullB],['বৈমাত্রেয় ভাই',c.patB],['সহোদর ভাইয়ের পুত্র',v('brotherSons')],['বৈমাত্রেয় ভাইয়ের পুত্র',v('paternalBrotherSons')],['সহোদর ভাইয়ের পুত্রের পুত্র',v('brotherSonSons')],['বৈমাত্রেয় ভাইয়ের পুত্রের পুত্র',v('paternalBrotherSonSons')],['চাচা',v('paternalUncles')],['চাচা (বৈমাত্রেয়)',v('paternalHalfUncles')],['চাচাতো ভাই',v('paternalCousins')],['চাচাতো ভাই (বৈমাত্রেয়)',v('paternalHalfCousins')],['চাচাতো ভাইয়ের পুত্র',v('paternalCousinSons')],['চাচাতো ভাই (বৈমাত্রেয়)-এর পুত্র',v('paternalHalfCousinSons')],['চাচাতো ভাইয়ের পুত্রের পুত্র',v('paternalCousinSonSons')],['চাচাতো ভাই (বৈমাত্রেয়)-এর পুত্রের পুত্র',v('paternalHalfCousinSonSons')]];
        const g=candidates.find(x=>x[1]>0);
        if(g){
          if(g[0]==='সহোদর ভাই'&&c.fullS){const units=g[1]*2+c.fullS,per=residue/units;rows.push({name:'সহোদর ভাই',count:g[1],share:per*2*g[1],each:per*2,reason:'আসাবা: সহোদর ভাই-বোন ২:১'});rows.push({name:'সহোদর বোন',count:c.fullS,share:per*c.fullS,each:per,reason:'সহোদর ভাইয়ের সঙ্গে আসাবা ২:১'});}
          else if(g[0]==='বৈমাত্রেয় ভাই'&&c.patS){const units=g[1]*2+c.patS,per=residue/units;rows.push({name:'বৈমাত্রেয় ভাই',count:g[1],share:per*2*g[1],each:per*2,reason:'আসাবা: বৈমাত্রেয় ভাই-বোন ২:১'});rows.push({name:'বৈমাত্রেয় বোন',count:c.patS,share:per*c.patS,each:per,reason:'বৈমাত্রেয় ভাইয়ের সঙ্গে আসাবা ২:১'});}
          else rows.push({name:g[0],count:g[1],share:residue,each:residue/g[1],reason:'নিকটতম আসাবা শ্রেণীর অবশিষ্টভোগী'});
          residue=0;method='আসাবা — নিকটতম শ্রেণী';
        }
      }
    }
    // Radd: only where no residuary remains and eligible fixed sharers exist.
    let total=rows.reduce((a,x)=>a+x.share,0);
    if(residue>1e-9){
      const spouseNames=new Set(['স্বামী','স্ত্রী','স্ত্রীগণ']),eligible=rows.filter(x=>!spouseNames.has(x.name)),eligibleTotal=eligible.reduce((a,x)=>a+x.share,0);
      if(eligibleTotal>1e-10){eligible.forEach(x=>{x.share+=residue*(x.share/eligibleTotal);x.each=x.share/(x.count||1);});notes.push('রদনীতি: আসাবা না থাকায় স্বামী/স্ত্রীর নির্ধারিত অংশ অপরিবর্তিত রেখে অবশিষ্ট অংশ যোগ্য অংশীদারদের মধ্যে বণ্টন করা হয়েছে।');residue=0;method='রদনীতি';}
    }
    total=rows.reduce((a,x)=>a+x.share,0);
    if(residue>1e-9){notes.push('অবশিষ্ট অংশের জন্য তালিকায় উপযুক্ত আসাবা পাওয়া যায়নি; তাই এই কেসটি সম্পূর্ণ স্বয়ংক্রিয়ভাবে নিষ্পত্তি করা হয়নি।');}
    const merged=new Map();rows.forEach(x=>{if(x.share<=1e-10)return;if(merged.has(x.name)){const y=merged.get(x.name);y.share+=x.share;y.count+=x.count;y.each=y.share/y.count;}else merged.set(x.name,{...x});});
    const finalRows=[...merged.values()];
    const assets=[['জমি',land,'শতাংশ'],['মুদ্রা',estate,'টাকা'],['স্বর্ণ',gold,'ভরি']].filter(x=>x[1]>0);
    const rowsHtml=finalRows.map(x=>`<tr><td><strong>${esc(x.name)}</strong><br><span class="small-note">${esc(x.reason||'')}</span>${x.count>1?`<br><span class="small-note">প্রতি জন ≈ ${frac(x.share/x.count)}</span>`:''}</td><td><span class="share-chip">${frac(x.share)}</span></td><td>${(x.share*100).toFixed(2)}%</td><td>${assets.map(a=>`<div><strong>${a[0]}:</strong> ${Number(a[1]*x.share).toLocaleString('bn-BD',{maximumFractionDigits:4})} ${a[2]}</div>`).join('')}</td></tr>`).join('');
    const notesHtml=notes.length?`<div class="method-box"><strong>হিসাবের নোট</strong><ul>${notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></div>`:'';
    r.innerHTML=`<div class="result-main">⚖️ উত্তরাধিকার হিসাবের ফলাফল</div>
      <div class="result-kpis"><div class="result-kpi"><strong>${(total*100).toFixed(2)}%</strong><span>মোট বণ্টন</span></div><div class="result-kpi"><strong>${finalRows.length}</strong><span>ফলাফলে অংশীদার</span></div><div class="result-kpi"><strong>${esc(method)}</strong><span>প্রধান পদ্ধতি</span></div></div>
      <div class="inheritance-summary"><table class="inheritance-table"><thead><tr><th>উত্তরাধিকারী</th><th>অংশ</th><th>শতাংশ</th><th>সম্পদ অনুযায়ী প্রাপ্য</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>${notesHtml}
      <p class="small-note" style="margin-top:14px"><strong>সতর্কতা:</strong> ফলাফলটি প্রদত্ত পারিবারিক তথ্যের ভিত্তিতে। বিশেষত পূর্বমৃত উত্তরাধিকারীর শাখা, বঞ্চনা/হাজব, আউল-রদ, দাদা-ভাইয়ের জটিলতা বা বিরোধ থাকলে সরকারি নথি ও যোগ্য আইনজীবী/ফারায়েজ বিশেষজ্ঞের যাচাই করুন।</p>`;
  };
  $('inheritReset').onclick=()=>{document.querySelectorAll('#panel-inheritance input').forEach(i=>i.value='0');$('deceasedGender').value='male';toggleGender();$('inheritResult').innerHTML='';};
  document.querySelectorAll('[data-clear]').forEach(btn=>btn.addEventListener('click',()=>{
    const type=btn.dataset.clear;
    const panel=$('panel-'+type);
    panel.querySelectorAll('input').forEach(i=>i.value='');
    if(type==='inheritance'){
      $('deceasedGender').value='male'; $('wives').value='1'; $('husband').value='0'; $('father').value='1'; $('mother').value='1'; $('sons').value='1'; $('daughters').value='1'; toggleGender();
    }
    panel.querySelectorAll('.calc-result').forEach(r=>r.innerHTML='');
  }));
})();
