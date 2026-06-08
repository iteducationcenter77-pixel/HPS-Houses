// ============================================
// Admin Entry Point
// ============================================

import './css/variables.css';
import './css/base.css';
import './css/animations.css';
import './css/components.css';
import './css/admin.css';

import { login, isLoggedIn, logout, changePassword } from './js/auth.js';
import { renderHousesPage, getHouses } from './js/houses.js';
import { renderStudentsPage } from './js/students.js';
import { renderCompetitionsPage } from './js/competitions.js';
import { showToast, escapeHtml, loadSchoolLogo } from './js/utils.js';
import { isConfigured } from './js/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  loadSchoolLogo();
  const loginPage = document.getElementById('login-page');
  const adminPanel = document.getElementById('admin-panel');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');

  // Check session
  if (isLoggedIn()) showAdmin();
  else showLogin();

  function showLogin() {
    loginPage.style.display = '';
    adminPanel.style.display = 'none';
  }

  function showAdmin() {
    loginPage.style.display = 'none';
    adminPanel.style.display = '';
    getHouses(); // preload
    navigateTo('dashboard');
  }

  // Login form
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    const pwd = document.getElementById('login-password').value;
    const ok = await login(pwd);
    if (ok) {
      showAdmin();
      showToast('Welcome back, Admin!', 'success');
    } else {
      loginError.style.display = 'block';
    }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    logout();
    showLogin();
    showToast('Logged out', 'info');
  });

  // Sidebar navigation
  document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  // Sidebar toggle (mobile)
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  // Modal helpers
  function openModal(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-backdrop').classList.add('active');
  }

  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('modal-backdrop').classList.remove('active');
  });
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
  });

  // Page navigation
  function navigateTo(page) {
    // Update sidebar active state
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar-nav a[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Update title
    const titles = { dashboard: 'Dashboard', houses: 'Houses', students: 'Students', competitions: 'Competitions', settings: 'Settings' };
    document.getElementById('page-title').textContent = titles[page] || 'Dashboard';

    const content = document.getElementById('admin-content');

    // Close sidebar on mobile
    sidebar.classList.remove('open');

    switch (page) {
      case 'dashboard': renderDashboardPage(content); break;
      case 'houses': renderHousesPage(content, openModal); break;
      case 'students': renderStudentsPage(content, openModal); break;
      case 'competitions': renderCompetitionsPage(content, openModal); break;
      case 'settings': renderSettingsPage(content, openModal); break;
      default: renderDashboardPage(content);
    }
  }

  // Admin Dashboard
  async function renderDashboardPage(container) {
    const configured = isConfigured();
    container.innerHTML = `
      ${!configured ? `<div style="background:rgba(240,194,68,0.1);border:1px solid var(--accent);border-radius:var(--radius-md);padding:var(--space-lg);margin-bottom:var(--space-xl);color:var(--accent)">
        <strong>⚠ Demo Mode</strong> — Connect Supabase to enable full functionality. Edit <code>src/js/supabase.js</code> with your project credentials.
      </div>` : ''}
      <div class="stats-grid" id="admin-stats">
        <div class="stat-card orion">
          <div class="stat-label">Orion Points</div>
          <div class="stat-value" style="color:var(--orion)">—</div>
        </div>
        <div class="stat-card titans">
          <div class="stat-label">Titans Points</div>
          <div class="stat-value" style="color:var(--titans)">—</div>
        </div>
        <div class="stat-card phoenix">
          <div class="stat-label">Phoenix Points</div>
          <div class="stat-value" style="color:var(--phoenix)">—</div>
        </div>
        <div class="stat-card spartans">
          <div class="stat-label">Spartans Points</div>
          <div class="stat-value" style="color:var(--spartans)">—</div>
        </div>
      </div>
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-card"><div class="stat-label">Total Students</div><div class="stat-value accent" id="stat-students">—</div></div>
        <div class="stat-card"><div class="stat-label">Competitions</div><div class="stat-value accent" id="stat-comps">—</div></div>
        <div class="stat-card"><div class="stat-label">Total Points Awarded</div><div class="stat-value accent" id="stat-total-pts">—</div></div>
      </div>
      <div style="margin-top:var(--space-xl);text-align:center;color:var(--text-muted);padding:var(--space-2xl)">
        <p style="font-size:var(--font-lg);margin-bottom:var(--space-sm)">👋 Welcome to HPS Admin Panel</p>
        <p>Use the sidebar to manage Houses, Students, and Competitions.</p>
      </div>
    `;

    // Load stats
    try {
      const houses = await getHouses();
      const statsGrid = document.getElementById('admin-stats');
      if (statsGrid && houses.length) {
        const houseOrder = ['Orion', 'Titans', 'Phoenix', 'Spartans'];
        const cards = statsGrid.querySelectorAll('.stat-card');
        houseOrder.forEach((name, i) => {
          const h = houses.find(x => x.name === name);
          if (h && cards[i]) cards[i].querySelector('.stat-value').textContent = h.total_points;
        });
      }

      if (configured) {
        const { supabase } = await import('./js/supabase.js');
        const { count: studentCount, error: sErr } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true);
        if (!sErr && document.getElementById('stat-students')) document.getElementById('stat-students').textContent = studentCount || 0;

        const { count: compCount, error: cErr } = await supabase.from('competitions').select('*', { count: 'exact', head: true });
        if (!cErr && document.getElementById('stat-comps')) document.getElementById('stat-comps').textContent = compCount || 0;

        const totalPts = houses.reduce((s, h) => s + (h.total_points || 0), 0);
        if (document.getElementById('stat-total-pts')) document.getElementById('stat-total-pts').textContent = totalPts;
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  }

  // Settings Page
  async function renderSettingsPage(container) {
    let logoUrl = '';
    if (isConfigured()) {
      try {
        const { supabase } = await import('./js/supabase.js');
        const { data } = await supabase.from('admin_settings').select('school_logo_url').eq('id', 1).single();
        if (data) logoUrl = data.school_logo_url || '';
      } catch (err) { console.error('Error fetching logo', err); }
    }

    container.innerHTML = `
      <div style="max-width:500px">
        <div class="table-container" style="margin-bottom:var(--space-xl)">
          <div class="table-header"><h3>School Logo</h3></div>
          <div style="padding:var(--space-xl)">
            <form id="logo-form">
              <div class="form-group">
                <label class="form-label">School Logo URL (Google Drive)</label>
                <input class="form-input" type="text" id="school-logo" value="${escapeHtml(logoUrl)}" placeholder="Paste Google Drive share link">
              </div>
              <button type="submit" class="btn btn-primary">Update Logo</button>
            </form>
          </div>
        </div>
        <div class="table-container" style="margin-bottom:var(--space-xl)">
          <div class="table-header"><h3>Change Admin Password</h3></div>
          <div style="padding:var(--space-xl)">
            <form id="password-form">
              <div class="form-group">
                <label class="form-label">Current Password</label>
                <input class="form-input" type="password" id="current-pwd" required>
              </div>
              <div class="form-group">
                <label class="form-label">New Password</label>
                <input class="form-input" type="password" id="new-pwd" required minlength="6">
              </div>
              <button type="submit" class="btn btn-primary">Update Password</button>
            </form>
          </div>
        </div>
        <div class="table-container">
          <div class="table-header"><h3>About</h3></div>
          <div style="padding:var(--space-xl);color:var(--text-secondary)">
            <p><strong style="color:var(--white)">HPS House Management System</strong></p>
            <p style="margin-top:var(--space-sm)">Howly Public School — Shaping Future Leaders</p>
            <p style="margin-top:var(--space-sm);font-size:var(--font-sm);color:var(--text-muted)">Supabase: ${isConfigured() ? '✅ Connected' : '❌ Not configured'}</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById('logo-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!isConfigured()) return showToast('Cannot update logo in demo mode', 'error');
      
      const newUrl = document.getElementById('school-logo').value;
      const { supabase } = await import('./js/supabase.js');
      
      // Use update instead of upsert for better RLS compatibility
      const { error } = await supabase.from('admin_settings')
        .update({ school_logo_url: newUrl, updated_at: new Date().toISOString() })
        .eq('id', 1);
      
      if (error) {
        console.error('Logo update error:', error);
        showToast('Failed: ' + error.message, 'error');
      } else {
        showToast('School logo updated!', 'success');
        import('./js/utils.js').then(m => m.loadSchoolLogo());
      }
    });

    document.getElementById('password-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const result = await changePassword(
        document.getElementById('current-pwd').value,
        document.getElementById('new-pwd').value
      );
      showToast(result.message, result.success ? 'success' : 'error');
      if (result.success) e.target.reset();
    });
  }
});
