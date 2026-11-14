// ============================================
// Contact page: details, message form, map
// ============================================

import { banner } from '../layout.js';
import { esc, icon, brandIcon, safeUrl, telHref, waHref, sectionHead } from '../util.js';
import { enquiryForm, bindEnquiryForms } from '../forms.js';

function mapSrc(g) {
  const custom = safeUrl(g.map_url);
  if (custom && /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/i.test(custom)) return custom;
  const q = encodeURIComponent(`${g.name}, ${g.address_line1}, ${g.address_line2}`);
  return `https://maps.google.com/maps?q=${q}&z=15&output=embed`;
}

export function render(site) {
  const { general: g } = site;
  const fb = safeUrl(g.facebook_url);
  const ig = safeUrl(g.instagram_url);

  const cards = [
    { icon: 'MapPin', title: 'Visit', lines: [esc(g.address_line1), esc(g.address_line2)] },
    { icon: 'Phone', title: 'Call', lines: [g.phone, g.phone2].filter(Boolean).map((p) => `<a href="${telHref(p)}">${esc(p)}</a>`) },
    { icon: 'Mail', title: 'Email', lines: [g.email, g.email2].filter(Boolean).map((m) => `<a href="mailto:${esc(m)}">${esc(m)}</a>`) },
    { icon: 'Clock', title: 'Office hours', lines: [esc(g.office_days), esc(g.office_hours)] },
  ];

  return `
    ${banner({ kicker: 'Contact', title: 'We would love to hear from you', text: 'Questions about admissions, programmes or a campus visit — reach out any time.', image: site.hero.image, crumb: 'Contact' })}

    <section class="blk">
      <div class="wrap">
        <div class="contact-cards" data-stagger>
          ${cards.map((c) => `
            <article class="contact-card">
              <span class="icon-badge">${icon(c.icon)}</span>
              <h3>${c.title}</h3>
              <p>${c.lines.join('<br>')}</p>
            </article>`).join('')}
        </div>
      </div>
    </section>

    <section class="blk blk--cream">
      <div class="wrap contact-grid">
        <div class="form-card" data-reveal>
          <h2 class="form-card-title">Send us a message</h2>
          <p class="form-card-text">We usually reply within one working day.</p>
          ${enquiryForm('general')}
        </div>
        <div class="contact-side">
          ${sectionHead({ kicker: 'Find us', title: g.address_line1 })}
          <div class="map" data-reveal>
            <iframe title="Map showing ${esc(g.name)}" src="${esc(mapSrc(g))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
          <div class="contact-social" data-reveal>
            <a class="ui-btn ui-btn--navy ui-btn--sm" href="${waHref(g.whatsapp)}" target="_blank" rel="noopener"><span>WhatsApp</span>${brandIcon.whatsapp}</a>
            ${fb ? `<a class="round-link" href="${esc(fb)}" target="_blank" rel="noopener" aria-label="Facebook">${brandIcon.facebook}</a>` : ''}
            ${ig ? `<a class="round-link" href="${esc(ig)}" target="_blank" rel="noopener" aria-label="Instagram">${brandIcon.instagram}</a>` : ''}
          </div>
        </div>
      </div>
    </section>`;
}

export function mount(root, _motion, site) {
  bindEnquiryForms(root, site);
}
