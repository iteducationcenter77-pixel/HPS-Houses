// ============================================
// Competitions CRUD Module
// ============================================

import { api } from './api.js';
import { formatDate, showToast, escapeHtml, convertGDriveUrl } from './utils.js';
import { loadAllStudents } from './students.js';
import { CATEGORIES, OPEN_CATEGORY, categoryOf, inCategory } from '../../shared/categories.js';

export async function getCompetitions() {
  try {
    return await api('competitions.list');
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function addCompetition(comp) {
  try {
    await api('competitions.add', { competition: comp });
  } catch (err) {
    showToast(err.message || 'Failed to add', 'error');
    return false;
  }
  showToast('Competition created', 'success');
  return true;
}

export async function updateCompetition(id, updates) {
  try {
    await api('competitions.update', { id, updates });
  } catch (err) {
    showToast(err.message || 'Failed to update', 'error');
    return false;
  }
  showToast('Competition updated', 'success');
  return true;
}

export async function deleteCompetition(id) {
  try {
    // The server removes the competition's results along with it
    await api('competitions.delete', { id });
  } catch (err) {
    showToast(err.message || 'Failed to delete', 'error');
    return false;
  }
  showToast('Competition deleted', 'success');
  return true;
}

export async function getParticipation(compId) {
  try {
    return await api('participation.list', { competition_id: compId });
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function saveResults(compId, results) {
  try {
    // The server replaces the results, marks the competition completed
    // and recalculates every house's points in one step
    await api('results.save', { competition_id: compId, results });
  } catch (err) {
    showToast(err.message || 'Failed to save results', 'error');
    return false;
  }
  showToast('Results saved & points updated', 'success');
  return true;
}

export async function getAllStudents() {
  try {
    return await api('students.list', { sort: 'name' });
  } catch (err) {
    console.error(err);
    return [];
  }
}

export function renderCompetitionsPage(container, openModal) {
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg)">
      <div></div>
      <button class="btn btn-primary btn-sm" id="add-comp-btn">+ New Competition</button>
    </div>
    <div class="table-container">
      <div class="table-header"><h3>All Competitions</h3></div>
      <div class="table-body">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Type</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="comp-tbody"><tr><td colspan="5"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
    </div>`;

  loadCompTable(openModal);
  document.getElementById('add-comp-btn').addEventListener('click', () => openCompModal(null, openModal));
}

async function loadCompTable(openModal) {
  const comps = await getCompetitions();
  const tbody = document.getElementById('comp-tbody');
  if (!tbody) return;

  if (!comps.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>No competitions yet</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = comps.map(c => `<tr>
    <td><strong style="color:var(--white)">${escapeHtml(c.name)}</strong></td>
    <td><span class="badge badge-${(c.type||'other').toLowerCase()}">${escapeHtml(c.type)}</span></td>
    <td>${formatDate(c.competition_date)}</td>
    <td><span class="badge badge-${c.status}">${c.status}</span></td>
    <td><div class="table-actions">
      <button class="btn btn-secondary btn-sm edit-comp" data-id="${c.id}">Edit</button>
      <button class="btn btn-primary btn-sm results-comp" data-id="${c.id}">Results</button>
      <button class="btn btn-danger btn-sm del-comp" data-id="${c.id}">Delete</button>
    </div></td>
  </tr>`).join('');

  tbody.querySelectorAll('.edit-comp').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = comps.find(x => x.id === btn.dataset.id);
      if (c) openCompModal(c, openModal);
    });
  });
  tbody.querySelectorAll('.results-comp').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = comps.find(x => x.id === btn.dataset.id);
      if (c) openResultsModal(c, openModal);
    });
  });
  tbody.querySelectorAll('.del-comp').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Delete this competition and all its results?')) {
        await deleteCompetition(btn.dataset.id);
        loadCompTable(openModal);
      }
    });
  });
}

function openCompModal(comp, openModal) {
  const isEdit = !!comp;
  openModal(isEdit ? 'Edit Competition' : 'New Competition', `
    <form id="comp-form">
      <div class="form-group">
        <label class="form-label">Competition Name *</label>
        <input class="form-input" id="cf-name" value="${isEdit ? escapeHtml(comp.name) : ''}" required placeholder="e.g. Inter-House Cricket">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md)">
        <div class="form-group">
          <label class="form-label">Type *</label>
          <select class="form-select" id="cf-type" required>
            <option value="Sports" ${isEdit && comp.type === 'Sports' ? 'selected' : ''}>Sports</option>
            <option value="Academic" ${isEdit && comp.type === 'Academic' ? 'selected' : ''}>Academic</option>
            <option value="Cultural" ${isEdit && comp.type === 'Cultural' ? 'selected' : ''}>Cultural</option>
            <option value="Other" ${isEdit && comp.type === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Date *</label>
          <input class="form-input" id="cf-date" type="date" value="${isEdit ? comp.competition_date : ''}" required>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="cf-status">
          <option value="upcoming" ${isEdit && comp.status === 'upcoming' ? 'selected' : ''}>Upcoming</option>
          <option value="ongoing" ${isEdit && comp.status === 'ongoing' ? 'selected' : ''}>Ongoing</option>
          <option value="completed" ${isEdit && comp.status === 'completed' ? 'selected' : ''}>Completed</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-input" id="cf-desc" rows="3" placeholder="Brief description">${isEdit ? escapeHtml(comp.description || '') : ''}</textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%">${isEdit ? 'Save' : 'Create Competition'}</button>
    </form>
  `);

  document.getElementById('comp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('cf-name').value.trim(),
      type: document.getElementById('cf-type').value,
      competition_date: document.getElementById('cf-date').value,
      status: document.getElementById('cf-status').value,
      description: document.getElementById('cf-desc').value.trim() || null
    };
    let success;
    if (isEdit) success = await updateCompetition(comp.id, data);
    else success = await addCompetition(data);
    if (success) {
      document.getElementById('modal-backdrop').classList.remove('active');
      loadCompTable(openModal);
    }
  });
}

// ── Results: one competition, winners entered category by category ──

const ordinal = (n) => {
  const v = n % 100;
  return n + (['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th');
};
const POINTS_KEY = 'hps-result-points';
const DEFAULT_POINTS = { 1: 10, 2: 7, 3: 5 };
const SECTIONS = [...CATEGORIES.map((c) => ({ name: c.name, classes: c.classes })), { name: OPEN_CATEGORY, classes: 'All classes' }];

/** Points for 1st/2nd/3rd: this competition's saved results, else the last ones used, else 10/7/5. */
function startingPoints(existing) {
  const table = { ...DEFAULT_POINTS };
  try { Object.assign(table, JSON.parse(localStorage.getItem(POINTS_KEY) || '{}')); } catch { /* private mode */ }
  for (const p of existing) if (p.position >= 1 && p.position <= 3) table[p.position] = Number(p.points_earned) || 0;
  return table;
}

async function openResultsModal(comp, openModal) {
  const [students, existing] = await Promise.all([
    loadAllStudents().catch(() => []),
    getParticipation(comp.id),
  ]);
  const byId = new Map(students.map((s) => [s.id, s]));
  const points = startingPoints(existing);
  const pointsFor = (pos) => (pos >= 1 && pos <= 3 ? Number(points[pos]) || 0 : 0);

  // Earlier results saved without a category go under the category of the student's class.
  const rows = existing
    .map((p) => ({
      category: p.category || categoryOf(byId.get(p.student_id)?.class ?? p.students?.class) || OPEN_CATEGORY,
      student_id: p.student_id,
      position: Number(p.position) || 1,
      points_earned: Number(p.points_earned) || 0,
      remarks: p.remarks || '',
    }))
    .sort((a, b) => a.position - b.position);
  rows.forEach((r) => { r.auto = r.points_earned === pointsFor(r.position); });
  for (const c of CATEGORIES) {
    if (!rows.some((r) => r.category === c.name)) {
      for (const pos of [1, 2, 3]) rows.push({ category: c.name, student_id: '', position: pos, points_earned: pointsFor(pos), auto: true, remarks: '' });
    }
  }
  let showOpen = rows.some((r) => r.category === OPEN_CATEGORY);

  openModal('Results — ' + comp.name, `
    <p class="res-intro">Enter the <strong>1st, 2nd and 3rd</strong> place winners of each category. Search by name, chest no., roll no. or class. Use <strong>+ Add place</strong> for a 4th place or a joint position. House points update when you save.</p>
    <div class="res-toolbar">
      <div class="res-points" role="group" aria-label="Points for each place">
        <span class="res-points-title">Points</span>
        ${[1, 2, 3].map((p) => `
          <label class="res-points-item"><span class="res-medal res-medal--${p}">${ordinal(p)}</span>
            <input type="number" min="0" class="form-input" data-points="${p}" value="${pointsFor(p)}" aria-label="Points for ${ordinal(p)} place"></label>`).join('')}
      </div>
      <label class="res-anyclass"><input type="checkbox" id="res-all-classes"> Allow students from other classes</label>
    </div>
    <div id="res-sections" class="res-sections"></div>
    <div class="res-footer">
      <span id="res-summary" class="res-summary"></span>
      <button class="btn btn-primary" id="save-results-btn">Save Results &amp; Update Points</button>
    </div>
  `);
  document.getElementById('modal').classList.add('modal--wide');

  const box = document.getElementById('res-sections');
  const anyClass = () => document.getElementById('res-all-classes')?.checked;

  const meta = (s) => [s.class, s.houses?.name, s.chest_number ? `Chest ${s.chest_number}` : '', `Roll ${s.roll_number}`].filter(Boolean).join(' · ');
  const face = (s) => {
    const color = escapeHtml(s.houses?.color_hex || '#8a94a6');
    const photo = convertGDriveUrl(s.photo_url);
    return photo
      ? `<img class="res-face" src="${escapeHtml(photo)}" alt="" loading="lazy">`
      : `<span class="res-face res-face--initial" style="--hc:${color}">${escapeHtml((s.name || '?').charAt(0))}</span>`;
  };

  function pickerHtml(r, i) {
    const s = byId.get(r.student_id);
    if (s) {
      return `
        <div class="res-chosen" style="--hc:${escapeHtml(s.houses?.color_hex || '#8a94a6')}">
          ${face(s)}
          <span class="res-chosen-text"><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(meta(s))}</small></span>
          <button type="button" class="btn btn-secondary btn-sm res-change" data-idx="${i}">Change</button>
        </div>`;
    }
    return `
      <div class="res-search-wrap">
        <input class="form-input res-search" data-idx="${i}" placeholder="Search name, chest no., roll or class…" autocomplete="off" aria-autocomplete="list">
        <div class="res-options" hidden></div>
      </div>`;
  }

  const rowHtml = (r, i) => `
    <div class="res-row" data-idx="${i}">
      <select class="form-select res-pos res-medal--${Math.min(r.position, 4)}" data-idx="${i}" aria-label="Place">
        ${Array.from({ length: 10 }, (_, k) => k + 1).map((n) => `<option value="${n}"${n === r.position ? ' selected' : ''}>${ordinal(n)}</option>`).join('')}
      </select>
      <div class="res-pick">${pickerHtml(r, i)}</div>
      <label class="res-pts-wrap"><input class="form-input res-pts" data-idx="${i}" type="number" min="0" value="${r.points_earned}" aria-label="Points"><span>pts</span></label>
      <button type="button" class="btn btn-danger btn-sm res-del" data-idx="${i}" aria-label="Remove this place">✕</button>
    </div>`;

  function summary() {
    const done = rows.filter((r) => r.student_id);
    const cats = new Set(done.map((r) => r.category)).size;
    document.getElementById('res-summary').textContent = done.length
      ? `${done.length} winner${done.length > 1 ? 's' : ''} in ${cats} categor${cats > 1 ? 'ies' : 'y'} · ${done.reduce((t, r) => t + (r.points_earned || 0), 0)} points`
      : 'No winners chosen yet';
  }

  function render(focusIdx = null) {
    box.innerHTML = SECTIONS.filter((sec) => sec.name !== OPEN_CATEGORY || showOpen).map((sec) => {
      const items = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.category === sec.name);
      const filled = items.filter(({ r }) => r.student_id).length;
      return `
        <section class="res-section">
          <header class="res-section-head">
            <div><h4>${escapeHtml(sec.name)}</h4><span>${escapeHtml(sec.classes)}</span></div>
            <span class="res-filled${filled ? ' is-on' : ''}">${filled ? `${filled} winner${filled > 1 ? 's' : ''}` : 'No winners yet'}</span>
          </header>
          <div class="res-rows">${items.map(({ r, i }) => rowHtml(r, i)).join('') || '<p class="res-empty">No places — add one below.</p>'}</div>
          <button type="button" class="res-add" data-cat="${escapeHtml(sec.name)}">+ Add place</button>
        </section>`;
    }).join('') + (showOpen ? '' : '<button type="button" class="res-add-open" id="res-add-open">+ Add an Open section (any class, e.g. Nursery – I)</button>');
    summary();
    if (focusIdx !== null) box.querySelector(`.res-search[data-idx="${focusIdx}"]`)?.focus();
  }

  function search(text, idx) {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const taken = new Set(rows.filter((r, i) => i !== idx && r.student_id).map((r) => r.student_id));
    const category = rows[idx].category;
    return students.filter((s) => {
      if (taken.has(s.id)) return false;
      if (!anyClass() && !inCategory(s.class, category)) return false;
      const hay = `${s.name} ${s.class} ${s.roll_number} ${s.chest_number || ''} ${s.houses?.name || ''}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    }).slice(0, 8);
  }

  function showOptions(input) {
    const idx = Number(input.dataset.idx);
    const list = input.nextElementSibling;
    if (!input.value.trim()) { list.hidden = true; return; }
    const found = search(input.value, idx);
    const category = rows[idx].category;
    list.hidden = false;
    list.innerHTML = found.length
      ? found.map((s, k) => `
          <button type="button" class="res-option${k === 0 ? ' is-active' : ''}" data-pick="${escapeHtml(s.id)}" data-idx="${idx}">
            ${face(s)}<span><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(meta(s))}</small></span>
          </button>`).join('')
      : `<div class="res-none">No student found${category !== OPEN_CATEGORY && !anyClass() ? ` in ${escapeHtml(category)}` : ''} — try a chest number or class.</div>`;
  }

  function pick(idx, id) {
    rows[idx].student_id = id;
    render();
    // Jump to the next empty place, so 1st → 2nd → 3rd can be filled straight through.
    const next = rows.findIndex((r, i) => i > idx && r.category === rows[idx].category && !r.student_id);
    if (next >= 0) box.querySelector(`.res-search[data-idx="${next}"]`)?.focus();
  }

  box.addEventListener('input', (e) => {
    const t = e.target;
    const idx = Number(t.dataset.idx);
    if (t.classList.contains('res-search')) showOptions(t);
    if (t.classList.contains('res-pts')) { rows[idx].points_earned = Math.max(0, parseInt(t.value, 10) || 0); rows[idx].auto = false; summary(); }
  });

  box.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.classList.contains('res-pos')) return;
    const r = rows[Number(t.dataset.idx)];
    r.position = parseInt(t.value, 10) || 1;
    if (r.auto) r.points_earned = pointsFor(r.position);
    render();
  });

  box.addEventListener('keydown', (e) => {
    const input = e.target.closest('.res-search');
    if (!input) return;
    const list = input.nextElementSibling;
    const options = [...list.querySelectorAll('.res-option')];
    const current = options.findIndex((o) => o.classList.contains('is-active'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!options.length) return;
      const next = (current + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      options.forEach((o, k) => o.classList.toggle('is-active', k === next));
      options[next].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = options[current >= 0 ? current : 0];
      if (chosen) pick(Number(input.dataset.idx), chosen.dataset.pick);
    } else if (e.key === 'Escape') {
      list.hidden = true;
    }
  });

  // mousedown (not click) so the choice registers before the search box loses focus
  box.addEventListener('mousedown', (e) => {
    const option = e.target.closest('.res-option');
    if (option) { e.preventDefault(); pick(Number(option.dataset.idx), option.dataset.pick); }
  });

  box.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    if (btn.classList.contains('res-change')) { rows[idx].student_id = ''; render(idx); }
    if (btn.classList.contains('res-del')) { rows.splice(idx, 1); render(); }
    if (btn.classList.contains('res-add')) {
      const category = btn.dataset.cat;
      const position = Math.min(10, Math.max(0, ...rows.filter((r) => r.category === category).map((r) => r.position)) + 1);
      rows.push({ category, student_id: '', position, points_earned: pointsFor(position), auto: true, remarks: '' });
      render(rows.length - 1);
    }
    if (btn.id === 'res-add-open') {
      showOpen = true;
      rows.push({ category: OPEN_CATEGORY, student_id: '', position: 1, points_earned: pointsFor(1), auto: true, remarks: '' });
      render(rows.length - 1);
    }
  });

  box.addEventListener('focusout', (e) => {
    const input = e.target.closest('.res-search');
    if (input) setTimeout(() => { if (document.activeElement !== input) input.nextElementSibling.hidden = true; }, 150);
  });

  // Changing the points for a place updates every row of that place that still uses the standard points.
  document.querySelectorAll('[data-points]').forEach((input) => {
    input.addEventListener('input', () => {
      const place = Number(input.dataset.points);
      points[place] = Math.max(0, parseInt(input.value, 10) || 0);
      rows.forEach((r, i) => {
        if (r.auto && r.position === place) {
          r.points_earned = points[place];
          const field = box.querySelector(`.res-pts[data-idx="${i}"]`);
          if (field) field.value = r.points_earned;
        }
      });
      summary();
    });
  });

  document.getElementById('res-all-classes').addEventListener('change', () => {
    box.querySelectorAll('.res-search').forEach((input) => { if (input.value.trim()) showOptions(input); });
  });

  render();

  const saveBtn = document.getElementById('save-results-btn');
  saveBtn.addEventListener('click', async () => {
    const results = rows.filter((r) => r.student_id).map((r) => ({
      student_id: r.student_id,
      category: r.category,
      position: r.position,
      points_earned: r.points_earned || 0,
      remarks: r.remarks || null,
    }));
    try { localStorage.setItem(POINTS_KEY, JSON.stringify({ 1: points[1], 2: points[2], 3: points[3] })); } catch { /* private mode */ }
    saveBtn.disabled = true;
    const success = await saveResults(comp.id, results);
    saveBtn.disabled = false;
    if (success) {
      document.getElementById('modal-backdrop').classList.remove('active');
      loadCompTable(openModal);
    }
  });
}

