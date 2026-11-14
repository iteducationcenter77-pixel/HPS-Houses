// ============================================
// Students: list, add/edit (with photo upload), bulk Excel import
// ============================================

import { api } from './api.js';
import { convertGDriveUrl, showToast, escapeHtml, debounce } from './utils.js';
import { getCachedHouses, getHouses } from './houses.js';
import { resizeImage } from './site-editor.js';

let studentsCache = [];

export async function getStudents(filters = {}) {
  try {
    studentsCache = await api('students.list', { house_id: filters.house_id, search: filters.search });
  } catch (err) {
    console.error(err);
    studentsCache = [];
  }
  return studentsCache;
}

export async function addStudent(student) {
  try {
    await api('students.add', { student });
  } catch (err) {
    showToast(err.message || 'Failed to add student', 'error');
    return false;
  }
  showToast('Student added successfully', 'success');
  return true;
}

export async function updateStudent(id, updates) {
  try {
    await api('students.update', { id, updates });
  } catch (err) {
    showToast(err.message || 'Failed to update', 'error');
    return false;
  }
  showToast('Student updated', 'success');
  return true;
}

export async function deleteStudent(id) {
  try {
    await api('students.delete', { id });
  } catch (err) {
    showToast(err.message || 'Failed to delete', 'error');
    return false;
  }
  showToast('Student removed', 'success');
  return true;
}

const closeModal = () => document.getElementById('modal-backdrop').classList.remove('active');

function avatar(s, size = 36) {
  const photo = convertGDriveUrl(s.photo_url);
  const color = s.houses?.color_hex || '#8a94a6';
  const initial = escapeHtml((s.name || '?').charAt(0));
  const fallback = `<div class="student-photo student-photo--initial" style="--hc:${escapeHtml(color)};width:${size}px;height:${size}px">${initial}</div>`;
  return photo
    ? `<img class="student-photo" style="width:${size}px;height:${size}px" src="${escapeHtml(photo)}" alt="" onerror="this.outerHTML=this.dataset.fallback" data-fallback="${escapeHtml(fallback)}">`
    : fallback;
}

export function renderStudentsPage(container, openModal) {
  container.innerHTML = `
    <div class="table-container">
      <div class="table-header">
        <h3>Manage Students</h3>
        <div style="display:flex;gap:var(--space-sm);align-items:center;flex-wrap:wrap">
          <div class="table-search">
            <input type="text" id="student-search" placeholder="Search by name…" class="form-input" style="width:200px;padding:8px 14px;font-size:var(--font-sm)">
          </div>
          <select id="student-house-filter" class="form-select" style="width:150px;padding:8px 12px;font-size:var(--font-sm)">
            <option value="">All Houses</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="import-students-btn">⇪ Import from Excel</button>
          <button class="btn btn-primary btn-sm" id="add-student-btn">+ Add Student</button>
        </div>
      </div>
      <div class="table-body">
        <table class="data-table">
          <thead><tr><th>Photo</th><th>Name</th><th>Chest No.</th><th>Class</th><th>Roll No</th><th>House</th><th>Contact</th><th>Actions</th></tr></thead>
          <tbody id="students-tbody"><tr><td colspan="8"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
      <div class="table-foot" id="students-count"></div>
    </div>`;

  populateHouseFilter();
  loadStudentsTable(openModal);

  document.getElementById('add-student-btn').addEventListener('click', () => openStudentModal(null, openModal));
  document.getElementById('import-students-btn').addEventListener('click', () => openImportModal(openModal));
  document.getElementById('student-search').addEventListener('input', debounce(() => loadStudentsTable(openModal), 300));
  document.getElementById('student-house-filter').addEventListener('change', () => loadStudentsTable(openModal));
}

