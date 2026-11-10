// ============================================
// Houses CRUD Module
// ============================================

import { api } from './api.js';
import { convertGDriveUrl, showToast, escapeHtml } from './utils.js';

let housesCache = [];

export async function getHouses() {
  try {
    housesCache = await api('houses.list');
  } catch (err) {
    console.error(err);
    housesCache = [];
  }
  return housesCache;
}

export function getCachedHouses() { return housesCache; }

export async function updateHouse(id, updates) {
  try {
    await api('houses.update', { id, updates });
  } catch (err) {
    showToast(err.message || 'Failed to update house', 'error');
    return false;
  }
  showToast('House updated successfully', 'success');
  return true;
}

export function renderHousesPage(container, openModal) {
  container.innerHTML = `
    <div class="table-container">
      <div class="table-header">
        <h3>Manage Houses</h3>
      </div>
      <div class="table-body">
        <table class="data-table">
          <thead><tr><th>House</th><th>Color</th><th>Motto</th><th>Points</th><th>Logo</th><th>Actions</th></tr></thead>
          <tbody id="houses-tbody"><tr><td colspan="6"><div class="spinner"></div></td></tr></tbody>
        </table>
      </div>
    </div>`;
  loadHousesTable(openModal);
}

async function loadHousesTable(openModal) {
  const houses = await getHouses();
  const tbody = document.getElementById('houses-tbody');
  if (!tbody) return;
  if (!houses.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><p>No houses found</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = houses.map(h => {
    const logo = convertGDriveUrl(h.logo_url);
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:10px">
        <span class="house-dot" style="background:${h.color_hex}"></span>
        <strong style="color:var(--white)">${escapeHtml(h.name)}</strong>
      </div></td>
      <td><span style="display:inline-block;width:24px;height:24px;border-radius:6px;background:${h.color_hex}"></span></td>
      <td>${escapeHtml(h.motto || '-')}</td>
      <td><strong style="color:${h.color_hex}">${h.total_points}</strong></td>
      <td>${logo ? `<img src="${logo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover" onerror="this.outerHTML='—'">` : '—'}</td>
      <td><button class="btn btn-secondary btn-sm edit-house-btn" data-id="${h.id}">Edit</button></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.edit-house-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const house = houses.find(h => h.id === btn.dataset.id);
      if (house) openEditHouseModal(house, openModal);
    });
  });
}

function openEditHouseModal(house, openModal) {
  const logoPreview = convertGDriveUrl(house.logo_url);
  openModal('Edit House — ' + house.name, `
    <form id="edit-house-form">
      <div class="form-group">
        <label class="form-label">House Name</label>
        <input class="form-input" value="${escapeHtml(house.name)}" disabled>
      </div>
      <div class="form-group">
        <label class="form-label">Motto</label>
        <input class="form-input" id="house-motto" value="${escapeHtml(house.motto || '')}" placeholder="Enter house motto">
      </div>
      <div class="form-group">
        <label class="form-label">Logo URL (Google Drive)</label>
        <input class="form-input" id="house-logo-url" value="${escapeHtml(house.logo_url || '')}" placeholder="Paste Google Drive share link">
        <div class="image-preview" id="house-logo-preview">
          ${logoPreview ? `<img src="${logoPreview}" alt="Preview">` : '<span class="placeholder-text">Paste a Google Drive link to preview</span>'}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Total Points</label>
        <input class="form-input" id="house-points" type="number" value="${house.total_points}" min="0">
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%">Save Changes</button>
    </form>
  `);

  const logoInput = document.getElementById('house-logo-url');
  const preview = document.getElementById('house-logo-preview');
  logoInput.addEventListener('input', () => {
    const url = convertGDriveUrl(logoInput.value);
    preview.innerHTML = url ? `<img src="${url}" alt="Preview" onerror="this.outerHTML='<span class=\\'placeholder-text\\'>Invalid image URL</span>'">` : '<span class="placeholder-text">Paste a Google Drive link to preview</span>';
  });

  document.getElementById('edit-house-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const success = await updateHouse(house.id, {
      motto: document.getElementById('house-motto').value,
      logo_url: logoInput.value,
      total_points: parseInt(document.getElementById('house-points').value) || 0
    });
    if (success) {
      document.getElementById('modal-backdrop').classList.remove('active');
      loadHousesTable(openModal);
    }
  });
}
