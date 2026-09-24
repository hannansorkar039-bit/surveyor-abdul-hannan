PWA / Digital Platform Update — Surveyor Abdul Hannan

এই প্যাকেজটি আপনার বর্তমান GitHub Pages ওয়েবসাইটের ডিজাইন/কনটেন্ট নতুন করে বানায়নি।
শুধু PWA (Install App), app manifest, icons এবং service worker যোগ করা হয়েছে এবং
সব HTML পেজে manifest/registration সংযুক্ত করা হয়েছে।

যে নতুন ফাইলগুলো যোগ হয়েছে:
- manifest.webmanifest
- service-worker.js
- icons/icon-192.png
- icons/icon-512.png

যে ফাইলগুলো আপডেট হয়েছে:
- সব *.html পেজ (manifest + PWA metadata + service worker registration)
- sitemap.xml (lastmod: 2026-09-24)

ব্যবহার:
1) এই ZIP-এর ভেতরের সব ফাইল GitHub repository-র বর্তমান root-এর ফাইল দিয়ে replace/upload করুন।
2) GitHub Pages deploy শেষ হওয়ার পর HTTPS URL-এ সাইট খুলুন।
3) Android Chrome-এ Install app / Add to Home screen অপশন দেখলে সেটি দিয়ে ইনস্টল করুন।
4) Google Search Console-এ sitemap.xml submit করুন:
   https://hannansorkar039-bit.github.io/surveyor-abdul-hannan/sitemap.xml

নোট:
- App icon হিসেবে একটি নতুন neutral "SAH / LAND" icon দেওয়া হয়েছে; আপনার নিজস্ব logo/profile image
  দিলে পরে সেটি দিয়ে icon replace করা যাবে।
- Google indexing তাৎক্ষণিক বা নিশ্চিত নয়; Search Console-এ URL Inspection/Request indexing ব্যবহার করা যায়।