async function populateHouseFilter() {
  const houses = getCachedHouses().length ? getCachedHouses() : await getHouses();
  const select = document.getElementById('student-house-filter');
  if (!select) return;
  houses.forEach((h) => {
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
  const count = document.getElementById('students-count');
  if (count) count.textContent = students.length ? `${students.length} student${students.length === 1 ? '' : 's'}` : '';

  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>No students found</p><p style="font-size:var(--font-sm);margin-top:8px">Add them one by one, or use <strong>Import from Excel</strong> to add many at once.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = students.map((s) => {
    const hColor = s.houses?.color_hex || '#8a94a6';
    return `<tr>
      <td>${avatar(s)}</td>
      <td><strong style="color:var(--white)">${escapeHtml(s.name)}</strong></td>
      <td>${s.chest_number ? `<span class="chest-badge">${escapeHtml(s.chest_number)}</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td>${escapeHtml(s.class)}</td>
      <td>${escapeHtml(s.roll_number)}</td>
      <td><span class="house-dot" style="background:${escapeHtml(hColor)}"></span>${escapeHtml(s.houses?.name || '')}</td>
      <td>${escapeHtml(s.contact_number || '—')}</td>
      <td><div class="table-actions">
        <button class="btn btn-secondary btn-sm edit-student" data-id="${escapeHtml(s.id)}">Edit</button>
        <button class="btn btn-danger btn-sm del-student" data-id="${escapeHtml(s.id)}">Delete</button>
      </div></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.edit-student').forEach((btn) => {
    btn.addEventListener('click', () => {
      const st = students.find((s) => s.id === btn.dataset.id);
      if (st) openStudentModal(st, openModal);
    });
  });
  tbody.querySelectorAll('.del-student').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (confirm('Remove this student? Their past competition results are kept.')) {
        await deleteStudent(btn.dataset.id);
        loadStudentsTable(openModal);
      }
    });
  });
}

// ── Add / edit one student ──

function photoPreview(url) {
  const src = convertGDriveUrl(url);
  return src
    ? `<img src="${escapeHtml(src)}" alt="" onerror="this.outerHTML='<span class=\\'placeholder-text\\'>Could not load this picture</span>'">`
    : '<span class="placeholder-text">No photo yet</span>';
}

