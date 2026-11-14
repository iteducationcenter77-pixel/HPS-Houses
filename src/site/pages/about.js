// ============================================
// About page: story, leadership messages, faculty & staff
// ============================================

import { banner } from '../layout.js';
import { esc, img, icon, sectionHead, paragraphs, initials } from '../util.js';
import { personCard } from './home.js';

const LEADERSHIP = /director|principal|dean|chair|founder|head/i;
const TEACHING = /teacher|faculty|lecturer|educator/i;

function groupOf(p) {
  if (LEADERSHIP.test(p.role)) return 'leadership';
  if (TEACHING.test(p.role)) return 'teachers';
  return 'staff';
}

export function render(site) {
  const { general: g, hero, about, messages, faculty } = site;
  const [first, ...rest] = about.paragraphs || [];
  const people = faculty.items || [];
  const counts = people.reduce((acc, p) => ({ ...acc, [groupOf(p)]: (acc[groupOf(p)] || 0) + 1 }), {});
  const filters = [
    ['all', 'Everyone', people.length],
    ['leadership', 'Leadership', counts.leadership || 0],
    ['teachers', 'Teachers', counts.teachers || 0],
    ['staff', 'Staff', counts.staff || 0],
  ].filter(([key, , n]) => key === 'all' || n > 0);

  return `
    ${banner({ kicker: `Est. ${g.established}`, title: about.heading, text: about.lead, image: site.banners?.about_image || hero.image, crumb: 'About' })}

    <section class="blk story">
      <div class="wrap story-grid">
        <div class="story-aside">
          <span class="kicker" data-reveal>Our story</span>
          <p class="story-year" data-reveal>${esc(g.established)}</p>
        </div>
        <div class="story-copy">
          ${first ? `<p class="story-lead" data-split>${esc(first)}</p>` : ''}
          <div class="prose prose--cols" data-reveal>${rest.map((p) => paragraphs(p)).join('')}</div>
        </div>
      </div>
      ${about.image ? `<div class="wrap"><figure class="frame frame--wide" data-img-reveal>${img(about.image, `Students at ${g.name}`)}</figure></div>` : ''}
      <div class="wrap">
        <ul class="stat-row" data-stagger>
          ${(about.stats || []).map((s) => `<li><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></li>`).join('')}
        </ul>
      </div>
    </section>

    <section class="blk blk--cream" id="messages">
      <div class="wrap">
        ${sectionHead({ kicker: 'From our leaders', title: messages.heading, align: 'center' })}
        <div class="messages">
          ${(messages.items || []).map((m, i) => `
            <article class="message${i % 2 ? ' message--flip' : ''}">
              <figure class="message-photo" data-img-reveal>${m.photo ? img(m.photo, m.name) : `<span class="monogram">${esc(initials(m.name))}</span>`}</figure>
              <div class="message-copy">
                <span class="kicker" data-reveal>${esc(m.role)}</span>
                ${m.greeting ? `<p class="message-greeting" data-reveal>${esc(m.greeting)}</p>` : ''}
                <blockquote class="message-text" data-split>${esc(m.text)}</blockquote>
                <p class="quote-by" data-reveal><strong>${esc(m.name)}</strong><span>${esc(m.credentials)}</span></p>
              </div>
            </article>`).join('')}
        </div>
      </div>
    </section>

    <section class="blk" id="faculty">
      <div class="wrap">
        <div class="split-head">
          ${sectionHead({ kicker: 'Our people', title: faculty.heading, text: faculty.intro })}
          <div class="chips" role="tablist" aria-label="Filter staff" data-reveal>
            ${filters.map(([key, label, n], i) => `<button class="chip${i ? '' : ' is-active'}" role="tab" aria-selected="${i ? 'false' : 'true'}" data-filter="${key}">${label}<span>${n}</span></button>`).join('')}
          </div>
        </div>
        <div class="people-grid" data-people data-stagger>
          ${people.map((p) => personCard(p).replace('<article class="person"', `<article class="person" data-group="${groupOf(p)}"`)).join('')}
        </div>
      </div>
    </section>`;
}

export function mount(root, { gsap, ScrollTrigger, reducedMotion }) {
  const grid = root.querySelector('[data-people]');
  root.querySelectorAll('[data-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.filter;
      root.querySelectorAll('[data-filter]').forEach((c) => {
        c.classList.toggle('is-active', c === chip);
        c.setAttribute('aria-selected', String(c === chip));
      });
      const shown = [];
      grid.querySelectorAll('.person').forEach((card) => {
        const visible = key === 'all' || card.dataset.group === key;
        card.hidden = !visible;
        if (visible) shown.push(card);
      });
      if (!reducedMotion) gsap.fromTo(shown, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.03, ease: 'expo.out' });
      ScrollTrigger.refresh();
    });
  });
}
