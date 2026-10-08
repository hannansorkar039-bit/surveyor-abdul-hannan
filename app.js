
(function(){
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const youtubeId = url => {
    const m = String(url || "").match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
    return m ? m[1] : "";
  };

  const vg = $("videoGallery");
  if (vg) {
    if (SITE.videos.length) {
      vg.innerHTML = SITE.videos.map(v => {
        const platform = String(v.platform || "").toLowerCase();
        const id = youtubeId(v.url);
        const isYouTube = platform === "youtube" || !!id;
        if (isYouTube && id) {
          return `
            <article class="video-card">
              <div class="video-frame-wrap">
                <iframe class="video-frame" src="https://www.youtube.com/embed/${encodeURIComponent(id)}" title="${esc(v.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
              </div>
              <div class="video-platform">▶ YouTube</div>
              <h3>${esc(v.title)}</h3>
              <p>${esc(v.description || "")}${v.date ? " · " + esc(v.date) : ""}</p>
            </article>`;
        }
        return `
          <article class="video-card">
            <a class="social-video-card" href="${esc(v.url || "#")}" target="_blank" rel="noopener noreferrer">
              <span class="social-video-icon">${platform === "facebook" ? "f" : "▶"}</span>
              <strong>${platform === "facebook" ? "Facebook ভিডিও দেখুন" : "ভিডিও দেখুন"}</strong>
              <span>নতুন ট্যাবে ভিডিওটি খুলবে →</span>
            </a>
            <div class="video-platform">${platform === "facebook" ? "● Facebook" : "ভিডিও"}</div>
            <h3>${esc(v.title)}</h3>
            <p>${esc(v.description || "")}${v.date ? " · " + esc(v.date) : ""}</p>
          </article>`;
      }).join("");
    } else {
      vg.innerHTML = `
        <div class="video-empty">
          <div>
            <div class="play">▶</div>
            <h3 style="margin:15px 0 6px;color:#fff">ভিডিও শীঘ্রই যুক্ত হবে</h3>
            <p style="margin:0;opacity:.9">YouTube বা Facebook ভিডিও যোগ করতে content.js-এর videos তালিকায় লিংক দিন।</p>
          </div>
        </div>`;
    }
  }

  // Shared image fallback handler. Event delegation is used so images added
  // later by the scalable gallery receive the same protection as initial images.
  const applyImageFallback = (img) => {
    if (!img || img.dataset.fallback) return;
    img.dataset.fallback = '1';
    const label = (img.alt || 'Surveyor Abdul Hannan').slice(0, 45);
    const safeLabel = label.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#061a2a"/><stop offset="1" stop-color="#08747b"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><g fill="none" stroke="#f2bd62" stroke-opacity=".25"><path d="M0 170h1200M0 330h1200M0 490h1200M0 650h1200M180 0v800M390 0v800M600 0v800M810 0v800M1020 0v800"/></g><circle cx="600" cy="315" r="105" fill="#ffffff" fill-opacity=".08" stroke="#f2bd62" stroke-width="4"/><text x="600" y="335" text-anchor="middle" font-family="Arial,sans-serif" font-size="92" font-weight="700" fill="#f2bd62">AH</text><text x="600" y="500" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="#ffffff">SURVEYOR ABDUL HANNAN</text><text x="600" y="545" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" fill="#d4e7eb">${safeLabel}</text></svg>`;
    img.src = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  };
  document.addEventListener('error', e => {
    if (e.target instanceof HTMLImageElement) applyImageFallback(e.target);
  }, true);

  const photoGallery = $("photoGallery");
  if (photoGallery) {
    // Scalable gallery: keep all photo data available, but only render a small
    // batch at a time. This prevents hundreds of gallery cards from being
    // inserted into the DOM at once while preserving the existing lightbox.
    const photos = Array.isArray(SITE.photos) ? SITE.photos : [];
    const PAGE_SIZE = 24;
    let rendered = 0;

    const renderPhotos = () => {
      const next = photos.slice(rendered, rendered + PAGE_SIZE);
      if (!next.length) return;
      const html = next.map(p => `
        <figure class="gallery-item">
          <img src="${esc(p.src)}" alt="${esc(p.alt || "ভূমি জরিপের ছবি")}" loading="lazy" decoding="async" width="1200" height="900" tabindex="0">
          <figcaption class="gallery-caption"><strong>${esc(p.title || "ভূমি জরিপের ছবি")}</strong><span>${esc(p.caption || "")}</span></figcaption>
        </figure>`).join("");
      photoGallery.insertAdjacentHTML("beforeend", html);
      rendered += next.length;
      updateGalleryMoreButton();
    };

    const moreWrap = document.createElement("div");
    moreWrap.className = "gallery-more-wrap";
    moreWrap.hidden = true;
    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "btn btn-light gallery-more-btn";
    moreBtn.textContent = "আরও ছবি দেখুন";
    moreBtn.setAttribute("aria-controls", "photoGallery");
    moreBtn.addEventListener("click", renderPhotos);
    moreWrap.appendChild(moreBtn);
    photoGallery.insertAdjacentElement("afterend", moreWrap);

    function updateGalleryMoreButton() {
      const remaining = photos.length - rendered;
      moreWrap.hidden = remaining <= 0;
      if (remaining > 0) {
        moreBtn.textContent = `আরও ছবি দেখুন (${Math.min(PAGE_SIZE, remaining)})`;
      }
    }

    if (photos.length) {
      renderPhotos();
    } else {
      photoGallery.innerHTML = '<p class="gallery-empty">বর্তমানে কোনো ছবি যুক্ত করা হয়নি।</p>';
    }
  }

  const pg = $("postGallery");
  if (pg) {
    if (SITE.posts.length) {
      pg.innerHTML = SITE.posts.map(p => `
        <article class="post-card">
          <div class="post-meta">${esc(p.category || "তথ্য")}${p.date ? " · " + esc(p.date) : ""}</div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.excerpt || "")}</p>
          ${p.url ? `<a class="post-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">সম্পূর্ণ লেখা →</a>` : ""}
        </article>`).join("");
    } else {
      pg.innerHTML = `
        <article class="post-card">
          <a class="post-link" href="https://surveyorabdulhannan.blogspot.com/" target="_blank" rel="noopener noreferrer">
            ব্লগার খুলুন →
          </a>
        </article>`;
    }
  }

  const socialGrid = $("socialGrid");
  if (socialGrid) {
    socialGrid.innerHTML = SITE.profiles.map(p => {
      const name = String(p[0] || "");
      const n = name.toLowerCase();
      let icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg>';
      if(n.includes("facebook")) icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9c0-.7.3-1 1-1z"/></svg>';
      else if(n.includes("instagram")) icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8"/></svg>';
      else if(n.includes("linkedin")) icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 10v6M8 7.5v.01M12 16v-6M12 13c0-2 4-3 4 0v3"/></svg>';
      else if(n.includes("tiktok")) icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5v9a4 4 0 1 1-4-4"/><path d="M14 5c1 2 2 3 5 3"/></svg>';
      else if(n.includes("youtube")) icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="4"/><path d="M10 9l5 3-5 3V9z"/></svg>';
      else if(n.includes("blogger")) icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h7a5 5 0 0 1 5 5v1h1v4a6 6 0 0 1-6 6H7a3 3 0 0 1-3-3V7a3 3 0 0 1 2-3z"/><path d="M9 10h4M9 14h6"/></svg>';
      else if(n.includes("maps")) icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6z"/><path d="M9 4v14M15 6v14"/></svg>';
      return `<a class="social" href="${esc(p[1])}" target="_blank" rel="noopener noreferrer"><span class="social-icon">${icon}</span><span>${esc(p[0])}</span></a>`;
    }).join("");
  }
})();

