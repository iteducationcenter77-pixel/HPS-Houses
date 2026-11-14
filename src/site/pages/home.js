// ============================================
// Home page
// ============================================

import { api } from '../../js/api.js';
import { esc, img, icon, iconFor, sectionHead, paragraphs, safeUrl, waHref, initials, formatDate, pad2, socialLinks, brandIcon } from '../util.js';

// Start loading the live house points while the rest of the page is prepared.
const housesPromise = api('houses.list').catch(() => []);

const FALLBACK_HOUSES = [
  { name: 'Orion', color_hex: '#f0c244', motto: 'Shine Bright Like the Stars', total_points: 0 },
  { name: 'Titans', color_hex: '#2ecc71', motto: 'Strength in Unity', total_points: 0 },
  { name: 'Phoenix', color_hex: '#e74c3c', motto: 'Rise from the Ashes', total_points: 0 },
  { name: 'Spartans', color_hex: '#3498db', motto: 'Courage and Honor', total_points: 0 },
];

function houseColumns(houses) {
  const sorted = [...houses].sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
  const leader = sorted[0]?.total_points > 0 ? sorted[0].name : null;
  return sorted.map((h, i) => `
    <a class="house-col" href="/houses" style="--hc:${esc(/^#[0-9a-f]{6}$/i.test(h.color_hex) ? h.color_hex : '#e9b949')}">
      <span class="house-col-rank">${pad2(i + 1)}</span>
      <span class="house-col-glow"></span>
      <span class="house-col-body">
        ${h.name === leader ? `<span class="house-col-lead">${icon('Trophy')} Leading</span>` : ''}
        <span class="house-col-name">${esc(h.name)}</span>
        <span class="house-col-motto">${esc(h.motto || '')}</span>
        <span class="house-col-points"><strong data-count="${Number(h.total_points) || 0}">0</strong> pts</span>
      </span>
    </a>`).join('');
}

