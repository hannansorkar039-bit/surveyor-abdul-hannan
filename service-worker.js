const CACHE_NAME = "sah-pwa-v12-calculator-visibility-fix";
const CORE_ASSETS = [
  "./", "./index.html", "./styles.css", "./app.js", "./content.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./profile-abdul-hannan.webp",
  "./about.html", "./services.html", "./knowledge.html", "./documents.html", "./mistakes.html",
  "./videos.html", "./photos.html", "./posts.html", "./important-topics.html", "./social.html",
  "./process.html", "./faq.html", "./question.html", "./feedback.html", "./order.html", "./contact.html",
  "./land-solution-bd.html", "./disclaimer.html", "./calculator.html"
];

// Optional third-party libraries: cache them when online, but never let a CDN outage block the PWA install.
const OPTIONAL_EXTERNAL = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];

const CACHE_FIRST = new Set(["./calculator.html", "./styles.css", "./app.js"]);
const isSameOrigin = url => url.origin === self.location.origin;
const isCacheFirstAsset = url => CACHE_FIRST.has(url.pathname === "/" ? "./" : "./" + url.pathname.replace(/^\/+/, ""));

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(async cache => {
        await Promise.allSettled(OPTIONAL_EXTERNAL.map(async url => {
          try {
            const response = await fetch(url, {mode:"cors", cache:"no-cache"});
            if (response && (response.ok || response.type === "opaque")) {
              await cache.put(url, response.clone());
            }
          } catch (_) { /* CDN unavailable: core offline install remains valid. */ }
        }));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request).then(response => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // The calculator's core files are explicitly Cache-First for reliable field/offline use.
  if (isSameOrigin(url) && isCacheFirstAsset(url)) {
    event.respondWith(cacheFirst(request).catch(() => caches.match(request)));
    return;
  }

  // Offline navigation: prefer the cached page, then try network.
  if (request.mode === "navigate") {
    event.respondWith(
      cacheFirst(request)
        .catch(() => caches.match("./calculator.html"))
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Same-origin pages/assets use Stale-While-Revalidate.
  if (isSameOrigin(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // External CDN/tile assets are cached after a successful online visit and served from Cache API when offline.
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && (response.ok || response.type === "opaque")) {
        caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      }
      return response;
    }).catch(() => cached))
  );
});
