

if ("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{}));

(()=>{
  const loaded=new Map();
  const loadScript=(src,key=src)=>{
    if(loaded.has(key)) return loaded.get(key);
    const p=new Promise((resolve,reject)=>{
      const s=document.createElement('script'); s.src=src; s.defer=true; s.onload=resolve; s.onerror=()=>reject(new Error('Failed to load '+src));
      document.head.appendChild(s);
    });
    loaded.set(key,p); return p;
  };
  const loadCss=(href,key=href)=>{
    if(document.querySelector('link[data-dynamic-css="'+key+'"]')) return Promise.resolve();
    const l=document.createElement('link'); l.rel='stylesheet'; l.href=href; l.dataset.dynamicCss=key; document.head.appendChild(l); return Promise.resolve();
  };
  const whenVisible=(el,loader)=>{
    if(!el)return;
    if(!('IntersectionObserver' in window)){loader();return;}
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);loader();}}),{rootMargin:'420px 0px'}); io.observe(el);
  };
  window.SAH_CALC_READY=loadScript('calculator-core.js','core').catch(()=>{});
  window.SAH_LOAD_PDF=async()=>{
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','jspdf').catch(()=>{});
    await loadScript('calculator-pdf.js','pdf').catch(()=>{});
  };
  const loadPartition=()=>loadScript('calculator-partition.js','partition').catch(()=>{});
  document.querySelectorAll('.calc-tab[data-tab="quad-partition"]').forEach(btn=>btn.addEventListener('click',loadPartition,{once:true}));
  whenVisible(document.querySelector('.featured-calcs'),()=>loadScript('calculator-featured.js','featured').catch(()=>{}));
  whenVisible(document.querySelector('#professional-land-suite'),()=>loadScript('calculator-land-suite.js','land-suite').catch(()=>{}));
  // The multi-field Drawing & Alignment section lives before the registry calculator.
  // Load its engine when that section becomes visible so its inputs are live immediately.
  const shapeSketch=document.querySelector('#featured-shape-sketch');
  whenVisible(shapeSketch,()=>loadScript('calculator-registry.js?v=v13-deterministic-cardinal-placement','registry').catch(()=>{}));
  const registry=document.querySelector('#registry-calculator');
  whenVisible(registry,async()=>{
    await loadCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','leaflet-css');
    await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','leaflet').catch(()=>{});
    await loadScript('calculator-registry.js?v=v13-deterministic-cardinal-placement','registry').catch(()=>{});
  });
  document.querySelectorAll('.calculator-launch-card').forEach(btn=>btn.addEventListener('click',async()=>{
    await window.SAH_CALC_READY;
    const tab=btn.dataset.calcTab;
    if(tab){
      const target=document.querySelector('.calc-tab[data-tab="'+tab+'"]');
      if(target) target.click();
      if(tab==='quad-partition') await loadPartition();
      document.querySelector('#panel-'+tab)?.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    const id=btn.dataset.calcTarget;
    if(id) document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
  }));
})();
