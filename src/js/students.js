// ============================================
// Students CRUD Module
// ============================================

import { supabase, isConfigured } from './supabase.js';
import { convertGDriveUrl, showToast, escapeHtml, debounce } from './utils.js';
import { getCachedHouses, getHouses } from './houses.js';

let studentsCache = [];

export async function getStudents(filters = {}) {
  if (!isConfigured()) return [];
  let query = supabase.from('students').select('*, houses(name, color_hex)').eq('is_active', true).order('class').order('roll_number');
  if (filters.house_id) query = query.eq('house_id', filters.house_id);
  if (filters.search) query = query.ilike('name', `%${filters.search}%`);
  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  studentsCache = data || [];
  return studentsCache;
}

export async function addStudent(student) {
  if (!isConfigured()) { showToast('Student added (demo)', 'success'); return true; }
  const { error } = await supabase.from('students').insert(student);
  if (error) { showToast(error.message || 'Failed to add student', 'error'); return false; }
  showToast('Student added successfully', 'success');
  return true;
}

export async function updateStudent(id, updates) {
  if (!isConfigured()) { showToast('Student updated (demo)', 'success'); return true; }
  const { error } = await supabase.from('students').update(updates).eq('id', id);
  if (error) { showToast('Failed to update', 'error'); return false; }
  showToast('Student updated', 'success');
  return true;
}

export async function deleteStudent(id) {
  if (!isConfigured()) { showToast('Student deleted (demo)', 'success'); return true; }
  const { error } = await supabase.from('students').update({ is_active: false }).eq('id', id);
  if (error) { showToast('Failed to delete', 'error'); return false; }
  showToast('Student removed', 'success');
  return true;
}

export function renderStudentsPage(container, openModal) {
  container.innerHTML = `
    <div class="table-container">
      <div class="table-header">
        <h3>Manage Students</h3>
        <div style="display:flex;gap:var(--space-sm);align-items:center;flex-wrap:wrap">
          <div class="table-search">
            <input type="text" id="student-search" placeholder="Search students..." class="form-input" style="width:200px;padding:8px 14px;font-size:var(--font-sm)">
          </div>
          <select id="student-house-filter" class="form-select" style="width:150px;padding:8px 12px;font-size:var(--font-sm)">
            <option value="">All Houses</option>
          </select>
          <button class="btn btn-primary btn-sm" id="add-student-btn">+ Add Student</button>
        </div>
      </div>
      <div class="table-body">
        <table class="data-table">
          <thead><tr><th>Photo</th><th>Name</th><th>Class</th><th>Roll No</th><th>House</th><th>Contact</th><th>Actions</th></tr></thead>
          <tbody id="students-tbody"><tr><td colspan="7"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
    </div>`;

  populateHouseFilter();
  loadStudentsTable(openModal);

  document.getElementById('add-student-btn').addEventListener('click', () => openStudentModal(null, openModal));
  document.getElementById('student-search').addEventListener('input', debounce(() => loadStudentsTable(openModal), 300));
  document.getElementById('student-house-filter').addEventListener('change', () => loadStudentsTable(openModal));
}

async function populateHouseFilter() {
  const houses = getCachedHouses().length ? getCachedHouses() : await getHouses();
  const select = document.getElementById('student-house-filter');
  if (!select) return;
  houses.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h.id; opt.textContent = h.name;
    select.appendChild(opt);
  });
}

