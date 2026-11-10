// ============================================
// Admin → Website: edit every part of the public school website
// ============================================
// Forms are generated from the shape of the default content, so every section
// (text, lists, photos) can be edited without custom code per field.

import { api } from './api.js';
import { showToast, escapeHtml } from './utils.js';
import { SITE_DEFAULTS } from '../../shared/site-defaults.js';
import { clearSiteCache } from '../site/data.js';

export const SECTIONS = [
  { key: 'general', title: 'School details', text: 'Name, address, phone, email, WhatsApp, social links, office hours, logo', page: '/contact' },
  { key: 'notice', title: 'Notice bar', text: 'The scrolling announcement at the top of every page', page: '/' },
  { key: 'hero', title: 'Home banner', text: 'Main headline and picture on the home page', page: '/' },
  { key: 'highlights', title: 'Home highlights', text: 'The three cards under the home banner', page: '/' },
  { key: 'about', title: 'About the school', text: 'Introduction, story and key facts', page: '/about' },
  { key: 'messages', title: 'Leadership messages', text: 'Messages from the MD, Principal and Vice-Principal', page: '/about#messages' },
  { key: 'faculty', title: 'Faculty & staff', text: 'Teachers and staff shown on the About page', page: '/about#faculty' },
  { key: 'academics', title: 'Academics', text: 'Curriculum, programmes, assessment, calendar', page: '/academics' },
  { key: 'facilities', title: 'Facilities', text: 'Facilities and infrastructure', page: '/academics#facilities' },
  { key: 'houses', title: 'Houses page', text: 'Introduction to the house system', page: '/houses' },
  { key: 'gallery', title: 'Gallery', text: 'Photos on the home page and the Gallery page', page: '/gallery' },
  { key: 'news', title: 'Notices & news', text: 'Announcements on the Notices page and home page', page: '/news' },
  { key: 'admissions', title: 'Admissions', text: 'Admission steps and required documents', page: '/admissions' },
];

const LABELS = {
  name: 'Name', short_name: 'Short name', tagline: 'Tagline', logo_url: 'Wide logo (optional)', crest_url: 'Round school crest',
  established: 'Year established', address_line1: 'Address line 1', address_line2: 'Address line 2',
  phone: 'Main phone', phone2: 'Second phone', email: 'Main email', email2: 'Second email',
  whatsapp: 'WhatsApp number', office_days: 'Office days', office_hours: 'Office hours',
  facebook_url: 'Facebook page link', instagram_url: 'Instagram link', prospectus_url: 'Prospectus link',
  map_url: 'Google Maps embed link', footer_about: 'Footer description',
  enabled: 'Show the notice bar', text: 'Text', eyebrow: 'Small line above the headline', title: 'Title', image: 'Picture',
  heading: 'Heading', lead: 'Introduction line', paragraphs: 'Paragraphs', stats: 'Key facts', value: 'Value', label: 'Label',
  items: 'Entries', role: 'Role', greeting: 'Greeting', credentials: 'Title / qualification', photo: 'Photo', intro: 'Introduction',
  groups: 'Curriculum groups', points: 'Points', programs_intro: 'Programmes introduction', programs: 'Programmes',
  assessment_intro: 'Assessment introduction', assessment: 'Assessment types', calendar: 'Academic calendar', date: 'Date',
  infrastructure: 'Infrastructure', qualification: 'Qualification', experience: 'Experience', category: 'Category',
  steps: 'Admission steps', documents: 'Documents required',
};

const HINTS = {
  whatsapp: 'Country code + number, digits only — e.g. 918099375516',
  prospectus_url: 'Paste a link to the prospectus PDF (for example a Google Drive share link). Leave empty to hide the button.',
  map_url: 'Optional. In Google Maps: Share → Embed a map → copy the link inside src="…". Leave empty to use the address.',
  crest_url: 'Shown in the header, footer and loading screen. A square picture works best.',
  enabled: 'Turn the scrolling notice on or off across the whole site.',
  category: 'Used to group items (e.g. the Gallery filters).',
  experience: 'e.g. "12+ years experience" or "Since 2019".',
  date: 'Optional.',
};

