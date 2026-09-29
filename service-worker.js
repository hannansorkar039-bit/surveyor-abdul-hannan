const CACHE_NAME = "sah-pwa-v16-professional-final";
const CORE_ASSETS = [
  "./", "./index.html", "./styles.css", "./app.js", "./content.js", "./manifest.webmanifest",
  "./profile-abdul-hannan.webp",
  "./about.html", "./services.html", "./knowledge.html", "./documents.html", "./mistakes.html",
  "./videos.html", "./photos.html", "./posts.html", "./important-topics.html", "./social.html",
  "./process.html", "./faq.html", "./question.html", "./feedback.html", "./order.html", "./contact.html",
  "./land-solution-bd.html", "./disclaimer.html", "./calculator.html",
  "./calculator-pdf.js", "./calculator-core.js", "./calculator-featured.js", "./calculator-registry.js",
  "./calculator-land-suite.js", "./calculator-bootstrap.js", "./fonts/Lohit-Bengali.ttf",
  "./icons/icon-192.png", "./icons/icon-512.png"
];
const OPTIONAL_EXTERNAL = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];
const CACHE_FIRST = new Set(["./calculator.html", "./styles.css", "./app.js", "./calculator-pdf.js", "./calculator-core.js", "./calculator-featured.js", "./calculator-registry.js", "./calculator-land-suite.js", "./calculator-bootstrap.js", "./fonts/Lohit-Bengali.ttf"]);
const isSameOrigin = url => url.origin === self.location.origin;
const BASE_PATH = new URL("./", self.location.href).pathname;
const isCacheFirstAsset = url => {
  if (!isSameOrigin(url)) return false;
  if (!url.pathname.startsWith(BASE_PATH)) return false;
  const rel = url.pathname.slice(BASE_PATH.length);
  return CACHE_FIRST.has(rel ? "./" + rel : "./");
};
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE_NAME).then(async cache => { await Promise.allSettled(CORE_ASSETS.map(async asset => { try { await cache.add(asset); } catch(_) {} })); await Promise.allSettled(OPTIONAL_EXTERNAL.map(async url => { try { const response=await fetch(url,{mode:"cors",cache:"no-cache"}); if(response&&(response.ok||response.type==="opaque")) await cache.put(url,response.clone()); } catch(_){} })); await self.skipWaiting(); })); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())); });
async function cacheFirst(request){ const cached=await caches.match(request); if(cached)return cached; const response=await fetch(request); if(response&&response.ok){const cache=await caches.open(CACHE_NAME);cache.put(request,response.clone())} return response; }
async function staleWhileRevalidate(request){ const cache=await caches.open(CACHE_NAME); const cached=await cache.match(request); const network=fetch(request).then(response=>{if(response&&response.ok)cache.put(request,response.clone());return response}).catch(()=>cached); return cached||network; }
self.addEventListener("fetch",event=>{ const request=event.request; if(request.method!=="GET")return; const url=new URL(request.url); if(isSameOrigin(url)&&(url.pathname.endsWith("/calculator.html")||url.pathname==="/calculator.html")){ event.respondWith(fetch(request,{cache:"no-cache"}).then(response=>{if(response&&response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>caches.match(request))); return; } if(isSameOrigin(url)&&isCacheFirstAsset(url)){event.respondWith(cacheFirst(request).catch(()=>caches.match(request)));return;} if(request.mode==="navigate"){event.respondWith(cacheFirst(request).catch(()=>caches.match("./index.html")).catch(()=>caches.match("./calculator.html")));return;} if(isSameOrigin(url)){event.respondWith(staleWhileRevalidate(request));return;} event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response&&(response.ok||response.type==="opaque"))caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));return response}).catch(()=>cached))); });
