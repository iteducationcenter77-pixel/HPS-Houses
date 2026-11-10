// ============================================
// Motion: smooth scroll, preloader, page transitions, scroll reveals
// ============================================
// Two levels:
//  • full  — smooth scrolling, sliding text reveals, parallax, pinned gallery
//  • calm  — for visitors whose device asks for reduced motion: gentle fades only
// Add ?motion=full (or ?motion=calm) to any address to force a level for this tab.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger, SplitText);

const forced = (() => {
  try {
    const q = new URLSearchParams(location.search).get('motion');
    if (q === 'full' || q === 'calm') sessionStorage.setItem('hps_motion', q);
    if (q === 'auto') sessionStorage.removeItem('hps_motion');
    return sessionStorage.getItem('hps_motion');
  } catch {
    return null;
  }
})();

export const reducedMotion = forced ? forced === 'calm' : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const calm = reducedMotion;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const EASE = 'expo.out';

document.documentElement.classList.toggle('calm', calm);

let lenis = null;

export function getLenis() { return lenis; }

// ── Smooth scrolling ──

export function initSmoothScroll() {
  if (calm) return null;
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, anchors: { offset: -90 } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function scrollToEl(el) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -90, duration: 1.4 });
  else el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
}

// ── Fonts must be ready before text is split into lines ──

function fontsReady(timeout = 1500) {
  if (!document.fonts?.ready) return Promise.resolve();
  return Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, timeout))]);
}

// ── Preloader (first visit) and curtain (between pages) ──

/**
 * Lift the loading screen once `ready` resolves. `onReveal` fires as the screen
 * starts moving away, so the page's own entrance can overlap it.
 */
export async function playIntro({ firstVisit, ready, onReveal = () => {} }) {
  const pre = document.querySelector('.preloader');
  const curtain = document.querySelector('.curtain');

  if (firstVisit && pre) {
    const tl = gsap.timeline();
    if (calm) {
      tl.from('.pl-inner', { autoAlpha: 0, duration: 0.6 })
        .to('.pl-bar span', { scaleX: 0.7, duration: 0.8, ease: 'power2.out' }, 0);
    } else {
      tl.from('.pl-crest', { scale: 0.4, autoAlpha: 0, rotate: -40, duration: 1.1, ease: 'back.out(1.6)' })
        .from('.pl-ch', { yPercent: 120, autoAlpha: 0, stagger: 0.025, duration: 0.8, ease: EASE }, '-=0.6')
        .from('.pl-tag', { autoAlpha: 0, y: 12, duration: 0.6, ease: EASE }, '-=0.5')
        .fromTo('.pl-bar span', { scaleX: 0 }, { scaleX: 0.7, duration: 1.2, ease: 'power2.out' }, 0.2);
    }
    await Promise.all([ready, tl.then()]);
    await gsap.to('.pl-bar span', { scaleX: 1, duration: 0.35, ease: 'power2.out' });
    if (calm) {
      await gsap.timeline().call(onReveal).to(pre, { autoAlpha: 0, duration: 0.6 }, 0);
    } else {
      await gsap.timeline()
        .to('.pl-inner', { yPercent: -30, autoAlpha: 0, duration: 0.6, ease: 'power3.in' })
        .to(pre, { yPercent: -100, duration: 1.0, ease: 'expo.inOut' }, '-=0.25')
        .call(onReveal, null, '-=0.55');
    }
    pre.remove();
    curtain?.classList.remove('is-covering');
    return;
  }

  pre?.remove();
  await ready;
  if (!curtain?.classList.contains('is-covering')) { onReveal(); return; }
  if (calm) {
    await gsap.timeline().call(onReveal).to(curtain, { autoAlpha: 0, duration: 0.45 }, 0);
  } else {
    await gsap.timeline()
      .to('.curtain-crest', { scale: 0.6, autoAlpha: 0, duration: 0.35, ease: 'power2.in' })
      .to('.curtain-panel', { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '-=0.1')
      .call(onReveal, null, '-=0.6');
  }
  curtain.classList.remove('is-covering');
  gsap.set([curtain, '.curtain-panel', '.curtain-crest'], { clearProps: 'all' });
}

/** Cover the page, then go to `href`. */
function leaveTo(href) {
  const curtain = document.querySelector('.curtain');
  if (!curtain) { location.href = href; return; }
  curtain.classList.add('is-leaving');
  const go = () => { location.href = href; };
  if (calm) {
    gsap.set('.curtain-panel', { yPercent: 0 });
    gsap.fromTo(curtain, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, onComplete: go });
    return;
  }
  gsap.timeline({ onComplete: go })
    .fromTo('.curtain-panel', { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'expo.inOut' })
    .fromTo('.curtain-crest', { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2)' }, '-=0.25');
}

const pagePath = (u) => u.pathname.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';

export function initPageTransitions() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

    const samePage = pagePath(url) === pagePath(location);
    if (samePage && url.hash) {
      e.preventDefault();
      closeMenu();
      scrollToEl(document.querySelector(url.hash));
      history.replaceState(null, '', url.hash);
      return;
    }
    if (samePage) {
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(0); else window.scrollTo({ top: 0 });
      return;
    }
    e.preventDefault();
    closeMenu();
    leaveTo(url.href);
  });

  // Coming back via the browser's back button restores the page as it was left.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    const curtain = document.querySelector('.curtain');
    curtain?.classList.remove('is-leaving', 'is-covering');
    gsap.set([curtain, '.curtain-panel', '.curtain-crest'], { clearProps: 'all' });
  });
}

