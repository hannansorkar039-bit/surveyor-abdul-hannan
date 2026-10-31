/* Gooey Effect Loader — standalone add-on.
   1) Splash screen (home page only, once per session)
   2) Calculator "calculating" indicator
   3) Video / photo loading placeholders
   4) Form submit button loader
   Nothing in the existing site code is modified. */
(function () {
  "use strict";

  var script = document.currentScript;
  var wantSplash = !!(script && script.hasAttribute("data-goo-splash"));
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  /* ---------- helpers ---------- */
  function ensureFilters() {
    if (document.getElementById("goo-f")) return;
    var d = document.createElement("div");
    d.className = "goo-svg-defs";
    d.setAttribute("aria-hidden", "true");
    d.innerHTML =
      '<svg width="0" height="0" focusable="false"><defs>' +
      '<filter id="goo-f" x="-20%" y="-90%" width="140%" height="280%" color-interpolation-filters="sRGB">' +
      '<feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>' +
      '<feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"/></filter>' +
      '<filter id="goo-f-sm" x="-30%" y="-150%" width="160%" height="400%" color-interpolation-filters="sRGB">' +
      '<feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/>' +
      '<feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"/></filter>' +
      "</defs></svg>";
    root.appendChild(d);
  }

  // Builds a gooey row. letters = array of characters, or a number of plain dots.
  function row(letters, mini) {
    var n = typeof letters === "number" ? letters : letters.length;
    var mid = (n - 1) / 2;
    var wrap = document.createElement("span");
    wrap.className = "goo-row" + (mini ? " goo-mini" : "");
    var blobs = document.createElement("span");
    blobs.className = "goo-blobs";
    for (var i = 0; i < n; i++) {
      var c = document.createElement("i");
      c.style.setProperty("--d", "calc(" + (mid - i) + " * (var(--goo-s) + var(--goo-g)))");
      blobs.appendChild(c);
    }
    wrap.appendChild(blobs);
    if (typeof letters !== "number") {
      var ls = document.createElement("span");
      ls.className = "goo-letters";
      ls.setAttribute("aria-hidden", "true");
      for (var j = 0; j < n; j++) {
        var b = document.createElement("b");
        b.textContent = letters[j];
        ls.appendChild(b);
      }
      wrap.appendChild(ls);
    }
    return wrap;
  }

  /* ---------- 1) Splash (home page, once per session) ---------- */
  if (wantSplash && !reduce) {
    var seen = false;
    try { seen = sessionStorage.getItem("gooSplashShown") === "1"; } catch (e) {}
    if (!seen) {
      try { sessionStorage.setItem("gooSplashShown", "1"); } catch (e) {}
      ensureFilters();
      var splash = document.createElement("div");
      splash.className = "goo-splash";
      splash.setAttribute("role", "status");
      splash.setAttribute("aria-label", "লোড হচ্ছে");
      splash.appendChild(row(["H", "A", "N", "N", "A", "N"], false));
      var nm = document.createElement("p");
      nm.className = "goo-splash-name";
      nm.textContent = "সার্ভেয়ার আবদুল হান্নান";
      var sb = document.createElement("p");
      sb.className = "goo-splash-sub";
      sb.textContent = "লোড হচ্ছে…";
      splash.appendChild(nm);
      splash.appendChild(sb);
      root.appendChild(splash);

      var started = Date.now(), closed = false, MIN = 1500, MAX = 3200;
      var hide = function () {
        if (closed) return;
        closed = true;
        splash.classList.add("goo-out");
        setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 600);
      };
      var done = function () { setTimeout(hide, Math.max(0, MIN - (Date.now() - started))); };
      if (document.readyState === "complete") done();
      else window.addEventListener("load", done, { once: true });
      setTimeout(hide, MAX);
    }
  }

  /* ---------- everything else runs after the DOM is ready ---------- */
  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(function () {
    ensureFilters();

    /* ---------- 2) Calculator indicator ---------- */
    var pop = null, popTimer = null;
    function showCalc() {
      if (!pop) {
        pop = document.createElement("div");
        pop.className = "goo-calc-pop";
        pop.setAttribute("role", "status");
        pop.setAttribute("aria-live", "polite");
        pop.appendChild(row(3, true));
        var t = document.createElement("span");
        t.textContent = "হিসাব চলছে…";
        pop.appendChild(t);
        document.body.appendChild(pop);
      }
      void pop.offsetWidth;
      pop.classList.add("goo-show");
      clearTimeout(popTimer);
      popTimer = setTimeout(function () { pop.classList.remove("goo-show"); }, 650);
    }
    if (document.querySelector(".calc-btn")) {
      document.addEventListener("click", function (e) {
        var btn = e.target && e.target.closest ? e.target.closest("button.calc-btn.calc-primary") : null;
        if (!btn || btn.disabled) return;
        var id = btn.id || "";
        var txt = btn.textContent || "";
        if (/print/i.test(id) || /প্রিন্ট|PDF/i.test(txt)) return;
        if (/(Calc|Calculate|Run)$/.test(id) || /হিসাব|রূপান্তর|হিস্যা/.test(txt)) showCalc();
      }, true);
    }

    /* ---------- 3) Video / photo placeholders ---------- */
    var vg = document.getElementById("videoGallery");
    var pg = document.getElementById("photoGallery");
    if (vg || pg) {
      var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            io.unobserve(en.target);
            var fn = en.target.__gooFail;
            if (fn) setTimeout(fn, 12000);
          }
        });
      }) : null;

      var attach = function (el) {
        if (el.__gooDone) return;
        el.__gooDone = true;
        var isImg = el.tagName === "IMG";
        if (isImg && el.complete && el.naturalWidth > 0) return;
        var host = el.parentElement;
        if (!host) return;
        host.classList.add("goo-host");
        var ov = document.createElement("div");
        ov.className = "goo-media" + (isImg ? " goo-media-img" : "");
        ov.setAttribute("aria-hidden", "true");
        ov.appendChild(row(3, true));
        host.appendChild(ov);
        var finish = function () {
          if (!ov.parentNode) return;
          ov.classList.add("goo-out");
          setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 400);
        };
        el.addEventListener("load", finish, { once: true });
        el.addEventListener("error", finish, { once: true });
        el.__gooFail = finish;
        if (io) io.observe(el);
        else setTimeout(finish, 12000);
      };

      var scan = function (scope) {
        if (!scope.querySelectorAll) return;
        var list = scope.querySelectorAll("iframe, img");
        for (var i = 0; i < list.length; i++) attach(list[i]);
        if (scope.tagName === "IMG" || scope.tagName === "IFRAME") attach(scope);
      };

      [vg, pg].forEach(function (g) {
        if (!g) return;
        scan(g);
        new MutationObserver(function (muts) {
          muts.forEach(function (m) {
            for (var i = 0; i < m.addedNodes.length; i++) {
              if (m.addedNodes[i].nodeType === 1) scan(m.addedNodes[i]);
            }
          });
        }).observe(g, { childList: true, subtree: true });
      });
    }

    /* ---------- 4) Form submit button ---------- */
    document.addEventListener("submit", function (e) {
      var f = e.target;
      if (!f || !f.matches || !f.matches("#workOrderForm, #feedbackForm, #questionForm")) return;
      var b = f.querySelector('button[type="submit"]');
      if (!b || b.classList.contains("goo-btn-loading")) return;
      b.classList.add("goo-btn-loading");
      b.setAttribute("aria-busy", "true");
      var dots = document.createElement("span");
      dots.className = "goo-btn-dots";
      dots.setAttribute("aria-hidden", "true");
      dots.appendChild(row(3, true));
      b.appendChild(dots);
      setTimeout(function () {
        b.classList.remove("goo-btn-loading");
        b.removeAttribute("aria-busy");
        if (dots.parentNode) dots.parentNode.removeChild(dots);
      }, 1000);
    }, true);
  });
})();