export function render(site) {
  const { general: g, hero, highlights, about, messages, facilities, houses, gallery, faculty, news } = site;
  const prospectus = safeUrl(g.prospectus_url);
  const md = messages.items?.[0];
  const campus = (gallery.items || []).filter((x) => x.image).slice(0, 7);
  const people = (faculty.items || []).filter((p) => p.photo).slice(0, 8);
  const latest = (news.items || []).slice(0, 3);
  const facts = (about.stats || []).slice(1, 4);

  return `
    <section class="mast" data-banner>
      <div class="mast-media" data-parallax-media>${img(hero.image, '', { eager: true })}</div>
      <div class="mast-shade"></div>
      <div class="mast-grain"></div>
      <div class="wrap mast-inner">
        <span class="kicker kicker--gold" data-intro>${esc(hero.eyebrow)}</span>
        <h1 class="display display--mast" data-intro-split>${esc(hero.title)}</h1>
        <p class="mast-text" data-intro>${esc(hero.text)}</p>
        <div class="mast-actions" data-intro>
          <a class="ui-btn ui-btn--gold" href="/admissions" data-magnetic><span>Apply for admission</span>${icon('ArrowUpRight')}</a>
          <a class="ui-btn ui-btn--ghost-light" href="${waHref(g.whatsapp, 'I have a query about admission')}" target="_blank" rel="noopener"><span>WhatsApp us</span>${brandIcon.whatsapp}</a>
          ${prospectus ? `<a class="ui-btn ui-btn--text-light" href="${esc(prospectus)}" target="_blank" rel="noopener"><span>View prospectus</span>${icon('Download')}</a>` : ''}
        </div>
      </div>
      <div class="wrap mast-foot" data-intro>
        <ul class="mast-facts">
          ${facts.map((f) => `<li><strong>${esc(f.value)}</strong><span>${esc(f.label)}</span></li>`).join('')}
        </ul>
        <a href="#welcome" class="scroll-cue" aria-label="Scroll down"><span>Scroll</span><i></i></a>
      </div>
      <div class="mast-social" data-intro aria-label="Follow us">
        <span class="mast-social-label">Follow us</span>
        <span class="mast-social-line"></span>
        ${socialLinks(g, { cls: 'mast-social-link' })}
      </div>
    </section>

    <section class="blk blk--tight highlights-blk" aria-label="Why HPS">
      <div class="wrap">
        <div class="highlights" data-stagger>
          ${(highlights.items || []).map((h, i) => `
            <article class="highlight">
              <span class="highlight-num">${pad2(i + 1)}</span>
              <span class="icon-badge">${icon(iconFor(h.title))}</span>
              <h3>${esc(h.title)}</h3>
              <p>${esc(h.text)}</p>
            </article>`).join('')}
        </div>
      </div>
    </section>

    <section class="blk welcome" id="welcome">
      <div class="wrap welcome-grid">
        <div class="welcome-copy">
          ${sectionHead({ kicker: `Welcome to ${g.short_name || 'HPS'}`, title: about.lead })}
          <div class="prose" data-reveal>${(about.paragraphs || []).slice(0, 2).map((p) => paragraphs(p)).join('')}</div>
          <a class="link-arrow" href="/about" data-reveal><span>Discover our story</span>${icon('ArrowRight')}</a>
        </div>
        <div class="welcome-media">
          <figure class="frame frame--tall" data-img-reveal>${img(about.image || hero.image, `Students at ${g.name}`)}</figure>
          <div class="est-badge" data-reveal>
            <svg viewBox="0 0 200 200" aria-hidden="true"><defs><path id="estCircle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs>
              <text><textPath href="#estCircle">${esc(g.name)} • ${esc(hero.eyebrow)} • </textPath></text></svg>
            <span><small>Est.</small>${esc(g.established)}</span>
          </div>
        </div>
      </div>
      <div class="wrap">
        <ul class="stat-row" data-stagger>
          ${(about.stats || []).map((s) => `<li><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></li>`).join('')}
        </ul>
      </div>
    </section>

    ${md ? `
    <section class="blk blk--navy quote-blk">
      <div class="wrap quote-grid">
        <figure class="quote-photo" data-img-reveal>${md.photo ? img(md.photo, md.name) : `<span class="monogram">${esc(initials(md.name))}</span>`}</figure>
        <div class="quote-copy">
          <span class="kicker kicker--gold" data-reveal>${esc(md.role)}</span>
          <span class="quote-mark" data-reveal>${icon('Quote')}</span>
          <blockquote class="quote" data-split>${esc(md.text)}</blockquote>
          <p class="quote-by" data-reveal><strong>${esc(md.name)}</strong><span>${esc(md.credentials)}</span></p>
          <a class="link-arrow link-arrow--light" href="/about#messages" data-reveal><span>Read all leadership messages</span>${icon('ArrowRight')}</a>
        </div>
      </div>
    </section>` : ''}

    <section class="blk">
      <div class="wrap">
        <div class="split-head">
          ${sectionHead({ kicker: 'Facilities', title: facilities.heading, text: facilities.intro })}
          <a class="link-arrow" href="/academics#facilities" data-reveal><span>All facilities</span>${icon('ArrowRight')}</a>
        </div>
        <div class="feature-grid" data-stagger>
          ${(facilities.items || []).slice(0, 6).map((f, i) => `
            <article class="feature">
              <span class="feature-num">${pad2(i + 1)}</span>
              <span class="icon-badge icon-badge--soft">${icon(iconFor(f.title))}</span>
              <h3>${esc(f.title)}</h3>
              <p>${esc(f.text)}</p>
            </article>`).join('')}
        </div>
      </div>
    </section>

    <section class="blk blk--ink houses-teaser">
      <div class="wrap">
        <div class="split-head">
          ${sectionHead({ kicker: 'The house system', title: houses.heading, text: houses.text, light: true })}
          <a class="ui-btn ui-btn--gold" href="/houses" data-reveal data-magnetic><span>Live leaderboard</span>${icon('Trophy')}</a>
        </div>
        <div class="house-cols" id="home-houses" data-stagger>${houseColumns(FALLBACK_HOUSES)}</div>
      </div>
    </section>

    ${campus.length ? `
    <section class="h-scroll" id="campus" aria-label="${esc(gallery.heading)}">
      <div class="h-track" data-h-track>
        <div class="h-lead">
          ${sectionHead({ kicker: 'Campus life', title: gallery.heading, text: gallery.intro })}
          <a class="link-arrow" href="/gallery" data-reveal><span>Explore the gallery</span>${icon('ArrowRight')}</a>
        </div>
        ${campus.map((c, i) => `
          <figure class="h-card${i % 2 ? ' h-card--low' : ''}">
            <div class="h-img">${img(c.image, c.title || 'Campus photo').replace('<img', '<img data-h-img')}</div>
            ${c.title ? `<figcaption><span>${esc(c.category)}</span><strong>${esc(c.title)}</strong>${c.text ? `<em>${esc(c.text)}</em>` : ''}</figcaption>` : ''}
          </figure>`).join('')}
        <a class="h-more" href="/gallery"><span>View all photos</span>${icon('ArrowUpRight')}</a>
      </div>
    </section>` : ''}

    ${people.length ? `
    <section class="blk">
      <div class="wrap">
        <div class="split-head">
          ${sectionHead({ kicker: 'Our pride', title: faculty.heading, text: faculty.intro })}
          <a class="link-arrow" href="/about#faculty" data-reveal><span>Meet everyone</span>${icon('ArrowRight')}</a>
        </div>
        <div class="people-grid people-grid--home" data-stagger>
          ${people.map((p) => personCard(p)).join('')}
        </div>
      </div>
    </section>` : ''}

    ${latest.length ? `
    <section class="blk blk--cream">
      <div class="wrap">
        <div class="split-head">
          ${sectionHead({ kicker: 'News & notices', title: news.heading, text: news.intro })}
          <a class="link-arrow" href="/news" data-reveal><span>All notices</span>${icon('ArrowRight')}</a>
        </div>
        <div class="notice-list" data-stagger>${latest.map((n) => noticeCard(n)).join('')}</div>
      </div>
    </section>` : ''}
  `;
}

