// ============================================
// Dashboard — Data Loading & Rendering
// ============================================

import { supabase, isConfigured } from './supabase.js';
import { formatDate, relativeDate, getHouseClass, getHouseColor, animateCounter, convertGDriveUrl, escapeHtml } from './utils.js';
import { renderPointsChart } from './charts.js';

// Demo data for when Supabase isn't configured
const DEMO_HOUSES = [
  { id: '1', name: 'Orion', color_hex: '#f0c244', motto: 'Shine Bright Like the Stars', total_points: 1250, logo_url: '' },
  { id: '2', name: 'Titans', color_hex: '#2ecc71', motto: 'Strength in Unity', total_points: 1180, logo_url: '' },
  { id: '3', name: 'Phoenix', color_hex: '#e74c3c', motto: 'Rise from the Ashes', total_points: 1320, logo_url: '' },
  { id: '4', name: 'Spartans', color_hex: '#3498db', motto: 'Courage and Honor', total_points: 1100, logo_url: '' }
];

const DEMO_RESULTS = [
  { id: '1', name: 'Inter-House Cricket', type: 'Sports', competition_date: '2026-06-05', status: 'completed',
    winners: [
      { name: 'Rahul Sharma', house: 'Phoenix', position: 1, points: 50, photo_url: '' },
      { name: 'Amit Patel', house: 'Orion', position: 2, points: 30, photo_url: '' },
      { name: 'Vikram Singh', house: 'Spartans', position: 3, points: 20, photo_url: '' }
    ]
  },
  { id: '2', name: 'Science Quiz', type: 'Academic', competition_date: '2026-06-03', status: 'completed',
    winners: [
      { name: 'Priya Devi', house: 'Titans', position: 1, points: 40, photo_url: '' },
      { name: 'Sneha Gupta', house: 'Phoenix', position: 2, points: 25, photo_url: '' },
      { name: 'Arjun Nair', house: 'Orion', position: 3, points: 15, photo_url: '' }
    ]
  },
  { id: '3', name: 'Dance Competition', type: 'Cultural', competition_date: '2026-06-01', status: 'completed',
    winners: [
      { name: 'Meera Krishnan', house: 'Orion', position: 1, points: 45, photo_url: '' },
      { name: 'Ritu Baruah', house: 'Spartans', position: 2, points: 30, photo_url: '' },
      { name: 'Kavita Rao', house: 'Titans', position: 3, points: 20, photo_url: '' }
    ]
  }
];

const DEMO_UPCOMING = [
  { id: '1', name: 'Inter-House Football', type: 'Sports', competition_date: '2026-06-15', description: 'Annual football tournament between all four houses' },
  { id: '2', name: 'Mathematics Olympiad', type: 'Academic', competition_date: '2026-06-20', description: 'Test your mathematical skills and problem-solving abilities' },
  { id: '3', name: 'Art Exhibition', type: 'Cultural', competition_date: '2026-06-25', description: 'Showcase your artistic talents through paintings and crafts' },
  { id: '4', name: 'Debate Championship', type: 'Academic', competition_date: '2026-07-01', description: 'Inter-house debate on contemporary topics' }
];

/**
 * Load and render the entire dashboard
 */
export async function initDashboard() {
  let houses, results, upcoming;

  if (isConfigured()) {
    houses = await fetchHouses();
    results = await fetchRecentResults();
    upcoming = await fetchUpcoming();
  } else {
    houses = DEMO_HOUSES;
    results = DEMO_RESULTS;
    upcoming = DEMO_UPCOMING;
  }

  renderLeaderboard(houses);
  renderPointsChart(houses);
  renderRecentResults(results);
  renderUpcoming(upcoming);
}

/**
 * Fetch houses sorted by points
 */
async function fetchHouses() {
  const { data, error } = await supabase
    .from('houses')
    .select('*')
    .order('total_points', { ascending: false });
  if (error) { console.error('Error fetching houses:', error); return DEMO_HOUSES; }
  return data || DEMO_HOUSES;
}

/**
 * Fetch recent completed competitions with winners
 */
async function fetchRecentResults() {
  const { data: competitions, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('status', 'completed')
    .order('competition_date', { ascending: false })
    .limit(5);

  if (error || !competitions?.length) return DEMO_RESULTS;

  const results = [];
  for (const comp of competitions) {
    const { data: participants } = await supabase
      .from('participation')
      .select('*, students(name, photo_url), houses(name)')
      .eq('competition_id', comp.id)
      .order('position', { ascending: true })
      .limit(3);

    results.push({
      ...comp,
      winners: (participants || []).map(p => ({
        name: p.students?.name || 'Unknown',
        house: p.houses?.name || '',
        position: p.position,
        points: p.points_earned,
        photo_url: p.students?.photo_url || ''
      }))
    });
  }
  return results;
}

/**
 * Fetch upcoming competitions
 */
async function fetchUpcoming() {
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .in('status', ['upcoming', 'ongoing'])
    .order('competition_date', { ascending: true })
    .limit(5);
  if (error || !data?.length) return DEMO_UPCOMING;
  return data;
}

/**
 * Render leaderboard cards
 */
function renderLeaderboard(houses) {
  const grid = document.getElementById('leaderboard-grid');
  if (!grid) return;

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