async function loadStudentsTable(openModal) {
  const search = document.getElementById('student-search')?.value || '';
  const houseId = document.getElementById('student-house-filter')?.value || '';
  const students = await getStudents({ search, house_id: houseId || undefined });
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;

  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>${isConfigured() ? 'No students found' : 'Connect Supabase to manage students'}</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => {
    const photo = convertGDriveUrl(s.photo_url);
    const hColor = s.houses?.color_hex || '#8a94a6';
    return `<tr>
      <td>${photo ? `<img class="student-photo" src="${photo}" onerror="this.outerHTML='<div class=\\'student-photo\\' style=\\'background:${hColor}15;color:${hColor};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;width:36px;height:36px;border-radius:50%\\'>${s.name.charAt(0)}</div>'">`
        : `<div class="student-photo" style="background:${hColor}15;color:${hColor};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;width:36px;height:36px;border-radius:50%">${s.name.charAt(0)}</div>`}</td>
      <td><strong style="color:var(--white)">${escapeHtml(s.name)}</strong></td>
      <td>${escapeHtml(s.class)}</td>
      <td>${s.roll_number}</td>
      <td><span class="house-dot" style="background:${hColor}"></span>${escapeHtml(s.houses?.name || '')}</td>
      <td>${s.contact_number || '—'}</td>
      <td><div class="table-actions">
        <button class="btn btn-secondary btn-sm edit-student" data-id="${s.id}">Edit</button>
        <button class="btn btn-danger btn-sm del-student" data-id="${s.id}">Delete</button>
      </div></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.edit-student').forEach(btn => {
    btn.addEventListener('click', () => {
      const st = students.find(s => s.id === btn.dataset.id);
      if (st) openStudentModal(st, openModal);
    });
  });
  tbody.querySelectorAll('.del-student').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Remove this student?')) {
        await deleteStudent(btn.dataset.id);
        loadStudentsTable(openModal);
      }
    });
  });
}

function openStudentModal(student, openModal) {
  const isEdit = !!student;
  const houses = getCachedHouses();
  const photoPreview = student ? convertGDriveUrl(student.photo_url) : '';

  openModal(isEdit ? 'Edit Student' : 'Add Student', `
    <form id="student-form">
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <input class="form-input" id="sf-name" value="${isEdit ? escapeHtml(student.name) : ''}" required placeholder="Student full name">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md)">
        <div class="form-group">
          <label class="form-label">Class *</label>
          <input class="form-input" id="sf-class" value="${isEdit ? escapeHtml(student.class) : ''}" required placeholder="e.g. Class 10-A">
        </div>
        <div class="form-group">
          <label class="form-label">Roll Number *</label>
          <input class="form-input" id="sf-roll" type="number" value="${isEdit ? student.roll_number : ''}" required placeholder="1" min="1">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">House *</label>
        <select class="form-select" id="sf-house" required>
          <option value="">Select House</option>
          ${houses.map(h => `<option value="${h.id}" ${isEdit && student.house_id === h.id ? 'selected' : ''}>${h.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Contact Number</label>
        <input class="form-input" id="sf-contact" value="${isEdit ? (student.contact_number || '') : ''}" placeholder="Phone number">
      </div>
      <div class="form-group">
        <label class="form-label">Photo URL (Google Drive)</label>
        <input class="form-input" id="sf-photo" value="${isEdit ? (student.photo_url || '') : ''}" placeholder="Paste Google Drive share link">
        <div class="image-preview" id="sf-photo-preview">
          ${photoPreview ? `<img src="${photoPreview}">` : '<span class="placeholder-text">Paste a Google Drive link to preview</span>'}
        </div>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%">${isEdit ? 'Save Changes' : 'Add Student'}</button>
    </form>
  `);

  document.getElementById('sf-photo').addEventListener('input', (e) => {
    const url = convertGDriveUrl(e.target.value);
    const prev = document.getElementById('sf-photo-preview');
    prev.innerHTML = url ? `<img src="${url}" onerror="this.outerHTML='<span class=\\'placeholder-text\\'>Invalid URL</span>'">` : '<span class="placeholder-text">Paste a Google Drive link to preview</span>';
  });

  document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('sf-name').value.trim(),
      class: document.getElementById('sf-class').value.trim(),
      roll_number: parseInt(document.getElementById('sf-roll').value),
      house_id: document.getElementById('sf-house').value,
      contact_number: document.getElementById('sf-contact').value.trim() || null,
      photo_url: document.getElementById('sf-photo').value.trim() || null
    };
    let success;
    if (isEdit) success = await updateStudent(student.id, data);
    else success = await addStudent(data);
    if (success) {
      document.getElementById('modal-backdrop').classList.remove('active');
      loadStudentsTable(openModal);
    }
  });
}
