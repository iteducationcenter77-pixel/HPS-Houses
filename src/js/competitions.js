// ============================================
// Competitions CRUD Module
// ============================================

import { supabase, isConfigured } from './supabase.js';
import { formatDate, showToast, escapeHtml } from './utils.js';
import { getHouses } from './houses.js';

export async function getCompetitions() {
  if (!isConfigured()) return [];
  const { data, error } = await supabase.from('competitions').select('*').order('competition_date', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function addCompetition(comp) {
  if (!isConfigured()) { showToast('Competition added (demo)', 'success'); return true; }
  const { error } = await supabase.from('competitions').insert(comp);
  if (error) { showToast(error.message || 'Failed to add', 'error'); return false; }
  showToast('Competition created', 'success');
  return true;
}

export async function updateCompetition(id, updates) {
  if (!isConfigured()) { showToast('Updated (demo)', 'success'); return true; }
  const { error } = await supabase.from('competitions').update(updates).eq('id', id);
  if (error) { showToast('Failed to update', 'error'); return false; }
  showToast('Competition updated', 'success');
  return true;
}

export async function deleteCompetition(id) {
  if (!isConfigured()) { showToast('Deleted (demo)', 'success'); return true; }
  // Delete participation first, then competition
  await supabase.from('participation').delete().eq('competition_id', id);
  const { error } = await supabase.from('competitions').delete().eq('id', id);
  if (error) { showToast('Failed to delete', 'error'); return false; }
  showToast('Competition deleted', 'success');
  return true;
}

export async function getParticipation(compId) {
  if (!isConfigured()) return [];
  const { data } = await supabase.from('participation')
    .select('*, students(name, class, photo_url), houses(name, color_hex)')
    .eq('competition_id', compId).order('position');
  return data || [];
}

export async function saveResults(compId, results) {
  if (!isConfigured()) { showToast('Results saved (demo)', 'success'); return true; }
  // Delete old participation
  await supabase.from('participation').delete().eq('competition_id', compId);
  // Insert new
  if (results.length) {
    const { error } = await supabase.from('participation').insert(results);
    if (error) { showToast('Failed to save results', 'error'); return false; }
  }
  // Update competition status
  await supabase.from('competitions').update({ status: 'completed' }).eq('id', compId);
  // Recalculate house points
  await recalculateHousePoints();
  showToast('Results saved & points updated', 'success');
  return true;
}

async function recalculateHousePoints() {
  const houses = await getHouses();
  for (const house of houses) {
    const { data } = await supabase.from('participation')
      .select('points_earned').eq('house_id', house.id);
    const total = (data || []).reduce((sum, p) => sum + (p.points_earned || 0), 0);
    await supabase.from('houses').update({ total_points: total, updated_at: new Date().toISOString() }).eq('id', house.id);
  }
}

export async function getAllStudents() {
  if (!isConfigured()) return [];
  const { data } = await supabase.from('students').select('id, name, class, house_id, houses(name, color_hex)').eq('is_active', true).order('name');
  return data || [];
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
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>${isConfigured() ? 'No competitions yet' : 'Connect Supabase to manage competitions'}</p></div></td></tr>`;
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
  const students = await getAllStudents();
  const existing = await getParticipation(comp.id);

  openModal('Enter Results — ' + comp.name, `
    <p style="color:var(--text-muted);font-size:var(--font-sm);margin-bottom:var(--space-lg)">Add participants, assign positions and points. Points will auto-update house totals.</p>
    <div id="results-list"></div>
    <button class="btn btn-secondary btn-sm" id="add-participant-btn" style="margin:var(--space-md) 0">+ Add Participant</button>
    <button class="btn btn-primary" id="save-results-btn" style="width:100%;margin-top:var(--space-md)">Save Results & Update Points</button>
  `);

  const list = document.getElementById('results-list');
  let rows = existing.map(p => ({ student_id: p.student_id, position: p.position, points_earned: p.points_earned, remarks: p.remarks || '' }));
  if (!rows.length) rows.push({ student_id: '', position: '', points_earned: 0, remarks: '' });

  function renderRows() {
    list.innerHTML = rows.map((r, i) => `
      <div class="participant-row" style="display:grid;grid-template-columns:1fr 80px 80px 40px;gap:8px;align-items:center;padding:8px;background:var(--primary);border-radius:8px;margin-bottom:8px;border:1px solid var(--border)">
        <select class="form-select res-student" data-idx="${i}" style="padding:8px;font-size:var(--font-sm)">
          <option value="">Select Student</option>
          ${students.map(s => `<option value="${s.id}" ${r.student_id === s.id ? 'selected' : ''}>${s.name} (${s.houses?.name || ''})</option>`).join('')}
        </select>
        <input class="form-input res-pos" data-idx="${i}" type="number" min="1" placeholder="Pos" value="${r.position || ''}" style="padding:8px;font-size:var(--font-sm)">
        <input class="form-input res-pts" data-idx="${i}" type="number" min="0" placeholder="Pts" value="${r.points_earned || 0}" style="padding:8px;font-size:var(--font-sm)">
        <button class="btn btn-danger btn-sm res-del" data-idx="${i}" style="padding:4px 8px">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('.res-student').forEach(el => el.addEventListener('change', (e) => { rows[e.target.dataset.idx].student_id = e.target.value; }));
    list.querySelectorAll('.res-pos').forEach(el => el.addEventListener('input', (e) => { rows[e.target.dataset.idx].position = parseInt(e.target.value) || null; }));
    list.querySelectorAll('.res-pts').forEach(el => el.addEventListener('input', (e) => { rows[e.target.dataset.idx].points_earned = parseInt(e.target.value) || 0; }));
    list.querySelectorAll('.res-del').forEach(el => el.addEventListener('click', (e) => { rows.splice(e.target.dataset.idx, 1); renderRows(); }));
  }
  renderRows();

  document.getElementById('add-participant-btn').addEventListener('click', () => {
    rows.push({ student_id: '', position: '', points_earned: 0, remarks: '' });
    renderRows();
  });

  document.getElementById('save-results-btn').addEventListener('click', async () => {
    const valid = rows.filter(r => r.student_id);
    const results = valid.map(r => {
      const student = students.find(s => s.id === r.student_id);
      return {
        competition_id: comp.id,
        student_id: r.student_id,
        house_id: student?.house_id || '',
        position: r.position || null,
        points_earned: r.points_earned || 0,
        remarks: r.remarks || null
      };
    });
    const success = await saveResults(comp.id, results);
    if (success) {
      document.getElementById('modal-backdrop').classList.remove('active');
      loadCompTable(openModal);
    }
  });
}
