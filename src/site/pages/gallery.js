// ============================================
// Gallery page: filterable masonry + full-screen viewer
// ============================================

import { banner } from '../layout.js';
import { esc, img, imageUrl, icon, sectionHead } from '../util.js';

export function render(site) {
  const { gallery } = site;
  const items = (gallery.items || []).filter((x) => imageUrl(x.image));
  const categories = [...new Set(items.map((x) => x.category).filter(Boolean))];

  return `
    ${banner({ kicker: 'Gallery', title: gallery.heading, text: gallery.intro, image: site.banners?.gallery_image || items[1]?.image || site.hero.image, crumb: 'Gallery' })}

    <section class="blk">
      <div class="wrap">
        <div class="split-head">
          ${sectionHead({ kicker: `${items.length} photos`, title: 'Moments from our campus' })}
          ${categories.length > 1 ? `
            <div class="chips" role="tablist" aria-label="Filter photos" data-reveal>
              <button class="chip is-active" role="tab" aria-selected="true" data-cat="">All</button>
              ${categories.map((c) => `<button class="chip" role="tab" aria-selected="false" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
            </div>` : ''}
        </div>
        ${items.length ? `
          <div class="masonry" data-masonry>
            ${items.map((x, i) => `
              <button class="tile" type="button" data-index="${i}" data-cat="${esc(x.category || '')}" aria-label="Open photo${x.title ? `: ${esc(x.title)}` : ''}">
                <span class="tile-img" data-img-reveal>${img(x.image, x.title || 'Campus photo')}</span>
                ${x.title ? `<span class="tile-cap"><small>${esc(x.category)}</small>${esc(x.title)}</span>` : ''}
              </button>`).join('')}
          </div>` : '<p class="empty">Photos will appear here soon.</p>'}
      </div>
    </section>

    <div class="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" hidden>
      <button class="lb-close" type="button" aria-label="Close">${icon('X')}</button>
      <button class="lb-nav lb-prev" type="button" aria-label="Previous photo">${icon('ChevronLeft')}</button>
      <figure class="lb-figure"><img alt=""><figcaption></figcaption></figure>
      <button class="lb-nav lb-next" type="button" aria-label="Next photo">${icon('ChevronRight')}</button>
      <span class="lb-count"></span>
    </div>`;
}

export function mount(root, { gsap, ScrollTrigger, reducedMotion, getLenis }) {
  const tiles = [...root.querySelectorAll('.tile')];
  const box = root.querySelector('.lightbox');
  if (!box || !tiles.length) return;
  const pic = box.querySelector('img');
  const cap = box.querySelector('figcaption');
  const count = box.querySelector('.lb-count');
  let list = tiles;
  let current = 0;
  let lastFocus = null;

  const show = (i) => {
    current = (i + list.length) % list.length;
    const tile = list[current];
    const source = tile.querySelector('img');
    pic.src = source.currentSrc || source.src;
    pic.alt = source.alt;
    cap.textContent = tile.querySelector('.tile-cap')?.textContent.trim() || '';
    count.textContent = `${current + 1} / ${list.length}`;
    if (!reducedMotion) gsap.fromTo(pic, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
  };
  const open = (tile) => {
    list = tiles.filter((t) => !t.hidden);
    lastFocus = document.activeElement;
    box.hidden = false;
    getLenis()?.stop();
    document.body.classList.add('lb-open');
    show(list.indexOf(tile));
    if (!reducedMotion) gsap.fromTo(box, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 });
    box.querySelector('.lb-close').focus();
  };
  const close = () => {
    box.hidden = true;
    getLenis()?.start();
    document.body.classList.remove('lb-open');
    lastFocus?.focus();
  };

  tiles.forEach((t) => t.addEventListener('click', () => open(t)));
  box.querySelector('.lb-close').addEventListener('click', close);
  box.querySelector('.lb-prev').addEventListener('click', () => show(current - 1));
  box.querySelector('.lb-next').addEventListener('click', () => show(current + 1));
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  let startX = null;
  box.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    startX = null;
  });

  root.querySelectorAll('[data-cat]').forEach((chip) => {
    if (!chip.classList.contains('chip')) return;
    chip.addEventListener('click', () => {
      const cat = chip.dataset.cat;
      root.querySelectorAll('.chip[data-cat]').forEach((c) => {
        c.classList.toggle('is-active', c === chip);
        c.setAttribute('aria-selected', String(c === chip));
      });
      const shown = [];
      tiles.forEach((t) => {
        t.hidden = Boolean(cat) && t.dataset.cat !== cat;
        if (!t.hidden) shown.push(t);
      });
      if (!reducedMotion) gsap.fromTo(shown, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.04, ease: 'expo.out' });
      ScrollTrigger.refresh();
    });
  });
}
