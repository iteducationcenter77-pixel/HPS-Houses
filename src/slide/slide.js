// ============================================
// Corridor notice screen — hpsassam.org/slide
// A full-screen, self-running slideshow of the school website's live content. Everything it shows
// (which slides, order, timing, countdowns, transition style) is set in Admin → Slideshow, and the
// screen picks up changes by itself, so nobody needs to touch the TV.
// ============================================

import gsap from 'gsap';
import { api } from '../js/api.js';
import { esc, imageUrl, initials, formatDate } from '../site/util.js';
import { SITE_DEFAULTS } from '../../shared/site-defaults.js';
import { normalizeSlideshow, DEFAULT_COUNTDOWN_LABEL, SLIDE_TYPES } from '../../shared/slideshow.js';
import { CATEGORIES, GENERAL_CATEGORY, GENERAL_LABEL } from '../../shared/categories.js';
import './slide.css';

const W = 1920;
const H = 1080;
const SETTINGS_EVERY = 30_000; // look for new admin settings
const DATA_EVERY = 120_000; // refresh school data
const JUMP_BEFORE = 15_000; // a countdown takes over the screen this long before it ends
const FINAL_SECONDS = 10; // big 10…1 at the end of a countdown
const params = new URLSearchParams(location.search);
const ONLY = params.get('slide'); // /slide?slide=leaderboard shows just that one

const state = {
  site: SITE_DEFAULTS,
  dash: null,
  settings: normalizeSlideshow(),
  version: undefined,
  sequence: [],
  index: -1,
  el: null, // the slide on screen
  advance: null, // timer to the next slide
  advanceAt: 0, // when the current slide moves on
  advanceLeft: 0, // time left when paused
  paused: false,
  busy: false, // a transition or reveal is running
  holding: null, // key of the countdown slide holding the screen
  deadlines: new Map(), // slide key → { at, minutes }
  shownPoints: new Map(), // house id → points last shown on the leaderboard
  shownRanks: new Map(),
  transitionNo: 0,
  finalShown: -1,
};
if (params.has('debug')) Object.assign(window, { __sx: state, __gsap: gsap }); // /slide?debug — lets the state be inspected

// ── Helpers ──

