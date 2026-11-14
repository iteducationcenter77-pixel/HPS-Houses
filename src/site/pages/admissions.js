// ============================================
// Admissions page: process, documents, enquiry form
// ============================================

import { banner } from '../layout.js';
import { esc, icon, brandIcon, sectionHead, safeUrl, telHref, waHref, pad2 } from '../util.js';
import { enquiryForm, bindEnquiryForms } from '../forms.js';

export function render(site) {
  const { general: g, admissions: ad, notice, gallery } = site;
  const prospectus = safeUrl(g.prospectus_url);
  const image = (gallery.items || [])[0]?.image ? (gallery.items[7]?.image || gallery.items[0].image) : site.hero.image;
  const open = notice.enabled !== 'no' && notice.text;

  return `
    ${banner({ kicker: open ? notice.text : 'Admissions', title: ad.heading, text: ad.intro, image, crumb: 'Admissions' })}

    <section class="blk">
      <div class="wrap">
        ${sectionHead({ kicker: 'How to apply', title: 'Four simple steps', align: 'center' })}
        <ol class="steps">
          <span class="steps-line"><span data-draw></span></span>
          ${(ad.steps || []).map((s, i) => `
            <li class="step" data-reveal>
              <span class="step-num">${pad2(i + 1)}</span>
              <h3>${esc(s.title)}</h3>
              ${s.text ? `<p>${esc(s.text)}</p>` : ''}
            </li>`).join('')}
        </ol>
      </div>
    </section>

    <section class="blk blk--cream" id="apply">
      <div class="wrap apply-grid">
        <aside class="apply-aside">
          ${sectionHead({ kicker: 'Before you visit', title: 'Documents required' })}
          <ul class="checks checks--big" data-stagger>
            ${(ad.documents || []).map((d) => `<li>${icon('FileText')}<span>${esc(d)}</span></li>`).join('')}
          </ul>
          <div class="apply-contact" data-reveal>
            <p>Prefer to talk? Our office is open <strong>${esc(g.office_days)}, ${esc(g.office_hours)}</strong>.</p>
            <div class="apply-buttons">
              <a class="ui-btn ui-btn--navy ui-btn--sm" href="${telHref(g.phone)}"><span>Call ${esc(g.phone)}</span>${icon('Phone')}</a>
              <a class="ui-btn ui-btn--outline ui-btn--sm" href="${waHref(g.whatsapp, 'I have a query about admission')}" target="_blank" rel="noopener"><span>WhatsApp</span>${brandIcon.whatsapp}</a>
              ${prospectus ? `<a class="ui-btn ui-btn--outline ui-btn--sm" href="${esc(prospectus)}" target="_blank" rel="noopener"><span>Prospectus</span>${icon('Download')}</a>` : ''}
            </div>
          </div>
        </aside>
        <div class="form-card" data-reveal>
          <h2 class="form-card-title">Admission enquiry</h2>
          <p class="form-card-text">Tell us a little about your child and we will call you back with the next steps.</p>
          ${enquiryForm('admission')}
        </div>
      </div>
    </section>`;
}

export function mount(root, _motion, site) {
  bindEnquiryForms(root, site);
}