(function(){
  const form = document.getElementById("workOrderForm");
  if(!form) return;

  const districts = {
    "ঢাকা":["ঢাকা","গাজীপুর","নারায়ণগঞ্জ","নরসিংদী","মুন্সিগঞ্জ","মানিকগঞ্জ","মাদারীপুর","রাজবাড়ী","ফরিদপুর","গোপালগঞ্জ","কিশোরগঞ্জ","টাঙ্গাইল","শরীয়তপুর"],
    "চট্টগ্রাম":["চট্টগ্রাম","কক্সবাজার","কুমিল্লা","ফেনী","নোয়াখালী","লক্ষ্মীপুর","চাঁদপুর","ব্রাহ্মণবাড়িয়া","রাঙ্গামাটি","খাগড়াছড়ি","বান্দরবান"],
    "রাজশাহী":["রাজশাহী","নওগাঁ","নাটোর","চাঁপাইনবাবগঞ্জ","পাবনা","সিরাজগঞ্জ","বগুড়া","জয়পুরহাট"],
    "খুলনা":["খুলনা","বাগেরহাট","সাতক্ষীরা","যশোর","ঝিনাইদহ","মাগুরা","নড়াইল","কুষ্টিয়া","চুয়াডাঙ্গা","মেহেরপুর"],
    "বরিশাল":["বরিশাল","ভোলা","পটুয়াখালী","পিরোজপুর","বরগুনা","ঝালকাঠি"],
    "সিলেট":["সিলেট","মৌলভীবাজার","হবিগঞ্জ","সুনামগঞ্জ"],
    "রংপুর":["রংপুর","দিনাজপুর","ঠাকুরগাঁও","পঞ্চগড়","নীলফামারী","লালমনিরহাট","কুড়িগ্রাম","গাইবান্ধা"],
    "ময়মনসিংহ":["ময়মনসিংহ","জামালপুর","শেরপুর","নেত্রকোনা"]
  };

  const division = document.getElementById("orderDivision");
  const district = document.getElementById("orderDistrict");
  const upazila = document.getElementById("orderUpazila");
  const mouza = document.getElementById("orderMouza");
  const work = document.getElementById("orderWork");

  const sum = {
    division:document.getElementById("sumDivision"),
    district:document.getElementById("sumDistrict"),
    upazila:document.getElementById("sumUpazila"),
    mouza:document.getElementById("sumMouza"),
    work:document.getElementById("sumWork")
  };

  function updateSummary(){
    sum.division.textContent = division.value || "—";
    sum.district.textContent = district.value || "—";
    sum.upazila.textContent = upazila.value.trim() || "—";
    sum.mouza.textContent = mouza.value.trim() || "—";
    sum.work.textContent = work.value || "—";
  }

  division.addEventListener("change", function(){
    district.innerHTML = '<option value="">জেলা নির্বাচন করুন</option>';
    (districts[this.value] || []).forEach(d => {
      const o = document.createElement("option");
      o.value = d; o.textContent = d;
      district.appendChild(o);
    });
    district.disabled = !(districts[this.value] || []).length;
    updateSummary();
  });

  [district, upazila, mouza, work].forEach(el => {
    el.addEventListener("input", updateSummary);
    el.addEventListener("change", updateSummary);
  });

  form.addEventListener("reset", function(){
    setTimeout(function(){
      district.innerHTML = '<option value="">আগে বিভাগ নির্বাচন করুন</option>';
      district.disabled = true;
      updateSummary();
      document.getElementById("orderSuccess").classList.remove("show");
      document.getElementById("orderError").classList.remove("show");
    }, 0);
  });

  form.addEventListener("submit", function(e){
    e.preventDefault();
    const success = document.getElementById("orderSuccess");
    const error = document.getElementById("orderError");
    success.classList.remove("show");
    error.classList.remove("show");

    const name = document.getElementById("orderName").value.trim();
    const phone = document.getElementById("orderPhone").value.trim();
    const details = document.getElementById("orderDetails").value.trim();

    if(!name || !phone || !division.value || !district.value || !upazila.value.trim() || !mouza.value.trim() || !work.value){
      error.textContent = "অনুগ্রহ করে সব বাধ্যতামূলক (*) তথ্য পূরণ করুন।";
      error.classList.add("show");
      return;
    }

    const text =
`কাজের অর্ডার — সার্ভেয়ার আবদুল হান্নান

নাম: ${name}
মোবাইল: ${phone}
বিভাগ: ${division.value}
জেলা: ${district.value}
উপজেলা: ${upazila.value.trim()}
মৌজা: ${mouza.value.trim()}
কাজ: ${work.value}
${details ? "বিস্তারিত: " + details : ""}`;

    const whatsappNumber = "8801810811989";
    const orderId = `SAH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000+Math.random()*9000)}`;
    const url = "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(text + "\nরেফারেন্স: " + orderId);
    success.innerHTML = `✓ অনুরোধ প্রস্তুত হয়েছে। <strong>রেফারেন্স: ${orderId}</strong><br><span>এখন WhatsApp-এ বার্তাটি পাঠিয়ে দিন।</span>`;
    success.setAttribute('role','status'); success.setAttribute('aria-live','polite');
    success.classList.add("show");
    window.open(url, "_blank", "noopener,noreferrer");
  });

  updateSummary();
})();


