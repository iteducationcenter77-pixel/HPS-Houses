// ============================================
// Notices & updates page
// ============================================

import { banner } from '../layout.js';
import { sectionHead } from '../util.js';
import { noticeCard } from './home.js';

export function render(site) {
  const { news, gallery } = site;
  const items = news.items || [];
  const image = (gallery.items || []).find((x) => /award|event/i.test(x.title))?.image || site.hero.image;

  return `
    ${banner({ kicker: 'Stay updated', title: news.heading, text: news.intro, image, crumb: 'Notices' })}
    <section class="blk">
      <div class="wrap narrow">
        ${sectionHead({ kicker: `${items.length} ${items.length === 1 ? 'notice' : 'notices'}`, title: 'Latest from the school office' })}
        ${items.length
          ? `<div class="notice-list notice-list--full" data-stagger>${items.map((n) => noticeCard(n)).join('')}</div>`
          : '<p class="empty">There are no notices at the moment. Please check back soon.</p>'}
      </div>
    </section>`;
}
