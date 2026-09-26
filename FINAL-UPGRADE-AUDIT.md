# FINAL UPGRADE AUDIT — 2026-09-26

Existing visual design was preserved; changes are additive and scoped to SEO, offline caching, and calculator functionality.

Implemented:
- index.html: LocalBusiness + ProfessionalService JSON-LD added without removing existing ProfilePage schema.
- contact.html: LocalBusiness/ProfessionalService JSON-LD + Google Maps embed + direct Maps link.
- land-solution-bd.html: LocalBusiness/ProfessionalService JSON-LD + Google Maps embed + direct Maps link.
- calculator.html:
  - Additive registration-cost calculator.
  - Two-column input layout using existing calculator classes.
  - Live cost summary.
  - Bengali number formatting via toLocaleString('bn-BD').
  - Adjustable local-government, stamp-duty and source-tax inputs.
  - Client name + khatian/dag fields.
  - Canvas-based 3/4-side approximate shape sketch.
  - Leaflet point-and-polygon area tool.
  - Print-to-PDF browser report with Bengali support.
  - jsPDF PDF export when the CDN library is available, with print fallback.
- service-worker.js:
  - calculator.html, styles.css and app.js are explicit Cache-First assets.
  - calculator.html is pre-cached.
  - same-origin resources use Stale-While-Revalidate.
  - external libraries are cached after a successful online visit.

Important accuracy safeguards:
- The registration calculator does NOT hard-code a single universal source-tax amount.
- The stamp-duty default is 1% because current 2026 legal material/search evidence indicates the 1.5% rate was amended; 1.5% remains selectable as an alternative.
- No Google star rating or opening hours were invented. They should only be added when verified from the actual Google Business Profile.
- Google Maps embed uses a search-based embed; the existing direct Google Maps short link remains available.
- Leaflet currently uses OpenStreetMap tiles, not a proprietary satellite layer, to avoid embedding an unverified/licensing-sensitive satellite provider.
