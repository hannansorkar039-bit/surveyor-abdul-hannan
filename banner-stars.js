/* banner-stars.js — ব্যানারের ব্যাকগ্রাউন্ডে "Interactive Dreamwave Galaxy" ধাঁচের ঝিকমিক তারার অ্যানিমেশন।
   শুধু ব্যানারের পেছনে একটি স্বচ্ছ canvas বসায়; পেজের অন্য কোনো লেখা/ডিজাইন/স্টাইল পরিবর্তন করে না। */
(function () {
  "use strict";
  var SELECTOR = ".hero, .knowledge-hero .kh-hero, .ls-hero";
  var COLORS = [
    [255, 255, 255], [255, 255, 255], [255, 255, 255],
    [90, 255, 90], [255, 80, 200], [80, 230, 255],
    [255, 230, 90], [120, 140, 255], [255, 150, 70], [190, 120, 255]
  ];
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function Banner(el) {
    this.el = el;
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    var s = this.canvas.style;
    s.position = "absolute"; s.left = "0"; s.top = "0"; s.width = "100%"; s.height = "100%";
    s.zIndex = "-1"; s.pointerEvents = "none"; s.display = "block";
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.isolation = "isolate";
    el.insertBefore(this.canvas, el.firstChild);
    this.ctx = this.canvas.getContext("2d");
    this.stars = [];
    this.mx = 0; this.my = 0; this.tx = 0; this.ty = 0;
    this.visible = true;
    this.w = 0; this.h = 0; this.dpr = 1;
    var self = this;
    this.resize();
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(el);
    else window.addEventListener("resize", function () { self.resize(); });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (e) { self.visible = e[0].isIntersecting; }).observe(el);
    }
    el.addEventListener("pointermove", function (ev) {
      var r = el.getBoundingClientRect();
      self.tx = ((ev.clientX - r.left) / r.width - 0.5) * 2;
      self.ty = ((ev.clientY - r.top) / r.height - 0.5) * 2;
    }, { passive: true });
    el.addEventListener("pointerleave", function () { self.tx = 0; self.ty = 0; }, { passive: true });
  }

  Banner.prototype.resize = function () {
    var r = this.el.getBoundingClientRect();
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    var n = Math.max(40, Math.min(230, Math.round(this.w * this.h / 2600)));
    this.stars = [];
    for (var i = 0; i < n; i++) {
      var big = Math.random() < 0.12;
      this.stars.push({
        x: Math.random() * this.w, y: Math.random() * this.h,
        r: big ? 2.2 + Math.random() * 2.6 : 0.5 + Math.random() * 1.3,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        ph: Math.random() * 6.283, sp: 0.6 + Math.random() * 1.8,
        d: 0.25 + Math.random() * 0.75, spark: big || Math.random() < 0.25
      });
    }
    this.draw(0);
  };

  Banner.prototype.draw = function (t) {
    var ctx = this.ctx, d = this.dpr;
    this.mx += (this.tx - this.mx) * 0.05; this.my += (this.ty - this.my) * 0.05;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      var tw = reduce ? 0.8 : 0.5 + 0.5 * Math.sin(t * 0.001 * s.sp + s.ph);
      var a = 0.18 + 0.82 * tw;
      var x = s.x + this.mx * 14 * s.d, y = s.y + this.my * 10 * s.d + (reduce ? 0 : Math.sin(t * 0.0002 * s.sp + s.ph) * 2 * s.d);
      var rgb = s.c[0] + "," + s.c[1] + "," + s.c[2];
      var rr = s.r * (0.7 + 0.5 * tw);
      var g = ctx.createRadialGradient(x, y, 0, x, y, rr * 3);
      g.addColorStop(0, "rgba(" + rgb + "," + a + ")");
      g.addColorStop(1, "rgba(" + rgb + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rr * 3, 0, 6.2832); ctx.fill();
      if (s.spark) {
        var L = rr * 4.2 * (0.6 + 0.6 * tw);
        ctx.strokeStyle = "rgba(" + rgb + "," + (a * 0.9) + ")";
        ctx.lineWidth = Math.max(0.6, rr * 0.35);
        ctx.beginPath();
        ctx.moveTo(x - L, y); ctx.lineTo(x + L, y);
        ctx.moveTo(x, y - L); ctx.lineTo(x, y + L);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
  };

  function init() {
    var els = document.querySelectorAll(SELECTOR), list = [], i;
    for (i = 0; i < els.length; i++) {
      if (els[i].querySelector(":scope > canvas[data-banner-stars]")) continue;
      var b = new Banner(els[i]);
      b.canvas.setAttribute("data-banner-stars", "1");
      list.push(b);
    }
    if (!list.length || reduce) return;
    function loop(t) {
      if (!document.hidden) for (var k = 0; k < list.length; k++) if (list[k].visible) list[k].draw(t);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
