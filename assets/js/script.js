/* ==========================================================
   LOST TAPES — scroll & motion
   GSAP 3 + ScrollTrigger + Lenis
   Порядок у HTML: lenis → gsap → ScrollTrigger → script.js
========================================================== */
(() => {
  "use strict";
 
  const root = document.documentElement;
  const hasLibs = Boolean(window.gsap && window.ScrollTrigger && window.Lenis);
  let lenis = null;
 
  /* ---------- 1. НАЛАШТУВАННЯ (крути тут) ---------- */
  const EASE = { out: "power3.out", exit: "power2.in", line: "power3.inOut" };
  const REVEAL = { y: 32, blur: 10, duration: 1 };
  /* Поява, прив'язана до скролу. Числа — у % висоти екрана:
       start — на якій висоті верх картки починає з'являтись (95% = майже внизу)
       step  — наскільки глибше треба доскролити для кожної наступної колонки в ряду
       span  — скільки скролу займає поява однієї картки
       scrub — інерція (с), з якою анімація наздоганяє скрол */
  const SCROLL = { start: 95, step: 7, span: 22, scrub: 0.5 };
  const SMOOTH = { duration: 1.1, ease: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)) };
 
  /* ---------- 2. КНОПКИ СКРОЛУ (працюють і без Lenis) ---------- */
  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: "smooth" });
    else target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
 
  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.scroll;
      const target = id === "top" ? 0 : document.getElementById(id);
      if (target === null) window.location.href = `/#${id}`; // напр. зі сторінки 404
      else scrollToTarget(target);
    });
  });
 
  /* 404: кнопка "GO BACK" */
  document.getElementById("go-back")?.addEventListener("click", () => {
    const sameSite = document.referrer.startsWith(window.location.origin);
    if (window.history.length > 1 && sameSite) window.history.back();
    else window.location.href = "/";
  });
 
  /* ---------- 3. БЕЗПЕЧНИЙ ВИХІД ----------
     Немає бібліотек або клас "js" уже знятий → контент просто лишається видимим. */
  if (!hasLibs || !root.classList.contains("js")) {
    root.classList.remove("js");
    return;
  }
  window.__ltReady = true;
 
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
 
  /* ---------- 4. СТАНИ З'ЯВИ ----------
     from() — прихований стан, show() — кінцевий. */
  const from = (y = REVEAL.y, blur = REVEAL.blur) => ({
    autoAlpha: 0,
    y,
    filter: `blur(${blur}px)`,
  });
 
  const show = (vars = {}) => ({
    autoAlpha: 1,
    y: 0,
    filter: "blur(0px)",
    duration: REVEAL.duration,
    ease: EASE.out,
    clearProps: "filter,transform", // після анімації блюр і transform не лишаються
    ...vars,
  });
 
  const exists = (selector) => document.querySelector(selector) !== null;
 
  /* ---------- 5. ВСТУП: ХЕДЕР (+ 404) ----------
     Анімуємо окремі елементи, а не темний контейнер хедера. */
  function introTimeline() {
    const tl = gsap.timeline();
 
    tl.fromTo(".header-word", from(40, 14), show({ duration: 1.2, stagger: 0.12 }), 0)
      .fromTo(".header-button", from(14, 5), show({ duration: 0.9, stagger: 0.05 }), 0.35)
      .fromTo(".last-updated", from(14, 5), show({ duration: 0.9 }), 0.7);
 
    if (exists(".error-card")) {
      tl.fromTo(
        ".error-top, .error-eyebrow, .error-code, .error-message, .error-actions, .error-bottom",
        from(24, 6),
        show({ duration: 1, stagger: 0.09 }),
        0.5
      ).fromTo(
        ".error-divider",
        { scaleX: 0, transformOrigin: "left center" },
        { scaleX: 1, duration: 1.3, ease: EASE.line },
        0.75
      );
    }
    return tl;
  }
 
  /* ---------- 6. ПОЯВА, ПРИВ'ЯЗАНА ДО СКРОЛУ ----------
     Кожен елемент має власний ScrollTrigger зі scrub: прогрес анімації = прогрес скролу.
     Скролиш вниз — з'являється, вгору — плавно зникає (без жодних скидань і мерехтіння).
     Елементи, що вже на екрані при завантаженні, отримують короткий вступ за часом. */
  let introOrder = 0;
 
  function scrollReveal({ trigger, targets, covers, col = () => 0, y, blur, stagger = 0 }) {
    const el = typeof trigger === "string" ? document.querySelector(trigger) : trigger;
    if (!el) return;
 
    /* вже видно при завантаженні → вступ за часом, по черзі */
    if (el.getBoundingClientRect().top < window.innerHeight * 0.8) {
      gsap.fromTo(targets, from(y, blur), show({ y: 0, stagger, delay: 0.55 + introOrder++ * 0.09 }));
      if (covers) gsap.fromTo(covers, { scale: 1.15 }, { scale: 1, duration: 1.5, ease: EASE.out, delay: 0.55, clearProps: "transform" });
      return;
    }
 
    /* далі — по скролу. start/end — функції, тож перераховуються при resize */
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: () => `top ${SCROLL.start - col() * SCROLL.step}%`,
        end: () => `clamp(top ${SCROLL.start - col() * SCROLL.step - SCROLL.span}%)`,
        scrub: SCROLL.scrub,
      },
    });
    tl.fromTo(targets, from(y, blur), show({ y: 0, stagger, duration: 1, ease: "power2.out" }), 0);
    if (covers) tl.fromTo(covers, { scale: 1.15 }, { scale: 1, duration: 1, ease: "power2.out", clearProps: "transform" }, 0);
  }
 
  /* Картки: колонка в ряду визначає, наскільки пізніше картка почне з'являтись */
  function revealCards() {
    const cards = gsap.utils.toArray(".album-card");
    const columnOf = (card) =>
      cards.filter((c) => Math.abs(c.offsetTop - card.offsetTop) < 8).indexOf(card);
 
    cards.forEach((card) =>
      scrollReveal({
        trigger: card,
        targets: card,
        covers: card.querySelector(".album-art"),
        col: () => columnOf(card),
      })
    );
  }
 
  /* ---------- 7. ЗАПУСК ----------
     gsap.matchMedia: усе нижче живе лише коли користувач НЕ просить reduced motion.
     При зміні налаштування GSAP сам відкотить усі анімації та ScrollTrigger. */
  function start() {
    root.classList.add("js");
 
    /* Lenis + ScrollTrigger: один екземпляр, один ticker */
    lenis = new window.Lenis({
      duration: SMOOTH.duration,
      easing: SMOOTH.ease,
      smoothWheel: true,
      syncTouch: false, // на телефоні лишається рідний touch-скрол
    });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
 
    introTimeline();
 
    /* ScrollTrigger-и створюємо зверху вниз по сторінці */
    scrollReveal({ trigger: ".albums-heading", targets: ".albums-heading span", y: 16, blur: 5, stagger: 0.1 });
    revealCards();
    scrollReveal({
      trigger: ".site-footer",
      targets: ".footer-brand, .footer-info, .footer-nav, .footer-bottom",
      y: 24,
      blur: 6,
      stagger: 0.15,
    });
 
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenis = null;
    };
  }
 
  /* Чекаємо шрифти (максимум 0.8 с), щоб позиції тригерів були точні */
  const fontsReady = Promise.race([document.fonts?.ready, new Promise((resolve) => setTimeout(resolve, 800))]);
 
  fontsReady.then(() => {
    gsap.matchMedia().add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        reduce: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        if (context.conditions.reduce) {
          root.classList.remove("js"); // без анімацій: усе одразу видно
          return;
        }
        return start();
      }
    );
  });
 
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();



