// ============================================
// Admin → Enquiries: messages from the website's Admissions and Contact forms
// ============================================

import { api } from './api.js';
import { showToast, escapeHtml } from './utils.js';

const STATUS_LABEL = { new: 'New', read: 'Read', done: 'Done' };
let filter = 'all';

const digits = (phone) => String(phone || '').replace(/\D/g, '');
const waNumber = (phone) => { const d = digits(phone); return d.length === 10 ? `91${d}` : d; };

function when(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function card(e) {
  return `
    <article class="enq${e.status === 'new' ? ' enq--new' : ''}" data-id="${escapeHtml(e.id)}">
      <header class="enq-head">
        <div>
          <span class="enq-kind enq-kind--${e.kind}">${e.kind === 'admission' ? 'Admission' : 'General'}</span>
          <span class="enq-status enq-status--${e.status}">${STATUS_LABEL[e.status] || e.status}</span>
        </div>
        <time>${escapeHtml(when(e.created_at))}</time>
      </header>
      <h4>${escapeHtml(e.name)}</h4>
      <ul class="enq-meta">
        <li><a href="tel:${escapeHtml(digits(e.phone))}">📞 ${escapeHtml(e.phone)}</a> · <a href="https://wa.me/${escapeHtml(waNumber(e.phone))}" target="_blank" rel="noopener">WhatsApp</a></li>
        ${e.email ? `<li><a href="mailto:${escapeHtml(e.email)}">✉ ${escapeHtml(e.email)}</a></li>` : ''}
        ${e.student_name || e.student_class ? `<li>Child: <strong>${escapeHtml(e.student_name || '—')}</strong>${e.student_class ? ` · ${escapeHtml(e.student_class)}` : ''}</li>` : ''}
      </ul>
      ${e.message ? `<p class="enq-msg">${escapeHtml(e.message)}</p>` : ''}
      <div class="enq-actions">
        ${e.status !== 'read' ? '<button class="btn btn-secondary btn-sm" data-status="read">Mark read</button>' : ''}
        ${e.status !== 'done' ? '<button class="btn btn-primary btn-sm" data-status="done">Mark done</button>' : ''}
        ${e.status !== 'new' ? '<button class="btn btn-secondary btn-sm" data-status="new">Mark as new</button>' : ''}
        <button class="btn btn-danger btn-sm" data-delete>Delete</button>
      </div>
    </article>`;
}

export async function renderEnquiriesPage(container, onChange = () => {}) {
  container.innerHTML = '<div class="spinner"></div>';
  let items = [];

  const draw = () => {
    const counts = items.reduce((acc, e) => ({ ...acc, [e.status]: (acc[e.status] || 0) + 1 }), {});
    const shown = filter === 'all' ? items : items.filter((e) => e.status === filter);
    container.innerHTML = `
      <div class="enq-toolbar">
        <div class="enq-filters">
          ${[['all', 'All', items.length], ['new', 'New', counts.new || 0], ['read', 'Read', counts.read || 0], ['done', 'Done', counts.done || 0]]
            .map(([key, text, n]) => `<button class="btn btn-sm ${filter === key ? 'btn-primary' : 'btn-secondary'}" data-filter="${key}">${text} (${n})</button>`).join('')}
        </div>
        <button class="btn btn-secondary btn-sm" data-refresh>↻ Refresh</button>
      </div>
      ${shown.length
        ? `<div class="enq-grid">${shown.map(card).join('')}</div>`
        : `<div class="empty-state"><p>${items.length ? 'Nothing in this list.' : 'No enquiries yet. Messages sent from the website’s Admissions and Contact pages will appear here.'}</p></div>`}`;
  };

  const load = async () => {
    try {
      items = await api('enquiries.list');
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>Could not load enquiries: ${escapeHtml(err.message)}</p></div>`;
      return;
    }
    draw();
    onChange(items.filter((e) => e.status === 'new').length);
  };

  container.onclick = async (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    if (btn.dataset.filter) { filter = btn.dataset.filter; draw(); return; }
    if (btn.hasAttribute('data-refresh')) { await load(); return; }
    const id = btn.closest('[data-id]')?.dataset.id;
    if (!id) return;
    try {
      if (btn.dataset.status) {
        await api('enquiries.update', { id, status: btn.dataset.status });
        items.find((e) => e.id === id).status = btn.dataset.status;
      } else if (btn.hasAttribute('data-delete')) {
        if (!confirm('Delete this enquiry permanently? This cannot be undone.')) return;
        await api('enquiries.delete', { id });
        items = items.filter((e) => e.id !== id);
        showToast('Enquiry deleted', 'success');
      }
      draw();
      onChange(items.filter((e) => e.status === 'new').length);
    } catch (err) {
      showToast(err.message || 'Something went wrong', 'error');
    }
  };

  await load();
}