const hex = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#e9b949');
const pad2 = (n) => String(n).padStart(2, '0');
const typeOf = (key) => SLIDE_TYPES.find((t) => t.key === key);
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const ordinal = (n) => {
  const v = n % 100;
  return n + (['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th');
};
const localDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
};
const daysUntil = (s) => Math.round((localDate(s) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
const houses = () => [...(state.dash?.houses || [])].sort((a, b) => (b.total_points || 0) - (a.total_points || 0) || a.name.localeCompare(b.name));
const houseByName = (name) => (state.dash?.houses || []).find((h) => h.name === name);
const crest = (h, cls = '') => {
  const logo = imageUrl(h?.logo_url);
  return `<span class="sx-crest ${cls}" style="--hc:${hex(h?.color_hex)}">${logo ? `<img src="${esc(logo)}" alt="">` : `<b>${esc((h?.name || '?').charAt(0))}</b>`}</span>`;
};
const head = (kicker, title, extra = '') => `
  <header class="sx-head">
    <div>
      <p class="sx-kicker" data-in><i></i>${esc(kicker)}</p>
      <h2 class="sx-title" data-in>${esc(title)}</h2>
    </div>
    ${extra}
  </header>`;

/** The ring + time shown on a slide that has a countdown. */
function countdownWidget(slide) {
  if (!slide?.countdown) return '';
  return `
    <div class="sx-cd" data-cd="${slide.key}" data-in>
      <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="sx-cd-track" cx="60" cy="60" r="52"/><circle class="sx-cd-ring" cx="60" cy="60" r="52"/></svg>
      <div class="sx-cd-text"><span>${esc(slide.countdown_label || DEFAULT_COUNTDOWN_LABEL)}</span><strong>--:--</strong></div>
    </div>`;
}

// ── Pictures ──
// Photos are downloaded ahead of time and kept in memory, so a slide never opens on an empty frame —
// even when the screen's internet is slow. A photo that fails to load is tried again later.

const pictures = new Map(); // url → { img, ok, failed, at, promise }
const RETRY_AFTER = 15_000;
const isReady = (url) => !!pictures.get(url)?.ok;
const heroUrl = () => imageUrl(state.site.hero?.image) || '/images/site/hero-building.jpg';
const galleryUrls = () => (state.site.gallery?.items || []).map((x) => imageUrl(x.image)).filter(Boolean);

function fetchPicture(url, high = false) {
  if (!url) return Promise.resolve();
  const have = pictures.get(url);
  if (have && (have.ok || !have.failed || Date.now() - have.at < RETRY_AFTER)) return have.promise;
  const p = { img: new Image(), ok: false, failed: false, at: Date.now() };
  p.promise = new Promise((resolve) => {
    p.img.decoding = 'async';
    if (high) p.img.fetchPriority = 'high';
    p.img.onload = () => Promise.resolve(p.img.decode?.()).catch(() => {}).then(() => { p.ok = true; paintPictures(); resolve(); });
    p.img.onerror = () => { p.failed = true; p.at = Date.now(); resolve(); };
  });
  pictures.set(url, p);
  p.img.src = url;
  return p.promise;
}

function preloadPictures() {
  fetchPicture(heroUrl(), true);
  galleryUrls().forEach((u) => fetchPicture(u));
}

/** Shows photos on screen that have finished loading, and asks again for any that have not. */
function paintPictures() {
  document.querySelectorAll('[data-pic]:not(.is-ready)').forEach((el) => {
    if (isReady(el.dataset.pic)) el.classList.add('is-ready');
    else fetchPicture(el.dataset.pic);
  });
}

const picture = (url, cls) =>
  `<div class="${cls} sx-pic${isReady(url) ? ' is-ready' : ''}" data-pic="${esc(url)}" style="background-image:url('${esc(url)}')"></div>`;

const shuffle = (list) => [...list].sort(() => Math.random() - 0.5);

// ── Slides ──

const RENDER = {
  welcome() {
    const g = state.site.general || {};
    const hero = state.site.hero || {};
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `
      ${picture(heroUrl(), 'sx-bg sx-kenburns')}
      <div class="sx-shade sx-shade--left"></div>
      <div class="sx-welcome">
        <p class="sx-kicker" data-in><i></i>${esc(greet)} · Welcome to</p>
        <h1 data-in>${esc(g.name || 'Howly Public School')}</h1>
        <p class="sx-welcome-tag" data-in>${esc(hero.title || g.tagline || '')}</p>
        <p class="sx-welcome-text" data-in>${esc(hero.text || '')}</p>
        <ul class="sx-facts" data-in>
          <li><strong>Nursery – X</strong><span>Classes offered</span></li>
          <li><strong>CBSE</strong><span>Curriculum</span></li>
          <li><strong>Est. ${esc(g.established || '2024')}</strong><span>${esc((g.address_line1 || 'Howly').split(',').pop().trim())}</span></li>
        </ul>
      </div>`;
  },

  notices() {
    const items = (state.site.news?.items || []).filter((n) => n.title).slice(0, 4);
    return `
      ${head('From the school office', 'Notices')}
      <div class="sx-notices sx-notices--${Math.max(1, items.length)}">
        ${items.length ? items.map((n, i) => `
          <article class="sx-notice" data-in>
            <span class="sx-notice-no">${pad2(i + 1)}</span>
            <div>
              ${n.category ? `<span class="sx-tag">${esc(n.category)}</span>` : ''}
              <h3>${esc(n.title)}</h3>
              ${n.text ? `<p>${esc(n.text)}</p>` : ''}
              ${n.date ? `<time>${esc(formatDate(n.date))}</time>` : ''}
            </div>
          </article>`).join('') : '<p class="sx-empty" data-in>No notices right now.</p>'}
      </div>`;
  },

  leaderboard(slide) {
    const list = houses();
    const max = Math.max(1, ...list.map((h) => h.total_points || 0));
    const adj = state.dash?.adjustments || [];
    return `
      ${head('Live standings', 'House leaderboard', countdownWidget(slide))}
      <div class="sx-board">
        ${list.map((h, i) => {
          const pts = h.total_points || 0;
          const own = adj.filter((a) => a.house_id === h.id);
          const bonus = own.filter((a) => a.points > 0).reduce((t, a) => t + a.points, 0);
          const penalty = own.filter((a) => a.points < 0).reduce((t, a) => t - a.points, 0);
          const behind = i === 0 ? (pts ? 'Top of the table' : 'No points yet') : list[0].total_points > pts ? `${fmt(list[0].total_points - pts)} behind the leader` : 'Level with the leader';
          return `
            <article class="sx-house${i === 0 && pts ? ' is-leader' : ''}" data-house="${esc(h.id)}" style="--hc:${hex(h.color_hex)}" data-in>
              <span class="sx-house-rank">${pad2(i + 1)}</span>
              ${i === 0 && pts ? '<span class="sx-lead">★ Leading</span>' : ''}
              ${crest(h)}
              <h3>${esc(h.name)}</h3>
              <p class="sx-motto">${esc(h.motto || '')}</p>
              <p class="sx-pts"><strong data-count="${pts}" data-from="${state.shownPoints.get(h.id) ?? 0}">0</strong><span>points</span></p>
              <div class="sx-bar"><span data-bar="${Math.max(3, Math.round((pts / max) * 100))}"></span></div>
              <p class="sx-behind">${esc(behind)}</p>
              <p class="sx-adj">${bonus ? `<span class="is-bonus">+${bonus} bonus</span>` : ''}${penalty ? `<span class="is-penalty">−${penalty} penalty</span>` : ''}</p>
            </article>`;
        }).join('')}
      </div>`;
  },

  results() {
    const comp = state.dash?.results?.[0];
    if (!comp) return `${head('Results', 'Latest results')}<p class="sx-empty" data-in>Results will appear here after the first competition.</p>`;
    const byCat = new Map();
    for (const w of comp.winners || []) {
      const key = w.category || '';
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key).push(w);
    }
    const anyClass = CATEGORIES.some((c) => byCat.has(c.name));
    const cols = [...CATEGORIES.map((c) => c.name), GENERAL_CATEGORY, 'Open', '']
      .filter((n) => byCat.has(n) || (anyClass && CATEGORIES.some((c) => c.name === n)));
    const label = (n) => CATEGORIES.find((c) => c.name === n)?.classes || (n === GENERAL_CATEGORY ? GENERAL_LABEL : 'All classes');
    const medal = ['gold', 'silver', 'bronze'];
    const person = (w) => {
      const h = houseByName(w.house);
      const pos = Number(w.position) || 1;
      const avatar = w.house_entry ? crest(h, 'sx-crest--sm')
        : `<span class="sx-avatar" style="--hc:${hex(h?.color_hex)}">${w.photo_url ? `<img src="${esc(imageUrl(w.photo_url))}" alt="">` : esc(initials(w.name))}</span>`;
      return `
        <li class="sx-win sx-win--${medal[pos - 1] || 'other'}" style="--hc:${hex(h?.color_hex)}">
          <span class="sx-medal">${pos}</span>
          ${avatar}
          <span class="sx-who"><strong>${esc(w.house_entry ? `${w.house} House` : w.name)}</strong>
            <small><i></i>${esc(w.house_entry ? 'Whole house · team entry' : `${w.house}${w.chest_number ? ` · Chest No. ${w.chest_number}` : ''}`)}</small></span>
          <span class="sx-gain">+${Number(w.points) || 0}</span>
        </li>`;
    };
    const d = localDate(comp.competition_date);
    return `
      ${head(`${comp.type || 'Competition'} · ${Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`, comp.name)}
      <div class="sx-cats sx-cats--${cols.length || 1}">
        ${(cols.length ? cols : ['']).map((n) => `
          <section class="sx-cat${n === GENERAL_CATEGORY ? ' sx-cat--general' : ''}" data-in>
            <p class="sx-cat-head"><strong>${esc(n || 'Winners')}</strong><span>${esc(n ? label(n) : '')}</span></p>
            ${byCat.has(n) ? `<ol>${byCat.get(n).map(person).join('')}</ol>` : '<p class="sx-cat-none">No entries</p>'}
          </section>`).join('')}
      </div>`;
  },

  houses() {
    const list = houses();
    const s = state.site.houses || {};
    return `
      <div class="sx-houses-intro">
        <p class="sx-kicker" data-in><i></i>The house system</p>
        <h2 class="sx-title" data-in>${esc(s.heading || 'Four Houses. One Spirit.')}</h2>
      </div>
      <div class="sx-pillars">
        ${list.map((h, i) => `
          <article class="sx-pillar${i === 0 && h.total_points ? ' is-leader' : ''}" style="--hc:${hex(h.color_hex)}" data-in>
            <span class="sx-pillar-no">${pad2(i + 1)}</span>
            ${crest(h, 'sx-crest--lg')}
            ${i === 0 && h.total_points ? '<span class="sx-lead">★ Leading</span>' : ''}
            <h3>${esc(h.name)}</h3>
            <p>${esc(h.motto || '')}</p>
            <p class="sx-pillar-pts"><strong data-count="${h.total_points || 0}">0</strong> pts</p>
          </article>`).join('')}
      </div>`;
  },

  distribution() {
    const list = houses();
    const total = list.reduce((t, h) => t + (h.total_points || 0), 0);
    return `
      ${head('Points distribution', 'How the points are spread')}
      ${total ? `
        <div class="sx-share" data-in>
          ${list.filter((h) => h.total_points > 0).map((h) => `<span style="--hc:${hex(h.color_hex)};flex:${h.total_points}" data-grow>${Math.round((h.total_points / total) * 100)}%</span>`).join('')}
        </div>
        <ul class="sx-legend">
          ${list.map((h) => `
            <li style="--hc:${hex(h.color_hex)}" data-in>
              ${crest(h, 'sx-crest--sm')}
              <span class="sx-legend-name">${esc(h.name)}</span>
              <strong data-count="${h.total_points || 0}">0</strong>
              <em>${total ? (((h.total_points || 0) / total) * 100).toFixed(1) : '0.0'}%</em>
            </li>`).join('')}
        </ul>
        <p class="sx-total" data-in><strong data-count="${total}">0</strong> points awarded in total</p>`
    : '<p class="sx-empty" data-in>No points have been awarded yet.</p>'}`;
  },

  conduct() {
    const list = state.dash?.adjustments || [];
    const hs = houses();
    return `
      ${head('Bonus & penalty', 'Points for conduct')}
      <div class="sx-conduct">
        <ul class="sx-conduct-totals">
          ${hs.map((h) => {
            const own = list.filter((a) => a.house_id === h.id);
            const bonus = own.filter((a) => a.points > 0).reduce((t, a) => t + a.points, 0);
            const penalty = own.filter((a) => a.points < 0).reduce((t, a) => t - a.points, 0);
            const net = bonus - penalty;
            return `
              <li style="--hc:${hex(h.color_hex)}" data-in>
                ${crest(h, 'sx-crest--sm')}
                <span class="sx-ct-name">${esc(h.name)}</span>
                <span class="is-bonus">${bonus ? `+${bonus}` : '0'}</span>
                <span class="is-penalty">${penalty ? `−${penalty}` : '0'}</span>
                <strong class="${net > 0 ? 'is-bonus' : net < 0 ? 'is-penalty' : ''}">${net === 0 ? '0' : `${net > 0 ? '+' : '−'}${Math.abs(net)}`}</strong>
              </li>`;
          }).join('')}
        </ul>
        <ol class="sx-conduct-list">
          ${list.slice(0, 5).map((a) => {
            const h = houseByName(a.house);
            const bonus = a.points > 0;
            return `
              <li class="${bonus ? 'is-bonus' : 'is-penalty'}" style="--hc:${hex(h?.color_hex)}" data-in>
                <span class="sx-ct-pts">${bonus ? '+' : '−'}${Math.abs(a.points)}</span>
                <span class="sx-ct-what"><strong>${esc(a.reason)}</strong><small><i></i>${esc(a.house)} · ${bonus ? 'Bonus' : 'Penalty'}</small></span>
                <time>${esc(formatDate(a.date))}</time>
              </li>`;
          }).join('') || '<li class="sx-empty" data-in>No bonus or penalty points yet.</li>'}
        </ol>
      </div>`;
  },

  upcoming() {
    const list = (state.dash?.upcoming || []).slice(0, 4);
    return `
      ${head('Coming up', 'Upcoming competitions')}
      <div class="sx-events">
        ${list.length ? list.map((c) => {
          const d = localDate(c.competition_date);
          const days = daysUntil(c.competition_date);
          const when = c.status === 'ongoing' ? 'Happening now' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days > 1 ? `In ${days} days` : '';
          return `
            <article class="sx-event" data-in>
              <div class="sx-event-date"><strong>${d.getDate() || '—'}</strong><span>${esc(d.toLocaleDateString('en-IN', { month: 'short' }))}</span></div>
              <div class="sx-event-body">
                <p><span class="sx-tag">${esc(c.type || 'Competition')}</span>${when ? `<span class="sx-when${c.status === 'ongoing' ? ' is-live' : ''}">${esc(when)}</span>` : ''}</p>
                <h3>${esc(c.name)}</h3>
                ${c.description ? `<p class="sx-event-text">${esc(c.description)}</p>` : ''}
              </div>
            </article>`;
        }).join('') : '<p class="sx-empty" data-in>No upcoming competitions are scheduled.</p>'}
      </div>`;
  },

  gallery() {
    const items = (state.site.gallery?.items || []).filter((x) => x.image);
    // Photos already downloaded come first, so the mosaic opens full.
    const pick = [...shuffle(items.filter((x) => isReady(imageUrl(x.image)))), ...shuffle(items.filter((x) => !isReady(imageUrl(x.image))))].slice(0, 4);
    const g = state.site.gallery || {};
    return `
      <div class="sx-mosaic">
        ${pick.map((x, i) => `
          <figure class="sx-tile sx-tile--${i + 1}" data-in>
            ${picture(imageUrl(x.image), 'sx-kenburns')}
            ${x.title ? `<figcaption>${esc(x.title)}</figcaption>` : ''}
          </figure>`).join('')}
      </div>
      <div class="sx-gallery-label" data-in>
        <p class="sx-kicker"><i></i>Campus life</p>
        <h2 class="sx-title">${esc(g.heading || 'Life at HPS')}</h2>
      </div>`;
  },
};

/** Slides with nothing to show step aside (unless nothing else is on). */
function hasContent(key) {
  const d = state.dash;
  switch (key) {
    case 'notices': return (state.site.news?.items || []).some((n) => n.title);
    case 'results': return Boolean(d?.results?.length);
    case 'upcoming': return Boolean(d?.upcoming?.length);
    case 'conduct': return Boolean(d?.adjustments?.length);
    case 'gallery': return (state.site.gallery?.items || []).some((x) => x.image);
    case 'leaderboard': case 'houses': case 'distribution': return Boolean(d?.houses?.length);
    default: return true;
  }
}

// ── Frame ──

const root = document.getElementById('screen');
root.innerHTML = `
  <div class="sx-stage" id="stage">
    <div class="sx-ambient" aria-hidden="true"><i></i><i></i><i></i></div>
    <header class="sx-top">
      <div class="sx-brand">
        <img id="sx-crest" src="/hps-logo.png" alt="">
        <div><strong id="sx-name">Howly Public School</strong><span id="sx-tagline">A School For Your Genius</span></div>
      </div>
      <div class="sx-on-air"><i></i><span id="sx-current">Live</span></div>
      <div class="sx-top-right">
        <div class="sx-mini-cd" id="sx-mini-cd" hidden><span></span><strong></strong></div>
        <div class="sx-clock" id="sx-clock"><strong id="sx-time"></strong><span id="sx-date"></span></div>
      </div>
    </header>
    <main class="sx-slides" id="sx-slides"></main>
    <footer class="sx-foot">
      <div class="sx-progress" id="sx-progress"></div>
      <div class="sx-ticker" id="sx-ticker">
        <span class="sx-ticker-label">Notice</span>
        <div class="sx-ticker-track"><div class="sx-ticker-run" id="sx-ticker-run"></div></div>
      </div>
    </footer>
    <div class="sx-curtain" id="sx-curtain" aria-hidden="true"><span></span></div>
    <div class="sx-final" id="sx-final" hidden><p></p><strong></strong></div>
    <div class="sx-updated" id="sx-updated" hidden><span>✦</span><strong>Points updated</strong><em></em></div>
  </div>
  <div class="sx-hint" id="sx-hint">Click anywhere or press <b>F</b> for full screen · <b>→</b> next · <b>Space</b> pause</div>`;

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const slidesEl = $('sx-slides');

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
addEventListener('resize', fit);
fit();

function applyChrome() {
  const g = state.site.general || {};
  $('sx-name').textContent = g.name || 'Howly Public School';
  $('sx-tagline').textContent = g.tagline || '';
  const logo = imageUrl(g.crest_url);
  if (logo) $('sx-crest').src = logo;
  $('sx-clock').hidden = !state.settings.show_clock;
  // Ticker: the website notice plus the notice titles.
  const texts = [];
  const n = state.site.notice || {};
  if (n.enabled !== 'no' && n.text) texts.push(n.text);
  for (const item of state.site.news?.items || []) if (item.title && !texts.includes(item.title)) texts.push(item.title);
  const showTicker = state.settings.show_ticker && texts.length;
  $('sx-ticker').hidden = !showTicker;
  stage.classList.toggle('no-ticker', !showTicker);
  if (showTicker) {
    const run = texts.map((t) => `<span>${esc(t)}</span>`).join('<i>✦</i>');
    $('sx-ticker-run').innerHTML = `<div>${run}<i>✦</i></div><div aria-hidden="true">${run}<i>✦</i></div>`;
    const width = $('sx-ticker-run').firstElementChild.scrollWidth || 1200;
    $('sx-ticker-run').style.setProperty('--dur', `${Math.max(20, width / 90)}s`);
  }
}

function tickClock() {
  const now = new Date();
  $('sx-time').textContent = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  $('sx-date').textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── Data and settings ──

async function loadData() {
  const [site, dash] = await Promise.allSettled([api('site.get'), api('dashboard.get')]);
  if (site.status === 'fulfilled') state.site = site.value;
  if (dash.status === 'fulfilled') state.dash = dash.value;
  stage.classList.toggle('is-offline', dash.status !== 'fulfilled');
  applyChrome();
  preloadPictures();
}

async function loadSettings() {
  try {
    const s = await api('slideshow.get');
    if (s.updated_at === state.version) return false;
    state.version = s.updated_at;
    state.settings = normalizeSlideshow(s);
    return true;
  } catch {
    return false;
  }
}

function buildSequence() {
  const on = state.settings.slides.filter((s) => s.enabled && (!ONLY || s.key === ONLY));
  const withContent = on.filter((s) => hasContent(s.key));
  state.sequence = withContent.length ? withContent : on.length ? on : [{ key: 'welcome', seconds: 12, countdown: 0 }];
  // Keep running countdowns; start new ones; forget removed ones.
  const keep = new Map();
  for (const s of state.sequence) {
    if (!s.countdown) continue;
    const old = state.deadlines.get(s.key);
    keep.set(s.key, old && old.minutes === s.countdown ? old : { at: Date.now() + s.countdown * 60_000, minutes: s.countdown });
  }
  state.deadlines = keep;
  drawProgress();
}

// ── Progress bars ──

function drawProgress() {
  $('sx-progress').innerHTML = state.sequence.length > 1
    ? state.sequence.map((s, i) => `<span class="${i < state.index ? 'is-done' : ''}"><i></i><b>${esc(typeOf(s.key)?.name || '')}</b></span>`).join('')
    : '';
}

// Slide timing runs on the browser's own timers and CSS — not GSAP, whose clock goes to sleep
// when nothing is animating, which would stop the slideshow on a still slide.
function runProgress(seconds) {
  const bars = [...$('sx-progress').children];
  bars.forEach((b, i) => {
    b.classList.toggle('is-done', i < state.index);
    b.classList.toggle('is-on', i === state.index);
    const fill = b.firstElementChild;
    fill.style.animation = 'none';
    if (i === state.index && seconds) {
      void fill.offsetWidth; // restart the CSS animation
      fill.style.animation = `sx-fill ${seconds}s linear forwards`;
      fill.style.animationPlayState = state.paused ? 'paused' : 'running';
    }
  });
}

function clearAdvance() {
  clearTimeout(state.advance);
  state.advance = null;
}

// ── Showing slides ──

function makeSlide(slide) {
  const el = document.createElement('section');
  el.className = `sx-slide sx-slide--${slide.key}`;
  el.dataset.key = slide.key;
  el.innerHTML = RENDER[slide.key](slide);
  return el;
}

function countUp(el, { delay = 0.4, duration = 1.8 } = {}) {
  el.querySelectorAll('[data-count]').forEach((n) => {
    const to = Number(n.dataset.count) || 0;
    const from = Number(n.dataset.from ?? 0) || 0;
    const obj = { v: from };
    n.textContent = fmt(from);
    gsap.to(obj, { v: to, duration, delay, ease: 'power3.out', onUpdate: () => { n.textContent = fmt(Math.round(obj.v)); } });
  });
  el.querySelectorAll('[data-bar]').forEach((b) => gsap.fromTo(b, { width: '0%' }, { width: `${b.dataset.bar}%`, duration: 1.6, delay: delay + 0.2, ease: 'expo.out' }));
  el.querySelectorAll('[data-grow]').forEach((b, i) => gsap.from(b, { flexGrow: 0.001, duration: 1.4, delay: delay + 0.1 * i, ease: 'expo.out' }));
}

function enter(el, delay = 0.35) {
  gsap.fromTo(el.querySelectorAll('[data-in]'), { y: 46, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.09, delay, ease: 'power3.out' });
  countUp(el, { delay: delay + 0.3 });
  if (el.dataset.key === 'leaderboard') rememberBoard();
}

function rememberBoard() {
  houses().forEach((h, i) => { state.shownPoints.set(h.id, h.total_points || 0); state.shownRanks.set(h.id, i); });
}

/** Wait for an animation, but never longer than it should take (it pauses while the tab is hidden). */
const settle = (anim) => Promise.race([anim.then(), new Promise((r) => setTimeout(r, (anim.totalDuration() + 0.3) * 1000))]);

const STYLES = ['fade', 'slide', 'zoom', 'curtain'];

function transition(from, to) {
  let style = state.settings.transition;
  if (style === 'mixed') style = STYLES[state.transitionNo++ % STYLES.length];
  const tl = gsap.timeline();
  if (!from) {
    tl.fromTo(to, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 });
    return { tl, delay: 0.2 };
  }
  if (style === 'slide') {
    tl.fromTo(from, { xPercent: 0 }, { xPercent: -30, autoAlpha: 0, duration: 1.2, ease: 'expo.inOut' }, 0)
      .fromTo(to, { xPercent: 100, autoAlpha: 1 }, { xPercent: 0, duration: 1.2, ease: 'expo.inOut' }, 0);
    return { tl, delay: 0.7 };
  }
  if (style === 'zoom') {
    tl.to(from, { scale: 1.18, autoAlpha: 0, duration: 0.9, ease: 'power2.in' }, 0)
      .fromTo(to, { scale: 0.86, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.1, ease: 'expo.out' }, 0.6);
    return { tl, delay: 0.8 };
  }
  if (style === 'curtain') {
    const c = $('sx-curtain');
    tl.set(c, { display: 'block', xPercent: -100 })
      .to(c, { xPercent: 0, duration: 0.7, ease: 'expo.in' })
      .set(from, { autoAlpha: 0 })
      .set(to, { autoAlpha: 1 })
      .to(c, { xPercent: 100, duration: 0.8, ease: 'expo.out' })
      .set(c, { display: 'none' });
    return { tl, delay: 0.75 };
  }
  tl.to(from, { autoAlpha: 0, duration: 0.9, ease: 'power2.inOut' }, 0)
    .fromTo(to, { autoAlpha: 0, scale: 1.035 }, { autoAlpha: 1, scale: 1, duration: 1.2, ease: 'power3.out' }, 0.3);
  return { tl, delay: 0.5 };
}

function schedule(seconds) {
  clearAdvance();
  if (state.sequence.length < 2 || state.holding) { runProgress(0); return; }
  runProgress(seconds);
  state.advanceLeft = seconds * 1000;
  state.advanceAt = Date.now() + state.advanceLeft;
  if (!state.paused) state.advance = setTimeout(next, state.advanceLeft);
}

function show(index) {
  if (!state.sequence.length) return;
  state.index = ((index % state.sequence.length) + state.sequence.length) % state.sequence.length;
  const slide = state.sequence[state.index];
  const from = state.el;
  const to = makeSlide(slide);
  slidesEl.appendChild(to);
  state.el = to;
  paintPictures();
  $('sx-current').textContent = typeOf(slide.key)?.name || '';
  state.busy = true;
  const { tl, delay } = transition(from, to);
  // Finish on the animation, or on a plain timer if the tab is hidden and animations are paused.
  let done = false;
  const finish = () => { if (done) return; done = true; from?.remove(); if (from) gsap.set(to, { clearProps: 'transform,opacity,visibility' }); gsap.set(to, { autoAlpha: 1 }); state.busy = false; };
  tl.eventCallback('onComplete', finish);
  setTimeout(finish, (tl.duration() + 0.3) * 1000);
  enter(to, delay);
  schedule(slide.seconds);
  updateCountdowns();
}

const next = () => show(state.index + 1);
const prev = () => show(state.index - 1);

// ── Countdowns ──

const clockText = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return s >= 3600 ? `${Math.floor(s / 3600)}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}` : `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
};

function updateCountdowns() {
  const now = Date.now();
  let soonest = null;
  for (const [key, d] of state.deadlines) {
    const left = d.at - now;
    const w = state.el?.querySelector(`[data-cd="${key}"]`);
    if (w) {
      w.querySelector('strong').textContent = clockText(left);
      const ring = w.querySelector('.sx-cd-ring');
      const frac = Math.max(0, Math.min(1, left / (d.minutes * 60_000)));
      ring.style.strokeDashoffset = String(326.7 * (1 - frac));
      w.classList.toggle('is-final', left <= FINAL_SECONDS * 1000);
    }
    if (!soonest || left < soonest.left) soonest = { key, left };
  }
  // Small countdown in the top bar when the counting slide is not on screen.
  const mini = $('sx-mini-cd');
  const cur = state.sequence[state.index]?.key;
  if (soonest && soonest.key !== cur) {
    const s = state.sequence.find((x) => x.key === soonest.key);
    mini.hidden = false;
    mini.firstElementChild.textContent = s?.countdown_label || DEFAULT_COUNTDOWN_LABEL;
    mini.lastElementChild.textContent = clockText(soonest.left);
  } else mini.hidden = true;
  return soonest;
}

async function countdownTick() {
  const soonest = updateCountdowns();
  if (!soonest || state.busy) return;
  const { key, left } = soonest;
  const idx = state.sequence.findIndex((s) => s.key === key);
  if (idx < 0) return;

  // Take over the screen shortly before the end so everyone sees it happen.
  if (left <= JUMP_BEFORE && !state.holding) {
    state.holding = key;
    if (state.sequence[state.index]?.key !== key) show(idx);
    else schedule(0);
    return;
  }

  // Big 10 … 1 in the middle of the screen.
  const final = $('sx-final');
  const sec = Math.ceil(left / 1000);
  if (state.holding === key && sec <= FINAL_SECONDS && sec > 0 && sec !== state.finalShown) {
    state.finalShown = sec;
    const s = state.sequence[idx];
    if (final.hidden) {
      final.hidden = false;
      final.firstElementChild.textContent = s.countdown_label || DEFAULT_COUNTDOWN_LABEL;
      gsap.fromTo(final, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 });
    }
    const n = final.lastElementChild;
    n.textContent = sec;
    gsap.fromTo(n, { scale: 1.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.55, ease: 'back.out(2)' });
  }

  if (left <= 0) {
    state.busy = true;
    state.finalShown = -1;
    await settle(gsap.to(final, { autoAlpha: 0, duration: 0.4 }));
    final.hidden = true;
    await loadData();
    const s = state.sequence[idx];
    state.deadlines.set(key, { at: Date.now() + s.countdown * 60_000, minutes: s.countdown });
    await reveal(key);
    state.holding = null;
    state.busy = false;
    schedule(Math.max(12, s.seconds)); // stay a while so the new standings can be read
  }
}

/** The moment a countdown ends: show the fresh data with a celebration. */
async function reveal(key) {
  const banner = $('sx-updated');
  const old = state.el;
  const slide = state.sequence.find((s) => s.key === key);
  const changed = [];

  if (key === 'leaderboard' && old) {
    // FLIP: remember where each house card was, render the new order, then glide them into place.
    const before = new Map([...old.querySelectorAll('[data-house]')].map((c) => [c.dataset.house, c.getBoundingClientRect()]));
    const fresh = makeSlide(slide);
    slidesEl.replaceChild(fresh, old);
    state.el = fresh;
    const scale = stage.getBoundingClientRect().width / W;
    houses().forEach((h, i) => {
      const card = fresh.querySelector(`[data-house="${CSS.escape(h.id)}"]`);
      if (!card) return;
      const was = before.get(h.id);
      const now = card.getBoundingClientRect();
      if (was) gsap.from(card, { x: (was.left - now.left) / scale, y: (was.top - now.top) / scale, duration: 1.4, ease: 'power3.inOut', delay: 0.3 });
      const gained = (h.total_points || 0) - (state.shownPoints.get(h.id) ?? 0);
      const oldRank = state.shownRanks.get(h.id);
      if (gained) {
        changed.push(h.name);
        const pop = document.createElement('span');
        pop.className = `sx-pop ${gained > 0 ? 'is-up' : 'is-down'}`;
        pop.textContent = `${gained > 0 ? '+' : '−'}${Math.abs(gained)}`;
        card.appendChild(pop);
        gsap.fromTo(pop, { y: 30, autoAlpha: 0, scale: 0.6 }, { y: -10, autoAlpha: 1, scale: 1, duration: 0.8, delay: 1.2, ease: 'back.out(2)' });
        gsap.to(card, { boxShadow: `0 0 0 3px ${hex(h.color_hex)}, 0 0 90px -10px ${hex(h.color_hex)}`, duration: 0.6, delay: 1.2, yoyo: true, repeat: 3 });
      }
      if (oldRank !== undefined && oldRank !== i) {
        const move = document.createElement('span');
        move.className = `sx-move ${oldRank > i ? 'is-up' : 'is-down'}`;
        move.textContent = `${oldRank > i ? '▲' : '▼'} ${Math.abs(oldRank - i)}`;
        card.appendChild(move);
        gsap.from(move, { autoAlpha: 0, scale: 0.4, duration: 0.6, delay: 1.8, ease: 'back.out(2)' });
      }
    });
    gsap.set(fresh.querySelectorAll('[data-in]'), { autoAlpha: 1 });
    countUp(fresh, { delay: 1.1, duration: 2.6 });
    rememberBoard();
  } else if (old) {
    const fresh = makeSlide(slide);
    slidesEl.replaceChild(fresh, old);
    state.el = fresh;
    enter(fresh, 0.2);
  }

  // A gold sweep and a "Points updated" banner.
  banner.hidden = false;
  banner.querySelector('strong').textContent = key === 'leaderboard' ? 'Points updated' : 'Updated';
  banner.querySelector('em').textContent = key === 'leaderboard'
    ? (changed.length ? `New points for ${changed.join(', ')}` : 'No change since the last update')
    : new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  await settle(gsap.timeline()
    .fromTo(banner, { autoAlpha: 0, y: -40, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.8)' })
    .to(banner, { autoAlpha: 0, y: -20, duration: 0.6, delay: 3.6 }));
  banner.hidden = true;
}

// ── Keyboard, full screen, idle cursor, screen wake ──

function togglePause() {
  state.paused = !state.paused;
  stage.classList.toggle('is-paused', state.paused);
  const fill = $('sx-progress').children[state.index]?.firstElementChild;
  if (fill) fill.style.animationPlayState = state.paused ? 'paused' : 'running';
  if (state.paused) {
    if (state.advance) { state.advanceLeft = Math.max(0, state.advanceAt - Date.now()); clearAdvance(); }
  } else if (!state.advance && state.advanceLeft && state.sequence.length > 1 && !state.holding) {
    state.advanceAt = Date.now() + state.advanceLeft;
    state.advance = setTimeout(next, state.advanceLeft);
  }
}

addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { state.holding = null; next(); }
  else if (e.key === 'ArrowLeft') { state.holding = null; prev(); }
  else if (e.key === ' ') { e.preventDefault(); togglePause(); }
  else if (e.key === 'f' || e.key === 'F') fullscreen();
});
function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
addEventListener('click', fullscreen);

let idle;
addEventListener('mousemove', () => {
  document.body.classList.remove('is-idle');
  clearTimeout(idle);
  idle = setTimeout(() => document.body.classList.add('is-idle'), 3000);
});
setTimeout(() => $('sx-hint').classList.add('is-gone'), 9000);

async function keepAwake() {
  try { await navigator.wakeLock?.request('screen'); } catch { /* not supported or not allowed */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });

// ── Start ──

(async () => {
  tickClock();
  setInterval(tickClock, 1000);
  await Promise.all([loadData(), loadSettings()]);
  buildSequence();
  // Give the first photos a moment to arrive so the screen does not open on an empty frame.
  await Promise.race([Promise.all([fetchPicture(heroUrl(), true), ...galleryUrls().slice(0, 4).map((u) => fetchPicture(u))]), new Promise((r) => setTimeout(r, 5000))]);
  show(0);
  setInterval(() => { preloadPictures(); paintPictures(); }, RETRY_AFTER);
  keepAwake();
  setInterval(countdownTick, 250);

  // Rebuild the running order, staying on the current slide when it is still in it.
  const resequence = () => {
    const key = state.sequence[state.index]?.key;
    buildSequence();
    const at = state.sequence.findIndex((s) => s.key === key);
    if (at < 0) { state.holding = null; show(0); } else { state.index = at; drawProgress(); schedule(state.sequence[at].seconds); }
  };
  const order = () => state.sequence.map((s) => s.key).join();

  setInterval(async () => {
    if (state.busy || state.holding) return;
    if (await loadSettings()) { applyChrome(); resequence(); }
  }, SETTINGS_EVERY);

  setInterval(async () => {
    if (state.busy || state.holding) return;
    await loadData();
    // Slides with nothing to show come and go as content appears or disappears.
    const was = order();
    const on = state.settings.slides.filter((s) => s.enabled && (!ONLY || s.key === ONLY));
    const nowOrder = (on.filter((s) => hasContent(s.key)).length ? on.filter((s) => hasContent(s.key)) : on).map((s) => s.key).join();
    if (nowOrder && nowOrder !== was) { resequence(); return; }
    if (state.sequence.length === 1 && !state.deadlines.size) {
      // A single slide stays on screen: refresh it in place.
      const fresh = makeSlide(state.sequence[0]);
      slidesEl.replaceChild(fresh, state.el);
      state.el = fresh;
      gsap.set(fresh.querySelectorAll('[data-in]'), { autoAlpha: 1 });
      countUp(fresh, { delay: 0, duration: 1.2 });
      if (fresh.dataset.key === 'leaderboard') rememberBoard();
    }
  }, DATA_EVERY);
})();
