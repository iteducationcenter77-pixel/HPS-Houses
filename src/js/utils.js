// ============================================
// Utility Functions
// ============================================

/**
 * Convert Google Drive share URL to direct image URL
 */
export function convertGDriveUrl(url) {
  if (!url) return '';
  // Handle drive.google.com/file/d/ID/view
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  // Handle drive.google.com/open?id=ID
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) return `https://drive.google.com/uc?export=view&id=${match2[1]}`;
  return url;
}

/**
 * Format date for display
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Format relative date
 */
export function relativeDate(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return formatDate(dateStr);
}

/**
 * Show toast notification
 */
export function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Get house CSS class from name
 */
export function getHouseClass(name) {
  if (!name) return '';
  const n = name.toLowerCase();
  if (n.includes('orion')) return 'house-orion';
  if (n.includes('titan')) return 'house-titans';
  if (n.includes('phoenix')) return 'house-phoenix';
  if (n.includes('spartan')) return 'house-spartans';
  return '';
}

/**
 * Get house color from name
 */
export function getHouseColor(name) {
  const colors = {
    'Orion': '#f0c244',
    'Titans': '#2ecc71',
    'Phoenix': '#e74c3c',
    'Spartans': '#3498db'
  };
  return colors[name] || '#8a94a6';
}

/**
 * Rank emoji
 */
export function rankEmoji(rank) {
  const emojis = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '4th' };
  return emojis[rank] || rank;
}

/**
 * Animated counter
 */
export function animateCounter(element, target, duration = 1500) {
  let start = 0;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);
    element.textContent = current;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/**
 * Debounce function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Escape HTML
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Generate placeholder avatar with initials
 */
export function initialsAvatar(name, color = '#8a94a6') {
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  return `<div class="avatar" style="background:${color}15;color:${color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;">${initials}</div>`;
}