// What one entry in a list is called, for the Add button and headers.
const ITEM_NAMES = {
  'faculty.items': 'person', 'gallery.items': 'photo', 'news.items': 'notice', 'messages.items': 'message',
  'highlights.items': 'highlight', 'facilities.items': 'facility', 'facilities.infrastructure': 'item',
  'about.stats': 'fact', 'about.paragraphs': 'paragraph', 'academics.groups': 'group', 'academics.programs': 'programme',
  'academics.assessment': 'assessment type', 'academics.calendar': 'date', 'admissions.steps': 'step',
  'admissions.documents': 'document', points: 'point',
};

const LONG_TEXT = new Set(['text', 'intro', 'footer_about', 'programs_intro', 'assessment_intro', 'lead', 'paragraphs']);
const IMAGE_KEYS = new Set(['image', 'photo', 'logo_url', 'crest_url']);
const PNG_KEYS = new Set(['logo_url', 'crest_url']);
const URL_KEYS = new Set(['facebook_url', 'instagram_url', 'prospectus_url', 'map_url']);
const SMALL_PHOTO_KEYS = new Set(['photo', 'crest_url', 'logo_url']);

let current = null; // { key, data, saved }
let expanded = new Set();

const clone = (v) => JSON.parse(JSON.stringify(v));
const label = (key) => LABELS[key] || key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const pathKey = (path) => path.filter((p) => typeof p === 'string').join('.');
const listName = (path) => ITEM_NAMES[`${current.key}.${pathKey(path)}`] || ITEM_NAMES[path[path.length - 1]] || 'entry';
const isDirty = () => current && JSON.stringify(current.data) !== current.saved;

function getAt(obj, path) { return path.reduce((o, k) => o?.[k], obj); }
function setAt(obj, path, value) {
  const parent = getAt(obj, path.slice(0, -1));
  parent[path[path.length - 1]] = value;
}
function blankLike(template) {
  if (typeof template === 'string') return '';
  if (Array.isArray(template)) return [];
  return Object.fromEntries(Object.keys(template).map((k) => [k, blankLike(template[k])]));
}

function imageSrc(url) {
  if (!url) return '';
  const drive = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
  if (drive) return `https://lh3.googleusercontent.com/d/${drive[1]}`;
  return /^(\/(?!\/)|https?:\/\/)/i.test(url) ? url : '';
}

// ── Field rendering ──

function fieldHtml(key, value, path, labelText = label(key)) {
  const id = `f-${path.join('-')}`;
  const dataPath = escapeHtml(JSON.stringify(path));
  const hint = HINTS[key] ? `<small class="se-hint">${escapeHtml(HINTS[key])}</small>` : '';

  if (key === 'enabled') {
    return `
      <div class="se-field">
        <label class="form-label" for="${id}">${escapeHtml(labelText)}</label>
        <select class="form-select" id="${id}" data-path="${dataPath}">
          <option value="yes"${value !== 'no' ? ' selected' : ''}>Yes — show it</option>
          <option value="no"${value === 'no' ? ' selected' : ''}>No — hide it</option>
        </select>${hint}
      </div>`;
  }

  if (IMAGE_KEYS.has(key)) {
    const src = imageSrc(value);
    return `
      <div class="se-field se-image">
        <label class="form-label" for="${id}">${escapeHtml(labelText)}</label>
        <div class="se-image-row">
          <div class="se-thumb">${src ? `<img src="${escapeHtml(src)}" alt="">` : '<span>No picture</span>'}</div>
          <div class="se-image-controls">
            <input class="form-input" id="${id}" data-path="${dataPath}" value="${escapeHtml(value)}" placeholder="Upload, or paste a link (Google Drive works)">
            <div class="se-image-buttons">
              <label class="btn btn-secondary btn-sm se-upload">Upload picture<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${dataPath}" data-key="${key}" hidden></label>
              ${value ? `<button type="button" class="btn btn-danger btn-sm" data-clear="${dataPath}">Remove</button>` : ''}
            </div>
            ${hint}
          </div>
        </div>
      </div>`;
  }

  const isLong = LONG_TEXT.has(key) || (typeof value === 'string' && value.length > 90);
  const type = key === 'date' ? 'date' : URL_KEYS.has(key) ? 'url' : key.startsWith('email') ? 'email' : key.startsWith('phone') ? 'tel' : 'text';
  return `
    <div class="se-field${isLong ? ' se-field--wide' : ''}">
      <label class="form-label" for="${id}">${escapeHtml(labelText)}</label>
      ${isLong
        ? `<textarea class="form-input" id="${id}" data-path="${dataPath}" rows="${Math.min(8, Math.max(3, Math.ceil((value || '').length / 90)))}">${escapeHtml(value)}</textarea>`
        : `<input class="form-input" type="${type}" id="${id}" data-path="${dataPath}" value="${escapeHtml(value)}">`}
      ${hint}
    </div>`;
}

