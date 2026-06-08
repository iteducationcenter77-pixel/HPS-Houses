// ============================================
// Main Entry — Public Dashboard
// ============================================

import './css/variables.css';
import './css/base.css';
import './css/animations.css';
import './css/components.css';
import './css/dashboard.css';

import { initDashboard } from './js/dashboard.js';
import { loadSchoolLogo } from './js/utils.js';

// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('navbar-hamburger');
  const nav = document.getElementById('navbar-nav');
  if (hamburger && nav) {
    hamburger.addEventListener('click', () => nav.classList.toggle('open'));
    // Close nav on link click
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  }

  // Load logo & Init dashboard
  loadSchoolLogo();
  initDashboard();
});
