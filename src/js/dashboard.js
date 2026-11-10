// ============================================
// Dashboard — Data Loading & Rendering
// ============================================

import { api } from './api.js';
import { formatDate, relativeDate, getHouseClass, getHouseColor, animateCounter, convertGDriveUrl, escapeHtml } from './utils.js';
import { renderPointsChart } from './charts.js';

/**
 * Load and render the entire dashboard
 */
export async function initDashboard() {
  let houses = [], results = [], upcoming = [];

  try {
    // One request returns the leaderboard, the 5 latest results (top 3 each)
    // and the next 5 competitions
    ({ houses, results, upcoming } = await api('dashboard.get'));
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }

  renderLeaderboard(houses);
  renderPointsChart(houses);
  renderRecentResults(results);
  renderUpcoming(upcoming);
}

/**
 * Render leaderboard cards
 */
function renderLeaderboard(houses) {
  const grid = document.getElementById('leaderboard-grid');
  if (!grid) return;

  if (!houses.length) {
    grid.innerHTML = '<div class="empty-state"><p>The leaderboard is unavailable right now. Please try again shortly.</p></div>';
    return;
  }

  const sorted = [...houses].sort((a, b) => b.total_points - a.total_points);

  grid.innerHTML = sorted.map((house, i) => {
    const rank = i + 1;
    const hClass = getHouseClass(house.name);
    const logoUrl = convertGDriveUrl(house.logo_url);

    return `
      <div class="house-card ${hClass} rank-${rank} animate-fade-in-up delay-${rank}" style="--house-color:${house.color_hex}; --house-bg:${house.color_hex}15; --house-glow:${house.color_hex}66">
        <div class="house-rank">${rank}</div>
        ${logoUrl
          ? `<img class="house-card-logo" src="${logoUrl}" alt="${escapeHtml(house.name)} logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''
        }
        <div class="house-card-logo-placeholder" ${logoUrl ? 'style="display:none"' : ''}>
          ${house.name.charAt(0)}
        </div>
        <h3>${escapeHtml(house.name)}</h3>
        <div class="house-color-tag">${house.motto || 'House ' + house.name}</div>
        <div class="house-points" data-target="${house.total_points}">0</div>
        <div class="house-points-label">Points</div>
      </div>
    `;
  }).join('');

  // Animate counters
  setTimeout(() => {
    grid.querySelectorAll('.house-points').forEach(el => {
      animateCounter(el, parseInt(el.dataset.target) || 0);
    });
  }, 400);
}

/**
 * Render recent competition results
 */
function renderRecentResults(results) {
  const container = document.getElementById('results-grid');
  if (!container) return;

  if (!results.length) {
    container.innerHTML = '<div class="empty-state"><p>No competition results yet</p></div>';
    return;
  }

  container.innerHTML = results.map((comp, i) => `
    <div class="result-card animate-fade-in-up delay-${i + 1}">
      <div class="result-card-header">
        <h4>${escapeHtml(comp.name)}</h4>
        <span class="badge badge-${(comp.type || 'other').toLowerCase()}">${escapeHtml(comp.type)}</span>
      </div>
      <div class="result-card-body">
        <div style="font-size:var(--font-xs);color:var(--text-dark-secondary);margin-bottom:var(--space-md)">
          📅 ${formatDate(comp.competition_date)}
        </div>
        ${(comp.winners || []).map(w => {
          const photoUrl = convertGDriveUrl(w.photo_url);
          return `
            <div class="result-winner">
              <div class="position position-${w.position}">${w.position}</div>
              ${photoUrl
                ? `<img class="avatar" src="${photoUrl}" alt="${escapeHtml(w.name)}" onerror="this.outerHTML='<div class=\\'avatar\\' style=\\'background:${getHouseColor(w.house)}15;color:${getHouseColor(w.house)};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px\\'>${w.name.charAt(0)}</div>'">`
                : `<div class="avatar" style="background:${getHouseColor(w.house)}15;color:${getHouseColor(w.house)};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">${w.name.charAt(0)}</div>`
              }
              <div class="winner-info">
                <h5>${escapeHtml(w.name)}</h5>
                <p><span class="house-dot" style="background:${getHouseColor(w.house)}"></span>${escapeHtml(w.house)}</p>
              </div>
              <div class="winner-points">+${w.points} pts</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

/**
 * Render upcoming competitions timeline
 */
function renderUpcoming(events) {
  const container = document.getElementById('upcoming-timeline');
  if (!container) return;

  if (!events.length) {
    container.innerHTML = '<div class="empty-state"><p>No upcoming competitions scheduled</p></div>';
    return;
  }

  container.innerHTML = `
    <div class="timeline">
      ${events.map((evt, i) => `
        <div class="timeline-item animate-fade-in-up delay-${i + 1}">
          <div class="timeline-dot"></div>
          <div class="timeline-date">${(() => {
              const rel = relativeDate(evt.competition_date);
              const full = formatDate(evt.competition_date);
              return rel === full ? full : `${rel} · ${full}`;
            })()}</div>
          <div class="timeline-content">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
              <h4>${escapeHtml(evt.name)}</h4>
              <span class="badge badge-${(evt.type || 'other').toLowerCase()}">${escapeHtml(evt.type)}</span>
            </div>
            ${evt.description ? `<p>${escapeHtml(evt.description)}</p>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
