# Pre-deployment audit — 2026-09-25

- Canonical home URL normalized to the GitHub Pages directory root.
- Sitemap home URL normalized to the same canonical root.
- FAQPage structured data is kept only on `faq.html`, where the FAQ content is presented.
- ProfilePage structured data is kept only on `index.html` and `about.html`.
- Missing profile photo references are replaced with the bundled PWA icon until the real profile image is supplied.
- Service-worker cache version bumped to v6.
- Existing Google Search Console verification meta tag preserved.
- Existing sitemap path and robots.txt sitemap directive preserved.

Before final deployment, replace `icons/icon-512.png` in the profile-image positions with the real profile photo if you want the real portrait to appear in favicon/social preview/profile sections.


## Profile image update — 2026-09-25
- Added optimized `profile-abdul-hannan.webp` from the newly supplied profile photo.
- Hero avatar references now use the dedicated profile image instead of the PWA app icon.
- Open Graph/Twitter profile image and ProfilePage schema image now use the dedicated profile image.
- PWA icons remain unchanged.
- Service-worker cache bumped to v7 and the profile image added to the precache list.
- Avatar CSS outer border removed because the supplied profile image already contains its own professional circular teal border.