function summaryOf(item) {
  if (typeof item === 'string') return item;
  return item.name || item.title || item.role || item.value || item.date || '';
}

function listHtml(key, list, template, path) {
  const name = listName(path);
  const itemTemplate = template[0];
  const collapsible = itemTemplate && typeof itemTemplate === 'object';
  const many = list.length > 5;
  const pk = JSON.stringify(path);

  const items = list.map((item, i) => {
    const itemPath = [...path, i];
    const ipk = JSON.stringify(itemPath);
    const open = !collapsible || !many || expanded.has(ipk);
    const thumb = collapsible ? imageSrc(item.photo || item.image) : '';
    const controls = `
      <div class="se-item-tools">
        <button type="button" class="btn btn-secondary btn-icon" data-move="${escapeHtml(ipk)}" data-dir="-1" title="Move up" aria-label="Move up"${i === 0 ? ' disabled' : ''}>↑</button>
        <button type="button" class="btn btn-secondary btn-icon" data-move="${escapeHtml(ipk)}" data-dir="1" title="Move down" aria-label="Move down"${i === list.length - 1 ? ' disabled' : ''}>↓</button>
        <button type="button" class="btn btn-danger btn-icon" data-remove="${escapeHtml(ipk)}" title="Remove" aria-label="Remove this ${name}">✕</button>
      </div>`;

    if (!collapsible) {
      const fieldKey = path[path.length - 1] === 'paragraphs' ? 'paragraphs' : 'item';
      const itemLabel = `${name[0].toUpperCase()}${name.slice(1)} ${i + 1}`;
      return `<div class="se-item se-item--inline">${fieldHtml(fieldKey, item, itemPath, itemLabel)}${controls}</div>`;
    }
    return `
      <div class="se-item${open ? ' is-open' : ''}">
        <div class="se-item-head">
          <button type="button" class="se-item-toggle" data-toggle="${escapeHtml(ipk)}" aria-expanded="${open}">
            ${thumb ? `<img src="${escapeHtml(thumb)}" alt="">` : `<span class="se-item-num">${i + 1}</span>`}
            <span>${escapeHtml(summaryOf(item)) || `<em>New ${name}</em>`}</span>
          </button>
          ${controls}
        </div>
        ${open ? `<div class="se-item-body">${objectFields(item, itemTemplate, itemPath)}</div>` : ''}
      </div>`;
  }).join('');

  return `
    <fieldset class="se-list se-field--wide">
      <legend class="form-label">${label(key)} <span class="se-count">${list.length}</span></legend>
      <div class="se-items">${items || `<p class="se-empty">No ${name}s yet.</p>`}</div>
      <button type="button" class="btn btn-secondary btn-sm se-add" data-add="${escapeHtml(pk)}">+ Add ${name}</button>
    </fieldset>`;
}

