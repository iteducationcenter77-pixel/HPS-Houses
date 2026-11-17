// ============================================
// Bonus & penalty points: points given straight to a house (discipline, cleanliness, misconduct…)
// ============================================

import { api } from './api.js';
import { formatDate, showToast, escapeHtml } from './utils.js';
import { getHouses } from './houses.js';

const REASONS = {
  bonus: ['Discipline', 'Cleanliness', 'Punctuality', 'Best assembly', 'Uniform', 'Sportsmanship'],
  penalty: ['Indiscipline', 'Late coming', 'Uniform violation', 'Misconduct', 'Untidy classroom'],
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const signed = (n) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

export function renderPointsPage(container) {
  container.innerHTML = `
    <p class="pts-lead">Give a house <strong>bonus points</strong> (e.g. for discipline) or take points away as a <strong>penalty</strong>. They count in the house totals straight away and are listed on the website’s Houses page with the reason.</p>
    <div class="pts-summary" id="pts-summary"><div class="spinner"></div></div>
    <div class="pts-grid">
      <form class="pts-form" id="pts-form" novalidate>
        <h3>Give points</h3>
        <div class="pts-type" role="radiogroup" aria-label="Bonus or penalty">
          <label><input type="radio" name="pts-type" value="bonus" checked><span>＋ Bonus</span></label>
          <label><input type="radio" name="pts-type" value="penalty"><span>− Penalty</span></label>
        </div>
        <div class="form-group">
          <span class="form-label">House *</span>
          <div class="pts-houses" id="pts-houses" role="radiogroup" aria-label="House"></div>
        </div>
        <div class="pts-row">
          <div class="form-group">
            <label class="form-label" for="pts-points">Points *</label>
            <input class="form-input" id="pts-points" type="number" min="1" max="1000" placeholder="e.g. 5" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="pts-date">Date *</label>
            <input class="form-input" id="pts-date" type="date" value="${today()}" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="pts-reason">Reason *</label>
          <input class="form-input" id="pts-reason" maxlength="200" placeholder="e.g. Best discipline in morning assembly" required>
          <div class="pts-chips" id="pts-chips"></div>
        </div>
        <button type="submit" class="btn btn-primary" id="pts-submit" style="width:100%">Add bonus points</button>
      </form>
      <div class="table-container">
        <div class="table-header"><h3>History</h3><span class="pts-count" id="pts-count"></span></div>
        <div class="table-body">
          <table class="data-table">
            <thead><tr><th>Date</th><th>House</th><th>Points</th><th>Reason</th><th></th></tr></thead>
            <tbody id="pts-tbody"><tr><td colspan="5"><div class="spinner"></div></td></tr></tbody>
          </table>
        </div>
      </div>
    </div>`;

  const form = container.querySelector('#pts-form');
  const kind = () => form.querySelector('input[name="pts-type"]:checked').value;
  let houses = [];
  let list = [];

  const drawChips = () => {
    container.querySelector('#pts-chips').innerHTML = REASONS[kind()]
      .map((r) => `<button type="button" class="pts-chip" data-reason="${escapeHtml(r)}">${escapeHtml(r)}</button>`).join('');
    const submit = container.querySelector('#pts-submit');
    submit.textContent = kind() === 'bonus' ? 'Add bonus points' : 'Give penalty';
    submit.classList.toggle('btn-danger', kind() === 'penalty');
    submit.classList.toggle('btn-primary', kind() === 'bonus');
    form.classList.toggle('is-penalty', kind() === 'penalty');
  };

  const drawSummary = () => {
    const by = new Map(houses.map((h) => [h.id, { bonus: 0, penalty: 0 }]));
    for (const a of list) {
      const t = by.get(a.house_id);
      if (!t) continue;
      if (a.points > 0) t.bonus += a.points; else t.penalty += a.points;
    }
    container.querySelector('#pts-summary').innerHTML = houses.map((h) => {
      const t = by.get(h.id);
      const total = Number(h.total_points) || 0;
      return `
        <div class="pts-house" style="--hc:${escapeHtml(h.color_hex || '#8a94a6')}">
          <div class="pts-house-name"><i></i>${escapeHtml(h.name)}</div>
          <div class="pts-house-total">${total}<small>total</small></div>
          <div class="pts-house-parts">
            <span>Competitions <b>${total - t.bonus - t.penalty}</b></span>
            <span class="is-bonus">Bonus <b>${t.bonus ? `+${t.bonus}` : 0}</b></span>
            <span class="is-penalty">Penalty <b>${t.penalty ? `−${Math.abs(t.penalty)}` : '0'}</b></span>
          </div>
        </div>`;
    }).join('');
  };

  const drawTable = () => {
    const tbody = container.querySelector('#pts-tbody');
    container.querySelector('#pts-count').textContent = list.length ? `${list.length} entr${list.length === 1 ? 'y' : 'ies'}` : '';
    tbody.innerHTML = list.length ? list.map((a) => `
      <tr>
        <td>${formatDate(a.date)}</td>
        <td><span class="pts-dot" style="--hc:${escapeHtml(a.houses?.color_hex || '#8a94a6')}"></span>${escapeHtml(a.houses?.name || '—')}</td>
        <td><span class="pts-badge ${a.points > 0 ? 'is-bonus' : 'is-penalty'}">${signed(a.points)} ${a.points > 0 ? 'bonus' : 'penalty'}</span></td>
        <td>${escapeHtml(a.reason)}</td>
        <td><button class="btn btn-danger btn-sm pts-del" data-id="${escapeHtml(a.id)}" aria-label="Delete this entry">Delete</button></td>
      </tr>`).join('')
      : '<tr><td colspan="5"><div class="empty-state"><p>No bonus or penalty points yet</p></div></td></tr>';
  };

  const load = async () => {
    try {
      [houses, list] = await Promise.all([getHouses(), api('points.list')]);
    } catch (err) {
      showToast(err.message || 'Could not load points', 'error');
      return;
    }
    houses.sort((a, b) => a.name.localeCompare(b.name));
    if (!container.querySelector('#pts-houses').children.length) {
      container.querySelector('#pts-houses').innerHTML = houses.map((h, i) => `
        <label class="pts-house-pick" style="--hc:${escapeHtml(h.color_hex || '#8a94a6')}">
          <input type="radio" name="pts-house" value="${escapeHtml(h.id)}"${i === 0 ? '' : ''}><span><i></i>${escapeHtml(h.name)}</span>
        </label>`).join('');
    }
    drawSummary();
    drawTable();
  };

  form.addEventListener('change', (e) => { if (e.target.name === 'pts-type') drawChips(); });
  container.querySelector('#pts-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.pts-chip');
    if (chip) container.querySelector('#pts-reason').value = chip.dataset.reason;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const house = form.querySelector('input[name="pts-house"]:checked')?.value;
    const amount = parseInt(container.querySelector('#pts-points').value, 10);
    const reason = container.querySelector('#pts-reason').value.trim();
    const date = container.querySelector('#pts-date').value;
    if (!house) return showToast('Choose a house', 'error');
    if (!amount || amount < 1) return showToast('Enter the number of points (1 or more)', 'error');
    if (!reason) return showToast('Write the reason', 'error');
    if (!date) return showToast('Choose the date', 'error');
    const submit = container.querySelector('#pts-submit');
    submit.disabled = true;
    try {
      await api('points.add', { adjustment: { house_id: house, points: kind() === 'bonus' ? amount : -amount, reason, date } });
      const name = houses.find((h) => h.id === house)?.name || 'House';
      showToast(kind() === 'bonus' ? `${name}: +${amount} bonus points added` : `${name}: −${amount} penalty given`, 'success');
      container.querySelector('#pts-points').value = '';
      container.querySelector('#pts-reason').value = '';
      await load();
    } catch (err) {
      showToast(err.message || 'Could not save', 'error');
    } finally {
      submit.disabled = false;
    }
  });

  container.querySelector('#pts-tbody').addEventListener('click', async (e) => {
    const btn = e.target.closest('.pts-del');
    if (!btn) return;
    const a = list.find((x) => x.id === btn.dataset.id);
    if (!a || !confirm(`Delete "${a.reason}" (${signed(a.points)} for ${a.houses?.name || 'the house'})? The house total will change back.`)) return;
    try {
      await api('points.delete', { id: a.id });
      showToast('Entry deleted', 'success');
      await load();
    } catch (err) {
      showToast(err.message || 'Could not delete', 'error');
    }
  });

  drawChips();
  load();
}