export function personCard(p) {
  return `
    <article class="person">
      <div class="person-photo">
        ${p.photo ? img(p.photo, p.name) : `<span class="monogram">${esc(initials(p.name))}</span>`}
      </div>
      <div class="person-info">
        <h3>${esc(p.name)}</h3>
        ${p.role ? `<span class="person-role">${esc(p.role)}</span>` : ''}
        ${p.qualification ? `<span class="person-meta">${esc(p.qualification)}</span>` : ''}
        ${p.experience ? `<span class="person-meta">${esc(p.experience)}</span>` : ''}
      </div>
    </article>`;
}

export function noticeCard(n) {
  return `
    <article class="notice-card">
      <div class="notice-card-top">
        ${n.category ? `<span class="tag">${esc(n.category)}</span>` : ''}
        ${n.date ? `<time>${icon('Calendar')}${esc(formatDate(n.date))}</time>` : ''}
      </div>
      <h3>${esc(n.title)}</h3>
      ${n.text ? `<div class="notice-card-text">${paragraphs(n.text)}</div>` : ''}
    </article>`;
}

export async function mount(root, { initHorizontal }) {
  const houses = await Promise.race([housesPromise, new Promise((r) => setTimeout(() => r(null), 2500))]);
  if (Array.isArray(houses) && houses.length) {
    root.querySelector('#home-houses').innerHTML = houseColumns(houses);
  }
  initHorizontal(root.querySelector('#campus'));
}
