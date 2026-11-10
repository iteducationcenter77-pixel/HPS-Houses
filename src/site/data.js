// ============================================
// Website content loading (admin-editable, from MongoDB)
// ============================================

import { api } from '../js/api.js';
import { SITE_DEFAULTS } from '../../shared/site-defaults.js';

const CACHE_KEY = 'hps_site_v1';
const CACHE_MS = 60_000;

function readCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    return cached && Date.now() - cached.at < CACHE_MS ? cached.site : null;
  } catch {
    return null;
  }
}

function writeCache(site) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), site }));
  } catch { /* storage may be unavailable; the site still works */ }
}

export function clearSiteCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
]);

/**
 * Resolve the website content. Uses a 1-minute per-tab cache so moving between pages
 * is instant; `?preview` (used by the admin's "View on site") always fetches fresh.
 * If the server is unreachable the original content is shown instead.
 */
export async function loadSite() {
  const preview = new URLSearchParams(location.search).has('preview');
  const cached = preview ? null : readCache();
  if (cached) return cached;
  try {
    const site = await withTimeout(api('site.get'), 6000);
    writeCache(site);
    return site;
  } catch (err) {
    console.warn('Showing built-in content; the server could not be reached.', err);
    return SITE_DEFAULTS;
  }
}
