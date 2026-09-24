const CACHE_NAME = "sah-pwa-v3-premium";
const CORE_ASSETS = [
  "./", "./index.html", "./styles.css", "./app.js", "./content.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png",
  "./about.html", "./services.html", "./knowledge.html", "./documents.html", "./mistakes.html",
  "./videos.html", "./photos.html", "./posts.html", "./important-topics.html", "./social.html",
  "./process.html", "./faq.html", "./question.html", "./feedback.html", "./order.html", "./contact.html",
  "./land-solution-bd.html", "./disclaimer.html"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(request,copy)); return response;
    }).catch(()=>caches.match(request).then(response=>response || caches.match("./index.html"))));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached || fetch(request).then(response=>{
    if(response && response.ok){const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));} return response;
  })));
});