function openStudentModal(student, openModal) {
  const isEdit = !!student;
  const houses = getCachedHouses();
  const v = (k) => (isEdit && student[k] !== undefined && student[k] !== null ? escapeHtml(student[k]) : '');

  openModal(isEdit ? 'Edit Student' : 'Add Student', `
    <form id="student-form">
      <div class="form-group">
        <label class="form-label" for="sf-name">Full name *</label>
        <input class="form-input" id="sf-name" value="${v('name')}" required placeholder="Student full name">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md)">
        <div class="form-group">
          <label class="form-label" for="sf-class">Class *</label>
          <input class="form-input" id="sf-class" value="${v('class')}" required placeholder="e.g. Class X">
        </div>
        <div class="form-group">
          <label class="form-label" for="sf-roll">Roll number *</label>
          <input class="form-input" id="sf-roll" type="number" value="${v('roll_number')}" required placeholder="1" min="1">
        </div>
        <div class="form-group">
          <label class="form-label" for="sf-house">House *</label>
          <select class="form-select" id="sf-house" required>
            <option value="">Select house</option>
            ${houses.map((h) => `<option value="${escapeHtml(h.id)}" ${isEdit && student.house_id === h.id ? 'selected' : ''}>${escapeHtml(h.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="sf-chest">Chest number</label>
          <input class="form-input" id="sf-chest" value="${v('chest_number')}" maxlength="12" placeholder="e.g. 101">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="sf-contact">Contact number</label>
        <input class="form-input" id="sf-contact" value="${v('contact_number')}" maxlength="15" placeholder="Phone number">
      </div>
      <div class="form-group">
        <span class="form-label">Photo</span>
        <div class="student-photo-row">
          <div class="image-preview student-photo-preview" id="sf-photo-preview">${photoPreview(isEdit ? student.photo_url : '')}</div>
          <div class="student-photo-actions">
            <label class="btn btn-secondary btn-sm" style="cursor:pointer"><span id="sf-upload-label">Upload photo</span><input type="file" id="sf-photo-file" accept="image/jpeg,image/png,image/webp" hidden></label>
            <input class="form-input" id="sf-photo" value="${v('photo_url')}" placeholder="…or paste a link (Google Drive works)">
          </div>
        </div>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%">${isEdit ? 'Save Changes' : 'Add Student'}</button>
    </form>
  `);

  const photoInput = document.getElementById('sf-photo');
  const preview = document.getElementById('sf-photo-preview');
  photoInput.addEventListener('input', () => { preview.innerHTML = photoPreview(photoInput.value.trim()); });

  document.getElementById('sf-photo-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const label = document.getElementById('sf-upload-label');
    label.textContent = 'Uploading…';
    try {
      const dataUrl = await resizeImage(file, { maxSize: 700, png: false });
      const { url } = await api('media.upload', { data_url: dataUrl });
      photoInput.value = url;
      preview.innerHTML = photoPreview(url);
      label.textContent = 'Replace photo';
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error');
      label.textContent = 'Upload photo';
    }
  });

  document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('sf-name').value.trim(),
      class: document.getElementById('sf-class').value.trim(),
      roll_number: parseInt(document.getElementById('sf-roll').value, 10),
      house_id: document.getElementById('sf-house').value,
      chest_number: document.getElementById('sf-chest').value.trim() || null,
      contact_number: document.getElementById('sf-contact').value.trim() || null,
      photo_url: photoInput.value.trim() || null,
    };
    const success = isEdit ? await updateStudent(student.id, data) : await addStudent(data);
    if (success) {
      closeModal();
      loadStudentsTable(openModal);
    }
  });
}

// ── Bulk import from Excel ──

// Accepted column titles (any capitalisation) for each field.
const COLUMNS = {
  name: ['name', 'student name', 'full name', 'student'],
  class: ['class', 'standard', 'grade'],
  roll_number: ['roll number', 'roll no', 'roll no.', 'roll'],
  house: ['house', 'house name'],
  chest_number: ['chest number', 'chest no', 'chest no.', 'chest'],
  contact_number: ['contact number', 'contact', 'phone', 'mobile', 'phone number', 'mobile number'],
  photo_url: ['photo link', 'photo', 'photo url', 'image', 'picture'],
};
const SAMPLE_HEADERS = ['Name', 'Class', 'Roll Number', 'House', 'Chest Number', 'Contact Number', 'Photo Link'];

const cellText = (v) => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
  return String(v).trim();
};

async function downloadSample() {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const houses = getCachedHouses().length ? getCachedHouses() : await getHouses();
  const names = houses.map((h) => h.name);
  const h = (value) => ({ value, fontWeight: 'bold', backgroundColor: '#F0C244', color: '#0A1628' });
  const students = [
    SAMPLE_HEADERS.map(h),
    ['Aarav Das', 'Class V', 1, names[0] || 'Orion', '101', '9876543210', ''],
    ['Riya Begum', 'Class V', 2, names[1] || 'Titans', '102', '', ''],
    ['Kabir Nath', 'Class VI', 1, names[2] || 'Phoenix', '201', '9123456780', ''],
  ];
  const help = [
    [h('How to fill the Students sheet')],
    ['One student per row. Keep the column titles in the first row exactly as they are.'],
    ['Required: Name, Class, Roll Number, House.'],
    [`House must be one of: ${names.join(', ')}.`],
    ['Chest Number is optional but must be different for every student.'],
    ['Photo Link is optional — paste a Google Drive share link or any image web link. You can also add photos later from the admin panel.'],
    ['If a row has the same Class and Roll Number as a student already saved, that student is updated instead of added again.'],
    ['Delete the three example rows before importing.'],
  ];
  await writeExcelFile([
    { data: students, sheet: 'Students', columns: [{ width: 26 }, { width: 12 }, { width: 13 }, { width: 14 }, { width: 15 }, { width: 17 }, { width: 40 }] },
    { data: help, sheet: 'How to fill', columns: [{ width: 110 }] },
  ]).toFile('HPS-students-sample.xlsx');
}

function openImportModal(openModal) {
  openModal('Import students from Excel', `
    <div class="import">
      <ol class="import-steps">
        <li><strong>Download the sample sheet</strong> — it has the right columns and a short guide.</li>
        <li><strong>Fill in one student per row</strong> — Name, Class, Roll Number and House are required; Chest Number, Contact and Photo Link are optional.</li>
        <li><strong>Upload the file here</strong> — everything is checked before anything is saved.</li>
      </ol>
      <div class="import-actions">
        <button type="button" class="btn btn-secondary btn-sm" id="import-sample">⇩ Download sample (.xlsx)</button>
        <label class="btn btn-primary btn-sm" style="cursor:pointer">⇪ Choose Excel file<input type="file" id="import-file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></label>
      </div>
      <div id="import-result"></div>
    </div>`);
  document.getElementById('modal').classList.add('modal--wide');

  document.getElementById('import-sample').addEventListener('click', async () => {
    try { await downloadSample(); } catch (err) { showToast(`Could not create the sample: ${err.message}`, 'error'); }
  });

  let rows = [];
  const result = document.getElementById('import-result');

  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    result.innerHTML = '<div class="spinner"></div>';
    try {
      const { readSheet } = await import('read-excel-file/browser');
      const sheet = await readSheet(file);
      if (!sheet.length) throw new Error('The first sheet is empty');
      const header = sheet[0].map((c) => cellText(c).toLowerCase());
      const index = Object.fromEntries(Object.entries(COLUMNS).map(([field, names]) => [field, header.findIndex((t) => names.includes(t))]));
      const missing = ['name', 'class', 'roll_number', 'house'].filter((f) => index[f] < 0);
      if (missing.length) {
        throw new Error(`Missing column${missing.length > 1 ? 's' : ''}: ${missing.map((f) => SAMPLE_HEADERS[Object.keys(COLUMNS).indexOf(f)]).join(', ')}. Please use the sample sheet.`);
      }
      rows = sheet.slice(1).map((r, i) => {
        const row = { __row: i + 2 };
        for (const [field, col] of Object.entries(index)) if (col >= 0) row[field] = cellText(r[col]);
        return row;
      }).filter((r) => Object.entries(r).some(([k, v]) => k !== '__row' && v));
      if (!rows.length) throw new Error('No students found below the header row');
      showPreview();
    } catch (err) {
      rows = [];
      result.innerHTML = `<div class="import-error">${escapeHtml(err.message || 'Could not read this file. Please save it as .xlsx and try again.')}</div>`;
    }
  });

  function showPreview() {
    const shown = rows.slice(0, 8);
    result.innerHTML = `
      <div class="import-summary"><strong>${rows.length}</strong> student${rows.length === 1 ? '' : 's'} found in the sheet.</div>
      <div class="table-body import-preview">
        <table class="data-table">
          <thead><tr><th>Row</th>${SAMPLE_HEADERS.slice(0, 6).map((t) => `<th>${t}</th>`).join('')}</tr></thead>
          <tbody>${shown.map((r) => `<tr><td>${r.__row}</td>${['name', 'class', 'roll_number', 'house', 'chest_number', 'contact_number'].map((k) => `<td>${escapeHtml(r[k] || '—')}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
      ${rows.length > shown.length ? `<p class="import-more">…and ${rows.length - shown.length} more</p>` : ''}
      <div id="import-errors"></div>
      <button type="button" class="btn btn-primary" id="import-go" style="width:100%;margin-top:var(--space-md)">Import ${rows.length} student${rows.length === 1 ? '' : 's'}</button>`;
    document.getElementById('import-go').addEventListener('click', runImport);
  }

  async function runImport() {
    const btn = document.getElementById('import-go');
    btn.disabled = true;
    btn.textContent = 'Checking and importing…';
    try {
      const res = await api('students.import', { rows });
      if (!res.imported) {
        document.getElementById('import-errors').innerHTML = `
          <div class="import-error">
            <strong>Nothing was imported — please fix ${res.errorCount} problem${res.errorCount === 1 ? '' : 's'} in the sheet and upload it again:</strong>
            <ul>${res.errors.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>
            ${res.errorCount > res.errors.length ? `<p>…and ${res.errorCount - res.errors.length} more.</p>` : ''}
          </div>`;
        btn.disabled = false;
        btn.textContent = `Import ${rows.length} students`;
        return;
      }
      closeModal();
      showToast(`Imported: ${res.added} added, ${res.updated} updated`, 'success');
      loadStudentsTable(openModal);
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
      btn.disabled = false;
      btn.textContent = `Import ${rows.length} students`;
    }
  }
}
