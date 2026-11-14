// ============================================
// Houses page: live standings, points share, results, upcoming competitions
// ============================================

import { api } from '../../js/api.js';
import { banner } from '../layout.js';
import { esc, img, icon, sectionHead, imageUrl, initials, formatDate, pad2 } from '../util.js';

// Start loading the live data while the page frame is prepared.
const dataPromise = api('dashboard.get').catch(() => null);

const hex = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : '#e9b949');
const houseByName = (houses, name) => houses.find((h) => h.name === name);

function standings(houses) {
  if (!houses.length) return '<p class="hz-empty hz-empty--dark">The house standings will appear here soon.</p>';
  const max = Math.max(...houses.map((h) => Number(h.total_points) || 0), 0);
  return houses.map((h, i) => {
    const pts = Number(h.total_points) || 0;
    const logo = imageUrl(h.logo_url);
    const share = max ? Math.max(4, Math.round((pts / max) * 100)) : 4;
    const behind = i > 0 && max > pts ? `${(max - pts).toLocaleString('en-IN')} behind the leader` : '';
    return `
      <article class="hz-card${i === 0 && pts > 0 ? ' is-leader' : ''}" style="--hc:${hex(h.color_hex)}">
        <div class="hz-card-top">
          <span class="hz-rank">${pad2(i + 1)}</span>
          ${i === 0 && pts > 0 ? `<span class="hz-lead">${icon('Trophy')}Leading</span>` : ''}
        </div>
        <div class="hz-crest">${logo ? `<img src="${esc(logo)}" alt="">` : `<span>${esc((h.name || '?').charAt(0))}</span>`}</div>
        <h3 class="hz-name">${esc(h.name)}</h3>
        <p class="hz-motto">${esc(h.motto || '')}</p>
        <p class="hz-points"><strong data-count="${pts}">0</strong><span>points</span></p>
        <div class="hz-bar" aria-hidden="true"><span style="width:${share}%"></span></div>
        <p class="hz-behind">${behind || (i === 0 ? (pts > 0 ? 'Top of the table' : 'No points yet') : 'Level with the leader')}</p>
      </article>`;
  }).join('');
}

function distribution(houses) {
  const total = houses.reduce((s, h) => s + (Number(h.total_points) || 0), 0);
  if (!total) {
    return `<div class="hz-share-empty">${icon('Trophy')}<p>No points have been awarded yet. The share of points appears here after the first competition results are entered.</p></div>`;
  }
  const rows = houses.map((h) => ({ h, pts: Number(h.total_points) || 0, pct: ((Number(h.total_points) || 0) / total) * 100 }));
  return `
    <div class="hz-share-bar" role="img" aria-label="${esc(rows.map((r) => `${r.h.name} ${Math.round(r.pct)}%`).join(', '))}">
      ${rows.filter((r) => r.pts).map((r) => `<span style="--hc:${hex(r.h.color_hex)};flex:${r.pts}" data-share>${r.pct >= 9 ? `${Math.round(r.pct)}%` : ''}</span>`).join('')}
    </div>
    <ul class="hz-legend">
      ${rows.map((r) => `
        <li style="--hc:${hex(r.h.color_hex)}">
          <i></i><span class="hz-legend-name">${esc(r.h.name)}</span>
          <strong>${r.pts.toLocaleString('en-IN')}</strong><em>${r.pct.toFixed(1)}%</em>
        </li>`).join('')}
    </ul>
    <p class="hz-total">${total.toLocaleString('en-IN')} points awarded in total</p>`;
}

const MEDALS = ['gold', 'silver', 'bronze'];

function results(list, houses) {
  if (!list.length) {
    return `<div class="hz-empty">${icon('Award')}<p>No competition results yet — they appear here as soon as results are entered.</p></div>`;
  }
  return list.map((c) => `
    <article class="hz-result">
      <header class="hz-result-head">
        <span class="tag">${esc(c.type || 'Competition')}</span>
        ${c.competition_date ? `<time>${icon('Calendar')}${esc(formatDate(c.competition_date))}</time>` : ''}
      </header>
      <h3>${esc(c.name)}</h3>
      <ol class="hz-podium">
        ${(c.winners || []).map((w, i) => {
          const house = houseByName(houses, w.house);
          const color = hex(house?.color_hex);
          return `
            <li class="hz-place hz-place--${MEDALS[i] || 'other'}" style="--hc:${color}">
              <span class="hz-medal">${w.position || i + 1}</span>
              <span class="hz-avatar">${w.photo_url ? img(w.photo_url, w.name) : `<span>${esc(initials(w.name))}</span>`}</span>
              <span class="hz-who">
                <strong>${esc(w.name)}</strong>
                <small><i></i>${esc(w.house || '')}${w.chest_number ? ` · Chest No. ${esc(w.chest_number)}` : ''}</small>
              </span>
              <span class="hz-gain">+${Number(w.points) || 0}</span>
            </li>`;
        }).join('') || '<li class="hz-place-none">Results are being finalised.</li>'}
      </ol>
    </article>`).join('');
}