/* ===== Premium UX layer ===== */
(function(){
  const nav = document.querySelector('.nav');
  const navLinks = document.querySelector('.navlinks');
  if(nav && navLinks){
    const btn = document.createElement('button');
    btn.className='nav-toggle'; btn.type='button'; btn.setAttribute('aria-label','মেনু খুলুন'); btn.setAttribute('aria-expanded','false'); btn.innerHTML='☰'; btn.style.cssText='width:99px!important;height:99px!important;min-width:99px!important;min-height:99px!important;max-width:99px!important;max-height:99px!important;flex:0 0 99px!important;font-size:45px!important;line-height:1!important;border-radius:49.5px!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;';
    nav.querySelector('.nav-inner')?.appendChild(btn);
    // Group the existing links on mobile without changing desktop navigation order/content.
    if(!navLinks.dataset.grouped){
      const groups=[
        ['প্রধান', ['index.html','about.html','services.html','calculator.html']],
        ['ভূমি তথ্য', ['knowledge.html','documents.html','mistakes.html','videos.html','photos.html','posts.html']],
        ['সহায়তা ও সেবা', ['question.html','feedback.html','order.html']],
        ['যোগাযোগ ও সংযোগ', ['land-solution-bd.html','contact.html']]
      ];
      const links=[...navLinks.children].filter(el=>el.tagName==='A');
      groups.forEach(([title,hrefs])=>{
        const g=document.createElement('div'); g.className='nav-group';
        const h=document.createElement('div'); h.className='nav-group-title'; h.textContent=title; g.appendChild(h);
        hrefs.forEach(href=>{ const a=links.find(x=>(x.getAttribute('href')||'').split('#')[0].split('?')[0]===href); if(a) g.appendChild(a); });
        if(g.children.length>1) navLinks.appendChild(g);
      });
      navLinks.dataset.grouped='1';
    }
    const close=()=>{navLinks.classList.remove('open');btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-label','মেনু খুলুন');btn.innerHTML='☰';};
    btn.addEventListener('click',()=>{const open=navLinks.classList.toggle('open');btn.setAttribute('aria-expanded',String(open));btn.setAttribute('aria-label',open?'মেনু বন্ধ করুন':'মেনু খুলুন');btn.innerHTML=open?'✕':'☰';});
    navLinks.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&navLinks.classList.contains('open')){close();btn.focus();}});
    const current=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    navLinks.querySelectorAll('a[href]').forEach(a=>{
      const href=(a.getAttribute('href')||'').split('#')[0].split('?')[0].toLowerCase();
      const target=href||'index.html';
      const isHome=(current===''||current==='index.html')&&(target==='index.html'||target==='./');
      if(isHome||target===current){a.setAttribute('aria-current','page');a.classList.add('active');}
    });
  }

  const progress=document.createElement('div'); progress.className='scroll-progress'; document.body.appendChild(progress);
  const updateProgress=()=>{const h=document.documentElement.scrollHeight-window.innerHeight;progress.style.width=(h>0?(window.scrollY/h)*100:0)+'%';};
  window.addEventListener('scroll',updateProgress,{passive:true}); updateProgress();

  const selectors='.section,.card,.service,.info-card,.post-card,.video-card,.contact-card,.order-card,.gallery-item,.social,.v3-highlight';
  document.querySelectorAll(selectors).forEach(el=>el.classList.add('reveal'));
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.08});
    document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
  }else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));

  const bar=document.createElement('div'); bar.className='v6-mobile-bar';
  bar.innerHTML='<a href="tel:+8801810811989">📞<span>কল</span></a><a href="https://wa.me/8801810811989" target="_blank" rel="noopener">💬<span>WhatsApp</span></a><a class="primary" href="calculator.html">🧮<span>ক্যালকুলেটর</span></a><a href="contact.html">📍<span>যোগাযোগ</span></a>';
  document.body.appendChild(bar);

  const gallery=document.querySelector('.gallery');
  if(gallery){
    const box=document.createElement('div');
    box.className='lightbox';
    box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label','ছবি বড় করে দেখুন');
    box.innerHTML='<button type="button" class="lightbox-close" aria-label="ছবি বন্ধ করুন">×</button><button type="button" class="lightbox-nav lightbox-prev" aria-label="আগের ছবি">‹</button><img alt=""><button type="button" class="lightbox-nav lightbox-next" aria-label="পরের ছবি">›</button><div class="lightbox-counter" aria-live="polite"></div>';
    document.body.appendChild(box);
    const img=box.querySelector('img'), counter=box.querySelector('.lightbox-counter');
    let index=0; let previousFocus=null;
    const getSources=()=>[...gallery.querySelectorAll('img')];
    const render=()=>{const sources=getSources(); const source=sources[index]; if(!source)return; img.src=source.currentSrc||source.src; img.alt=source.alt||''; counter.textContent=`${index+1} / ${sources.length}`;};
    const openAt=i=>{const sources=getSources(); if(!sources.length)return; index=(i+sources.length)%sources.length; previousFocus=document.activeElement; render(); box.classList.add('open'); document.body.style.overflow='hidden'; box.querySelector('.lightbox-close').focus();};
    const close=()=>{box.classList.remove('open');document.body.style.overflow='';previousFocus?.focus();};
    const next=()=>openAt(index+1), prev=()=>openAt(index-1);
    gallery.addEventListener('click',e=>{const source=e.target.closest('img'); if(!source)return; const sources=getSources(); const i=sources.indexOf(source); if(i>=0)openAt(i);});
    gallery.addEventListener('keydown',e=>{if(!['Enter',' '].includes(e.key))return; const source=e.target.closest('img'); if(!source)return; e.preventDefault(); const sources=getSources(); const i=sources.indexOf(source); if(i>=0)openAt(i);});
    box.querySelector('.lightbox-close').addEventListener('click',close); box.querySelector('.lightbox-next').addEventListener('click',next); box.querySelector('.lightbox-prev').addEventListener('click',prev);
    box.addEventListener('click',e=>{if(e.target===box)close();});
    document.addEventListener('keydown',e=>{if(!box.classList.contains('open'))return;if(e.key==='Escape')close();else if(e.key==='ArrowRight')next();else if(e.key==='ArrowLeft')prev();});
  }

  let deferredInstallPrompt=null;
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault(); deferredInstallPrompt=e;
    if(!document.querySelector('.pwa-install-btn')){
      const a=document.createElement('a'); a.className='btn btn-light pwa-install-btn'; a.href='#'; a.textContent='📲 App হিসেবে ইনস্টল করুন';
      const actions=document.querySelector('.actions');
      if(actions) actions.appendChild(a);
      a.addEventListener('click',async ev=>{ev.preventDefault(); if(!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; a.remove();});
    }
  });
  window.addEventListener('appinstalled',()=>{document.querySelector('.pwa-install-btn')?.remove();});

  document.querySelectorAll('.footer').forEach(f=>{
    if(f.dataset.premiumDone) return; f.dataset.premiumDone='1';
    const c=f.querySelector('.container'); if(!c) return;
    c.innerHTML='<div><strong>সার্ভেয়ার আবদুল হান্নান</strong><p>Digital Amin &amp; Land Surveyor</p><p class="small">ভূমি জরিপ • নকশা • পরিমাপ • সীমানা-সংক্রান্ত কাজ • তথ্যভিত্তিক আলোচনা</p></div><div class="footer-col"><h3>দ্রুত লিংক</h3><a href="services.html">সেবা</a><a href="knowledge.html">ভূমি তথ্য</a><a href="photos.html">ফটো গ্যালারি</a><a href="videos.html">ভিডিও</a></div><div class="footer-col"><h3>সরাসরি যোগাযোগ</h3><a href="tel:+8801810811989">📞 01810811989</a><a href="mailto:hannansorkar039@gmail.com">✉️ ই-মেইল</a><a href="land-solution-bd.html">🌐 Land Solution BD</a></div><div class="footer-bottom"><p class="small">© 2026 Surveyor Abdul Hannan. All Rights Reserved. · <a href="disclaimer.html">তথ্য ব্যবহারের নির্দেশনা</a></p></div>';
  });
})();


