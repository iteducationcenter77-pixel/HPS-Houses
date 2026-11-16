// ============================================
// Competitions CRUD Module
// ============================================

import { api } from './api.js';
import { formatDate, showToast, escapeHtml, convertGDriveUrl } from './utils.js';
import { loadAllStudents } from './students.js';

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

async function openResultsModal(comp, openModal) {
  const [students, existing] = await Promise.all([
    loadAllStudents().catch(() => []),
    getParticipation(comp.id),
  ]);
  const byId = new Map(students.map((s) => [s.id, s]));

  openModal('Enter Results — ' + comp.name, `
    <p class="res-intro">Search for each participant by <strong>name, chest no., roll no. or class</strong>, then set their position and points. House totals update when you save.</p>
    <div class="res-head"><span>Participant</span><span>Position</span><span>Points</span><span></span></div>
    <div id="results-list"></div>
    <button class="btn btn-secondary btn-sm" id="add-participant-btn" style="margin:var(--space-md) 0">+ Add Participant</button>
    <button class="btn btn-primary" id="save-results-btn" style="width:100%;margin-top:var(--space-md)">Save Results & Update Points</button>
  `);
  document.getElementById('modal').classList.add('modal--wide');

  const list = document.getElementById('results-list');
  let rows = existing.map((p) => ({ student_id: p.student_id, position: p.position, points_earned: p.points_earned, remarks: p.remarks || '' }));
  if (!rows.length) rows.push({ student_id: '', position: 1, points_earned: 0, remarks: '' });

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

  function renderRows(focusIdx = null) {
    list.innerHTML = rows.map((r, i) => `
      <div class="res-row" data-idx="${i}">
        <div class="res-pick">${pickerHtml(r, i)}</div>
        <input class="form-input res-pos" data-idx="${i}" type="number" min="1" placeholder="Pos" value="${r.position || ''}" aria-label="Position">
        <input class="form-input res-pts" data-idx="${i}" type="number" min="0" placeholder="Pts" value="${r.points_earned || 0}" aria-label="Points">
        <button type="button" class="btn btn-danger btn-sm res-del" data-idx="${i}" aria-label="Remove participant">✕</button>
      </div>`).join('');
    if (focusIdx !== null) list.querySelector(`.res-search[data-idx="${focusIdx}"]`)?.focus();
  }

  function search(text, idx) {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const taken = new Set(rows.filter((r, i) => i !== idx && r.student_id).map((r) => r.student_id));
    if (!words.length) return [];
    return students.filter((s) => {
      if (taken.has(s.id)) return false;
      const hay = `${s.name} ${s.class} ${s.roll_number} ${s.chest_number || ''} ${s.houses?.name || ''}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    }).slice(0, 8);
  }

  function showOptions(input) {
    const idx = Number(input.dataset.idx);
    const box = input.nextElementSibling;
    const found = search(input.value, idx);
    if (!input.value.trim()) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = found.length
      ? found.map((s, k) => `
          <button type="button" class="res-option${k === 0 ? ' is-active' : ''}" data-pick="${escapeHtml(s.id)}" data-idx="${idx}">
            ${face(s)}<span><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(meta(s))}</small></span>
          </button>`).join('')
      : '<div class="res-none">No student found — try a chest number or class.</div>';
  }

  function pick(idx, id) {
    rows[idx].student_id = id;
    renderRows();
    list.querySelector(`.res-pos[data-idx="${idx}"]`)?.focus();
  }

  list.addEventListener('input', (e) => {
    const t = e.target;
    const idx = Number(t.dataset.idx);
    if (t.classList.contains('res-search')) showOptions(t);
    if (t.classList.contains('res-pos')) rows[idx].position = parseInt(t.value, 10) || null;
    if (t.classList.contains('res-pts')) rows[idx].points_earned = parseInt(t.value, 10) || 0;
  });

  list.addEventListener('keydown', (e) => {
    const input = e.target.closest('.res-search');
    if (!input) return;
    const box = input.nextElementSibling;
    const options = [...box.querySelectorAll('.res-option')];
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
      box.hidden = true;
    }
  });

  // mousedown (not click) so the choice registers before the search box loses focus
  list.addEventListener('mousedown', (e) => {
    const option = e.target.closest('.res-option');
    if (option) { e.preventDefault(); pick(Number(option.dataset.idx), option.dataset.pick); }
  });

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    if (btn.classList.contains('res-change')) { rows[idx].student_id = ''; renderRows(idx); }
    if (btn.classList.contains('res-del')) { rows.splice(idx, 1); renderRows(); }
  });

  list.addEventListener('focusout', (e) => {
    const input = e.target.closest('.res-search');
    if (input) setTimeout(() => { if (document.activeElement !== input) input.nextElementSibling.hidden = true; }, 150);
  });

  renderRows(rows.length === 1 && !rows[0].student_id ? 0 : null);

  document.getElementById('add-participant-btn').addEventListener('click', () => {
    const nextPos = Math.max(0, ...rows.map((r) => Number(r.position) || 0)) + 1;
    rows.push({ student_id: '', position: nextPos, points_earned: 0, remarks: '' });
    renderRows(rows.length - 1);
  });

  document.getElementById('save-results-btn').addEventListener('click', async () => {
    const valid = rows.filter((r) => r.student_id);
    const results = valid.map((r) => ({
      competition_id: comp.id,
      student_id: r.student_id,
      house_id: byId.get(r.student_id)?.house_id || '',
      position: r.position || null,
      points_earned: r.points_earned || 0,
      remarks: r.remarks || null,
    }));
    const success = await saveResults(comp.id, results);
    if (success) {
      document.getElementById('modal-backdrop').classList.remove('active');
      loadCompTable(openModal);
    }
  });
}
