
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

  const photoGallery = $("photoGallery");
  if (photoGallery) {
    photoGallery.innerHTML = SITE.photos.map(p => `
      <figure class="gallery-item">
        <img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy">
        <figcaption class="gallery-caption"><strong>${esc(p.title)}</strong><span>${esc(p.caption || "")}</span></figcaption>
      </figure>`).join("");
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
    const url = "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(text);

    success.textContent = "অর্ডারের তথ্য প্রস্তুত হয়েছে। WhatsApp খুলে বার্তাটি পাঠিয়ে দিন।";
    success.classList.add("show");
    window.open(url, "_blank", "noopener,noreferrer");
  });

  updateSummary();
})();