// ── Header: solid after scrolling, hides while scrolling down ──

export function initHeader() {
  const head = document.querySelector('.site-head');
  if (!head) return;
  let last = 0;
  const onScroll = (y) => {
    head.classList.toggle('is-scrolled', y > 40);
    const goingDown = y > last && y > 300;
    head.classList.toggle('is-hidden', goingDown && !document.body.classList.contains('menu-open'));
    last = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
  onScroll(window.scrollY);
}

// ── Full-screen menu ──

let menuTl = null;

export function closeMenu() {
  if (document.body.classList.contains('menu-open')) toggleMenu(false);
}

function toggleMenu(open) {
  const menu = document.getElementById('menu');
  const btn = document.querySelector('.menu-btn');
  if (!menu || !btn) return;
  document.body.classList.toggle('menu-open', open);
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.setAttribute('aria-hidden', String(!open));
  if (open) lenis?.stop(); else lenis?.start();

  menuTl?.kill();
  if (calm) {
    if (open) {
      menu.classList.add('is-open');
      menuTl = gsap.fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
    } else {
      menuTl = gsap.to(menu, { autoAlpha: 0, duration: 0.25, onComplete: () => { menu.classList.remove('is-open'); gsap.set(menu, { clearProps: 'all' }); } });
    }
    return;
  }
  if (open) {
    menu.classList.add('is-open');
    menuTl = gsap.timeline()
      .fromTo('.menu-bg', { clipPath: 'circle(0% at 100% 0%)' }, { clipPath: 'circle(150% at 100% 0%)', duration: 0.9, ease: 'expo.inOut' })
      .fromTo('.menu-word', { yPercent: 110 }, { yPercent: 0, stagger: 0.05, duration: 0.8, ease: EASE }, '-=0.45')
      .fromTo(['.menu-num', '.menu-foot a'], { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, stagger: 0.03, duration: 0.5 }, '-=0.6');
  } else {
    menuTl = gsap.timeline({ onComplete: () => menu.classList.remove('is-open') })
      .to('.menu-word', { yPercent: -110, stagger: 0.02, duration: 0.4, ease: 'power2.in' })
      .to('.menu-bg', { clipPath: 'circle(0% at 100% 0%)', duration: 0.6, ease: 'expo.inOut' }, '-=0.2');
  }
}

export function initMenu() {
  document.querySelector('.menu-btn')?.addEventListener('click', () => {
    toggleMenu(!document.body.classList.contains('menu-open'));
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
}

// ── Scroll reveals ──

const onScrollIn = (trigger, start = 'top 88%') => ({ trigger, start, once: true });

function splitReveal(el, { delay = 0, scroll = true } = {}) {
  if (el.dataset.splitDone) return;
  el.dataset.splitDone = '1';
  if (calm) {
    gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1, delay, scrollTrigger: scroll ? onScrollIn(el) : undefined });
    return;
  }
  SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'split-line',
    autoSplit: true,
    onSplit(self) {
      gsap.set(el, { visibility: 'visible' });
      return gsap.from(self.lines, {
        yPercent: 115, rotate: 2, duration: 1.15, ease: EASE, stagger: 0.09, delay,
        scrollTrigger: scroll ? onScrollIn(el) : undefined,
      });
    },
  });
}

