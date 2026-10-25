const CACHE_NAME = "sah-pwa-v129-fixes";
const BASE_PATH = new URL("./", self.location.href).pathname;

// Only the offline application shell is required for Service Worker installation.
// Images are handled separately so one unavailable image can never prevent the
// Service Worker from installing/updating.
const CORE_ASSETS = [
  "./", "./index.html", "./404.html", "./styles.css", "./hero-header.css?v=2", "./readability.css?v=1", "./mobile-fix.css?v=3", "./mobile-ux.css?v=1", "./mobile-ux.js?v=1", "./icons.js?v=1", "./app.js", "./content.js", "./manifest.webmanifest",
  "./about.html", "./services.html", "./knowledge.html", "./documents.html", "./mistakes.html",
  "./videos.html", "./photos.html", "./posts.html", "./important-topics.html", "./social.html",
  "./process.html", "./faq.html", "./question.html", "./feedback.html", "./order.html", "./contact.html",
  "./land-solution-bd.html", "./disclaimer.html", "./calculator.html", "./calculator.css?v=20261018-fqprint", "./calculator-redesign.css?v=1", "./calculator-redesign-v2.css?v=1", "./calculator-tabs-large.css?v=3", "./calculator-inner-large.css?v=8", "./calculator-type-unify.css?v=2", "./calculator-polygon-draw.css?v=20261011-11", "./calculator-polygon-draw.js?v=v20-print",
  "./article-land-survey-preparation.html", "./article-dag-khatian-mouza.html", "./article-cs-sa-rs-bs-khatian.html", "./article-boundary-demarcation.html", "./article-land-partition-survey.html", "./article-land-unit-conversion.html", "./article-quadrilateral-area-measurement.html", "./article-diagonal-check.html", "./article-land-survey-common-mistakes.html", "./article-land-record-verification.html", "./article-mutation-khatian-update.html", "./article-field-survey-report.html",
  "./calculator-core.js", "./calculator-bootstrap.js", "./calculator-quad-auto-draw.js?v=20261015-qd-autodraw-fix2", "./calculator-field-boundary-pdf-deepfix.js?v=20261005-fbc-deepfix-v10", "./calculator-angle-convert.js?v=20261018-ac1", "./field-note-sketch.html",
  "./calculator-pdf.js", "./calculator-partition.js?v=multi-v2", "./calculator-featured.js?v=20261015-fq-bd-autodraw", "./calculator-registry.js?v=v14-smooth-point-edit",
  "./calculator-land-suite.js", "./calculator-triangle-partition.js?v=20261018-print", "./calculator-wood-cft.js?v=20261018-print-unify",
  "./calculator-sawn-wood-cft.js?v=20261018-print-unify", "./calculator-triangle-heron-cosine.js?v=5", "./calculator-ux.js?v=20261019-qd-print-all", "./profile-abdul-hannan.webp", "./profile-abdul-hannan-512.webp",
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

// Cache-first is used ONLY for assets that never change in place (fonts, icons).
// CSS / JS are deliberately NOT listed here: they are served "fresh-first"
// (see freshFirst below) so an update is never hidden behind a stale cache copy.
const CACHE_FIRST = new Set([
  "./fonts/Lohit-Bengali.ttf", "./fonts/NotoSerifBengali-Regular.ttf", "./fonts/NotoSerifBengali-Bold.ttf",
  "./icons/icon-192.png", "./icons/icon-512.png"
]);

// How long a page may wait for the network before falling back to the cached copy
// of a CSS/JS file (the network response still refreshes the cache afterwards).
const FRESH_FIRST_TIMEOUT_MS = 4000;

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

    // Cache assets individually. A missing article or optional page must not
    // prevent the whole PWA (including its calculators) from working offline.
    const results = await Promise.allSettled(
      CORE_ASSETS.map(asset => cacheAsset(cache, asset))
    );
    const failed = results
      .map((result, index) => ({ result, asset: CORE_ASSETS[index] }))
      .filter(item => item.result.status === "rejected")
      .map(item => item.asset);

    // These are the minimum files needed to open the app and initialize the
    // calculator engines. Do not activate an offline shell without them.
    const CORE_REQUIRED_OFFLINE_ASSETS = [
      "./index.html", "./calculator.html", "./app.js", "./content.js",
      "./article-mutation-khatian-update.html",
      "./calculator-bootstrap.js", "./calculator-core.js", "./calculator-quad-auto-draw.js?v=20261015-qd-autodraw-fix2", "./calculator.css?v=20261018-fqprint", "./calculator-redesign.css?v=1", "./calculator-redesign-v2.css?v=1", "./calculator-tabs-large.css?v=3", "./calculator-inner-large.css?v=8", "./calculator-type-unify.css?v=2",
      "./calculator-polygon-draw.js?v=v20-print", "./calculator-polygon-draw.css?v=20261011-11",
      "./calculator-partition.js?v=multi-v2", "./calculator-featured.js?v=20261015-fq-bd-autodraw",
      "./calculator-field-boundary-pdf-deepfix.js?v=20261005-fbc-deepfix-v10", "./calculator-angle-convert.js?v=20261018-ac1", "./field-note-sketch.html", "./calculator-registry.js?v=v14-smooth-point-edit",
      "./calculator-triangle-partition.js?v=20261018-print", "./calculator-land-suite.js",
      "./calculator-wood-cft.js?v=20261018-print-unify", "./calculator-sawn-wood-cft.js?v=20261018-print-unify",
      "./calculator-triangle-heron-cosine.js?v=5", "./calculator-ux.js?v=20261019-qd-print-all", "./calculator-pdf.js"
    ];
    // Cache external runtime dependencies before validating the offline shell.
    // jsPDF is required: a successful PWA install must include the PDF engine,
    // otherwise PDF generation would silently depend on a future network visit.
    await Promise.allSettled(
      [...EXTERNAL_CACHE_FIRST].map(asset => cacheAsset(cache, asset))
    );

    const REQUIRED_OFFLINE_ASSETS = [
      ...CORE_REQUIRED_OFFLINE_ASSETS
    ];
    const missingRequired = [];
    for (const asset of REQUIRED_OFFLINE_ASSETS) {
      const url = new URL(asset, self.registration.scope).href;
      if (!(await cache.match(url))) missingRequired.push(asset);
    }
    if (missingRequired.length) {
      throw new Error(
        "SAH PWA required offline assets could not be cached: " +
        missingRequired.join(", ") +
        (failed.length ? " | Other unavailable assets: " + failed.join(", ") : "")
      );
    }

    if (failed.length) {
      console.warn("SAH PWA: some non-critical assets were not cached:", failed);
    }
    await self.skipWaiting();
  })().catch(error => {
    console.error("SAH PWA required offline cache failed:", error);
    throw error;
  }));
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith("sah-pwa-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
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
    if (response && response.ok) return response;
    // A server-side 404 while offline/stale must not replace a cached page.
    const cachedResponse = await findCachedRequest(request);
    return cachedResponse || response;
  } catch (_) {
    const cached = await findCachedRequest(request);
    if (cached) return cached;
    return fallback ? (await findCachedRequest(new Request(new URL(fallback, self.registration.scope).href))) : Response.error();
  }
}