/* ===== Modern gallery filters + performance polish ===== */
(function(){
  document.querySelectorAll('img').forEach(img=>{
    if(!img.hasAttribute('decoding')) img.setAttribute('decoding','async');
    if(!img.hasAttribute('width') && img.naturalWidth) img.setAttribute('width',img.naturalWidth);
    if(!img.hasAttribute('height') && img.naturalHeight) img.setAttribute('height',img.naturalHeight);
  });

  const classify = (text)=>{
    const t=String(text||'').toLowerCase();
    if(/সীমানা|boundary|ডিমার্কেশন|ত্রিভুজায়ন/.test(t)) return 'boundary';
    if(/নকশা|ম্যাপ|map|প্যান্টোগ্রাফ|tracing|trace/.test(t)) return 'map';
    return 'survey';
  };

  document.querySelectorAll('.filter-bar').forEach(bar=>{
    const galleryId=bar.nextElementSibling?.id;
    const gallery=document.getElementById(galleryId);
    if(!gallery) return;
    const items=[...gallery.children];
    const buttons=[...bar.querySelectorAll('.filter-btn')];
    const apply=(filter)=>{
      let visible=0;
      items.forEach(item=>{
        if(item.classList.contains('filter-empty')) return;
        const text=item.textContent||'';
        const match=filter==='all'||classify(text)===filter;
        item.hidden=!match;
        if(match) visible++;
      });
      let empty=gallery.querySelector('.filter-empty');
      if(!visible){
        if(!empty){
          empty=document.createElement('div');
          empty.className='filter-empty';
          empty.textContent='এই বিভাগে বর্তমানে কোনো কনটেন্ট নেই।';
          gallery.appendChild(empty);
        }
      }else if(empty) empty.remove();
    };
    buttons.forEach(btn=>btn.addEventListener('click',()=>{
      buttons.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      apply(btn.dataset.filter||'all');
    }));
  });
})();
