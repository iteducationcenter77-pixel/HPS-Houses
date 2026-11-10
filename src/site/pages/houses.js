// ============================================
// Houses page: the live house-points system, now part of the school site
// ============================================

import '../../css/variables.css';
import '../../css/animations.css';
import '../../css/components.css';
import '../../css/dashboard.css';
import { banner } from '../layout.js';
import { sectionHead } from '../util.js';
import { initDashboard } from '../../js/dashboard.js';

export function render(site) {
  const { houses, gallery } = site;
  const image = (gallery.items || []).find((x) => /house/i.test(x.title))?.image || site.hero.image;

  return `
    ${banner({ kicker: 'The house system', title: houses.heading, text: houses.text, image, crumb: 'Houses' })}

    <section class="blk blk--ink houses-board" id="leaderboard">
      <div class="wrap">
        ${sectionHead({ kicker: 'Live standings', title: 'House leaderboard', text: 'Points update the moment results are entered — who will lift the House Cup this year?', light: true })}
        <div class="leaderboard-grid" id="leaderboard-grid"><div class="spinner"></div></div>
      </div>
    </section>

    <section class="blk blk--navy">
      <div class="wrap points-split">
        <div>
          ${sectionHead({ kicker: 'Points distribution', title: 'How the points are spread', light: true })}
          <div id="chart-legend" class="chart-legend"></div>
        </div>
        <div class="chart-container"><canvas id="points-chart" width="320" height="320" aria-label="Points by house"></canvas></div>
      </div>
    </section>

    <section class="blk" id="results">
      <div class="wrap">
        ${sectionHead({ kicker: 'Results', title: 'Recent competition results', text: 'Latest outcomes from inter-house competitions.' })}
        <div class="results-grid" id="results-grid"><div class="spinner"></div></div>
      </div>
    </section>

    <section class="blk blk--cream" id="upcoming">
      <div class="wrap upcoming-wrap">
        ${sectionHead({ kicker: 'Coming up', title: 'Upcoming competitions', text: 'Mark your calendars for these events.' })}
        <div id="upcoming-timeline"><div class="spinner"></div></div>
      </div>
    </section>`;
}

export async function mount() {
  await initDashboard();
}
