// ============================================
// Admin → Slideshow: controls the corridor notice screen at /slide
// ============================================

import { api } from './api.js';
import { showToast, escapeHtml } from './utils.js';
import { SLIDE_TYPES, TRANSITIONS, COUNTDOWN_CHOICES, DEFAULT_COUNTDOWN_LABEL, DEFAULT_SLIDESHOW, normalizeSlideshow } from '../../shared/slideshow.js';

const typeOf = (key) => SLIDE_TYPES.find((t) => t.key === key);
const duration = (s) => (s >= 60 ? `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ''}` : `${s} s`);
const SCREEN_URL = `${location.origin}/slide`;

let dirty = false;
export const hasUnsavedSlideshowChanges = () => dirty;

export async function renderSlideshowPage(container) {
  container.innerHTML = '<div class="spinner"></div>';
  let settings;
  try {
    settings = normalizeSlideshow(await api('slideshow.get'));
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message || 'Could not load the slideshow settings')}</p></div>`;
    return;
  }
  dirty = false;

  container.innerHTML = `
    <div class="ss-intro">
      <div>
        <h2>Corridor notice screen</h2>
        <p>Open <strong>${escapeHtml(SCREEN_URL.replace(/^https?:\/\//, ''))}</strong> in the TV’s browser and press <strong>F</strong> for full screen. It plays the slides below on a loop with live school data. Changes you save here reach the screen within 30 seconds — nobody needs to touch the TV.</p>
      </div>
      <div class="ss-intro-actions">
        <a class="btn btn-primary" href="/slide" target="_blank" rel="noopener">Open the screen ↗</a>
        <button type="button" class="btn btn-secondary" id="ss-copy">Copy link</button>
      </div>
    </div>

    <div class="ss-grid">
      <section class="ss-list-wrap">
        <div class="ss-list-head">
          <h3>Slides</h3>
          <span id="ss-loop"></span>
        </div>
        <p class="ss-help">Switch slides on or off, set how long each stays, and change the order with the arrows. Turn on just one slide to keep a single page on the screen. A <strong>countdown</strong> counts down on its slide; a few seconds before the end the screen jumps to that slide, counts 10 … 1, then loads the latest data and animates the change — perfect for house points.</p>
        <ol class="ss-list" id="ss-list"></ol>
      </section>

      <aside class="ss-side">
        <div class="ss-card">
          <h3>Look</h3>
          <div class="form-group">
            <label class="form-label" for="ss-transition">Change between slides</label>
            <select class="form-select" id="ss-transition">
              ${TRANSITIONS.map((t) => `<option value="${t.key}">${escapeHtml(t.name)}</option>`).join('')}
            </select>
          </div>
          <label class="ss-check"><input type="checkbox" id="ss-clock"> Show the clock and date</label>
          <label class="ss-check"><input type="checkbox" id="ss-ticker"> Show the notice ticker at the bottom</label>
        </div>
        <div class="ss-card">
          <h3>Quick set-ups</h3>
          <p class="ss-help">Fills the list for you — press Save to use it.</p>
          <div class="ss-presets">
            <button type="button" class="btn btn-secondary btn-sm" data-preset="all">Everything</button>
            <button type="button" class="btn btn-secondary btn-sm" data-preset="points">House points only, 5-min countdown</button>
            <button type="button" class="btn btn-secondary btn-sm" data-preset="houses">House system slides</button>
            <button type="button" class="btn btn-secondary btn-sm" data-preset="notices">Notices only</button>
          </div>
        </div>
        <button type="button" class="btn btn-primary ss-save" id="ss-save">Save slideshow</button>
        <p class="ss-saved" id="ss-saved"></p>
      </aside>
    </div>`;

  const list = container.querySelector('#ss-list');
  const saveBtn = container.querySelector('#ss-save');

  const markDirty = (on = true) => {
    dirty = on;
    saveBtn.textContent = on ? 'Save slideshow •' : 'Save slideshow';
    saveBtn.classList.toggle('is-dirty', on);
  };

  function drawList() {
    list.innerHTML = settings.slides.map((s, i) => {
      const t = typeOf(s.key);
      return `
        <li class="ss-item${s.enabled ? '' : ' is-off'}" data-i="${i}">
          <div class="ss-move">
            <button type="button" class="ss-arrow" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move ${escapeHtml(t.name)} up">▲</button>
            <button type="button" class="ss-arrow" data-down="${i}" ${i === settings.slides.length - 1 ? 'disabled' : ''} aria-label="Move ${escapeHtml(t.name)} down">▼</button>
          </div>
          <label class="ss-switch" title="Show this slide">
            <input type="checkbox" data-on="${i}" ${s.enabled ? 'checked' : ''} aria-label="Show ${escapeHtml(t.name)}"><span></span>
          </label>
          <div class="ss-name">
            <strong>${escapeHtml(t.name)}</strong>
            <small>${escapeHtml(t.text)}</small>
          </div>
          <label class="ss-field"><span>Stays for</span>
            <span class="ss-secs"><input class="form-input" type="number" min="5" max="600" data-secs="${i}" value="${s.seconds}"><em>sec</em></span>
          </label>
          <label class="ss-field"><span>Countdown</span>
            <select class="form-select" data-cd="${i}">
              ${COUNTDOWN_CHOICES.map((m) => `<option value="${m}"${m === s.countdown ? ' selected' : ''}>${m ? `${m} min` : 'Off'}</option>`).join('')}
            </select>
          </label>
          <a class="ss-preview" href="/slide?slide=${s.key}" target="_blank" rel="noopener" title="Preview only this slide">Preview ↗</a>
          ${s.countdown ? `
            <label class="ss-cd-label"><span>Countdown text</span>
              <input class="form-input" maxlength="60" data-cdlabel="${i}" value="${escapeHtml(s.countdown_label)}" placeholder="${escapeHtml(DEFAULT_COUNTDOWN_LABEL)}">
            </label>` : ''}
        </li>`;
    }).join('');
    const on = settings.slides.filter((s) => s.enabled);
    container.querySelector('#ss-loop').textContent = on.length === 1
      ? 'One slide stays on screen'
      : `${on.length} slides on · one loop ≈ ${duration(on.reduce((t, s) => t + s.seconds, 0))}`;
  }

  function drawSide() {
    container.querySelector('#ss-transition').value = settings.transition;
    container.querySelector('#ss-clock').checked = settings.show_clock;
    container.querySelector('#ss-ticker').checked = settings.show_ticker;
  }

  list.addEventListener('click', (e) => {
    const up = e.target.closest('[data-up]');
    const down = e.target.closest('[data-down]');
    const i = Number((up || down)?.dataset.up ?? (up || down)?.dataset.down);
    if (!up && !down) return;
    const j = up ? i - 1 : i + 1;
    if (j < 0 || j >= settings.slides.length) return;
    [settings.slides[i], settings.slides[j]] = [settings.slides[j], settings.slides[i]];
    drawList();
    markDirty();
    list.querySelector(`[data-${up ? 'up' : 'down'}="${j}"]`)?.focus();
  });

  list.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.on !== undefined) {
      settings.slides[t.dataset.on].enabled = t.checked;
      drawList();
    }
    if (t.dataset.cd !== undefined) {
      settings.slides[t.dataset.cd].countdown = Number(t.value);
      drawList();
    }
    if (t.dataset.secs !== undefined) {
      const v = Math.min(600, Math.max(5, parseInt(t.value, 10) || 5));
      settings.slides[t.dataset.secs].seconds = v;
      t.value = v;
      drawList();
    }
    markDirty();
  });

  list.addEventListener('input', (e) => {
    if (e.target.dataset.cdlabel !== undefined) {
      settings.slides[e.target.dataset.cdlabel].countdown_label = e.target.value;
      markDirty();
    }
  });

  container.querySelector('#ss-transition').addEventListener('change', (e) => { settings.transition = e.target.value; markDirty(); });
  container.querySelector('#ss-clock').addEventListener('change', (e) => { settings.show_clock = e.target.checked; markDirty(); });
  container.querySelector('#ss-ticker').addEventListener('change', (e) => { settings.show_ticker = e.target.checked; markDirty(); });

  container.querySelector('.ss-presets').addEventListener('click', (e) => {
    const p = e.target.closest('[data-preset]')?.dataset.preset;
    if (!p) return;
    const only = (keys, extra = {}) => {
      // Chosen slides first, in the given order, then the rest switched off.
      const byKey = new Map(settings.slides.map((s) => [s.key, s]));
      const chosen = keys.map((k) => ({ ...byKey.get(k), enabled: true, ...(extra[k] || {}) }));
      const rest = settings.slides.filter((s) => !keys.includes(s.key)).map((s) => ({ ...s, enabled: false }));
      settings.slides = [...chosen, ...rest];
    };
    if (p === 'all') settings.slides = DEFAULT_SLIDESHOW.slides.map((d) => ({ ...d, ...settings.slides.find((s) => s.key === d.key), enabled: true }));
    if (p === 'points') only(['leaderboard'], { leaderboard: { countdown: 5 } });
    if (p === 'houses') only(['leaderboard', 'results', 'houses', 'distribution', 'conduct', 'upcoming']);
    if (p === 'notices') only(['notices']);
    drawList();
    markDirty();
    showToast('Set-up filled in — press Save to use it', 'info');
  });

  container.querySelector('#ss-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(SCREEN_URL); showToast('Link copied', 'success'); } catch { showToast(SCREEN_URL, 'info'); }
  });

  saveBtn.addEventListener('click', async () => {
    if (!settings.slides.some((s) => s.enabled)) return showToast('Switch on at least one slide', 'error');
    saveBtn.disabled = true;
    try {
      const saved = await api('slideshow.update', { settings });
      settings = normalizeSlideshow(saved);
      drawList();
      markDirty(false);
      container.querySelector('#ss-saved').textContent = `Saved at ${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} — the screen updates within 30 seconds.`;
      showToast('Slideshow saved', 'success');
    } catch (err) {
      showToast(err.message || 'Could not save', 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  drawList();
  drawSide();
}
