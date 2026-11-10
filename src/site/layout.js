// ============================================
// Site frame: preloader, header, notice ticker, menu, footer
// ============================================

import { esc, safeUrl, imageUrl, icon, brandIcon, telHref, waHref } from './util.js';

export const NAV = [
  { href: '/', label: 'Home', page: 'index' },
  { href: '/about', label: 'About', page: 'about' },
  { href: '/academics', label: 'Academics', page: 'academics' },
  { href: '/houses', label: 'Houses', page: 'houses' },
  { href: '/gallery', label: 'Gallery', page: 'gallery' },
  { href: '/news', label: 'Notices', page: 'news' },
  { href: '/contact', label: 'Contact', page: 'contact' },
];

function crest(g, cls = '') {
  const src = imageUrl(g.crest_url) || '/hps-logo.png';
  return `<span class="crest ${cls}"><img src="${esc(src)}" alt="" width="64" height="64"></span>`;
}

export function brand(g, { light = true } = {}) {
  return `
    <a href="/" class="brand${light ? ' brand--light' : ''}" aria-label="${esc(g.name)} — home">
      ${crest(g)}
      <span class="brand-text">
        <span class="brand-name">${esc(g.name)}</span>
        <span class="brand-sub">Est. ${esc(g.established)} · CBSE Curriculum</span>
      </span>
    </a>`;
}

