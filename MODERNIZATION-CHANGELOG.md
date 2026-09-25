# Surveyor Abdul Hannan — Modernization Update

## Applied
- Deep Navy / Royal Blue / Organic Green / Gold design system with CSS variables.
- Hind Siliguri typography with Google Fonts preconnect.
- Mobile-first responsive navigation and layout refinements.
- Stronger hero value proposition and CTA hierarchy.
- Card-based visual system for services, documents, posts, topics and content blocks.
- Process timeline styling with numbered steps.
- Trust / transparency section without inventing client testimonials.
- Photo/video filter controls for Field Survey, Map & Drawing, and Boundary content.
- Gallery hover states and lightbox compatibility.
- Scroll progress indicator, reveal animations, focus states and reduced-motion support.
- PWA install prompt presented as a compact floating action instead of occupying the hero layout.
- Async image decoding and existing lazy-loading preserved.
- PWA manifest metadata and theme colors updated.
- Service-worker cache version bumped to v4.
- All HTML pages received the modern typography/performance head hints.

## Asset note
The supplied ZIP contains the PWA icons but does not contain the JPG/PNG field-photo files referenced by `content.js` (for example `profile-abdul-hannan.jpg`, `cs dima 1.jpg`, etc.). The existing graceful image fallback remains enabled so missing media does not break the page. To fully realize the requested high-resolution surveying-equipment photography/WebP optimization, the original image assets should be added to the project and then converted to WebP.
