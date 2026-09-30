// Surveyor Abdul Hannan — modular calculator component

/* ===== Registry calculator logic — ES6+, additive only ===== */
(() => {
  const $ = id => document.getElementById(id);
  const bn = n => Number(n || 0).toLocaleString('bn-BD', {maximumFractionDigits:2});
  const money = n => '৳ ' + bn(n);
  const val = id => Number($(id)?.value || 0);

  const rows = $('registryRows');
  const totalEl = $('registryTotal');
  const fixedWrap = $('regFixedSourceWrap');

  function calcRegistry() {
    const base = val('regValue');
    const registrationRate = val('regRegistrationRate') / 100;
    const registration = Math.max(base * registrationRate, base > 0 ? 100 : 0);
    const stampRate = val('regStampRate') / 100;
    const stamp = base * stampRate;
    const localRate = val('regLocalRate') / 100;
    const localTax = base * localRate;
    const sourceSel = $('regSourceRate').value;
    const sourceMinimum = val('regSourceMinimum');
    const source = sourceSel === 'fixed'
      ? val('regFixedSource')
      : Math.max(base * (Number(sourceSel) / 100), sourceMinimum);
    const affidavit = val('regAffidavit');
    const nFee = val('regPages') * val('regNFee');
    const nnFee = val('regPages') * val('regNNFee');
    const eFee = val('regEFee');
    const courtFee = val('regCourtFee');
    const total = registration + stamp + localTax + source + affidavit + nFee + nnFee + eFee + courtFee;

    const data = [
      ['💳','রেজিস্ট্রেশন ফি',$('regRegistrationRate').value+'%',registration],
      ['📜','স্ট্যাম্প ডিউটি',$('regStampRate').value+'%',stamp],
      ['🏛️','স্থানীয় সরকার কর', $('regLocalRate').value+'%',localTax],
      ['💰','উৎসে কর', sourceSel === 'fixed' ? 'ফিক্সড' : sourceSel+'%',source],
      ['📄','হলফনামা স্ট্যাম্প','ফিক্সড',affidavit],
      ['🧾','N-Fee',bn(val('regPages'))+' পৃষ্ঠা',nFee],
      ['🧾','NN-Fee',bn(val('regPages'))+' পৃষ্ঠা',nnFee],
      ['💼','E-Fee','ফিক্সড',eFee],
      ['⚖️','কোর্ট ফি','ফিক্সড',courtFee]
    ];
    rows.innerHTML = data.map(r => `<div class="cost-row"><div><span class="cost-name">${r[0]} ${r[1]} <span class="badge-rate">${r[2]}</span></span><span class="cost-meta">${r[1] === 'N-Fee' ? 'পৃষ্ঠা × নির্ধারিত হার' : 'আনুমানিক'}</span></div><span class="cost-amount">${money(r[3])}</span></div>`).join('');
    totalEl.textContent = money(total);
    window.__registryLast = {base, registration, registrationRate, stamp, stampRate, localTax, localRate, source, sourceSel, sourceMinimum, affidavit, nFee, nnFee, eFee, courtFee, total};
  }

  function clearRegistry() {
    ['regClient','regKhatian','regValue'].forEach(id => $(id).value = '');
    $('regRegistrationRate').value='1';
    $('regLocalRate').value='3';
    $('regStampRate').value='1.5';
    $('regSourceRate').value='2';
    $('regFixedSource').value='0';
    $('regSourceMinimum').value='0';
    $('regAffidavit').value='200';
    $('regPages').value='1';
    $('regNFee').value='24';
    $('regNNFee').value='36';
    $('regEFee').value='100';
    $('regCourtFee').value='10';
    fixedWrap.hidden=true;
    rows.innerHTML='<div class="small-note">দলিলের মূল্য লিখলে ফলাফল এখানে দেখাবে।</div>';
    totalEl.textContent='৳ ০';
    drawShape();
  }

  function printReport() {
    calcRegistry();
    const r = window.__registryLast;
    const client = $('regClient').value.trim() || '—';
    const khatian = $('regKhatian').value.trim() || '—';
    const report = `<!doctype html><html lang="bn"><head><meta charset="utf-8"><title>Land Registration Calculation Sheet</title>
<style>body{font-family:Arial,"Noto Sans Bengali",sans-serif;padding:28px;color:#15242e}h1{color:#082336}table{width:100%;border-collapse:collapse;margin-top:18px}td,th{border:1px solid #dce5e9;padding:10px;text-align:left}th{background:#f2f6f7}.total{font-size:20px;font-weight:800}.note{margin-top:18px;font-size:12px;color:#5e6f79}</style></head>
<body><h1>Land Registration Calculation Sheet</h1>
<p><strong>ক্লায়েন্ট:</strong> ${escapeHtml(client)}<br><strong>খতিয়ান/দাগ:</strong> ${escapeHtml(khatian)}<br><strong>দলিল মূল্য:</strong> ${money(r.base)}</p>
<table><tr><th>খরচের খাত</th><th>হার/ধরন</th><th>পরিমাণ</th></tr>
<tr><td>রেজিস্ট্রেশন ফি</td><td>${$('regRegistrationRate').value}%</td><td>${money(r.registration)}</td></tr>
<tr><td>স্ট্যাম্প ডিউটি</td><td>${$('regStampRate').value}%</td><td>${money(r.stamp)}</td></tr>
<tr><td>স্থানীয় সরকার কর</td><td>${$('regLocalRate').value}%</td><td>${money(r.localTax)}</td></tr>
<tr><td>উৎসে কর</td><td>${r.sourceSel==='fixed'?'ফিক্সড':r.sourceSel+'%'+(r.sourceMinimum>0?' / ন্যূনতম '+bn(r.sourceMinimum):'')}</td><td>${money(r.source)}</td></tr>
<tr><td>হলফনামা স্ট্যাম্প</td><td>ফিক্সড</td><td>${money(r.affidavit)}</td></tr>
<tr><td>N-Fee</td><td>${bn(val('regPages'))} পৃষ্ঠা</td><td>${money(r.nFee)}</td></tr>
<tr><td>NN-Fee</td><td>${bn(val('regPages'))} পৃষ্ঠা</td><td>${money(r.nnFee)}</td></tr>
<tr><td>E-Fee</td><td>ফিক্সড</td><td>${money(r.eFee)}</td></tr><tr><td>কোর্ট ফি</td><td>ফিক্সড</td><td>${money(r.courtFee)}</td></tr>
<tr><td colspan="2" class="total">মোট আনুমানিক খরচ</td><td class="total">${money(r.total)}</td></tr></table>
<p class="note">বি.দ্র: এটি একটি আনুমানিক হিসাব। সরকারি বিধিমালা, দলিলের ধরন, সম্পত্তির শ্রেণি, মৌজা রেইট, এলাকা এবং প্রযোজ্য উৎসে কর/ন্যূনতম কর অনুযায়ী প্রকৃত ফি পরিবর্তিত হতে পারে। চূড়ান্ত হিসাব সংশ্লিষ্ট সাব-রেজিস্ট্রি অফিসের নির্ধারিত হিসাব অনুযায়ী যাচাই করুন। এই শিটটি আনুমানিক হিসাব; চূড়ান্ত অর্থ প্রদানের আগে সংশ্লিষ্ট কর্তৃপক্ষের হার যাচাই করুন।</p>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) { alert('পপ-আপ ব্লক হয়েছে। ব্রাউজারের পপ-আপ অনুমতি দিয়ে আবার চেষ্টা করুন।'); return; }
    w.document.write(report); w.document.close(); w.focus();
    setTimeout(() => w.print(), 250);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  async function pdfReport() {
    calcRegistry();
    const r = window.__registryLast;
    const client = $('regClient').value.trim() || 'N/A';
    const khatian = $('regKhatian').value.trim() || 'N/A';
    if (window.jspdf && window.jspdf.jsPDF) {
      const doc = await window.SAH_PDF?.create({unit:'mm',format:'a4'});
      if(!doc){ printReport(); return; }
      doc.setFont('LohitBengali','bold'); doc.setFontSize(16);
      doc.text('ভূমি রেজিস্ট্রেশন হিসাব রিপোর্ট', 18, 18);
      doc.setFont('LohitBengali','normal'); doc.setFontSize(10);
      doc.text(`গ্রাহক: ${client}`, 18, 28);
      doc.text(`খতিয়ান/দাগ: ${khatian}`, 18, 35);
      doc.text(`দলিল মূল্য: BDT ${r.base.toLocaleString('en-US',{maximumFractionDigits:2})}`, 18, 42);
      const lines = [
        [`রেজিস্ট্রেশন ফি (${$('regRegistrationRate').value}%, ন্যূনতম BDT ১০০)`, r.registration],
        [`স্ট্যাম্প ডিউটি (${$('regStampRate').value}%)`, r.stamp],
        [`স্থানীয় সরকার কর (${$('regLocalRate').value}%)`, r.localTax],
        [`Source Tax (${r.sourceSel==='fixed'?'Fixed':r.sourceSel+'%'})`, r.source],
        ['এফিডেভিট স্ট্যাম্প', r.affidavit],
        ['N-ফি', r.nFee],
        ['NN-ফি', r.nnFee],
        ['E-ফি', r.eFee],
        ['কোর্ট ফি', r.courtFee],
      ];
      let y=54;
      doc.setFontSize(10);
      lines.forEach(([label,amount]) => { doc.text(label,18,y); doc.text('BDT '+Number(amount).toLocaleString('en-US',{maximumFractionDigits:2}),190,y,{align:'right'}); y+=8; });
      doc.setFont('LohitBengali','bold'); doc.text('আনুমানিক মোট',18,y+4); doc.text('BDT '+r.total.toLocaleString('en-US',{maximumFractionDigits:2}),190,y+4,{align:'right'});
      doc.setFont('LohitBengali','normal'); doc.setFontSize(8);
      doc.text('নোট: মৌজা, দলিলের ধরন ও প্রযোজ্য সরকারি বিধি অনুযায়ী হার পরিবর্তিত হতে পারে।',18,y+16);
      doc.save('land-registration-calculation-sheet.pdf');
    } else {
      printReport();
    }
  }

  ['regValue','regRegistrationRate','regLocalRate','regStampRate','regSourceRate','regFixedSource','regSourceMinimum','regAffidavit','regPages','regNFee','regNNFee','regEFee','regCourtFee'].forEach(id => {
    $(id)?.addEventListener('input', calcRegistry);
    $(id)?.addEventListener('change', calcRegistry);
  });
  $('regSourceRate')?.addEventListener('change', () => { fixedWrap.hidden = $('regSourceRate').value !== 'fixed'; calcRegistry(); });
  $('regCalculate')?.addEventListener('click', calcRegistry);
  $('regReset')?.addEventListener('click', clearRegistry);
  $('registryPrint')?.addEventListener('click', printReport);
  $('registryPdf')?.addEventListener('click', pdfReport);

  // -------- Automatic dimension-based 3/4 side sketch + multi-field placement/edit --------
  (() => {
    const main=$('landShapeCanvas'), multi=$('multiFieldCanvas'); if(!main||!multi)return;
    const mctx=main.getContext('2d'), ctx=multi.getContext('2d');
    const names=['A','B','C','D'], labels=['উত্তর • AB','পূর্ব • BC','দক্ষিণ • CD','পশ্চিম • DA'];
    const STORAGE='abdul_hannan_dimension_land_fields_v7';
    const MANUAL_EDIT_VERSION='v10-large-drawing-area-no-standalone-sketch';
    let saved=[]; try{saved=JSON.parse(localStorage.getItem(STORAGE)||'[]')}catch(e){saved=[]}
    let selectedId=null, current=null, editMode=false, dragIndex=-1, silentInputs=false;
    let view={zoom:1,panX:0,panY:0};
    // এডিটের সময় একটি স্থির scene transform রাখা হয়, যাতে অন্য ক্ষেত্রের অবস্থান/স্কেল না বদলায়।
    let lockedTr=null;
    let pinch=null;
    const bn=n=>Number(n||0).toLocaleString('bn-BD',{maximumFractionDigits:2});
    function ftInText(value){const n=Math.max(0,Number(value)||0);const ft=Math.floor(n+1e-9);let inch=(n-ft)*12;if(inch<0.005)inch=0;if(inch>=11.995){return (ft+1)+'′';}const inchText=Number(inch.toFixed(2)).toLocaleString('bn-BD',{maximumFractionDigits:2});return ft+'′ '+inchText+'″';}
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function inp(ftId,inId){const f=Number($(ftId)?.value||0),i=Number($(inId)?.value||0);return Math.max(0,f+i/12)}
    function dims(){return [inp('shapeAft','shapeAin'),inp('shapeBft','shapeBin'),inp('shapeCft','shapeCin'),inp('shapeDft','shapeDin')]}
    function syncHidden(v){['A','B','C','D'].forEach((x,i)=>{const e=$('shape'+x);if(e)e.value=v[i]||0})}
    function setInputs(v){v=v||[0,0,0,0];silentInputs=true;v.forEach((x,i)=>{const ft=Math.floor(Math.max(0,x)+1e-9),inch=(Math.max(0,x)-ft)*12; $('shape'+names[i]+'ft').value=ft||''; $('shape'+names[i]+'in').value=inch?inch.toFixed(3):''});syncHidden(v);silentInputs=false}
    function valid4(a,b,c,d){return a>0&&b>0&&c>0&&d>0&&Math.max(a,b,c,d)<(a+b+c+d)-Math.max(a,b,c,d)}
    function quadPoints(v){
      const [a,b,c,d]=v;if(!valid4(a,b,c,d))return null;
      const qMin=Math.max(Math.abs(a-b),Math.abs(c-d)), qMax=Math.min(a+b,c+d); if(!(qMax-qMin>1e-7))return null;
      const q=(qMin+qMax)/2;
      const x=(a*a+q*q-b*b)/(2*a), y=Math.sqrt(Math.max(0,q*q-x*x)); if(!(y>1e-8))return null;
      const xd=(d*d+q*q-c*c)/(2*q), yd=Math.sqrt(Math.max(0,d*d-xd*xd)); if(!(yd>1e-8))return null;
      const ux=x/q,uy=y/q,nx=-uy,ny=ux;
      const D=[xd*ux+yd*nx,xd*uy+yd*ny];
      const pts=[[0,0],[a,0],[x,-y],[D[0],-D[1]]];
      const lens=pts.map((p,i)=>{const z=pts[(i+1)%4];return Math.hypot(z[0]-p[0],z[1]-p[1])});
      if(lens.some((z,i)=>Math.abs(z-v[i])>1e-4))return null;
      return pts;
    }
    function triPoints(v){const [a,b,c]=v;if(!(a>0&&b>0&&c>0)||a+b<=c||a+c<=b||b+c<=a)return null;const x=(a*a+c*c-b*b)/(2*a),y=Math.sqrt(Math.max(0,c*c-x*x));return [[0,0],[a,0],[x,-y]]}
    function area(pts){let s=0;for(let i=0;i<pts.length;i++){const j=(i+1)%pts.length;s+=pts[i][0]*pts[j][1]-pts[j][0]*pts[i][1]}return Math.abs(s)/2}
    function sideLengths(pts){return pts.map((p,i)=>{const q=pts[(i+1)%pts.length];return Math.hypot(q[0]-p[0],q[1]-p[1])})}
    function bbox(pts){return {minX:Math.min(...pts.map(p=>p[0])),maxX:Math.max(...pts.map(p=>p[0])),minY:Math.min(...pts.map(p=>p[1])),maxY:Math.max(...pts.map(p=>p[1]))}}
    function centroid(pts){return [pts.reduce((s,p)=>s+p[0],0)/pts.length,pts.reduce((s,p)=>s+p[1],0)/pts.length]}
    function translate(pts,dx,dy){return pts.map(p=>[p[0]+dx,p[1]+dy])}
    function rotatePts(pts,ang){const ca=Math.cos(ang),sa=Math.sin(ang);return pts.map(p=>[p[0]*ca-p[1]*sa,p[0]*sa+p[1]*ca])}
    function edgeMid(pts,i){const a=pts[i],b=pts[(i+1)%pts.length];return [(a[0]+b[0])/2,(a[1]+b[1])/2]}
    function edgeVec(pts,i){const a=pts[i],b=pts[(i+1)%pts.length];return [b[0]-a[0],b[1]-a[1]]}
    function shapeTypeOf(f){
      if(Array.isArray(f)) return f.length===3?'tri':'quad';
      if(f&&Array.isArray(f.pts)) return f.pts.length===3?'tri':'quad';
      if(f&&f.shapeType==='tri') return 'tri';
      return (f&&f.v&&Number(f.v[3])>0)?'quad':'tri';
    }
    function sideTargetAngle(side){return (side==='east'||side==='west')?Math.PI/2:0}
    function nearestEdgeForSide(pts,side){
      if(!pts||pts.length<3)return 0;
      const target=sideTargetAngle(side); let best=0,bestScore=Infinity;
      pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length];let a=Math.atan2(q[1]-p[1],q[0]-p[0]);
        // একটি রেখার দিক ১৮০° পরপর একই; তাই target-এর সঙ্গে ছোট angular distance নিই।
        let d=Math.abs(Math.atan2(Math.sin(a-target),Math.cos(a-target))); d=Math.min(d,Math.PI-d);
        if(d<bestScore){bestScore=d;best=i;}
      }); return best;
    }
    function sideEdges(side,base,shape,triAttachEdge=0,quadAttachEdge=0){
      const baseType=shapeTypeOf(base), shapeType=shapeTypeOf(shape);
      let baseEdge;
      if(baseType==='tri'){
        if(/^tri[0-2]$/.test(String(side))) baseEdge=Number(String(side).slice(3));
        else baseEdge=nearestEdgeForSide(base?.pts,side);
      }else{
        baseEdge={north:0,east:1,south:2,west:3}[side];
      }
      let newEdge;
      if(shapeType==='tri'){
        newEdge=Math.max(0,Math.min(2,Number(triAttachEdge)||0));
      }else if(/^tri[0-2]$/.test(String(side))){
        newEdge=Math.max(0,Math.min(3,Number(quadAttachEdge)||0));
      }else{
        newEdge={north:2,east:3,south:0,west:1}[side];
      }
      return {baseEdge,newEdge};
    }
    function attachmentMeta(side,base=null){
      // ত্রিভুজের ক্ষেত্রে দিক নয়, নির্বাচিত প্রকৃত edge-এর দুই প্রান্তই reference হবে।
      if(base && shapeTypeOf(base)==='tri' && /^tri[0-2]$/.test(String(side))){
        const i=Number(String(side).slice(3));
        const names=['A','B','C'];
        const a=names[i], b=names[(i+1)%3];
        return {start:a,end:b,startArrow:'→',endArrow:'←',edgeLabel:a+'B'===a+b?'AB':a+b};
      }
      if(side==='east'||side==='west')return {start:'উত্তর',end:'দক্ষিণ',startArrow:'↑',endArrow:'↓'};
      return {start:'পশ্চিম',end:'পূর্ব',startArrow:'←',endArrow:'→'};
    }
    function attachmentModeLabels(side,base=null){
      const meta=attachmentMeta(side,base);
      return {
        center:'↕ মাঝখানে',
        start:meta.startArrow+' '+meta.start+' প্রান্তে',
        end:meta.endArrow+' '+meta.end+' প্রান্তে',
        custom:'📏 নির্দিষ্ট দূরত্বে'
      };
    }
    function attachSettings(){
      const side=$('mfSide')?.value||'east', mode=$('mfAttachMode')?.value||'center';
      const ft=Number($('mfAttachOffsetFt')?.value||0), inch=Number($('mfAttachOffsetIn')?.value||0);
      const ref=$('mfAttachRef')?.value||'start';
      return {mode,offset:Math.max(0,ft+inch/12),ref};
    }
    function normalizedAttach(f){
      return {mode:f?.attachMode||'center',offset:Math.max(0,Number(f?.attachOffset)||0),ref:f?.attachRef||'start'};
    }
    function cross2(ax,ay,bx,by){return ax*by-ay*bx;}
    function reflectAcrossLine(pts,a,b){
      const vx=b[0]-a[0],vy=b[1]-a[1],vv=vx*vx+vy*vy;
      if(vv<1e-12)return pts.map(p=>[...p]);
      return pts.map(p=>{
        const px=p[0]-a[0],py=p[1]-a[1];
        const t=(px*vx+py*vy)/vv;
        const qx=a[0]+t*vx, qy=a[1]+t*vy;
        return [2*qx-p[0],2*qy-p[1]];
      });
    }
    function alignToBase(shape,base,side,attach,triAttachEdge=0,quadAttachEdge=0){
      // ROBUST PROFESSIONAL SNAP:
      // 1) নতুন ক্ষেত্রের নির্বাচিত edge-কে ভিত্তি edge-এর একই line-এ বসাই।
      // 2) base polygon-এর interior side নির্ণয় করি; নতুন polygon সবসময় তার বিপরীত পাশে থাকবে।
      // 3) প্রয়োজন হলে পুরো polygon-কে edge line বরাবর reflect করি—কোনো vertex আলাদা করে টেনে
      //    shape বিকৃত করি না।
      // 4) shared edge-এর দুই endpoint কেবল rigid transform-এর মাধ্যমেই নির্ধারিত হয়।
      const {baseEdge,newEdge}=sideEdges(side,base,shape,triAttachEdge,quadAttachEdge);
      const bp=base[baseEdge], bq=base[(baseEdge+1)%base.length];
      const bv=edgeVec(base,baseEdge), lv=edgeVec(shape,newEdge);
      const bl=Math.hypot(bv[0],bv[1]), ll=Math.hypot(lv[0],lv[1]);
      if(!(bl>1e-9&&ll>1e-9))return shape.map(p=>[...p]);

      const a=attach||{mode:'center',offset:0,ref:'start'};
      const maxGap=Math.max(0,bl-ll);
      let startOffset=maxGap/2;
      if(a.mode==='north'||a.mode==='start')startOffset=0;
      else if(a.mode==='south'||a.mode==='end')startOffset=maxGap;
      else if(a.mode==='custom'){
        const off=Math.max(0,Number(a.offset)||0);
        startOffset=a.ref==='end'?maxGap-off:off;
      }
      if(ll<=bl) startOffset=Math.max(0,Math.min(maxGap,startOffset));
      else startOffset=a.ref==='end'
        ? (bl-ll-Math.max(0,Number(a.offset)||0))
        : Math.max(0,Number(a.offset)||0);

      // Target segment on the base edge. Its direction is initially opposite to the
      // new edge direction so the new polygon is placed on the outside half-plane.
      const ux=bv[0]/bl, uy=bv[1]/bl;
      const e1=[bp[0]+ux*startOffset,bp[1]+uy*startOffset];
      const e2=[bp[0]+ux*(startOffset+ll),bp[1]+uy*(startOffset+ll)];
      const targetAng=Math.atan2(e2[1]-e1[1],e2[0]-e1[0]);
      const localAng=Math.atan2(lv[1],lv[0]);

      // Candidate A: newEdge p0 -> p1 maps exactly to e1 -> e2.
      let r=rotatePts(shape,targetAng-localAng);
      const ra0=r[newEdge];
      r=translate(r,e1[0]-ra0[0],e1[1]-ra0[1]);

      // If the candidate's edge is reversed relative to target, use the second rigid
      // candidate. This avoids depending on the polygon's winding convention.
      const rb=r[(newEdge+1)%r.length];
      const errForward=Math.hypot(rb[0]-e2[0],rb[1]-e2[1]);
      const targetAngRev=Math.atan2(e1[1]-e2[1],e1[0]-e2[0]);
      let rr=rotatePts(shape,targetAngRev-localAng);
      const rr0=rr[newEdge];
      rr=translate(rr,e2[0]-rr0[0],e2[1]-rr0[1]);
      const rr1=rr[(newEdge+1)%rr.length];
      const errReverse=Math.hypot(rr1[0]-e1[0],rr1[1]-e1[1]);
      if(errReverse<errForward) r=rr;

      // Direction is a GLOBAL cardinal instruction (উত্তর/পূর্ব/দক্ষিণ/পশ্চিম).
      // Do not infer it from the base polygon's interior: an irregular/concave
      // sketch can have vertices on both sides of the selected edge, which makes
      // a sign/centroid vote ambiguous and can flip a requested NORTH placement
      // to SOUTH. Instead, choose the rigid candidate whose centroid lies on the
      // requested cardinal side of the shared boundary.
      const edgeA=r[newEdge], edgeB=r[(newEdge+1)%r.length];
      const edgeMidPt=[(edgeA[0]+edgeB[0])/2,(edgeA[1]+edgeB[1])/2];

      if(side==='north'||side==='east'||side==='south'||side==='west'){
        const desired =
          side==='north' ? [0,1] :
          side==='east'  ? [1,0] :
          side==='south' ? [0,-1] : [-1,0];

        const centroidOf=pts=>{
          let sx=0,sy=0;
          pts.forEach(p=>{sx+=p[0];sy+=p[1]});
          return [sx/pts.length,sy/pts.length];
        };
        const sideScore=pts=>{
          const c=centroidOf(pts);
          return (c[0]-edgeMidPt[0])*desired[0] +
                 (c[1]-edgeMidPt[1])*desired[1];
        };

        // Reflection preserves every side length and keeps the selected edge
        // exactly on the same line. Pick the candidate on the requested side.
        const reflected=reflectAcrossLine(r,edgeA,edgeB);
        if(sideScore(reflected)>sideScore(r)){
          r=reflected;
        }
      }else{
        // Explicit triangle-edge attachment keeps the previous geometric
        // outside-half-plane behaviour; only cardinal placement uses the
        // corrected global-direction rule above.
        const baseSigns=[];
        base.forEach((p,i)=>{
          if(i===baseEdge || i===(baseEdge+1)%base.length)return;
          const c=(edgeB[0]-edgeA[0])*(p[1]-edgeA[1])-
                  (edgeB[1]-edgeA[1])*(p[0]-edgeA[0]);
          if(Math.abs(c)>1e-8)baseSigns.push(Math.sign(c));
        });
        const newSigns=[];
        r.forEach((p,i)=>{
          if(i===newEdge || i===(newEdge+1)%r.length)return;
          const c=(edgeB[0]-edgeA[0])*(p[1]-edgeA[1])-
                  (edgeB[1]-edgeA[1])*(p[0]-edgeA[0]);
          if(Math.abs(c)>1e-8)newSigns.push(Math.sign(c));
        });
        const baseSide=baseSigns.reduce((sum,v)=>sum+v,0)>=0?1:-1;
        const newSide=newSigns.reduce((sum,v)=>sum+v,0)>=0?1:-1;
        if(newSigns.length && baseSigns.length && newSide===baseSide){
          r=reflectAcrossLine(r,edgeA,edgeB);
        }
      }

      // Recompute the edge endpoints after reflection because its orientation may
      // have reversed. We still keep the exact selected shared edge.
      // Hard numerical cleanup: project only the selected shared edge onto the exact
      // target line. We do NOT move any other vertex, so the polygon remains rigid.
      const p0=r[newEdge], p1=r[(newEdge+1)%r.length];
      const vx=p1[0]-p0[0], vy=p1[1]-p0[1], vlen=Math.hypot(vx,vy);
      if(vlen>1e-9){
        const tx=(e2[0]-e1[0])/vlen, ty=(e2[1]-e1[1])/vlen;
        // Pick the endpoint ordering closest to the target.
        const dF=Math.hypot(p0[0]-e1[0],p0[1]-e1[1])+Math.hypot(p1[0]-e2[0],p1[1]-e2[1]);
        const dR=Math.hypot(p0[0]-e2[0],p0[1]-e2[1])+Math.hypot(p1[0]-e1[0],p1[1]-e1[1]);
        if(dF<=dR){r[newEdge]=[...e1];r[(newEdge+1)%r.length]=[...e2];}
        else{r[newEdge]=[...e2];r[(newEdge+1)%r.length]=[...e1];}
      }
      return r;
    }
    // দুই-পাশের Boundary Assignment (FIT MODE)
    // endpoint-এ যুক্ত করলে নতুন ক্ষেত্রের selected edge + তার লাগোয়া edge
    // একই সঙ্গে base-এর দুইটি boundary line-এ বসে। এই মোডে প্রয়োজন হলে
    // affine adjustment হয়—অর্থাৎ আঁকা geometry input-কে প্রাথমিক মাপ হিসেবে নেয়।
    function affineFitAtCorner(shape,base,baseEdge,newEdge,attach){
      const mode=attach?.mode||'center';
      if(mode!=='start'&&mode!=='end') return null;
      const bn=base.length,sn=shape.length;
      const baseAnchor=mode==='start'?baseEdge:(baseEdge+1)%bn;
      const newAnchor=mode==='start'?newEdge:(newEdge+1)%sn;
      const baseOther=(baseAnchor===baseEdge)?(baseEdge+1)%bn:baseEdge;
      const newOther=(newAnchor===newEdge)?(newEdge+1)%sn:newEdge;
      const baseAdj=mode==='start'?(baseEdge-1+bn)%bn:(baseEdge+1)%bn;
      const newAdj=mode==='start'?(newEdge-1+sn)%sn:(newEdge+1)%sn;
      const s0=shape[newAnchor], sSel=shape[newOther], sAdj=shape[newAdj];
      const t0=base[baseAnchor], tSel=base[baseOther], tAdj0=base[baseAdj];
      const su=[sSel[0]-s0[0],sSel[1]-s0[1]], sv=[sAdj[0]-s0[0],sAdj[1]-s0[1]];
      const det=su[0]*sv[1]-su[1]*sv[0];
      if(Math.abs(det)<1e-9)return null;
      const baseSigns=[];
      base.forEach((p,i)=>{if(i===baseEdge||i===(baseEdge+1)%bn)return;const a=t0,b=tSel,c=(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);if(Math.abs(c)>1e-8)baseSigns.push(Math.sign(c));});
      const baseSide=baseSigns.reduce((a,b)=>a+b,0)>=0?1:-1;
      let best=null,bestScore=-Infinity;
      for(const sign of [1,-1]){
        const tv=[(tAdj0[0]-t0[0])*sign,(tAdj0[1]-t0[1])*sign];
        const tu=[tSel[0]-t0[0],tSel[1]-t0[1]];
        // Matrix columns are source [selected, adjacent] -> target [selected, adjacent].
        const detS=su[0]*sv[1]-su[1]*sv[0];
        const a11=(tu[0]*sv[1]-tv[0]*su[1])/detS;
        const a12=(-tu[0]*sv[0]+tv[0]*su[0])/detS;
        const a21=(tu[1]*sv[1]-tv[1]*su[1])/detS;
        const a22=(-tu[1]*sv[0]+tv[1]*su[0])/detS;
        const cand=shape.map(p=>{
          const x=p[0]-s0[0],y=p[1]-s0[1];
          return [t0[0]+a11*x+a12*y,t0[1]+a21*x+a22*y];
        });
        const signs=[]; cand.forEach((p,i)=>{if(i===newEdge||i===(newEdge+1)%sn)return;const c=(tSel[0]-t0[0])*(p[1]-t0[1])-(tSel[1]-t0[1])*(p[0]-t0[0]);if(Math.abs(c)>1e-8)signs.push(Math.sign(c));});
        const outside=signs.length?signs.reduce((a,b)=>a+b,0):-baseSide;
        const sideOK=!signs.length||Math.sign(outside)!==baseSide;
        // Convex/usable candidate gets priority; otherwise still keep the best fit.
        const score=(sideOK?100000:0)-Math.abs(Math.abs(area(cand))-area(shape))*0.0001;
        if(score>bestScore){bestScore=score;best=cand;}
      }
      if(!best)return null;
      // Numerical cleanup: force the selected edge to the exact base segment.
      best[newAnchor]=[...t0]; best[newOther]=[...tSel];
      return best;
    }
    function twoLineAssigned(base,shape,side,attach,triAttachEdge=0,quadAttachEdge=0){
      const {baseEdge,newEdge}=sideEdges(side,base,shape,triAttachEdge,quadAttachEdge);
      const fitted=affineFitAtCorner(shape,base,baseEdge,newEdge,attach);
      if(!fitted)return null;
      // Boundary assignment must never silently change the user's entered
      // feet/inches. Accept the two-line fit only when it is a rigid fit and
      // therefore preserves every entered side length exactly (within tolerance).
      const src=sideLengths(shape), dst=sideLengths(fitted);
      const tol=1e-7;
      if(src.length!==dst.length || src.some((v,i)=>Math.abs(v-dst[i])>tol*Math.max(1,v))) return null;
      return fitted;
    }
    function pointInPoly(pt,pts){let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const xi=pts[i][0],yi=pts[i][1],xj=pts[j][0],yj=pts[j][1];
      const hit=((yi>pt[1])!==(yj>pt[1]))&&(pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi+1e-20)+xi);if(hit)inside=!inside;
    }return inside;}
    function segmentDistance(p,a,b){const vx=b[0]-a[0],vy=b[1]-a[1],vv=vx*vx+vy*vy;if(vv<1e-12)return Math.hypot(p[0]-a[0],p[1]-a[1]);const t=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/vv));return Math.hypot(p[0]-(a[0]+t*vx),p[1]-(a[1]+t*vy));}
    function nearestVertexSnap(target,others,tr,thresholdPx){
      let best=null,bestD=thresholdPx;
      target.pts.forEach((p,ti)=>others.forEach(base=>base.pts.forEach((q,qi)=>{
        const ps=screenPoint(p,tr,multi.height,multi.width),qs=screenPoint(q,tr,multi.height,multi.width),d=Math.hypot(ps[0]-qs[0],ps[1]-qs[1]);
        if(d<bestD){bestD=d;best={ti,base,qi};}
      })));
      if(!best)return null;
      const p=target.pts[best.ti],q=best.base.pts[best.qi],dx=q[0]-p[0],dy=q[1]-p[1];
      return {pts:translate(target.pts,dx,dy),message:'🧲 SNAP: কাছের পয়েন্টে অ্যালাইন করা হয়েছে।'};
    }
    // Point SNAP: কাছের অন্য ক্ষেত্রের point বা boundary segment-এর উপর
    // আঙুলের পয়েন্টকে সরাসরি বসিয়ে দেয়। Segment-এর মাঝখানেও exact projection হয়।
    function snapVertexToNearbyGeometry(target,others,vertexIndex,tr,thresholdPx=32){
      if(!target||!others.length||vertexIndex<0)return null;
      const p=target.pts[vertexIndex],ps=screenPoint(p,tr,multi.height,multi.width);
      let best=null,bestD=thresholdPx;
      others.forEach(base=>base.pts.forEach((q,qi)=>{
        const qs=screenPoint(q,tr,multi.height,multi.width),d=Math.hypot(ps[0]-qs[0],ps[1]-qs[1]);
        if(d<bestD){bestD=d;best={type:'point',q:[...q],base,qi};}
      }));
      others.forEach(base=>base.pts.forEach((a,ai)=>{
        const b=base.pts[(ai+1)%base.pts.length];
        const as=screenPoint(a,tr,multi.height,multi.width),bs=screenPoint(b,tr,multi.height,multi.width);
        const vx=bs[0]-as[0],vy=bs[1]-as[1],vv=vx*vx+vy*vy;if(vv<1e-9)return;
        const tt=Math.max(0,Math.min(1,((ps[0]-as[0])*vx+(ps[1]-as[1])*vy)/vv));
        const sx=as[0]+tt*vx,sy=as[1]+tt*vy,d=Math.hypot(ps[0]-sx,ps[1]-sy);
        if(d<bestD){bestD=d;best={type:'line',q:worldPoint(sx,sy,tr,multi.height),base,edge:ai};}
      }));
      if(!best)return null;
      target.pts[vertexIndex]=[best.q[0],best.q[1]];
      return best;
    }
    function snapDraggedField(target,others,tr,thresholdPx=30){
      if(!target||!others.length)return {pts:target.pts,message:''};
      const vp=nearestVertexSnap(target,others,tr,thresholdPx);
      if(vp)return vp;
      let best=null,bestD=thresholdPx;
      target.pts.forEach((p,i)=>{
        const q=target.pts[(i+1)%target.pts.length],mid=[(p[0]+q[0])/2,(p[1]+q[1])/2];
        others.forEach(base=>base.pts.forEach((a,j)=>{
          const b=base.pts[(j+1)%base.pts.length],md=segmentDistance(mid,a,b);
          const ev=edgeVec(target.pts,i),bv=edgeVec(base.pts,j),ea=Math.atan2(ev[1],ev[0]),ba=Math.atan2(bv[1],bv[0]);
          let ad=Math.abs(Math.atan2(Math.sin(ea-ba),Math.cos(ea-ba)));ad=Math.min(ad,Math.PI-ad);
          const midPx=screenPoint(mid,tr,multi.height,multi.width),aa=screenPoint(a,tr,multi.height,multi.width),bb=screenPoint(b,tr,multi.height,multi.width);
          const dpx=Math.min(segmentDistance(midPx,aa,bb),md*tr.scale);
          if(dpx<bestD&&ad<0.28)bestD=dpx,best={i,base,j};
        }));
      });
      if(!best)return {pts:target.pts,message:''};
      const i=best.i,base=best.base,j=best.j;
      const ev=edgeVec(target.pts,i),bv=edgeVec(base.pts,j);const ea=Math.atan2(ev[1],ev[0]),ba=Math.atan2(bv[1],bv[0]);
      let r=rotatePts(target.pts,ba-ea);const m=edgeMid(r,i),bm=edgeMid(base.pts,j);r=translate(r,bm[0]-m[0],bm[1]-m[1]);
      // Snap the nearest endpoint too when the edge is close to an endpoint.
      const endpoints=[r[i],r[(i+1)%r.length]], bp=[base.pts[j],base.pts[(j+1)%base.pts.length]];let bestEP=null,ed=thresholdPx;
      endpoints.forEach((p,pi)=>bp.forEach((q,qi)=>{const ps=screenPoint(p,tr,multi.height,multi.width),qs=screenPoint(q,tr,multi.height,multi.width),d=Math.hypot(ps[0]-qs[0],ps[1]-qs[1]);if(d<ed){ed=d;bestEP={p,q}}}));
      if(bestEP)r=translate(r,bestEP.q[0]-bestEP.p[0],bestEP.q[1]-bestEP.p[1]);
      return {pts:r,message:'🧲 SNAP: কাছের boundary line-এ অ্যালাইন করা হয়েছে।'};
    }
    function placementInfo(base,shape,side,attach,triAttachEdge=0,quadAttachEdge=0){
      if(!base||!shape)return 'প্রথমে ক্ষেত্রের মাপ দিন।';
      const {baseEdge,newEdge}=sideEdges(side,base,shape,triAttachEdge,quadAttachEdge), bl=Math.hypot(...edgeVec(base,baseEdge)), ll=Math.hypot(...edgeVec(shape,newEdge));
      const meta=attachmentMeta(side,base), gap=bl-ll, a=attach||{mode:'center',offset:0};
      if(gap<-1e-7){
        const over=ll-bl;
        const modeText=a.mode==='center'?'মাঝখানে':(a.mode==='start'||a.mode==='north')?meta.start+' প্রান্তে':(a.mode==='end'||a.mode==='south')?meta.end+' প্রান্তে':('নির্দিষ্ট দূরত্বে • '+(a.ref==='end'?meta.end:meta.start)+' থেকে '+ftInText(Math.max(0,Number(a.offset)||0)));
        return 'সংযুক্তি: '+modeText+' • ভিত্তি বাহু '+ftInText(bl)+' • নতুন যুক্ত বাহু '+ftInText(ll)+' • অতিরিক্ত '+ftInText(over)+' অংশ ভিত্তি বাহুর বাইরে থাকবে।';
      }
      let fromStart=gap/2;
      if(a.mode==='north'||a.mode==='start')fromStart=0;
      else if(a.mode==='south'||a.mode==='end')fromStart=gap;
      else if(a.mode==='custom'){
        const off=Math.max(0,Number(a.offset)||0);
        fromStart=(a.ref==='end') ? Math.max(0,gap-off) : Math.min(gap,off);
      }
      if(fromStart>gap)fromStart=gap;
      const fromEnd=gap-fromStart;
      const modeText=a.mode==='center'?'মাঝখানে':(a.mode==='north'||a.mode==='start')?meta.start+' প্রান্তে':(a.mode==='south'||a.mode==='end')?meta.end+' প্রান্তে':('নির্দিষ্ট দূরত্বে • '+(a.ref==='end'?meta.end:meta.start)+' থেকে '+ftInText(Math.max(0,Number(a.offset)||0)));
      return 'যুক্তি: '+modeText+' • '+meta.start+' থেকে '+ftInText(fromStart)+' • '+meta.end+' থেকে '+ftInText(fromEnd)+' • মোট ফাঁকা অংশ '+ftInText(gap)+' • SNAP: বাহু একই সরলরেখায়, ক্ষেত্র বাইরের পাশে।';
    }
    function updateBaseSideUI(){
      const sel=$('mfBaseField'), sideSel=$('mfSide'), label=$('mfSideLabel'), baseEdgeTri=sideSel?.dataset.baseTri==='1';
      if(!sel||!sideSel)return;
      const baseVal=sel.value||'__first__';
      const base=baseVal==='__first__'?null:saved.find(f=>String(f.id)===String(baseVal));
      const old=sideSel.value||'east';
      if(base&&shapeTypeOf(base)==='tri'){
        sideSel.innerHTML='<option value="tri0">AB — ১ম বাহু</option><option value="tri1">BC — ২য় বাহু</option><option value="tri2">CA — ৩য় বাহু</option>';
        sideSel.value=['tri0','tri1','tri2'].includes(old)?old:'tri0';
        sideSel.dataset.baseTri='1';
        if(label)label.textContent='২. ত্রিভুজের কোন বাহু থেকে আঁকবেন?';
      }else{
        sideSel.innerHTML='<option value="north">↑ উত্তর</option><option value="east">→ পূর্ব</option><option value="south">↓ দক্ষিণ</option><option value="west">← পশ্চিম</option>';
        sideSel.value=['north','east','south','west'].includes(old)?old:'east';
        sideSel.dataset.baseTri='0';
        if(label)label.textContent='২. কোন পাশে?';
      }
      const type=$('mfShapeType')?.value||'quad';
      const qwrap=$('mfQuadAttachWrap');
      if(qwrap)qwrap.style.display=(base&&shapeTypeOf(base)==='tri'&&type==='quad')?'':'none';
    }
    function updateAttachUI(){
      updateBaseSideUI();
      const side=$('mfSide')?.value||'east', baseVal=$('mfBaseField')?.value||'__first__';
      const base=baseVal==='__first__'?null:saved.find(f=>String(f.id)===String(baseVal));
      const meta=attachmentMeta(side,base), mode=$('mfAttachMode')?.value||'center';
      const wrap=$('mfAttachOffsetWrap'), label=$('mfAttachOffsetLabel'), ref=$('mfAttachRef'), modeSel=$('mfAttachMode');
      if(modeSel){
        const current=modeSel.value||'center', L=attachmentModeLabels(side,base);
        modeSel.innerHTML='<option value="center">'+L.center+'</option><option value="start">'+L.start+'</option><option value="end">'+L.end+'</option><option value="custom">'+L.custom+'</option>';
        modeSel.value=['center','start','end','custom'].includes(current)?current:'center';
      }
      const refStart=ref?.value||'start';
      if(ref){
        ref.innerHTML='<option value="start">'+meta.startArrow+' '+meta.start+' থেকে</option><option value="end">'+meta.endArrow+' '+meta.end+' থেকে</option>';
        ref.value=refStart==='end'?'end':'start';
      }
      if(label)label.textContent=(refStart==='end'?meta.end:meta.start)+' প্রান্ত থেকে দূরত্ব';
      if(wrap)wrap.style.display=mode==='custom'?'block':'none';
      const local=localFromDims(dims(),$('mfShapeType')?.value||'quad');
      if($('mfAttachInfo'))$('mfAttachInfo').textContent=base&&local?placementInfo(base,local,side,attachSettings(),Number($('mfTriAttachEdge')?.value||0),Number($('mfQuadAttachEdge')?.value||0)):'মাঝখানে যুক্ত হলে নির্বাচিত বাহুর দুই প্রান্তে সমান ফাঁক থাকবে। নতুন ক্ষেত্রের মাপ দেওয়ার পর দুই প্রান্ত থেকে সঠিক দূরত্ব দেখানো হবে।';
    }
    function placeNext(local,base,side,attach,triAttachEdge=0,quadAttachEdge=0){const fitted=twoLineAssigned(base,local,side,attach,triAttachEdge,quadAttachEdge);return fitted||alignToBase(local,base,side,attach,triAttachEdge,quadAttachEdge);}
    function reflowDependents(baseId){
      // যে ক্ষেত্রগুলো এই ক্ষেত্রের ওপর SNAP হয়ে আছে, তাদের সংরক্ষিত attachment অবস্থান অনুযায়ী ধারাবাহিকভাবে বসাই।
      const walk=(parentId)=>{
        saved.forEach(f=>{
          if(String(f.baseId)!==String(parentId))return;
          const base=saved.find(x=>String(x.id)===String(parentId));
          if(!base)return;
          const side=f.side||'east', attach=normalizedAttach(f);
          f.pts=placeNext(f.pts,base.pts,side,attach,Number(f.triAttachEdge)||0,Number(f.quadAttachEdge)||0);
          f.area=area(f.pts);
          walk(f.id);
        });
      };
      if(baseId!=null)walk(baseId);
    }
    function fitAll(all,w,h,pad=65){const pts=all.flatMap(f=>f.pts||[]);if(!pts.length)return {scale:1,ox:w/2,oy:h/2};const bb=bbox(pts),sc=Math.min((w-2*pad)/Math.max(1,bb.maxX-bb.minX),(h-2*pad)/Math.max(1,bb.maxY-bb.minY));return {scale:sc,ox:pad-bb.minX*sc,oy:h-pad+bb.minY*sc}}
    function applyView(pt,w,h){const cx=w/2,cy=h/2;return [cx+(pt[0]-cx)*view.zoom+view.panX,cy+(pt[1]-cy)*view.zoom+view.panY]}
    function invertView(pt,w,h){const cx=w/2,cy=h/2;return [cx+(pt[0]-cx-view.panX)/view.zoom,cy+(pt[1]-cy-view.panY)/view.zoom]}
    function screenPoint(p,tr,h,w=multi.width){return applyView([tr.ox+p[0]*tr.scale,h-(tr.oy+p[1]*tr.scale)],w,h)}
    function worldPoint(sx,sy,tr,h){const q=invertView([sx,sy],multi.width,h);return [(q[0]-tr.ox)/tr.scale,(h-q[1]-tr.oy)/tr.scale]}
    function grid(c,w,h){c.clearRect(0,0,w,h);c.fillStyle='#fbfefe';c.fillRect(0,0,w,h);c.strokeStyle='#e5eff1';c.lineWidth=1;for(let x=0;x<w;x+=25){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=0;y<h;y+=25){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}c.fillStyle='#155b9d';c.font='bold 16px Arial';c.textAlign='center';c.fillText('↑ উত্তর',w/2,24);c.fillStyle='#176b49';c.textAlign='right';c.fillText('পূর্ব →',w-14,h/2);c.fillStyle='#a64a2b';c.textAlign='center';c.fillText('↓ দক্ষিণ',w/2,h-10);c.fillStyle='#60459b';c.textAlign='left';c.fillText('← পশ্চিম',14,h/2)}
    function edgeCardinalLabel(mp,i){
      // উত্তর/দক্ষিণ/পূর্ব/পশ্চিম নির্ধারণ হবে edge-এর প্রকৃত অবস্থান
      // (centroid-এর তুলনায় midpoint) থেকে—শুধু A/B/C/D ক্রম দেখে নয়।
      const j=(i+1)%mp.length;
      const mx=(mp[i][0]+mp[j][0])/2,my=(mp[i][1]+mp[j][1])/2;
      const cx=mp.reduce((s,p)=>s+p[0],0)/mp.length,cy=mp.reduce((s,p)=>s+p[1],0)/mp.length;
      const dx=mx-cx,dy=my-cy;
      if(Math.abs(dy)>=Math.abs(dx)) return dy<0?'উত্তর':'দক্ষিণ';
      return dx>0?'পূর্ব':'পশ্চিম';
    }
    function drawField(c,pts,v,name,tr,offset=0,alpha=.14,selected=false,meta=null){
      const mp=pts.map(p=>screenPoint(p,tr,c.canvas.height,c.canvas.width));
      c.beginPath();c.moveTo(mp[0][0],mp[0][1]);mp.slice(1).forEach(p=>c.lineTo(p[0],p[1]));c.closePath();
      c.fillStyle=offset?'rgba(8,116,123,'+alpha+')':'rgba(239,125,34,.18)';c.fill();
      c.strokeStyle=offset?'#08747b':'#ef7d22';c.lineWidth=selected?4:(offset?2.5:3);c.stroke();
      c.fillStyle='#082336';c.font='bold 15px Arial';c.textAlign='center';
      mp.forEach((p,i)=>c.fillText(names[i],p[0],p[1]-10));
      const cx=mp.reduce((s,p)=>s+p[0],0)/mp.length,cy=mp.reduce((s,p)=>s+p[1],0)/mp.length;
      for(let i=0;i<mp.length;i++){
        const j=(i+1)%mp.length,ax=mp[i][0],ay=mp[i][1],bx=mp[j][0],by=mp[j][1];
        const mx=(ax+bx)/2,my=(ay+by)/2;
        // মাপের লেখা সবসময় ক্ষেত্রের ভেতরে, সংশ্লিষ্ট লাইনের পাশে থাকবে এবং লাইনের দিকেই সোজা থাকবে।
        let ix=cx-mx,iy=cy-my,ilen=Math.hypot(ix,iy)||1; const gap=22;
        let lx=mx+ix/ilen*gap,ly=my+iy/ilen*gap;
        let ang=Math.atan2(by-ay,bx-ax);
        // লেখা উল্টো/মাথা নিচে না দেখিয়ে পাঠযোগ্য রাখি।
        if(ang>Math.PI/2)ang-=Math.PI;
        if(ang<-Math.PI/2)ang+=Math.PI;
        let dimLabel=labels[i];
        if(pts.length===4){
          // ৪ বাহুর ক্ষেত্রের label এখন প্রকৃত drawing position অনুযায়ী।
          // ফলে AB সবসময় উত্তর নয়; যে edge বাস্তবে উত্তর দিকে আছে সেটিই উত্তর হিসেবে দেখাবে।
          dimLabel=edgeCardinalLabel(mp,i)+' • '+['AB','BC','CD','DA'][i];
        }else if((meta&&shapeTypeOf(meta)==='tri')||pts.length===3){
          const triNames=['AB','BC','CA'];
          const attachedSide=meta?.side||null;
          const selectedTriEdge=/^tri[0-2]$/.test(String(attachedSide||''))?Number(String(attachedSide).slice(3)):-1;
          const cardinal=edgeCardinalLabel(mp,i);
          dimLabel=(i===selectedTriEdge?cardinal+' • ':'বাহু • ')+triNames[i];
        }
        const dimText=dimLabel+' • '+ftInText(v[i]);
        c.save();
        c.translate(lx,ly);
        c.rotate(ang);
        c.font='bold 18px Arial';
        const tw=c.measureText(dimText).width+18;
        c.fillStyle='rgba(255,255,255,.96)';
        c.fillRect(-tw/2,-16,tw,32);
        c.fillStyle='#183b49';c.textAlign='center';c.fillText(dimText,0,6);
        c.restore();
      }
      c.fillStyle='#31515b';c.font='bold 13px Arial';c.fillText(name||'বর্তমান ক্ষেত্র',cx,cy);
      if(selected&&editMode){mp.forEach((p,i)=>{c.beginPath();c.arc(p[0],p[1],8,0,Math.PI*2);c.fillStyle='#fff';c.fill();c.strokeStyle='#ef7d22';c.lineWidth=3;c.stroke()})}
    }
    function localFromDims(v,type){const t=type||((v.filter(x=>x>0).length===3)?'tri':'quad');return t==='tri'?triPoints(v.slice(0,3)):quadPoints(v)}
    function renderMain(){const v=dims(),type=$('mfShapeType')?.value||((v.filter(x=>x>0).length===3)?'tri':'quad'),pts=localFromDims(v,type);syncHidden(v);grid(mctx,main.width,main.height);if(pts){const tr=fitAll([{pts}],main.width,main.height);drawField(mctx,pts,v,type==='tri'?'৩ বাহুর বর্তমান ত্রিভুজ':'৪ বাহুর বর্তমান ক্ষেত্র',tr,0,.18,true,{shapeType:type,side:$('mfSide')?.value||null});const sf=area(pts);$('shapeStatus').textContent='SNAP ON: সব ক্ষেত্র একই ফুট–ইঞ্চি একক ও একই স্কেলে তৈরি হচ্ছে।';$('shapeResult').innerHTML='<div class="multi-field-kpis"><div class="multi-field-kpi"><strong>'+bn(sf)+' বর্গফুট</strong><span>আনুমানিক ক্ষেত্রফল</span></div><div class="multi-field-kpi"><strong>'+bn(sf/435.6)+' শতাংশ</strong><span>ডেসিমেল</span></div><div class="multi-field-kpi"><strong>'+bn(sf/10.7639104167)+' বর্গমিটার</strong><span>বর্গমিটার</span></div></div>'}else{$('shapeStatus').textContent=v.filter(x=>x>0).length<3?'কমপক্ষে ৩টি বাহুর মাপ দিন।':'এই মাপ দিয়ে বৈধ আনুমানিক ক্ষেত্র তৈরি করা যাচ্ছে না।';$('shapeResult').innerHTML=''}}
    function ensureCurrentFromInputs(){const v=dims(),type=$('mfShapeType')?.value||((v.filter(x=>x>0).length===3)?'tri':'quad'),local=localFromDims(v,type);if(!local)return null;if(selectedId){const f=saved.find(x=>x.id===selectedId);if(f){const oldC=centroid(f.pts),newC=centroid(local);current={...f,pts:translate(local,oldC[0]-newC[0],oldC[1]-newC[1]),v,area:area(local)};return current}}let base=null,side=$('mfSide')?.value||'east';const attach=attachSettings();const triAttachEdge=Number($('mfTriAttachEdge')?.value||0);const quadAttachEdge=Number($('mfQuadAttachEdge')?.value||0);const baseVal=$('mfBaseField')?.value||'__first__';if(baseVal!=='__first__')base=saved.find(f=>String(f.id)===String(baseVal));if(base){const {baseEdge,newEdge}=sideEdges(side,base,local,triAttachEdge,quadAttachEdge),baseLen=Math.hypot(...edgeVec(base.pts,baseEdge)),newLen=Math.hypot(...edgeVec(local,newEdge));if(newLen>baseLen+1e-7){$('shapeStatus').textContent='সতর্কতা: নতুন ক্ষেত্রের যুক্ত বাহু '+ftInText(newLen)+' এবং ভিত্তি বাহু '+ftInText(baseLen)+'. সংযোগ করা হয়েছে; অতিরিক্ত '+ftInText(newLen-baseLen)+' অংশ ভিত্তি বাহুর বাইরে থাকবে।';}}const pts=base?placeNext(local,base.pts,side,attach,triAttachEdge,quadAttachEdge):translate(local,-centroid(local)[0],-centroid(local)[1]);const fitted=!!base&&((attach.mode==='start'||attach.mode==='end')&&twoLineAssigned(base.pts,local,side,attach,triAttachEdge,quadAttachEdge));const actualV=v;if(base&&fitted)$('shapeStatus').textContent='🧲 দুই-পাশের boundary assignment সম্পন্ন — যুক্ত কোণ ও দুইটি সীমারেখা একসাথে ফিট করা হয়েছে।';current={id:null,name:type==='tri'?'নতুন ত্রিভুজ ক্ষেত্র':'নতুন ক্ষেত্র',v:actualV,pts,area:area(pts),shapeType:type,baseId:base?.id||null,side,attachMode:attach.mode,attachOffset:attach.offset,attachRef:attach.ref,triAttachEdge,quadAttachEdge};return current}
    function drawAll(){grid(ctx,multi.width,multi.height);const all=saved.map((f,i)=>({...f,_i:i}));if(current&&!selectedId)all.push(current);let tr=lockedTr;
      if(!tr){tr=fitAll(all,multi.width,multi.height);}
      saved.forEach((f,i)=>drawField(ctx,f.pts,f.v,f.name||('ক্ষেত্র '+(i+1)),tr,i+1,.09,String(f.id)===String(selectedId)));
      if(current&&!selectedId)drawField(ctx,current.pts,current.v,current.shapeType==='tri'?'নতুন ত্রিভুজ ক্ষেত্র':'নতুন ক্ষেত্র',tr,0,.18,true,current)}
    function persist(){localStorage.setItem(STORAGE,JSON.stringify(saved))}
    function renderList(){const listEl=$('mfSavedList');$('mfSavedCount').textContent=bn(saved.length)+'টি';const total=saved.reduce((s,f)=>s+Number(f.area||0),0);$('mfSavedTotal').innerHTML=saved.length?'মোট সেভ করা ক্ষেত্র: <strong>'+bn(total)+' বর্গফুট</strong> • <strong>'+bn(total/435.6)+' শতাংশ</strong>':'';listEl.innerHTML=saved.length?saved.map((f,i)=>'<div class="multi-field-item"><div class="multi-field-item-main"><strong>'+esc(f.name||('ক্ষেত্র '+(i+1)))+'</strong><span>'+f.v.slice(0,shapeTypeOf(f)==='tri'?3:4).map((x,j)=>(shapeTypeOf(f)==='tri'?['AB','BC','CA'][j]:labels[j])+': '+bn(x)+' ft').join(' • ')+' • '+bn(f.area)+' বর্গফুট</span></div><div class="multi-field-item-actions"><button type="button" data-load="'+f.id+'">লোড / এডিট</button><button type="button" class="danger" data-del="'+f.id+'">মুছুন</button></div></div>').join(''):'<div class="small-note">এখনও কোনো ক্ষেত্র সেভ করা হয়নি।</div>';listEl.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>load(Number(b.dataset.load)));listEl.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>del(Number(b.dataset.del)));updateBaseOptions();drawAll()}
    function updateBaseOptions(){const sel=$('mfBaseField'),old=sel.value;sel.innerHTML='<option value="__first__">প্রথম ক্ষেত্র / নতুন শুরু</option>'+saved.map((f,i)=>'<option value="'+f.id+'">'+esc(f.name||('ক্ষেত্র '+(i+1)))+'</option>').join('');if([...sel.options].some(o=>o.value===old))sel.value=old;}
    async function downloadMultiFieldPDF(){
      const list=saved.slice();
      if(!list.length && !current){
        $('shapeStatus').textContent='PDF তৈরি করতে অন্তত একটি ক্ষেত্র আঁকুন বা সেভ করুন।';
        return;
      }
      if(!(window.jspdf&&window.jspdf.jsPDF)){
        $('shapeStatus').textContent='PDF লাইব্রেরি লোড হয়নি। ইন্টারনেট সংযোগ চালু করে আবার চেষ্টা করুন।';
        return;
      }
      // PDF-তে যে দৃশ্যটি দেখা যাচ্ছে সেটিই নেওয়া হবে—অর্থাৎ saved + unsaved current field দুটিই থাকবে।
      drawAll();
      const doc=await window.SAH_PDF?.create({unit:'mm',format:'a4',orientation:'portrait',compress:true});
      if(!doc){ $('shapeStatus').textContent='PDF লাইব্রেরি বা বাংলা ফন্ট লোড হয়নি। অনলাইনে সংযোগ দিয়ে আবার চেষ্টা করুন।'; return; }
      const pageW=210,pageH=297,margin=10;
      const title='ভূমি নকশা ও Alignment রিপোর্ট';
      const now=new Date();
      const stamp=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')+' '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
      doc.setFont('LohitBengali','bold');doc.setFontSize(15);doc.text(title,pageW/2,13,{align:'center'});
      doc.setFont('LohitBengali','normal');doc.setFontSize(8);doc.text('Drawing & Alignment',pageW/2,18,{align:'center'});
      const data=multi.toDataURL('image/png');
      const imgW=pageW-margin*2;
      const imgH=Math.min(220,imgW*(multi.height/multi.width));
      const imgY=23;
      doc.addImage(data,'PNG',margin,imgY,imgW,imgH,undefined,'FAST');
      let y=imgY+imgH+9;
      doc.setFont('LohitBengali','bold');doc.setFontSize(9);doc.text('Fields: '+String(list.length+(current&&!selectedId?1:0)),margin,y);y+=6;
      const total=(list.reduce((sum,f)=>sum+Number(f.area||0),0))+(current&&!selectedId?Number(current.area||area(current.pts)||0):0);
      doc.setFont('LohitBengali','normal');doc.text('Total area (sq ft): '+total.toFixed(2),margin,y);y+=5;
      doc.text('Generated: '+stamp,margin,y);y+=7;
      doc.setFontSize(7);doc.text('নোট: এটি নকশা রেকর্ড; মাঠপর্যায়ে প্রকৃত পরিমাপ অবশ্যই যাচাই করতে হবে।',margin,y);
      doc.save('multi-field-drawing-alignment.pdf');
      $('shapeStatus').textContent='📄 বহু ক্ষেত্রের drawing ও alignment PDF হিসেবে ডাউনলোড হয়েছে।';
    }
    function save(){
      const r=selectedId?saved.find(x=>String(x.id)===String(selectedId)):ensureCurrentFromInputs();
      if(!r){$('shapeStatus').textContent='বৈধ ৩/৪ বাহুর মাপ দিন।';return}
      const name=prompt('এই ক্ষেত্রের নাম লিখুন:',r.name&&r.name!=='নতুন ক্ষেত্র'?r.name:'ক্ষেত্র '+(saved.length+1));
      if(name===null)return;
      const item={id:selectedId||Date.now(),name:name.trim()||('ক্ষেত্র '+(saved.length+1)),v:r.v.map(Number),pts:r.pts.map(p=>[...p]),area:area(r.pts),shapeType:r.shapeType||shapeTypeOf(r),baseId:r.baseId||null,side:r.side||null,attachMode:r.attachMode||'center',attachOffset:Number(r.attachOffset)||0,attachRef:r.attachRef||'start',triAttachEdge:Number(r.triAttachEdge)||0,quadAttachEdge:Number(r.quadAttachEdge)||0};
      const idx=saved.findIndex(x=>String(x.id)===String(item.id));
      if(idx>=0)saved[idx]=item;else saved.push(item);
      selectedId=item.id;current=null;editMode=true;persist();
      $('shapePointEdit').textContent='✋ পয়েন্ট এডিট: ON';
      $('shapeStatus').textContent='“'+item.name+'” আপডেট করে সেভ হয়েছে। ফুট–ইঞ্চির ইনপুট পরিবর্তন করলে আবারও আপডেট করা যাবে।';
      renderList();
    }
    function load(id){
      const f=saved.find(x=>String(x.id)===String(id));
      if(!f)return;
      // এডিট শুরু হওয়ার আগের পুরো দৃশ্যের স্কেল/অফসেট ধরে রাখি।
      lockedTr=fitAll(saved,multi.width,multi.height);
      selectedId=f.id;
      current={...f,pts:f.pts.map(p=>[...p]),v:f.v.map(Number)};
      setInputs(current.v);
      $('mfShapeType').value=shapeTypeOf(f);
      $('mfTriAttachEdge').value=String(Number(f.triAttachEdge)||0);$('mfQuadAttachEdge').value=String(Number(f.quadAttachEdge)||0);
      $('shapeDWrap').style.display=shapeTypeOf(f)==='tri'?'none':'';
      $('mfTriAttachWrap').style.display=shapeTypeOf(f)==='tri'?'':'none';
      editMode=true;
      $('shapePointEdit').textContent='✋ পয়েন্ট এডিট: ON';
      $('mfBaseField').value=(f.baseId!=null && saved.some(x=>String(x.id)===String(f.baseId)))?String(f.baseId):'__first__';
      updateBaseSideUI();
      $('mfSide').value=f.side||$('mfSide').value;
      $('mfAttachMode').value=f.attachMode||'center';
      $('mfAttachRef').value=f.attachRef||'start';
      $('mfAttachOffsetFt').value=f.attachOffset?Math.floor(Number(f.attachOffset)) : '';
      $('mfAttachOffsetIn').value=f.attachOffset?((Number(f.attachOffset)-Math.floor(Number(f.attachOffset)))*12).toFixed(3) : '';
      updateAttachUI();
      $('mfPlacementStatus').textContent='“'+f.name+'” এডিট মোডে। এই ক্ষেত্রের সংযুক্তির অবস্থান সংরক্ষিত আছে; ফুট–ইঞ্চি বদলালে সেই অ্যালাইনমেন্ট বজায় থাকবে।';
      $('shapeStatus').textContent='“'+f.name+'” এডিট হচ্ছে — ফুট ও ইঞ্চি পরিবর্তন করলে স্কেচ ও ক্ষেত্রফল সঙ্গে সঙ্গে আপডেট হবে।';
      renderMain();drawAll();
    }
    function del(id){saved=saved.filter(x=>String(x.id)!==String(id));if(String(selectedId)===String(id)){selectedId=null;current=null;lockedTr=null;setInputs([0,0,0,0])}persist();renderList();renderMain()}
    function newField(){view={zoom:1,panX:0,panY:0};pinch=null;lockedTr=null;selectedId=null;current=null;editMode=false;$('shapePointEdit').textContent='✋ পয়েন্ট এডিট: OFF';$('mfAttachMode').value='center';$('mfAttachRef').value='start';$('mfShapeType').value='quad';$('mfTriAttachEdge').value='0';$('mfQuadAttachEdge').value='0';$('mfTriAttachWrap').style.display='none';$('mfQuadAttachWrap').style.display='none';$('shapeDWrap').style.display='';$('mfAttachOffsetFt').value='';$('mfAttachOffsetIn').value='';updateAttachUI();setInputs([0,0,0,0]);$('shapeResult').innerHTML='';const n=saved.length+1;$('shapeStatus').textContent=n===1?'প্রথম ক্ষেত্রের ফুট–ইঞ্চি মাপ দিন।':'আগে নির্বাচন করুন: কোন ক্ষেত্রের উত্তর/দক্ষিণ/পূর্ব/পশ্চিম পাশে নতুন ক্ষেত্রটি হবে।';$('mfPlacementStatus').textContent=n===1?'প্রথম ক্ষেত্র তৈরি হবে।':'নতুন ক্ষেত্রের আগে “কোন ক্ষেত্রের পাশে” এবং “কোন পাশে” নির্বাচন করুন।';drawAll()}
    function clear(){view={zoom:1,panX:0,panY:0};pinch=null;lockedTr=null;selectedId=null;current=null;editMode=false;$('shapePointEdit').textContent='✋ পয়েন্ট এডিট: OFF';setInputs([0,0,0,0]);$('shapeResult').innerHTML='';$('shapeStatus').textContent='মাপ পরিষ্কার করা হয়েছে।';drawAll()}
    function updateCurrent(){
      const v=dims();
      const type=$('mfShapeType')?.value||((v.filter(x=>x>0).length===3)?'tri':'quad');
      const local=localFromDims(v,type);
      if(selectedId){
        const f=saved.find(x=>String(x.id)===String(selectedId));
        if(f&&local){
          const c=centroid(f.pts),lc=centroid(local);
          f.v=v.slice();
          f.shapeType=type;
          f.pts=translate(local,c[0]-lc[0],c[1]-lc[1]);
          f.area=area(f.pts);
          // এই ক্ষেত্রটি অন্য কোনো ক্ষেত্রের সঙ্গে যুক্ত থাকলে তার নিজের ALIGNMENT অক্ষুণ্ণ রাখি।
          if(f.baseId!=null){
            const base=saved.find(x=>String(x.id)===String(f.baseId));
            if(base) f.pts=placeNext(f.pts,base.pts,f.side||'east',normalizedAttach(f),Number(f.triAttachEdge)||0,Number(f.quadAttachEdge)||0);
          }
          // বর্তমান ক্ষেত্র বড়/ছোট হলে এর সঙ্গে যুক্ত পরের ক্ষেত্রগুলোও নতুন edge-এ সঙ্গে সঙ্গে বসবে।
          reflowDependents(f.id);
          current={...f,pts:f.pts.map(p=>[...p]),v:f.v.slice()};
          persist();
          $('shapeStatus').textContent='এডিট চলছে — ফুট–ইঞ্চির নতুন মাপ স্কেচে প্রয়োগ হয়েছে। “ক্ষেত্র সেভ করুন” চাপলে স্থায়ীভাবে সংরক্ষণ হবে।';
        }
      }else{
        current=ensureCurrentFromInputs();
      }
      renderMain();drawAll();
    }
    ['A','B','C','D'].forEach(x=>['ft','in'].forEach(u=>$( 'shape'+x+u)?.addEventListener('input',()=>{if(!silentInputs)updateCurrent()})));
    $('mfShapeType')?.addEventListener('change',()=>{const t=$('mfShapeType').value;$('shapeDWrap').style.display=t==='tri'?'none':'';$('mfTriAttachWrap').style.display=t==='tri'?'':'none';updateBaseSideUI();if(t==='tri'){$('shapeDft').value='';$('shapeDin').value='';}if(!selectedId)updateCurrent();else{const f=saved.find(x=>String(x.id)===String(selectedId));if(f){f.shapeType=t;f.v=dims();const local=localFromDims(f.v,t);if(local){const c=centroid(f.pts),lc=centroid(local);f.pts=translate(local,c[0]-lc[0],c[1]-lc[1]);if(f.baseId!=null){const base=saved.find(x=>String(x.id)===String(f.baseId));if(base)f.pts=alignToBase(f.pts,base.pts,f.side||'east',normalizedAttach(f),Number(f.triAttachEdge)||0,Number(f.quadAttachEdge)||0);}f.area=area(f.pts);reflowDependents(f.id);current={...f,pts:f.pts.map(p=>[...p]),v:f.v.slice()};persist();renderList();}}}});
    $('mfTriAttachEdge')?.addEventListener('change',()=>{if(selectedId){const f=saved.find(x=>String(x.id)===String(selectedId));if(f&&shapeTypeOf(f)==='tri'){f.triAttachEdge=Number($('mfTriAttachEdge').value)||0;if(f.baseId!=null){const base=saved.find(x=>String(x.id)===String(f.baseId));if(base)f.pts=alignToBase(f.pts,base.pts,f.side||'east',normalizedAttach(f),f.triAttachEdge);}f.area=area(f.pts);reflowDependents(f.id);current={...f,pts:f.pts.map(p=>[...p]),v:f.v.slice()};persist();renderList();}}else updateCurrent();});
    $('mfQuadAttachEdge')?.addEventListener('change',()=>{if(selectedId){const f=saved.find(x=>String(x.id)===String(selectedId));if(f&&shapeTypeOf(f)!=='tri'){f.quadAttachEdge=Number($('mfQuadAttachEdge').value)||0;if(f.baseId!=null){const base=saved.find(x=>String(x.id)===String(f.baseId));if(base)f.pts=placeNext(f.pts,base.pts,f.side||'east',normalizedAttach(f),Number(f.triAttachEdge)||0,f.quadAttachEdge);}f.area=area(f.pts);reflowDependents(f.id);current={...f,pts:f.pts.map(p=>[...p]),v:f.v.slice()};persist();renderList();}}else updateCurrent();});
    $('shapeNew')?.addEventListener('click',newField);
    $('shapeSave')?.addEventListener('click',save);
    $('shapePdf')?.addEventListener('click',downloadMultiFieldPDF);
    $('shapeClear')?.addEventListener('click',clear);
    $('shapePointEdit')?.addEventListener('click',()=>{
      editMode=!editMode;
      $('shapePointEdit').textContent='✋ পয়েন্ট এডিট: '+(editMode?'ON':'OFF');
      $('mfPlacementStatus').textContent=editMode
        ?'ম্যানুয়াল এডিট চালু: A/B/C/D পয়েন্ট ধরে টানুন বা ক্ষেত্রের ভেতর থেকে পুরো ক্ষেত্র ড্র্যাগ করুন। কাছে এলে SNAP অটো-অ্যালাইন হবে।'
        :'ম্যানুয়াল এডিট বন্ধ। ফুট–ইঞ্চি দিয়ে মাপ পরিবর্তন করুন।';
      drawAll();
    });
    $('mfBaseField')?.addEventListener('change',()=>{updateBaseSideUI();if(!selectedId){$('mfPlacementStatus').textContent=$('mfBaseField').value==='__first__'?'প্রথম ক্ষেত্র হিসেবে তৈরি হবে।':'নির্বাচিত ক্ষেত্রের কোন পাশে ও কোন অবস্থানে বসবে তা নির্বাচন করুন।';updateAttachUI();updateCurrent()}});
    $('mfSide')?.addEventListener('change',()=>{updateAttachUI();if(!selectedId)updateCurrent()});
    $('mfAttachMode')?.addEventListener('change',()=>{updateAttachUI();if(!selectedId)updateCurrent()});
    $('mfAttachRef')?.addEventListener('change',()=>{updateAttachUI();if(!selectedId)updateCurrent()});
    $('mfAttachOffsetFt')?.addEventListener('input',()=>{updateAttachUI();if(!selectedId)updateCurrent()});
    $('mfAttachOffsetIn')?.addEventListener('input',()=>{updateAttachUI();if(!selectedId)updateCurrent()});
    const dist=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    function canvasXY(e){const r=multi.getBoundingClientRect();const sx=multi.width/Math.max(1,r.width),sy=multi.height/Math.max(1,r.height);return [(e.clientX-r.left)*sx,(e.clientY-r.top)*sy]}
    function activeTarget(){return selectedId?saved.find(f=>String(f.id)===String(selectedId)):current}
    function targetUnderScreen(sx,sy,tr){const t=activeTarget();if(!t)return false;const wp=worldPoint(sx,sy,tr,multi.height);return pointInPoly(wp,t.pts)}
    let dragMode='';let dragStartWorld=null;let dragOriginalPts=null;let dragPointerId=null;
    multi.addEventListener('pointerdown',e=>{
      if(e.pointerType==='touch'){
        if(!pinch)pinch={ids:{},startDist:0,startZoom:view.zoom,startCenter:null,startPanX:view.panX,startPanY:view.panY,startSingle:null};
        pinch.ids[e.pointerId]=e;const ids=Object.keys(pinch.ids);
        if(ids.length===2){const a=pinch.ids[ids[0]],b=pinch.ids[ids[1]],r=multi.getBoundingClientRect();pinch.startDist=dist(a,b);pinch.startZoom=view.zoom;pinch.startCenter=canvasXY({clientX:(a.clientX+b.clientX)/2,clientY:(a.clientY+b.clientY)/2});pinch.startPanX=view.panX;pinch.startPanY=view.panY;dragIndex=-1;dragMode='';return;}
      }
      if(!editMode)return;
      const [sx,sy]=canvasXY(e),all=saved.map(f=>f),target=activeTarget();if(!target)return;
      const tr=fitAll(all.concat(current&&!selectedId?[current]:[]),multi.width,multi.height);
      let best=-1,bd=(e.pointerType==='touch'?42:28);target.pts.forEach((p,i)=>{const q=screenPoint(p,tr,multi.height,multi.width),d=Math.hypot(q[0]-sx,q[1]-sy);if(d<bd){bd=d;best=i}});
      if(best>=0){dragMode='vertex';dragIndex=best;dragPointerId=e.pointerId;multi.setPointerCapture(e.pointerId);return;}
      if(targetUnderScreen(sx,sy,tr)){dragMode='field';dragIndex=-1;dragPointerId=e.pointerId;dragStartWorld=worldPoint(sx,sy,tr,multi.height);dragOriginalPts=target.pts.map(p=>[...p]);multi.setPointerCapture(e.pointerId);}
    });
    multi.addEventListener('pointermove',e=>{
      if(e.pointerType==='touch'&&pinch&&pinch.ids[e.pointerId]){pinch.ids[e.pointerId]=e;const ids=Object.keys(pinch.ids);if(ids.length===2){const a=pinch.ids[ids[0]],b=pinch.ids[ids[1]],r=multi.getBoundingClientRect(),d=Math.max(20,dist(a,b)),ratio=d/pinch.startDist;view.zoom=Math.min(3,Math.max(.55,pinch.startZoom*ratio));const c=canvasXY({clientX:(a.clientX+b.clientX)/2,clientY:(a.clientY+b.clientY)/2});view.panX=pinch.startPanX+(c[0]-pinch.startCenter[0]);view.panY=pinch.startPanY+(c[1]-pinch.startCenter[1]);drawAll();return;}if(ids.length===1&&dragMode==='vertex'){} }
      if(dragPointerId!==e.pointerId||!dragMode)return;
      const [sx,sy]=canvasXY(e),all=saved.map(f=>f),target=activeTarget();if(!target)return;const tr=fitAll(all.concat(current&&!selectedId?[current]:[]),multi.width,multi.height);
      if(dragMode==='vertex'){
        target.pts[dragIndex]=worldPoint(sx,sy,tr,multi.height);
        const others=all.filter(f=>String(f.id)!==String(target.id));
        const sn=snapVertexToNearbyGeometry(target,others,dragIndex,tr,32);
        target.v=sideLengths(target.pts).map(x=>Math.round(x*12)/12);target.area=area(target.pts);
        reflowDependents(target.id);setInputs(target.v);syncHidden(target.v);
        $('shapeStatus').textContent=sn
          ? (sn.type==='point'?'🧲 SNAP: কাছের পয়েন্টে সরাসরি যুক্ত হয়েছে।':'🧲 SNAP: কাছের boundary line-এর উপর পয়েন্টটি exact adjust হয়েছে—ফাঁকা রাখা হয়নি।')
          : 'পয়েন্ট এডিট: আঙুল/মাউস দিয়ে পয়েন্ট সরান। কাছের point/line-এ এলে SNAP হবে।';
        renderMain();drawAll();return;
      }
      if(dragMode==='field'){
        const now=worldPoint(sx,sy,tr,multi.height),dx=now[0]-dragStartWorld[0],dy=now[1]-dragStartWorld[1];target.pts=dragOriginalPts.map(p=>[p[0]+dx,p[1]+dy]);target.v=sideLengths(target.pts).map(x=>Math.round(x*12)/12);target.area=area(target.pts);$('shapeStatus').textContent='✋ ক্ষেত্রটি টেনে সরানো হচ্ছে — কাছের boundary/পয়েন্টে ছেড়ে দিলে SNAP হবে।';renderMain();drawAll();
      }
    });
    multi.addEventListener('pointerup',e=>{
      // একটি আঙুলে drag শেষ হলে আগের কোড pinch-state দেখে এখানে return করত,
      // ফলে touch device-এ SNAP/commit অংশ কখনও চলত না। দুই-আঙুলের pinch-এ শুধু return করব।
      let wasPinchPointer=false;
      if(pinch&&pinch.ids[e.pointerId]){
        wasPinchPointer=Object.keys(pinch.ids).length>=2;
        delete pinch.ids[e.pointerId];
        const remaining=Object.keys(pinch.ids).length;
        if(dragPointerId===e.pointerId && wasPinchPointer){dragPointerId=null;dragMode='';}
        if(remaining===0) pinch=null;
        else if(remaining===1 && wasPinchPointer) {
          // দ্বিতীয় আঙুল উঠে গেছে; অবশিষ্ট আঙুলকে নতুন drag শুরু না করিয়ে বর্তমান gesture শেষ করি।
          const left=Object.keys(pinch.ids)[0];
          if(String(left)!==String(dragPointerId)){ pinch=null; }
        }
        if(wasPinchPointer)return;
      }
      if(dragPointerId!==e.pointerId)return;
      const target=activeTarget();
      if(target){const all=saved.filter(f=>String(f.id)!==String(target.id));const tr=fitAll(all.concat([target]),multi.width,multi.height);if(dragMode==='vertex'){
          const ti=dragIndex;
          const sn=snapVertexToNearbyGeometry(target,all,ti,tr,36);
          if(sn)$('shapeStatus').textContent=sn.type==='point'
            ? '🧲 SNAP: কাছের পয়েন্টে সঠিকভাবে যুক্ত হয়েছে।'
            : '🧲 SNAP: boundary line-এর সাথে পয়েন্ট exact adjust হয়েছে—ফাঁকা নেই।';
        }else if(dragMode==='field'){
          const sn=snapDraggedField(target,all,tr,34);target.pts=sn.pts;if(sn.message)$('shapeStatus').textContent=sn.message;else $('shapeStatus').textContent='ক্ষেত্রের নতুন অবস্থান রাখা হয়েছে।';
        }
        target.v=sideLengths(target.pts).map(x=>Math.round(x*12)/12);target.area=area(target.pts);reflowDependents(target.id);setInputs(target.v);syncHidden(target.v);
        if(selectedId){const f=saved.find(x=>String(x.id)===String(selectedId));if(f){f.v=target.v.slice();f.area=target.area;f.pts=target.pts.map(p=>[...p]);persist();renderList();}}
        renderMain();drawAll();
      }
      dragPointerId=null;dragMode='';dragIndex=-1;dragStartWorld=null;dragOriginalPts=null;
    });
    multi.addEventListener('pointercancel',e=>{if(pinch&&pinch.ids[e.pointerId]){delete pinch.ids[e.pointerId];if(Object.keys(pinch.ids).length<2)pinch=null;}dragPointerId=null;dragMode='';dragIndex=-1;dragStartWorld=null;dragOriginalPts=null;});
    // SNAP ON: প্রথম ক্ষেত্র দেখাবে, কিন্তু দ্বিতীয়/তৃতীয় ক্ষেত্র তৈরি করার আগে পাশ নির্বাচন বাধ্যতামূলক।
    setInputs(saved[0]?.v||[50,80,55,85]); if(saved[0]){selectedId=saved[0].id;current=null}else{selectedId=null;current=null} updateBaseOptions(); updateAttachUI(); renderMain(); renderList();
  })();

  // -------- Leaflet map + polygon area --------
  let map, poly, markers=[];
  const mapAreaEl=$('mapArea');
  const mapOfflineNote=$('mapOfflineNote');
  function polygonAreaM2(latlngs) {
    if (latlngs.length<3) return 0;
    const R=6378137, lat0=latlngs.reduce((s,p)=>s+p.lat,0)/latlngs.length*Math.PI/180;
    const pts=latlngs.map(p=>({x:R*p.lng*Math.PI/180*Math.cos(lat0),y:R*p.lat*Math.PI/180}));
    let area=0;
    for(let i=0;i<pts.length;i++){const j=(i+1)%pts.length; area+=pts[i].x*pts[j].y-pts[j].x*pts[i].y;}
    return Math.abs(area)/2;
  }
  function updateMapArea() {
    const latlngs=markers.map(m=>m.getLatLng());
    const m2=polygonAreaM2(latlngs);
    mapAreaEl.textContent=latlngs.length>=3 ? `ক্ষেত্রফল: ${bn(m2)} বর্গমিটার • ${(m2/10000).toLocaleString('bn-BD',{maximumFractionDigits:4})} হেক্টর` : `পয়েন্ট: ${bn(latlngs.length)}টি`;
    if(poly && map) { map.removeLayer(poly); poly=null; }
    if(latlngs.length>=3 && map) poly=L.polygon(latlngs,{color:'#08747b',weight:3,fillOpacity:.12}).addTo(map);
  }
  function showMapOfflineState() {
    if (mapOfflineNote) mapOfflineNote.classList.add('show');
    if (mapAreaEl) mapAreaEl.textContent='মানচিত্র: অনলাইন সংযোগ প্রয়োজন';
  }
  function initMap() {
    if(!$('registryMap')) return;
    if(!window.L){
      showMapOfflineState();
      return;
    }
    try {
      map=L.map('registryMap').setView([22.95,90.84],12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
      if (navigator.onLine && mapOfflineNote) mapOfflineNote.classList.remove('show');
      map.on('click',e=>{
        const m=L.marker(e.latlng,{draggable:true}).addTo(map);
        m.on('dragend',updateMapArea); markers.push(m); updateMapArea();
      });
      map.on('tileerror',()=>showMapOfflineState());
    } catch(err) {
      showMapOfflineState();
    }
  }
  $('mapClear')?.addEventListener('click',()=>{
    markers.forEach(m=>map?.removeLayer(m)); markers=[];
    if(poly && map){map.removeLayer(poly);poly=null;}
    mapAreaEl.textContent=map ? 'ক্ষেত্রফল: —' : 'মানচিত্র: অনলাইন সংযোগ প্রয়োজন';
  });
  $('mapClose')?.addEventListener('click',updateMapArea);
  window.addEventListener('offline',showMapOfflineState);
  window.addEventListener('online',()=>{ if(mapOfflineNote) mapOfflineNote.classList.remove('show'); });
  initMap();

})();
