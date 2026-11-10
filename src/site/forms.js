// ============================================
// Admission / contact enquiry form → Admin → Enquiries
// ============================================

import { api } from '../js/api.js';
import { esc, icon, telHref, waHref } from './util.js';

export const CLASS_OPTIONS = ['Nursery', 'KG', 'Class I', 'Class II', 'Class III', 'Class IV', 'Class V', 'Class VI', 'Class VII', 'Class VIII', 'Class IX', 'Class X'];

export function enquiryForm(kind = 'general') {
  const admission = kind === 'admission';
  return `
    <form class="enquiry" data-enquiry="${admission ? 'admission' : 'general'}" novalidate>
      <div class="enquiry-grid">
        <label class="field">
          <span>${admission ? 'Parent / guardian name' : 'Your name'} *</span>
          <input name="name" autocomplete="name" required maxlength="100">
        </label>
        <label class="field">
          <span>Phone number *</span>
          <input name="phone" type="tel" autocomplete="tel" required maxlength="20" inputmode="tel" placeholder="+91 …">
        </label>
        <label class="field">
          <span>Email (optional)</span>
          <input name="email" type="email" autocomplete="email" maxlength="120">
        </label>
        ${admission ? `
          <label class="field">
            <span>Class applying for</span>
            <select name="student_class">
              <option value="">Select a class</option>
              ${CLASS_OPTIONS.map((c) => `<option>${c}</option>`).join('')}
            </select>
          </label>
          <label class="field field--wide">
            <span>Child's name</span>
            <input name="student_name" maxlength="100">
          </label>` : ''}
        <label class="field field--wide">
          <span>${admission ? 'Anything you would like to ask? (optional)' : 'Your message *'}</span>
          <textarea name="message" rows="4" maxlength="2000"${admission ? '' : ' required'}></textarea>
        </label>
        <label class="hp" aria-hidden="true">Leave empty<input name="website" tabindex="-1" autocomplete="off"></label>
      </div>
      <div class="enquiry-foot">
        <button class="ui-btn ui-btn--navy" type="submit" data-magnetic><span>${admission ? 'Send admission enquiry' : 'Send message'}</span>${icon('Send')}</button>
        <p class="enquiry-note">We usually reply within one working day.</p>
      </div>
      <p class="enquiry-error" role="alert" hidden></p>
    </form>`;
}

function successPanel(kind, g) {
  return `
    <div class="enquiry-done" tabindex="-1">
      <span class="icon-badge">${icon('CircleCheck')}</span>
      <h3>Thank you — we have received your ${kind === 'admission' ? 'enquiry' : 'message'}.</h3>
      <p>Our office will contact you soon. For anything urgent, call
        <a href="${telHref(g.phone)}">${esc(g.phone)}</a> or
        <a href="${waHref(g.whatsapp)}" target="_blank" rel="noopener">message us on WhatsApp</a>.</p>
    </div>`;
}

export function bindEnquiryForms(root, site) {
  root.querySelectorAll('form[data-enquiry]').forEach((form) => {
    const errorEl = form.querySelector('.enquiry-error');
    const button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.hidden = true;

      const data = Object.fromEntries(new FormData(form).entries());
      const kind = form.dataset.enquiry;
      const missing = [...form.querySelectorAll('[required]')].find((el) => !el.value.trim());
      if (missing) {
        errorEl.textContent = 'Please fill in the required fields.';
        errorEl.hidden = false;
        missing.focus();
        return;
      }

      button.disabled = true;
      button.classList.add('is-busy');
      try {
        await api('enquiry.submit', { ...data, kind });
        const panel = document.createElement('div');
        panel.innerHTML = successPanel(kind, site.general);
        form.replaceWith(panel.firstElementChild);
        root.querySelector('.enquiry-done')?.focus();
      } catch (err) {
        errorEl.textContent = err.message || 'Could not send. Please try again or call us.';
        errorEl.hidden = false;
      } finally {
        button.disabled = false;
        button.classList.remove('is-busy');
      }
    });
  });
}