function objectFields(obj, template, path) {
  return `<div class="se-grid">${Object.keys(template).map((key) => {
    const value = obj[key] ?? blankLike(template[key]);
    const p = [...path, key];
    if (Array.isArray(template[key])) return listHtml(key, value, template[key], p);
    return fieldHtml(key, value, p);
  }).join('')}</div>`;
}

// ── Page ──

function sectionInfo(key) { return SECTIONS.find((s) => s.key === key); }

function renderEditor(container) {
  const info = sectionInfo(current.key);
  const panel = container.querySelector('#se-panel');
  const scroll = window.scrollY;
  panel.innerHTML = `
    <div class="se-panel-head">
      <div>
        <h3>${escapeHtml(info.title)}</h3>
        <p>${escapeHtml(info.text)}</p>
      </div>
      <a class="btn btn-secondary btn-sm" href="${info.page.replace('#', '?preview#')}${info.page.includes('#') ? '' : '?preview'}" target="_blank" rel="noopener">View on site ↗</a>
    </div>
    <form id="se-form" autocomplete="off">${objectFields(current.data, SITE_DEFAULTS[current.key], [])}</form>
    <div class="se-savebar${isDirty() ? ' is-dirty' : ''}">
      <span class="se-status">${isDirty() ? 'You have unsaved changes' : 'All changes saved'}</span>
      <div class="se-save-actions">
        <button type="button" class="btn btn-danger btn-sm" id="se-reset">Restore original</button>
        <button type="button" class="btn btn-primary" id="se-save"${isDirty() ? '' : ' disabled'}>Save changes</button>
      </div>
    </div>`;
  window.scrollTo(0, scroll);
  container.querySelectorAll('.se-nav button').forEach((b) => b.classList.toggle('active', b.dataset.section === current.key));
}

function refreshDirty(container) {
  const dirty = isDirty();
  const bar = container.querySelector('.se-savebar');
  bar?.classList.toggle('is-dirty', dirty);
  const status = container.querySelector('.se-status');
  if (status) status.textContent = dirty ? 'You have unsaved changes' : 'All changes saved';
  const save = container.querySelector('#se-save');
  if (save) save.disabled = !dirty;
}

async function loadSection(container, key, site) {
  current = { key, data: clone(site[key]), saved: JSON.stringify(site[key]) };
  expanded = new Set();
  renderEditor(container);
}

/** Shrink a photo in the browser before uploading (faster pages, smaller database). */
async function resizeImage(file, { maxSize, png }) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  if (png) return canvas.toDataURL('image/png');
  for (const quality of [0.85, 0.75, 0.6]) {
    const url = canvas.toDataURL('image/jpeg', quality);
    if (url.length < 1_900_000) return url;
  }
  return canvas.toDataURL('image/jpeg', 0.5);
}

