// ============================================
// Admin Entry Point
// ============================================

import './css/variables.css';
import './css/base.css';
import './css/animations.css';
import './css/components.css';
import './css/admin.css';

import { login, checkSession, logout, changePassword, canLocalReset, resetPasswordLocally } from './js/auth.js';
import { renderHousesPage, getHouses } from './js/houses.js';
import { renderStudentsPage } from './js/students.js';
import { renderCompetitionsPage } from './js/competitions.js';
import { showToast, loadSchoolLogo } from './js/utils.js';
import { api } from './js/api.js';
import { renderWebsitePage, hasUnsavedWebsiteChanges, forgetWebsiteEditor } from './js/site-editor.js';
import { renderEnquiriesPage } from './js/enquiries.js';

document.addEventListener('DOMContentLoaded', () => {
  loadSchoolLogo();
  const loginPage = document.getElementById('login-page');
  const adminPanel = document.getElementById('admin-panel');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');

  // Ask the server whether this browser is already signed in
  loginPage.style.display = 'none';
  checkSession().then(ok => (ok ? showAdmin() : showLogin()));

  // A request was refused because the session ended: go back to the login form
  window.addEventListener('hps:signed-out', () => {
    if (adminPanel.style.display === 'none') return;
    document.getElementById('modal-backdrop').classList.remove('active');
    showLogin();
    showToast('Your session has ended. Please sign in again.', 'info');
  });

  function showLogin() {
    loginPage.style.display = '';
    adminPanel.style.display = 'none';
    document.getElementById('local-reset').style.display = canLocalReset() ? '' : 'none';
  }

  // Set / reset the admin password — offered only on the owner's own computer
  const resetForm = document.getElementById('local-reset-form');
  const resetError = document.getElementById('local-reset-error');
  document.getElementById('local-reset-toggle').addEventListener('click', (e) => {
    e.preventDefault();
    resetForm.style.display = resetForm.style.display === 'none' ? '' : 'none';
  });
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    resetError.style.display = 'none';
    const pwd = document.getElementById('reset-pwd').value;
    if (pwd !== document.getElementById('reset-pwd2').value) {
      resetError.textContent = 'The two passwords do not match.';
      resetError.style.display = 'block';
      return;
    }
    const result = await resetPasswordLocally(pwd);
    if (result.success) {
      resetForm.reset();
      resetForm.style.display = 'none';
      showAdmin();
      showToast('Admin password saved. You are signed in.', 'success');
    } else {
      resetError.textContent = result.message || 'Could not save the password.';
      resetError.style.display = 'block';
    }
  });

  function showAdmin() {
    loginPage.style.display = 'none';
    adminPanel.style.display = '';
    getHouses(); // preload
    navigateTo('dashboard');
  }

  // Number of unread website enquiries, shown next to "Enquiries" in the sidebar
  function setEnquiryBadge(count) {
    const badge = document.getElementById('enquiry-badge');
    if (!badge) return;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = !count;
  }

  // Warn before closing the tab with unsaved website edits
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedWebsiteChanges()) { e.preventDefault(); e.returnValue = ''; }
  });

  // Login form
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    const pwd = document.getElementById('login-password').value;
    const result = await login(pwd);
    if (result.success) {
      loginForm.reset();
      showAdmin();
      showToast('Welcome back, Admin!', 'success');
    } else {
      loginError.textContent = result.message || 'Invalid password. Please try again.';
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
  let currentPage = null;
  function navigateTo(page, options = {}) {
    if (currentPage === 'website' && page !== 'website' && hasUnsavedWebsiteChanges()
      && !confirm('You have unsaved website changes. Leave without saving?')) return;
    if (currentPage === 'website') forgetWebsiteEditor();
    currentPage = page;

    // Update sidebar active state
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar-nav a[data-page="${page}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Update title
    const titles = {
      dashboard: 'Dashboard', website: 'Website', enquiries: 'Enquiries', houses: 'Houses',
      students: 'Students', competitions: 'Competitions', settings: 'Settings',
    };
    document.getElementById('page-title').textContent = titles[page] || 'Dashboard';

    const content = document.getElementById('admin-content');
    content.onclick = null;

    // Close sidebar on mobile
    sidebar.classList.remove('open');
    window.scrollTo(0, 0);

    switch (page) {
      case 'dashboard': renderDashboardPage(content); break;
      case 'website': renderWebsitePage(content, options.section); break;
      case 'enquiries': renderEnquiriesPage(content, setEnquiryBadge); break;
      case 'houses': renderHousesPage(content, openModal); break;
      case 'students': renderStudentsPage(content, openModal); break;
      case 'competitions': renderCompetitionsPage(content, openModal); break;
      case 'settings': renderSettingsPage(content, openModal); break;
      default: renderDashboardPage(content);
    }
  }

  // Admin Dashboard
  async function renderDashboardPage(container) {
    container.innerHTML = `
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
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">New Enquiries</div><div class="stat-value accent" id="stat-enquiries">—</div></div>
        <div class="stat-card"><div class="stat-label">Total Students</div><div class="stat-value accent" id="stat-students">—</div></div>
        <div class="stat-card"><div class="stat-label">Competitions</div><div class="stat-value accent" id="stat-comps">—</div></div>
        <div class="stat-card"><div class="stat-label">Total Points Awarded</div><div class="stat-value accent" id="stat-total-pts">—</div></div>
      </div>
      <div class="quick-links">
        <button class="quick-link" data-go="website" data-section="notice"><strong>Update the notice bar</strong><span>Change the scrolling announcement on every page</span></button>
        <button class="quick-link" data-go="website" data-section="news"><strong>Post a notice</strong><span>Add news or an announcement to the Notices page</span></button>
        <button class="quick-link" data-go="website" data-section="gallery"><strong>Add photos</strong><span>Upload pictures to the gallery</span></button>
        <button class="quick-link" data-go="enquiries"><strong>Read enquiries</strong><span>Messages from the Admissions and Contact forms</span></button>
        <button class="quick-link" data-go="competitions"><strong>Enter competition results</strong><span>Points update the house leaderboard instantly</span></button>
        <button class="quick-link" data-go="website" data-section="faculty"><strong>Update faculty</strong><span>Add or edit teachers and staff</span></button>
      </div>
    `;
    container.onclick = (e) => {
      const go = e.target.closest('[data-go]');
      if (go) navigateTo(go.dataset.go, { section: go.dataset.section });
    };

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

      const totalPts = houses.reduce((s, h) => s + (h.total_points || 0), 0);
      if (document.getElementById('stat-total-pts')) document.getElementById('stat-total-pts').textContent = totalPts;

      const stats = await api('stats.get');
      if (document.getElementById('stat-students')) document.getElementById('stat-students').textContent = stats.students || 0;
      if (document.getElementById('stat-comps')) document.getElementById('stat-comps').textContent = stats.competitions || 0;
      if (document.getElementById('stat-enquiries')) document.getElementById('stat-enquiries').textContent = stats.newEnquiries || 0;
      setEnquiryBadge(stats.newEnquiries || 0);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  }

  // Settings Page
  async function renderSettingsPage(container) {
    let dbConnected = true;
    try {
      await api('site.get');
    } catch (err) {
      dbConnected = false;
      console.error('Database check failed', err);
    }

    container.innerHTML = `
      <div style="max-width:500px">
        <div class="table-container" style="margin-bottom:var(--space-xl)">
          <div class="table-header"><h3>School logo &amp; details</h3></div>
          <div style="padding:var(--space-xl);color:var(--text-secondary)">
            <p>The school crest, name, address, phone numbers and social links are now edited under
              <strong style="color:var(--white)">Website → School details</strong>.</p>
            <button type="button" class="btn btn-primary btn-sm" id="go-school-details" style="margin-top:var(--space-md)">Open School details</button>
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
                <input class="form-input" type="password" id="new-pwd" required minlength="8">
              </div>
              <button type="submit" class="btn btn-primary">Update Password</button>
            </form>
          </div>
        </div>
        <div class="table-container">
          <div class="table-header"><h3>About</h3></div>
          <div style="padding:var(--space-xl);color:var(--text-secondary)">
            <p><strong style="color:var(--white)">Howly Public School — website &amp; house system</strong></p>
            <p style="margin-top:var(--space-sm)">Everything on the public website and the house leaderboard is managed from this panel.</p>
            <p style="margin-top:var(--space-sm);font-size:var(--font-sm);color:var(--text-muted)">Database (MongoDB): ${dbConnected ? '✅ Connected' : '❌ Not reachable'}</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById('go-school-details').addEventListener('click', () => navigateTo('website', { section: 'general' }));

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