/** Reveal everything marked up with data-* motion hooks inside `root`. */
export async function initReveals(root = document) {
  await fontsReady();
  root.querySelectorAll('[data-split]').forEach((el) => splitReveal(el));

  root.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.fromTo(el, { y: calm ? 0 : 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: calm ? 0.8 : 1.1, ease: EASE, scrollTrigger: onScrollIn(el, 'top 92%') });
  });

  root.querySelectorAll('[data-stagger]').forEach((group) => {
    const items = group.children;
    if (!items.length) return;
    gsap.fromTo(items, { y: calm ? 0 : 50, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: calm ? 0.8 : 1.1, ease: EASE, stagger: calm ? 0.05 : 0.08, scrollTrigger: onScrollIn(group),
    });
  });

  root.querySelectorAll('[data-img-reveal]').forEach((frame) => {
    if (calm) {
      gsap.fromTo(frame, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1, scrollTrigger: onScrollIn(frame, 'top 90%') });
      return;
    }
    const pic = frame.querySelector('img');
    const tl = gsap.timeline({ scrollTrigger: onScrollIn(frame, 'top 85%') });
    tl.fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' });
    if (pic) tl.from(pic, { scale: 1.35, duration: 1.8, ease: EASE }, 0);
  });

  root.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    if (!Number.isFinite(target)) return;
    if (calm) { el.textContent = target.toLocaleString('en-IN'); return; }
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 2, ease: 'power3.out', scrollTrigger: onScrollIn(el, 'top 90%'),
      onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString('en-IN'); },
    });
  });

  // Progress lines (calendar, admission steps): horizontal on desktop, vertical on phones.
  root.querySelectorAll('[data-draw]').forEach((line) => {
    if (calm) return; // stays fully drawn
    const track = line.parentElement;
    const vertical = track.offsetHeight > track.offsetWidth;
    gsap.fromTo(line, vertical ? { scaleY: 0 } : { scaleX: 0 }, {
      ...(vertical ? { scaleY: 1 } : { scaleX: 1 }),
      ease: 'none',
      transformOrigin: vertical ? 'center top' : 'left center',
      scrollTrigger: { trigger: track.parentElement, start: 'top 75%', end: 'bottom 60%', scrub: 0.6 },
    });
  });

  ScrollTrigger.refresh();
}

/** Page-top banner / hero entrance (runs as the loading screen lifts). */
export async function playBannerIntro() {
  const banner = document.querySelector('[data-banner]');
  if (!banner) return;
  const intro = banner.querySelectorAll('[data-intro]');

  if (calm) {
    gsap.fromTo([...banner.querySelectorAll('[data-intro-split]'), ...intro], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, stagger: 0.08 });
    return;
  }

  await fontsReady();
  const media = banner.querySelector('[data-parallax-media]');
  if (media) {
    gsap.fromTo(media, { scale: 1.25 }, { scale: 1, duration: 2.4, ease: 'expo.out' });
    gsap.to(media.querySelector('img') || media, {
      yPercent: 18, ease: 'none',
      scrollTrigger: { trigger: banner, start: 'top top', end: 'bottom top', scrub: true },
    });
  }
  banner.querySelectorAll('[data-intro-split]').forEach((el) => splitReveal(el, { delay: 0.1, scroll: false }));
  gsap.fromTo(intro, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.2, stagger: 0.1, delay: 0.3, ease: EASE });
  const content = banner.querySelector('.banner-inner, .mast-inner');
  if (content) {
    gsap.to(content, {
      yPercent: -18, autoAlpha: 0.2, ease: 'none',
      scrollTrigger: { trigger: banner, start: 'top top', end: 'bottom top', scrub: true },
    });
  }
}

/** Last-resort: never leave content invisible if something above failed. */
export function revealEverything() {
  document.querySelectorAll('[data-split], [data-intro-split], [data-intro]').forEach((el) => { el.style.visibility = 'visible'; });
}

// ── Buttons that lean toward the pointer ──

export function initMagnetic(root = document) {
  if (calm || !finePointer) return;
  root.querySelectorAll('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.25);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

// ── Horizontal scroll section (desktop): pins and slides the track sideways ──

export function initHorizontal(section) {
  if (!section || calm) return;
  const track = section.querySelector('[data-h-track]');
  if (!track) return;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 48);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });
    track.querySelectorAll('[data-h-img]').forEach((pic) => {
      gsap.fromTo(pic, { xPercent: -8 }, {
        xPercent: 8, ease: 'none',
        scrollTrigger: { trigger: pic.parentElement, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
      });
    });
  });
}

/** Big footer marquee drifts, and speeds up while the page is being scrolled. */
export function initMarquees() {
  if (calm) return;
  document.querySelectorAll('.foot-marquee-run').forEach((run) => {
    const loop = gsap.to(run, { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
    ScrollTrigger.create({
      trigger: run,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const boost = Math.min(Math.abs(self.getVelocity()) / 300, 6);
        gsap.to(loop, {
          timeScale: 1 + boost, duration: 0.2, overwrite: true,
          onComplete: () => gsap.to(loop, { timeScale: 1, duration: 1.2 }),
        });
      },
    });
  });
}

export { gsap, ScrollTrigger };
