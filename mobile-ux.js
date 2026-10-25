/* mobile-ux.js — মোবাইল ব্যবহারযোগ্যতা (আচরণ)।
   ক্যালকুলেটরের গণনা/সূত্র/ডেটা এই ফাইলে স্পর্শ করা হয়নি; শুধু ইনপুটের কিপ্যাড-ইঙ্গিত, ট্যাব স্ক্রল ও ফলাফল দৃশ্যমান করা। */
(function(){
'use strict';
var doc=document, root=doc.documentElement;
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var smooth=reduce?'auto':'smooth';
function ready(fn){if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',fn,{once:true});else fn();}

/* ---------- ১) নিচের বার (স্ক্রলে লুকায়) ও "উপরে যান" ---------- */
function setupBars(){
  var top=doc.querySelector('.backtop');
  var lastY=window.pageYOffset||0, ticking=false;
  function update(){
    ticking=false;
    var y=window.pageYOffset||0, dy=y-lastY;
    var max=Math.max(root.scrollHeight,doc.body.scrollHeight);
    var nearBottom=window.innerHeight+y>=max-90;
    if(top)top.classList.toggle('show',y>480);
    if(Math.abs(dy)>=8){
      if(y<90||dy<0||nearBottom)root.classList.remove('bar-hidden');
      else root.classList.add('bar-hidden');
      lastY=y;
    }else if(y<90||nearBottom){root.classList.remove('bar-hidden');}
  }
  window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(update);}},{passive:true});
  update();

  /* লেখার ঘরে ট্যাপ করলে (কিবোর্ড ওঠে) বার সরে যায় */
  var timer;
  function isField(el){
    return !!el&&/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)&&!/^(button|submit|reset|checkbox|radio|range|file)$/i.test(el.type||'');
  }
  doc.addEventListener('focusin',function(e){if(isField(e.target)){clearTimeout(timer);root.classList.add('bar-kbd');}});
  doc.addEventListener('focusout',function(){
    clearTimeout(timer);
    timer=setTimeout(function(){if(!isField(doc.activeElement))root.classList.remove('bar-kbd');},250);
  });
}

/* ---------- ২) জ্ঞানভাণ্ডার: ভাঁজ-করা অংশ (শুধু মোবাইলে কাজ করে) ---------- */
function setupAccordion(){
  var ids=['records','survey','mutation','tax','measurement','verification','mistakes','checklist','sources'];
  var mq=window.matchMedia('(max-width:700px)');
  var sections=[];
  ids.forEach(function(id){
    var sec=doc.getElementById(id);
    if(!sec||sec.classList.contains('acc-section'))return;
    var head=sec.querySelector('.kh-section-title');
    if(!head||!head.parentElement)return;
    var wrap=head.parentElement;
    var body=doc.createElement('div');
    body.className='acc-body';body.id='acc-'+id;
    while(head.nextSibling)body.appendChild(head.nextSibling);
    wrap.appendChild(body);
    var chev=doc.createElement('span');
    chev.className='acc-chevron';chev.setAttribute('aria-hidden','true');chev.textContent='▾';
    head.appendChild(chev);
    head.classList.add('acc-head');
    head.setAttribute('role','button');head.tabIndex=0;
    head.setAttribute('aria-controls',body.id);head.setAttribute('aria-expanded','false');
    sec.classList.add('acc-section');
    function toggle(){if(!mq.matches)return;setOpen(sec,!sec.classList.contains('acc-open'));}
    head.addEventListener('click',toggle);
    head.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
    sections.push(sec);
  });
  if(!sections.length)return;

  function setOpen(sec,open){
    sec.classList.toggle('acc-open',open);
    var h=sec.querySelector('.acc-head');
    if(h)h.setAttribute('aria-expanded',String(open));
  }
  function openForHash(){
    var id=decodeURIComponent((location.hash||'').replace(/^#/,''));
    if(!id)return false;
    var el=doc.getElementById(id);
    var sec=el&&el.closest?el.closest('.acc-section'):null;
    if(!sec)return false;
    setOpen(sec,true);
    if(mq.matches)setTimeout(function(){(el||sec).scrollIntoView({behavior:smooth,block:'start'});},60);
    return true;
  }
  if(!openForHash())setOpen(sections[0],true);   // শুরুতে প্রথম অংশ খোলা
  window.addEventListener('hashchange',openForHash);
  doc.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href^="#"]');
    if(!a)return;
    var id=decodeURIComponent((a.getAttribute('href')||'').slice(1));
    var el=id&&doc.getElementById(id);
    var sec=el&&el.closest?el.closest('.acc-section'):null;
    if(sec)setOpen(sec,true);
  });

  /* পেজের নিজস্ব সার্চ: যে অংশ মিলেছে সেটি খুলে দেখায় */
  var input=doc.getElementById('khSearch'), btn=doc.getElementById('khSearchBtn');
  function afterSearch(){
    setTimeout(function(){
      if(!input||!(input.value||'').trim())return;
      var first=null;
      sections.forEach(function(sec){
        if(sec.style.display!=='none'){setOpen(sec,true);if(!first)first=sec;}
      });
      if(first&&mq.matches)first.scrollIntoView({behavior:smooth,block:'start'});
    },30);
  }
  if(btn)btn.addEventListener('click',afterSearch);
  if(input)input.addEventListener('keydown',function(e){if(e.key==='Enter')afterSearch();});
}

