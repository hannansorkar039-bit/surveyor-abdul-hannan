

if ("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{}));

(()=>{
  const loaded=new Map();
  const loadScript=(src,key=src,integrity='',crossorigin='')=>{
    if(loaded.has(key)) return loaded.get(key);
    const p=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src; s.defer=true;
      if(integrity){ s.integrity=integrity; s.crossOrigin=crossorigin || 'anonymous'; }
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Failed to load '+src));
      document.head.appendChild(s);
    });
    loaded.set(key,p); return p;
  };
  const loadCss=(href,key=href,integrity='',crossorigin='')=>{
    if(document.querySelector('link[data-dynamic-css="'+key+'"]')) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const l=document.createElement('link');
      l.rel='stylesheet'; l.href=href; l.dataset.dynamicCss=key;
      if(integrity){ l.integrity=integrity; l.crossOrigin=crossorigin || 'anonymous'; }
      l.onload=resolve;
      l.onerror=()=>reject(new Error('Failed to load '+href));
      document.head.appendChild(l);
    });
  };
  const whenVisible=(el,loader)=>{
    if(!el)return;
    if(!('IntersectionObserver' in window)){loader();return;}
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);loader();}}),{rootMargin:'420px 0px'}); io.observe(el);
  };
  window.SAH_CALC_READY=loadScript('calculator-core.js','core').catch(error=>{ console.error('Calculator core failed to load:',error); throw error; });

  // Direct calculator-tab clicks can happen before the dynamically loaded core is ready.
  // Hold that click, wait for the core, then replay it once so no tab initialization is lost.
  document.addEventListener('click',async event=>{
    const btn=event.target.closest?.('.calc-tab');
    if(!btn || btn.dataset.sahCoreGuarded==='1') return;
    if(btn.classList.contains('active')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      await window.SAH_CALC_READY;
      btn.dataset.sahCoreGuarded='1';
      btn.click();
      delete btn.dataset.sahCoreGuarded;
    } catch(error) {
      console.error('Calculator initialization failed:',error);
    }
  },true);
  window.SAH_LOAD_PDF=async()=>{
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','jspdf','sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA==','anonymous').catch(error=>{ console.error('jsPDF offline dependency failed:',error); });
    await loadScript('calculator-pdf.js','pdf').catch(()=>{});
  };
  const loadPartition=()=>loadScript('calculator-partition.js?v=multi-v2','partition').catch(()=>{});
  document.querySelectorAll('.calc-tab[data-tab="quad-partition"]').forEach(btn=>btn.addEventListener('click',loadPartition,{once:true}));
  const loadTrianglePartition=()=>loadScript('calculator-triangle-partition.js?v=tp-v1','triangle-partition').catch(()=>{});
  document.querySelectorAll('.calc-tab[data-tab="triangle-partition"]').forEach(btn=>btn.addEventListener('click',loadTrianglePartition,{once:true}));
  whenVisible(document.querySelector('.featured-calcs'),()=>loadScript('calculator-featured.js','featured').catch(()=>{}));
  whenVisible(document.querySelector('#professional-land-suite'),()=>loadScript('calculator-land-suite.js','land-suite').catch(()=>{}));
  // Load Leaflet before the registry engine from every entry point.
  // The multi-field Drawing section and the map live in the same calculator,
  // so the registry engine must never execute before window.L is available.
  const loadRegistry=async()=>{
    await loadCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','leaflet-css','sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=','anonymous').catch(error=>{ console.error('Leaflet CSS failed:',error); });
    await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','leaflet','sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=','anonymous').catch(error=>{ console.error('Leaflet JS failed:',error); });
    await loadScript('calculator-registry.js?v=v14-smooth-point-edit','registry').catch(()=>{});
  };
  const shapeSketch=document.querySelector('#panel-multi-field-drawing');
  whenVisible(shapeSketch,loadRegistry);
  const registry=document.querySelector('#registry-calculator');
  whenVisible(registry,loadRegistry);
  document.querySelectorAll('.calculator-launch-card').forEach(btn=>btn.addEventListener('click',async()=>{
    await window.SAH_CALC_READY;
    const tab=btn.dataset.calcTab;
    if(tab){
      const target=document.querySelector('.calc-tab[data-tab="'+tab+'"]');
      if(target) target.click();
      if(tab==='quad-partition') await loadPartition();
      if(tab==='triangle-partition') await loadTrianglePartition();
      document.querySelector('#panel-'+tab)?.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    const id=btn.dataset.calcTarget;
    if(id) document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
  }));
})();