async function findCachedRequest(request) {
  const url = new URL(request.url);
  const exact = await caches.match(request);
  if (exact) return exact;

  // Navigation URLs may contain query parameters or vary by the app's launch
  // entry point. Retry against the same path without its query string.
  url.search = "";
  const queryless = await caches.match(url.href);
  if (queryless) return queryless;

  // If the installed PWA is launched at the scope root, use its cached shell.
  if (url.pathname === new URL(self.registration.scope).pathname.replace(/\/$/, "")) {
    return await caches.match(new URL("./index.html", self.registration.scope).href);
  }
  return null;
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

function isCodeRequest(request, url) {
  return ["style", "script", "manifest"].includes(request.destination) ||
    /\.(?:css|m?js|webmanifest)$/i.test(url.pathname);
}

// Network first (always revalidated, bypassing the HTTP cache) with a cache
// fallback. The cache entry is keyed by the full URL, so a changed ?v= value is
// honoured. If the network is offline, errors, returns a non-OK status, or is
// slower than the timeout, the cached copy is used instead.
async function freshFirst(event, request, timeoutMs = FRESH_FIRST_TIMEOUT_MS) {
  const cached = await findCachedRequest(request);
  const network = (async () => {
    const response = await fetch(request, { cache: "no-cache" });
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })();

  // Nothing cached yet: nothing to fall back to, so just wait for the network.
  if (!cached) return network;

  // Keep the worker alive so a slow response can still refresh the cache.
  try { event.waitUntil(network.catch(() => {})); } catch (_) {}
  const preferred = network.then(
    response => (response && response.ok ? response : cached),
    () => cached
  );
  const timeout = new Promise(resolve => setTimeout(() => resolve(cached), timeoutMs));
  return Promise.race([preferred, timeout]);
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
    // CSS / JS / manifest: always try the network first so edits to files such as
    // app.js, content.js and styles.css reach returning visitors immediately.
    if (isCodeRequest(request, url)) {
      event.respondWith(freshFirst(event, request));
      return;
    }

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