/** Covers the screen while the first page loads (first visit) or between pages. */
export function overlays(site, { firstVisit }) {
  const g = site.general;
  const letters = [...String(g.name || '')].map((ch) => `<span class="pl-ch">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
  return `
    <div class="preloader${firstVisit ? '' : ' is-skipped'}" aria-hidden="true">
      <div class="pl-inner">
        ${crest(g, 'pl-crest')}
        <div class="pl-name">${letters}</div>
        <div class="pl-tag">${esc(g.tagline || '')}</div>
        <div class="pl-bar"><span></span></div>
      </div>
    </div>
    <div class="curtain${firstVisit ? '' : ' is-covering'}" aria-hidden="true">
      <div class="curtain-panel"></div>
      ${crest(g, 'curtain-crest')}
    </div>`;
}

export function header(site, page) {
  const g = site.general;
  const notice = site.notice || {};
  const showNotice = notice.enabled !== 'no' && notice.text;
  const ticker = showNotice
    ? Array.from({ length: 6 }, () => `<span class="tick-item">${icon('Megaphone')}${esc(notice.text)}</span>`).join('')
    : '';

  return `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-head${showNotice ? ' has-notice' : ''}" data-page="${page}">
      ${showNotice ? `
        <a class="notice" href="/admissions" aria-label="Notice: ${esc(notice.text)}">
          <span class="notice-label">Notice</span>
          <span class="notice-track"><span class="notice-run">${ticker}</span><span class="notice-run" aria-hidden="true">${ticker}</span></span>
        </a>` : ''}
      <div class="nav-bar">
        <div class="wrap nav-inner">
          ${brand(g)}
          <nav class="nav-links" aria-label="Main">
            ${NAV.map((n) => `<a href="${n.href}" class="nav-link${n.page === page ? ' is-active' : ''}"${n.page === page ? ' aria-current="page"' : ''}><span>${n.label}</span></a>`).join('')}
          </nav>
          <div class="nav-actions">
            <a class="nav-phone" href="${telHref(g.phone)}">${icon('Phone')}<span>${esc(g.phone)}</span></a>
            <a class="ui-btn ui-btn--gold ui-btn--sm" href="/admissions" data-magnetic><span>Apply now</span>${icon('ArrowUpRight')}</a>
            <button class="menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="menu">
              <span></span><span></span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="menu" id="menu" aria-hidden="true">
      <div class="menu-bg"></div>
      <div class="wrap menu-inner">
        <nav class="menu-links" aria-label="Menu">
          ${[...NAV, { href: '/admissions', label: 'Admissions', page: 'admissions' }].map((n, i) => `
            <a href="${n.href}" class="menu-link${n.page === page ? ' is-active' : ''}">
              <span class="menu-num">${String(i + 1).padStart(2, '0')}</span><span class="menu-word">${n.label}</span>
            </a>`).join('')}
        </nav>
        <div class="menu-foot">
          <a href="${telHref(g.phone)}">${icon('Phone')}${esc(g.phone)}</a>
          <a href="mailto:${esc(g.email)}">${icon('Mail')}${esc(g.email)}</a>
          <a href="${waHref(g.whatsapp, 'I have a query about admission')}" target="_blank" rel="noopener">${icon('MessageCircle')}WhatsApp us</a>
        </div>
      </div>
    </div>`;
}

export function footer(site) {
  const g = site.general;
  const fb = safeUrl(g.facebook_url);
  const ig = safeUrl(g.instagram_url);
  const year = new Date().getFullYear();
  const marquee = `${esc(g.name)} <i>✦</i> ${esc(g.tagline)} <i>✦</i> `;

  return `
    <footer class="site-foot">
      <div class="foot-cta">
        <div class="foot-marquee" aria-hidden="true"><div class="foot-marquee-run">${marquee.repeat(4)}</div></div>
        <div class="wrap foot-cta-inner">
          <div>
            <span class="kicker kicker--gold" data-reveal>Admissions</span>
            <h2 class="display display--xl" data-split>Give your child a head start.</h2>
          </div>
          <div class="foot-cta-actions" data-reveal>
            <a class="ui-btn ui-btn--gold" href="/admissions" data-magnetic><span>Apply for admission</span>${icon('ArrowUpRight')}</a>
            <a class="ui-btn ui-btn--ghost-light" href="${waHref(g.whatsapp, 'I have a query about admission')}" target="_blank" rel="noopener"><span>WhatsApp us</span>${icon('MessageCircle')}</a>
          </div>
        </div>
      </div>

      <div class="wrap foot-grid">
        <div class="foot-brand">
          ${brand(g)}
          <p>${esc(g.footer_about)}</p>
          <div class="socials">
            ${fb ? `<a href="${esc(fb)}" target="_blank" rel="noopener" aria-label="Facebook">${brandIcon.facebook}</a>` : ''}
            ${ig ? `<a href="${esc(ig)}" target="_blank" rel="noopener" aria-label="Instagram">${brandIcon.instagram}</a>` : ''}
            <a href="${waHref(g.whatsapp)}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon('MessageCircle')}</a>
          </div>
        </div>
        <div>
          <h3 class="foot-title">Explore</h3>
          <ul class="foot-links">
            ${[...NAV.slice(1), { href: '/admissions', label: 'Admissions' }].map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join('')}
          </ul>
        </div>
        <div>
          <h3 class="foot-title">Visit us</h3>
          <ul class="foot-contact">
            <li>${icon('MapPin')}<span>${esc(g.address_line1)}<br>${esc(g.address_line2)}</span></li>
            <li>${icon('Phone')}<span><a href="${telHref(g.phone)}">${esc(g.phone)}</a>${g.phone2 ? `<br><a href="${telHref(g.phone2)}">${esc(g.phone2)}</a>` : ''}</span></li>
            <li>${icon('Mail')}<span><a href="mailto:${esc(g.email)}">${esc(g.email)}</a>${g.email2 ? `<br><a href="mailto:${esc(g.email2)}">${esc(g.email2)}</a>` : ''}</span></li>
          </ul>
        </div>
        <div>
          <h3 class="foot-title">Office hours</h3>
          <p class="foot-hours"><strong>${esc(g.office_days)}</strong><br>${esc(g.office_hours)}</p>
        </div>
      </div>

      <div class="wrap foot-bottom">
        <span>© ${year} ${esc(g.name)}. All rights reserved.</span>
        <a href="/admin.html" class="foot-admin">Staff login</a>
      </div>
    </footer>`;
}

/** Shared top banner for inner pages. */
export function banner({ kicker, title, text, image, crumb }) {
  const src = imageUrl(image);
  return `
    <section class="banner" data-banner>
      <div class="banner-media" data-parallax-media>${src ? `<img src="${esc(src)}" alt="" fetchpriority="high">` : ''}</div>
      <div class="banner-shade"></div>
      <div class="wrap banner-inner">
        <nav class="crumbs" aria-label="Breadcrumb" data-intro><a href="/">Home</a><span>/</span><span>${esc(crumb || title)}</span></nav>
        ${kicker ? `<span class="kicker kicker--gold" data-intro>${esc(kicker)}</span>` : ''}
        <h1 class="display display--hero" data-intro-split>${esc(title)}</h1>
        ${text ? `<p class="banner-text" data-intro>${esc(text)}</p>` : ''}
      </div>
    </section>`;
}
