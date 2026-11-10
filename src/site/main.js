// ============================================
// School website entry point (every public page)
// ============================================

import './site.css';
import { SITE_DEFAULTS } from '../../shared/site-defaults.js';
import { loadSite } from './data.js';
import { overlays, header, footer } from './layout.js';
import * as motion from './motion.js';

const PAGES = {
  index: () => import('./pages/home.js'),
  about: () => import('./pages/about.js'),
  academics: () => import('./pages/academics.js'),
  houses: () => import('./pages/houses.js'),
  gallery: () => import('./pages/gallery.js'),
  news: () => import('./pages/news.js'),
  admissions: () => import('./pages/admissions.js'),
  contact: () => import('./pages/contact.js'),
};

const page = PAGES[document.body.dataset.page] ? document.body.dataset.page : 'index';
const root = document.getElementById('site');

const firstVisit = (() => {
  try { return !sessionStorage.getItem('hps_seen'); } catch { return true; }
})();

function imageLoaded(image, timeout) {
  if (!image || image.complete) return Promise.resolve();
  return Promise.race([
    new Promise((resolve) => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); }),
    new Promise((resolve) => setTimeout(resolve, timeout)),
  ]);
}

async function start() {
  // Cover the screen straight away; the page is built underneath.
  root.innerHTML = overlays(SITE_DEFAULTS, { firstVisit });

  let resolveReady;
  const ready = new Promise((r) => { resolveReady = r; });
  const intro = motion.playIntro({ firstVisit, ready, onReveal: () => motion.playBannerIntro() });

  const [site, mod] = await Promise.all([loadSite(), PAGES[page]()]);

  root.insertAdjacentHTML('beforeend', `${header(site, page)}<main id="main">${mod.render(site)}</main>${footer(site)}`);
  const main = document.getElementById('main');
  try { sessionStorage.setItem('hps_seen', '1'); } catch { /* ignore */ }

  motion.initSmoothScroll();
  motion.initHeader();
  motion.initMenu();
  motion.initPageTransitions();

  const motionApi = {
    gsap: motion.gsap,
    ScrollTrigger: motion.ScrollTrigger,
    reducedMotion: motion.reducedMotion,
    getLenis: motion.getLenis,
    initHorizontal: motion.initHorizontal,
  };
  try {
    await mod.mount?.(main, motionApi, site);
  } catch (err) {
    console.error('Page setup failed:', err);
  }

  await imageLoaded(root.querySelector('[data-banner] img'), 2500);
  resolveReady();
  await intro;

  await motion.initReveals(root);
  motion.initMagnetic(root);
  motion.initMarquees();

  if (location.hash) {
    const target = document.querySelector(decodeURIComponent(location.hash).replace(/[^#\w-]/g, ''));
    if (target) setTimeout(() => motion.scrollToEl(target), 300);
  }
}

start().catch((err) => {
  console.error(err);
  // Never leave visitors staring at the loading screen or at hidden text.
  document.querySelectorAll('.preloader, .curtain').forEach((el) => el.remove());
  motion.revealEverything();
});