export async function renderWebsitePage(container, initialKey = 'general') {
  container.innerHTML = '<div class="spinner"></div>';
  let site;
  try {
    site = await api('site.get');
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Could not load the website content: ${escapeHtml(err.message)}</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="se-layout">
      <nav class="se-nav" aria-label="Website sections">
        ${SECTIONS.map((s) => `
          <button type="button" data-section="${s.key}">
            <strong>${escapeHtml(s.title)}</strong>
            <span>${escapeHtml(s.text)}</span>
          </button>`).join('')}
      </nav>
      <section class="se-panel table-container" id="se-panel"></section>
    </div>`;

  await loadSection(container, SECTIONS.some((s) => s.key === initialKey) ? initialKey : 'general', site);

  container.querySelector('.se-nav').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-section]');
    if (!btn || btn.dataset.section === current.key) return;
    if (isDirty() && !confirm('You have unsaved changes in this section. Leave without saving?')) return;
    loadSection(container, btn.dataset.section, site);
    container.querySelector('#se-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const panel = container.querySelector('#se-panel');

  panel.addEventListener('input', (e) => {
    const el = e.target.closest('[data-path]');
    if (!el) return;
    setAt(current.data, JSON.parse(el.dataset.path), el.value);
    refreshDirty(container);
    if (el.closest('.se-image')) {
      const thumb = el.closest('.se-image').querySelector('.se-thumb');
      const src = imageSrc(el.value.trim());
      thumb.innerHTML = src ? `<img src="${escapeHtml(src)}" alt="">` : '<span>No picture</span>';
    }
  });

  panel.addEventListener('change', async (e) => {
    const input = e.target.closest('[data-upload]');
    if (!input?.files?.[0]) return;
    const path = JSON.parse(input.dataset.upload);
    const key = input.dataset.key;
    const button = input.closest('.se-upload');
    button.classList.add('is-busy');
    button.firstChild.textContent = 'Uploading…';
    try {
      const dataUrl = await resizeImage(input.files[0], {
        maxSize: SMALL_PHOTO_KEYS.has(key) ? 900 : 1800,
        png: PNG_KEYS.has(key) && input.files[0].type === 'image/png',
      });
      const { url } = await api('media.upload', { data_url: dataUrl });
      setAt(current.data, path, url);
      renderEditor(container);
      showToast('Picture uploaded — remember to save', 'success');
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error');
      button.classList.remove('is-busy');
      button.firstChild.textContent = 'Upload picture';
    }
  });

  panel.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;

    if (t.dataset.toggle) {
      const k = t.dataset.toggle;
      if (expanded.has(k)) expanded.delete(k); else expanded.add(k);
      renderEditor(container);
      return;
    }
    if (t.dataset.clear) {
      setAt(current.data, JSON.parse(t.dataset.clear), '');
      renderEditor(container);
      return;
    }
    if (t.dataset.add) {
      const path = JSON.parse(t.dataset.add);
      const list = getAt(current.data, path);
      const template = getAt(SITE_DEFAULTS[current.key], path.map((p) => (typeof p === 'number' ? 0 : p)))[0];
      list.push(blankLike(template));
      expanded.add(JSON.stringify([...path, list.length - 1]));
      renderEditor(container);
      return;
    }
    if (t.dataset.remove) {
      const path = JSON.parse(t.dataset.remove);
      const list = getAt(current.data, path.slice(0, -1));
      const item = list[path[path.length - 1]];
      const what = summaryOf(item) ? `"${summaryOf(item).slice(0, 60)}"` : 'this entry';
      if (!confirm(`Remove ${what}? (Nothing is changed on the website until you press Save.)`)) return;
      list.splice(path[path.length - 1], 1);
      expanded = new Set();
      renderEditor(container);
      return;
    }
    if (t.dataset.move) {
      const path = JSON.parse(t.dataset.move);
      const list = getAt(current.data, path.slice(0, -1));
      const i = path[path.length - 1];
      const j = i + Number(t.dataset.dir);
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      expanded = new Set();
      renderEditor(container);
      return;
    }
    if (t.id === 'se-save') {
      t.disabled = true;
      t.textContent = 'Saving…';
      try {
        const { data } = await api('site.update', { section: current.key, data: current.data });
        site[current.key] = data;
        current.data = clone(data);
        current.saved = JSON.stringify(data);
        clearSiteCache();
        renderEditor(container);
        showToast('Saved — the website is updated', 'success');
      } catch (err) {
        showToast(err.message || 'Could not save', 'error');
        t.disabled = false;
        t.textContent = 'Save changes';
      }
      return;
    }
    if (t.id === 'se-reset') {
      if (!confirm(`Restore "${sectionInfo(current.key).title}" to the original content? Your edits to this section will be lost.`)) return;
      try {
        const { data } = await api('site.reset', { section: current.key });
        site[current.key] = data;
        clearSiteCache();
        await loadSection(container, current.key, site);
        showToast('Restored the original content', 'success');
      } catch (err) {
        showToast(err.message || 'Could not restore', 'error');
      }
    }
  });
}

/** Ask before leaving the admin page with unsaved website edits. */
export function hasUnsavedWebsiteChanges() {
  return isDirty();
}

export function forgetWebsiteEditor() {
  current = null;
}