/** "2026-11-15" → that day at local midnight (new Date("2026-11-15") would be UTC midnight). */
function localDate(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dateStr);
}

function relative(dateStr) {
  const d = localDate(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.round((d - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days <= 30) return `In ${days} days`;
  if (days < 0) return 'In progress';
  return '';
}

function upcoming(list) {
  if (!list.length) {
    return `<div class="hz-empty">${icon('Calendar')}<p>No upcoming competitions are scheduled right now.</p></div>`;
  }
  return list.map((c) => {
    const d = localDate(c.competition_date);
    const valid = !Number.isNaN(d.getTime());
    const when = relative(c.competition_date);
    return `
      <li class="hz-event">
        <div class="hz-date">
          <strong>${valid ? d.getDate() : '—'}</strong>
          <span>${valid ? d.toLocaleDateString('en-IN', { month: 'short' }) : ''}</span>
          <em>${valid ? d.getFullYear() : ''}</em>
        </div>
        <div class="hz-event-body">
          <div class="hz-event-meta">
            <span class="tag">${esc(c.type || 'Competition')}</span>
            ${when ? `<span class="hz-when">${esc(when)}</span>` : ''}
            ${c.status === 'ongoing' ? '<span class="hz-live"><i></i>Ongoing</span>' : ''}
          </div>
          <h3>${esc(c.name)}</h3>
          ${c.description ? `<p>${esc(c.description)}</p>` : ''}
        </div>
      </li>`;
  }).join('');
}

export function render(site) {
  const { houses, gallery } = site;
  const image = site.banners?.houses_image || (gallery.items || []).find((x) => /house/i.test(x.title))?.image || site.hero.image;

  return `
    ${banner({ kicker: 'The house system', title: houses.heading, text: houses.text, image, crumb: 'Houses' })}

    <section class="blk blk--ink hz-board" id="leaderboard">
      <div class="wrap">
        <div class="split-head">
          ${sectionHead({ kicker: 'Live standings', title: 'House leaderboard', text: 'Points update the moment results are entered — who will lift the House Cup this year?', light: true })}
        </div>
        <div class="hz-standings" id="hz-standings" data-stagger>${standings([])}</div>
      </div>
    </section>

    <section class="blk hz-share">
      <div class="wrap hz-share-grid">
        ${sectionHead({ kicker: 'Points distribution', title: 'How the points are spread', text: 'Each house’s share of every point awarded so far this year.' })}
        <div class="hz-share-card" id="hz-share" data-reveal></div>
      </div>
    </section>

    <section class="blk blk--cream" id="results">
      <div class="wrap">
        ${sectionHead({ kicker: 'Results', title: 'Recent competition results', text: 'The top three in each of the latest inter-house competitions.' })}
        <div class="hz-results" id="hz-results" data-stagger></div>
      </div>
    </section>

    <section class="blk" id="upcoming">
      <div class="wrap narrow">
        ${sectionHead({ kicker: 'Coming up', title: 'Upcoming competitions', text: 'Mark your calendars for these events.', align: 'center' })}
        <ol class="hz-events" id="hz-upcoming" data-stagger></ol>
      </div>
    </section>`;
}

export async function mount(root) {
  const data = await Promise.race([dataPromise, new Promise((r) => setTimeout(() => r(null), 6000))]);
  const houses = data?.houses || [];
  root.querySelector('#hz-standings').innerHTML = data ? standings(houses) : '<p class="hz-empty hz-empty--dark">The leaderboard is unavailable right now. Please try again shortly.</p>';
  root.querySelector('#hz-share').innerHTML = distribution(houses);
  root.querySelector('#hz-results').innerHTML = results(data?.results || [], houses);
  root.querySelector('#hz-upcoming').innerHTML = upcoming(data?.upcoming || []);
}
