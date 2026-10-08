const CACHE_NAME = "sah-pwa-v49-scalable-gallery";
const BASE_PATH = new URL("./", self.location.href).pathname;

// Only the offline application shell is required for Service Worker installation.
// Images are handled separately so one unavailable image can never prevent the
// Service Worker from installing/updating.
const CORE_ASSETS = [
  "./", "./index.html", "./404.html", "./styles.css", "./app.js", "./content.js", "./manifest.webmanifest",
  "./about.html", "./services.html", "./knowledge.html", "./documents.html", "./mistakes.html",
  "./videos.html", "./photos.html", "./posts.html", "./important-topics.html", "./social.html",
  "./process.html", "./faq.html", "./question.html", "./feedback.html", "./order.html", "./contact.html",
  "./land-solution-bd.html", "./disclaimer.html", "./calculator.html", "./calculator.css",
  "./article-land-survey-preparation.html", "./article-dag-khatian-mouza.html", "./article-cs-sa-rs-bs-khatian.html", "./article-boundary-demarcation.html", "./article-land-partition-survey.html", "./article-land-unit-conversion.html", "./article-quadrilateral-area-measurement.html", "./article-diagonal-check.html", "./article-land-survey-common-mistakes.html", "./article-land-record-verification.html", "./article-mutation-khatian-update.html", "./article-field-survey-report.html",
  "./calculator-core.js", "./calculator-bootstrap.js", "./calculator-field-boundary-pdf-deepfix.js",
  "./calculator-pdf.js", "./calculator-partition.js", "./calculator-featured.js", "./calculator-registry.js",
  "./calculator-land-suite.js", "./calculator-triangle-partition.js", "./calculator-wood-cft.js",
  "./calculator-sawn-wood-cft.js", "./calculator-ux.js", "./profile-abdul-hannan.webp",
  "./fonts/Lohit-Bengali.ttf", "./fonts/NotoSerifBengali-Regular.ttf", "./fonts/NotoSerifBengali-Bold.ttf",
  "./icons/icon-192.png", "./icons/icon-512.png"
];

// Gallery images are intentionally cached on demand.
// Do not maintain a fixed image list here; this keeps the PWA scalable as new
// photos are added to content.js. Visited images remain available offline.
const IMAGE_ASSETS = [];

const EXTERNAL_CACHE_FIRST = new Set([
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
]);

const CACHE_FIRST = new Set([
  "./styles.css", "./app.js", "./content.js", "./calculator-pdf.js", "./calculator-core.js", "./calculator-partition.js",
  "./calculator-featured.js", "./calculator-field-boundary-pdf-deepfix.js", "./calculator-registry.js", "./calculator-land-suite.js",
  "./calculator-bootstrap.js", "./calculator-triangle-partition.js", "./calculator-wood-cft.js",
  "./calculator-sawn-wood-cft.js", "./calculator-ux.js", "./fonts/Lohit-Bengali.ttf", "./fonts/NotoSerifBengali-Regular.ttf", "./fonts/NotoSerifBengali-Bold.ttf", "./icons/icon-192.png", "./icons/icon-512.png"
]);

const isSameOrigin = url => url.origin === self.location.origin;
const relativeKey = url => {
  if (!isSameOrigin(url) || !url.pathname.startsWith(BASE_PATH)) return null;
  const rel = url.pathname.slice(BASE_PATH.length);
  return rel ? "./" + rel : "./";
};

function isImageRequest(request, url) {
  return request.destination === "image" || /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(url.pathname);
}

async function cacheAsset(cache, asset) {
  const request = new Request(asset, { cache: "no-cache" });
  const response = await fetch(request);
  if (!response || !response.ok) {
    throw new Error(`Failed to cache ${asset}: ${response ? response.status : "no response"}`);
  }
  await cache.put(request, response.clone());
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Required shell: failure here means the new Service Worker must not install.
    await Promise.all(CORE_ASSETS.map(asset => cacheAsset(cache, asset)));

    // Images are optional during installation. They will always be fetched
    // normally on demand, with cache fallback for offline use.
    if (IMAGE_ASSETS.length) {
      await Promise.allSettled(IMAGE_ASSETS.map(asset => cacheAsset(cache, asset)));
    }

    // External CDN resources are also optional.
    await Promise.allSettled(
      [...EXTERNAL_CACHE_FIRST].map(asset => cacheAsset(cache, asset))
    );

    await self.skipWaiting();
  })().catch(error => {
    console.error("SAH PWA required offline cache failed:", error);
    throw error;
  }));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request, fallback = "./index.html") {
  try {
    const response = await fetch(request, { cache: "no-cache" });
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return fallback ? await caches.match(fallback) : Response.error();
  }
}

function normalizedCacheRequest(request) {
  const url = new URL(request.url);
  if (isSameOrigin(url) && url.search) {
    url.search = "";
    return new Request(url.href, {
      method: request.method,
      headers: request.headers,
      credentials: request.credentials
    });
  }
  return request;
}

async function cacheFirst(request) {
  const cacheRequest = normalizedCacheRequest(request);
  const cached = await caches.match(cacheRequest);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(cacheRequest, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const update = fetch(request).then(async response => {
    if (response && (response.ok || response.type === "opaque")) {
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  return cached || update;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const key = relativeKey(url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (EXTERNAL_CACHE_FIRST.has(request.url)) {
    event.respondWith(cacheFirst(request).catch(() => caches.match(request)));
    return;
  }

  if (key && CACHE_FIRST.has(key)) {
    event.respondWith(cacheFirst(request).catch(() => caches.match(request)));
    return;
  }

  if (isSameOrigin(url)) {
    // Images are deliberately NOT cache-first. Chrome/PWA must be allowed to
    // revalidate the current image, while a known-good cached image remains an
    // offline fallback. Failed/404 responses are never written to the cache.
    if (isImageRequest(request, url)) {
      event.respondWith(networkFirst(request, null));
      return;
    }

    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(async response => {
        if (response && (response.ok || response.type === "opaque")) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      }).catch(() => cached)
    )
  );
});
