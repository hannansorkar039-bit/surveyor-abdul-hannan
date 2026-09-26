# Final Offline Robustness Audit

## Scope
This revision preserves the existing visual design and strengthens the calculator/PWA behavior without changing the main site layout.

## Fixed items
- Calculator core remains Cache-First: `calculator.html`, `styles.css`, `app.js`.
- Service-worker cache version bumped to `v10`.
- Leaflet 1.9.4 and jsPDF 2.5.1 are treated as optional CDN dependencies during PWA install; a CDN failure no longer breaks the service-worker installation.
- When Leaflet is unavailable/offline, the page now shows a clear status instead of throwing a JavaScript error.
- The 3/4-side land-shape canvas and registration calculations remain local/offline.
- PDF generation already falls back to browser print when jsPDF is unavailable.
- Removed unused 4-side sketch variables.
- Existing LocalBusiness/ProfessionalService schema and map embeds were preserved.

## Important limitation
A first-time offline visit cannot load a live Leaflet/OpenStreetMap basemap if the required external library/tiles were never cached while online. The site now handles this gracefully. True offline map tiles require a locally bundled tile set or an approved offline map package; this revision does not pretend that a live map can work without map data.

## SEO note
No self-created `aggregateRating` was added. Google states that self-serving local-business review markup is ineligible for the star review feature, and structured data does not guarantee a search rich result.