/* ---------- ৩) ক্যালকুলেটর পেজ ---------- */
function setupCalculator(){
  if(!doc.querySelector('.calc-tabs')&&!doc.body.classList.contains('calculator-page'))return;

  /* (ক) সংখ্যার ঘরে সরাসরি নম্বর কিপ্যাড (ঋণাত্মক মান লাগতে পারে এমন ঘর বাদে) */
  function fixInputs(scope){
    var list=(scope||doc).querySelectorAll('input[type="number"]');
    for(var i=0;i<list.length;i++){
      var el=list[i];
      if(!el.hasAttribute('inputmode')){
        var mn=el.getAttribute('min');
        if(!(mn!==null&&parseFloat(mn)<0))el.setAttribute('inputmode','decimal');
      }
      if(!el.hasAttribute('enterkeyhint'))el.setAttribute('enterkeyhint','next');
    }
  }
  fixInputs(doc);
  var pending=false;
  new MutationObserver(function(){
    if(pending)return;pending=true;
    requestAnimationFrame(function(){pending=false;fixInputs(doc);});
  }).observe(doc.body,{childList:true,subtree:true});

  /* (খ) ট্যাব আড়াআড়ি স্ক্রল: সক্রিয় ট্যাব মাঝখানে আনা */
  var strip=doc.querySelector('.calc-tabs');
  function center(tab){
    if(!strip||!tab||!window.matchMedia('(max-width:700px)').matches)return;
    var s=strip.getBoundingClientRect(), t=tab.getBoundingClientRect();
    var left=strip.scrollLeft+(t.left-s.left)-(strip.clientWidth-tab.offsetWidth)/2;
    strip.scrollTo({left:Math.max(0,left),behavior:smooth});
  }
  if(strip){
    new MutationObserver(function(muts){
      for(var i=0;i<muts.length;i++){
        var tg=muts[i].target;
        if(tg.classList&&tg.classList.contains('calc-tab')&&tg.classList.contains('active')){center(tg);break;}
      }
    }).observe(strip,{subtree:true,attributes:true,attributeFilter:['class']});
    setTimeout(function(){center(strip.querySelector('.calc-tab.active'));},400);
  }

  /* (গ) "হিসাব করুন" চাপার পর ফলাফল পর্দায় না থাকলে সেখানে নিয়ে যাওয়া */
  var RES='.calc-result,.poly-results,.tp-result,.multi-field-result,.wood-cft-result,.sawn-wood-cft-result,.fbc-result-card,[id$="Result"]';
  var armedUntil=0, armedBtn=null, timer=null;
  doc.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.calc-wrap button, .calc-wrap input[type="submit"]');
    if(!b)return;
    if(b.closest('.calc-tabs,.calc-ux-bar,.calculator-launcher,.calc-result-tools'))return;
    armedUntil=Date.now()+2500;armedBtn=b;
  },true);
  function hasContent(el){
    if(!el||el.offsetParent===null||!el.getClientRects().length)return false;
    return (el.textContent||'').trim().length>0||!!el.querySelector('svg,canvas');
  }
  function reveal(){
    if(Date.now()>armedUntil||!armedBtn)return;
    if(!window.matchMedia('(max-width:900px)').matches)return;
    var scope=armedBtn.closest('.calc-panel,.featured-panel,#professional-land-suite,#registry-calculator')||doc;
    var list=[].slice.call(scope.querySelectorAll(RES)).filter(hasContent);
    if(!list.length)return;
    var btn=armedBtn;
    var target=list.filter(function(r){return btn.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_FOLLOWING;})[0]||list[0];
    var r=target.getBoundingClientRect();
    armedUntil=0;
    if(r.top<70||r.top>window.innerHeight-160){
      window.scrollTo({top:(window.pageYOffset||0)+r.top-84,behavior:smooth});
    }
  }
  var host=doc.querySelector('.calc-wrap')||doc.body;
  new MutationObserver(function(){
    if(Date.now()>armedUntil)return;
    clearTimeout(timer);timer=setTimeout(reveal,160);
  }).observe(host,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','hidden','style']});
}

ready(function(){setupBars();setupAccordion();setupCalculator();});
})();
