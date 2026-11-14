// ============================================
// Academics page: curriculum, programmes, facilities, assessment, calendar
// ============================================

import { banner } from '../layout.js';
import { esc, icon, iconFor, sectionHead, pad2 } from '../util.js';

export function render(site) {
  const { academics: a, facilities: f, gallery } = site;
  const bannerImage = site.banners?.academics_image || (gallery.items || []).find((x) => /classroom|lab/i.test(x.title))?.image || site.hero.image;

  return `
    ${banner({ kicker: 'NEP 2020 · CBSE', title: a.heading, text: a.intro, image: bannerImage, crumb: 'Academics' })}

    <section class="blk">
      <div class="wrap">
        ${sectionHead({ kicker: 'Curriculum & syllabus', title: 'Learning that grows with your child', text: a.intro })}
        <div class="curriculum" data-stagger>
          ${(a.groups || []).map((grp, i) => `
            <article class="curriculum-card${i % 2 ? ' curriculum-card--navy' : ''}">
              <span class="curriculum-num">${pad2(i + 1)}</span>
              <h3>${esc(grp.title)}</h3>
              <ul class="checks">
                ${(grp.points || []).map((p) => `<li>${icon('CircleCheck')}<span>${esc(p)}</span></li>`).join('')}
              </ul>
            </article>`).join('')}
        </div>
      </div>
    </section>

    <section class="blk blk--navy">
      <div class="wrap">
        ${sectionHead({ kicker: 'Educational programmes', title: 'Beyond the textbook', text: a.programs_intro, light: true })}
        <div class="programs">
          ${(a.programs || []).map((p, i) => `
            <article class="program" data-reveal>
              <span class="program-num">${pad2(i + 1)}</span>
              <h3>${esc(p.title)}</h3>
              <p>${esc(p.text)}</p>
              <span class="program-icon">${icon(iconFor(p.title))}</span>
            </article>`).join('')}
        </div>
      </div>
    </section>

    <section class="blk" id="facilities">
      <div class="wrap">
        ${sectionHead({ kicker: 'Our facilities', title: f.heading, text: f.intro })}
        <div class="feature-grid" data-stagger>
          ${(f.items || []).map((x, i) => `
            <article class="feature">
              <span class="feature-num">${pad2(i + 1)}</span>
              <span class="icon-badge icon-badge--soft">${icon(iconFor(x.title))}</span>
              <h3>${esc(x.title)}</h3>
              <p>${esc(x.text)}</p>
            </article>`).join('')}
        </div>
        ${(f.infrastructure || []).length ? `
          <div class="infra" data-reveal>
            <span class="infra-label">Infrastructure</span>
            <ul>${f.infrastructure.map((x) => `<li>${icon(iconFor(x))}${esc(x)}</li>`).join('')}</ul>
          </div>` : ''}
      </div>
    </section>

    <section class="blk blk--cream">
      <div class="wrap">
        ${sectionHead({ kicker: 'Assessment & evaluation', title: 'How we measure progress', text: a.assessment_intro, align: 'center' })}
        <div class="assess" data-stagger>
          ${(a.assessment || []).map((x, i) => `
            <article class="assess-card">
              <span class="assess-step">Step ${i + 1}</span>
              <span class="icon-badge">${icon(iconFor(x.title))}</span>
              <h3>${esc(x.title)}</h3>
              <p>${esc(x.text)}</p>
            </article>`).join('')}
        </div>
      </div>
    </section>

    ${(a.calendar || []).length ? `
    <section class="blk" id="calendar">
      <div class="wrap">
        ${sectionHead({ kicker: 'Academic calendar', title: 'Key dates of the year' })}
        <ol class="calendar">
          <span class="calendar-line"><span data-draw></span></span>
          ${a.calendar.map((c) => `
            <li class="calendar-item" data-reveal>
              <span class="calendar-dot"></span>
              <time>${esc(c.date)}</time>
              <strong>${esc(c.title)}</strong>
            </li>`).join('')}
        </ol>
      </div>
    </section>` : ''}`;
}
