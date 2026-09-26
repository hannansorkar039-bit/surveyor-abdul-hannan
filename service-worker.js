const CACHE_NAME = "sah-pwa-v14-land-calculator-upgrade";
const CORE_ASSETS = [
  "./", "./index.html", "./styles.css", "./app.js", "./content.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./profile-abdul-hannan.webp",
  "./about.html", "./services.html", "./knowledge.html", "./documents.html", "./mistakes.html",
  "./videos.html", "./photos.html", "./posts.html", "./important-topics.html", "./social.html",
  "./process.html", "./faq.html", "./question.html", "./feedback.html", "./order.html", "./contact.html",
  "./land-solution-bd.html", "./disclaimer.html", "./calculator.html"
];
const isSameOrigin = url => url.origin === self.location.origin;
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE_ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())));
async function cacheFirst(request){const cached=await caches.match(request);if(cached)return cached;const response=await fetch(request);if(response&&response.ok){const c=await caches.open(CACHE_NAME);c.put(request,response.clone())}return response}
async function stale(request){const c=await caches.open(CACHE_NAME),cached=await c.match(request);const net=fetch(request).then(r=>{if(r&&r.ok)c.put(request,r.clone());return r}).catch(()=>cached);return cached||net}
self.addEventListener("fetch",event=>{const req=event.request;if(req.method!=="GET")return;const url=new URL(req.url);if(isSameOrigin(url)&&url.pathname.endsWith("/calculator.html")){event.respondWith(cacheFirst(req).catch(()=>caches.match("./calculator.html")));return}if(req.mode==="navigate"){event.respondWith(cacheFirst(req).catch(()=>caches.match("./index.html")));return}if(isSameOrigin(url))event.respondWith(stale(req));});
