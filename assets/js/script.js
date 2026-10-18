/* =========================================================
   LOST TAPES — motion system
   GSAP + ScrollTrigger + Lenis (one instance, one ticker)
   Load order: gsap → ScrollTrigger → Lenis → this file (defer)
========================================================= */
(() => {
  "use strict";

  /* ---------- TUNABLE SETTINGS ---------- */
  const CONFIG = {
    lenis: { duration: 1.05, wheelMultiplier: 1, touchMultiplier: 1 },
    ease: "power4.out",
    reveal: {
      start: "top 92%",        // when an element starts to reveal
      y: 28,                   // px of vertical travel
      duration: 1.1,
      stagger: 0.09,           // gap between cards entering together
      blur: 10,                // px, album cards (0 disables); small text uses 4–6
    },
    intro: { fontWait: 600, cardDelay: 0.75 },
  };

  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasLibs = !!(window.gsap && window.ScrollTrigger && window.Lenis);
  const animated = !reduce && hasLibs;
  let lenis = null;

  /* ---------- SCROLL BUTTONS (data-scroll) ---------- */
  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.scroll;
      const target = id === "top" ? 0 : document.getElementById(id);
      if (target === null) return;

      if (lenis) {
        lenis.scrollTo(target, { duration: 1.4 });
      } else if (target === 0) {
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      } else {
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
    });
  });

  /* ---------- 404: GO BACK ---------- */
  const goBack = document.getElementById("go-back");
  goBack?.addEventListener("click", () => {
    const sameOrigin = document.referrer.startsWith(window.location.origin);
    if (window.history.length > 1 && sameOrigin) window.history.back();
    else window.location.href = "/";
  });

  /* ---------- BAIL OUT SAFELY ---------- */
  if (!animated) {
    root.classList.remove("js-motion"); // everything stays visible
    return;
  }
  window.__motionReady = true;
  root.classList.add("js-motion");

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------- LENIS (single instance, driven by GSAP ticker) ---------- */
  lenis = new window.Lenis({
    duration: CONFIG.lenis.duration,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false, // native touch scrolling on mobile
    wheelMultiplier: CONFIG.lenis.wheelMultiplier,
    touchMultiplier: CONFIG.lenis.touchMultiplier,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ---------- HELPERS ---------- */
  const $ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const R = CONFIG.reveal;

  const hiddenState = (y = R.y, blur = 0) => ({
    opacity: 0,
    y,
    ...(blur ? { filter: `blur(${blur}px)` } : {}),
  });

  function play(els, { y = R.y, blur = 0, delay = 0, stagger = R.stagger, duration = R.duration } = {}) {
    // Movement + opacity settle first; blur resolves slightly later and softer → sense of depth.
    gsap.to(els, {
      opacity: 1,
      y: 0,
      duration,
      delay,
      stagger,
      ease: CONFIG.ease,
      overwrite: true,
      onComplete: () => gsap.set(els, { clearProps: "transform" }),
    });
    if (blur) {
      gsap.to(els, {
        filter: "blur(0px)",
        duration: duration + 0.2,
        delay,
        stagger,
        ease: "power2.out",
        overwrite: false,
        onComplete: () => gsap.set(els, { clearProps: "filter" }),
      });
    }
  }

  function reset(els, y = R.y, blur = 0) {
    gsap.killTweensOf(els);
    gsap.set(els, hiddenState(y, blur));
  }

  /* Replay logic: reveal at `start`, reset only once fully off-screen
     (hysteresis → no flicker while any part is still visible). */
  function resetWhenOffscreen(el, resetFn) {
    ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      onLeave: resetFn,
      onLeaveBack: resetFn,
    });
  }

  let introPending = true;
  const introDelay = () => (introPending ? CONFIG.intro.cardDelay : 0);

  /* ---------- SETUP ---------- */
  function init() {
    const isError = !!document.querySelector(".error-card");

    /* --- Header (children only, never the dark container) --- */
    const words = $(".header-word");
    const navBtns = $(".header-button");
    const updated = $(".last-updated");

    gsap.set(words, hiddenState(30, 8));
    gsap.set(navBtns, hiddenState(12, 4));
    gsap.set(updated, hiddenState(12, 4));

    const intro = gsap.timeline({ defaults: { ease: CONFIG.ease } });
    intro
      .to(words, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.1, stagger: 0.12 }, 0)
      .to(navBtns, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.05 }, 0.35)
      .to(updated, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9 }, 0.7)
      .add(() => gsap.set([words, navBtns, updated], { clearProps: "transform,filter" }));

    /* --- 404 card --- */
    if (isError) {
      const parts = [".error-top", ".error-eyebrow", ".error-code", ".error-message", ".error-actions", ".error-bottom"]
        .map((s) => document.querySelector(s))
        .filter(Boolean);
      const divider = document.querySelector(".error-divider");

      gsap.set(parts, hiddenState(24, 6));
      if (divider) gsap.set(divider, { scaleX: 0, transformOrigin: "0% 50%" });

      intro.to(parts, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1, stagger: 0.09, clearProps: "transform,filter" }, 0.5);
      if (divider) intro.to(divider, { scaleX: 1, duration: 1.3, ease: "power3.inOut" }, 0.75);
    }

    /* --- Section heading --- */
    $(".albums-heading").forEach((el) => {
      const h = () => reset(el, 16, 4);
      gsap.set(el, hiddenState(16, 4));
      ScrollTrigger.create({
        trigger: el,
        start: R.start,
        onEnter: () => play(el, { y: 16, blur: 4, delay: Math.max(0, introDelay() - 0.2) }),
        onEnterBack: () => play(el, { y: 16, blur: 4 }),
      });
      resetWhenOffscreen(el, h);
    });

    /* --- Album cards (batched so rows enter as a staggered group) --- */
    const cards = $(".album-card");
    if (cards.length) {
      gsap.set(cards, hiddenState(R.y, R.blur));
      ScrollTrigger.batch(cards, {
        start: R.start,
        interval: 0.1,
        batchMax: 6,
        onEnter: (batch) => play(batch, { blur: R.blur, delay: introDelay() }),
        onEnterBack: (batch) => play(batch, { blur: R.blur }),
      });
      cards.forEach((card) => resetWhenOffscreen(card, () => reset(card, R.y, R.blur)));
    }

    /* --- Footer --- */
    const footer = document.querySelector(".site-footer");
    if (footer) {
      const kids = [".footer-brand", ".footer-info", ".footer-nav", ".footer-bottom"]
        .map((s) => footer.querySelector(s))
        .filter(Boolean);
      gsap.set(kids, hiddenState(24, 4));
      ScrollTrigger.create({
        trigger: footer,
        start: "top 88%",
        onEnter: () => play(kids, { y: 24, blur: 4, stagger: 0.1, duration: 1 }),
        onEnterBack: () => play(kids, { y: 24, blur: 4, stagger: 0.1, duration: 1 }),
      });
      resetWhenOffscreen(footer, () => reset(kids, 24, 4));
    }

    gsap.delayedCall(1.4, () => (introPending = false));
  }

  /* Wait briefly for fonts so layout is final, but never block long. */
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, CONFIG.intro.fontWait))]).then(init);

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
