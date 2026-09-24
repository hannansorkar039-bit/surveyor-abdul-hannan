# Surveyor Abdul Hannan — Premium Website Upgrade

এই প্যাকেজে বিদ্যমান ওয়েবসাইটের তথ্য ও পেজ কাঠামো রেখে একটি Premium 2026 UI/UX upgrade করা হয়েছে।

## প্রধান উন্নয়ন
- Premium responsive design system
- Mobile hamburger navigation
- Mobile fixed Call / WhatsApp / Order / Contact bar
- Scroll progress indicator
- Smooth reveal animation
- Photo lightbox
- Premium hero, service showcase, workflow ও Land Solution BD CTA
- Professional footer
- PWA install prompt support
- Service Worker cache upgraded to v3
- App icons included
- Existing forms, links, social profiles ও content structure preserved

## গুরুত্বপূর্ণ ছবি সংক্রান্ত নোট
ZIP-এ মূল profile/field-photo ফাইলগুলো ছিল না, তাই মূল ছবিগুলো ইচ্ছাকৃতভাবে বানিয়ে বা পরিবর্তন করে দেওয়া হয়নি। আপনার বর্তমান GitHub repository-তে থাকা original image files অবশ্যই রেখে দিন:
- profile-abdul-hannan.jpg
- cs dima 1.jpg
- 03.jpg
- Mosjid Bari.jpg
- IMG_20260921_065659.jpg
- CHH.jpg
- CamScanner 12-07-2026 14.52.jpg
- visiting-card.jpg

যদি GitHub repository-তে এগুলো আগে থেকেই থাকে, নতুন ফাইলগুলো upload/replace করার সময় ওই original image files delete করবেন না। ছবির কোনো ফাইল সাময়িকভাবে অনুপস্থিত থাকলে সাইট broken-image না দেখিয়ে একটি clean fallback visual দেখাবে।

## GitHub Pages-এ আপডেট
1. ZIP extract করুন।
2. আপনার repository-তে existing files replace করুন।
3. Original photo files delete করবেন না।
4. `index.html`, `styles.css`, `app.js`, `service-worker.js`, `content.js` এবং `icons/` অবশ্যই আপলোড করুন।
5. GitHub Pages deploy হওয়ার পর একবার hard refresh দিন।
6. PWA install option দেখাতে browser-এর install support ও HTTPS দরকার।

## Changed core files
- index.html
- styles.css
- app.js
- service-worker.js
- icons/icon-192.png
- icons/icon-512.png

অন্যান্য HTML পেজগুলো মূল content রেখে global premium CSS/JS-এর সঙ্গে compatible রাখা হয়েছে।
