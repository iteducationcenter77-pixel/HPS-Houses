// ============================================
// Admin → Website: edit every part of the public school website
// ============================================
// Forms are generated from the shape of the default content, so every section
// (text, lists, photos) can be edited without custom code per field. GROUPS
// arranges each section's fields into titled cards.

import { api } from './api.js';
import { showToast, escapeHtml } from './utils.js';
import { icon } from '../site/util.js';
import { SITE_DEFAULTS } from '../../shared/site-defaults.js';
import { clearSiteCache } from '../site/data.js';

// ── Sections, grouped the way the website is laid out ──

const NAV = [
  { title: 'General', items: [
    { key: 'general', title: 'School details', icon: 'School', text: 'Name, crest, address, phone numbers, email, WhatsApp, social links and office hours.', page: '/contact' },
    { key: 'notice', title: 'Notice bar', icon: 'Megaphone', text: 'The scrolling announcement at the top of every page.', page: '/' },
  ] },
  { title: 'Home page', items: [
    { key: 'hero', title: 'Home banner', icon: 'LayoutPanelTop', text: 'The headline, introduction and big picture at the top of the home page.', page: '/' },
    { key: 'highlights', title: 'Highlights', icon: 'Sparkles', text: 'The three cards just below the home banner.', page: '/' },
  ] },
  { title: 'About', items: [
    { key: 'about', title: 'About the school', icon: 'BookOpen', text: 'Introduction, the school’s story and key facts.', page: '/about' },
    { key: 'messages', title: 'Leadership messages', icon: 'Quote', text: 'Messages from the MD, Principal and Vice-Principal.', page: '/about#messages' },
    { key: 'faculty', title: 'Faculty & staff', icon: 'Users', text: 'Teachers and staff shown on the About page.', page: '/about#faculty' },
  ] },
  { title: 'Academics', items: [
    { key: 'academics', title: 'Academics', icon: 'GraduationCap', text: 'Curriculum, programmes, assessment and the academic calendar.', page: '/academics' },
    { key: 'facilities', title: 'Facilities', icon: 'FlaskConical', text: 'Facilities and infrastructure.', page: '/academics#facilities' },
  ] },
  { title: 'More pages', items: [
    { key: 'houses', title: 'Houses page', icon: 'Shield', text: 'Introduction to the house system.', page: '/houses' },
    { key: 'gallery', title: 'Gallery', icon: 'Image', text: 'Photos on the home page and the Gallery page.', page: '/gallery' },
    { key: 'news', title: 'Notices & news', icon: 'Newspaper', text: 'Announcements on the Notices page and the home page.', page: '/news' },
    { key: 'admissions', title: 'Admissions', icon: 'ClipboardCheck', text: 'Admission steps and required documents.', page: '/admissions' },
  ] },
];
const SECTION_LIST = NAV.flatMap((g) => g.items);
export const SECTIONS = SECTION_LIST;

// Cards shown for each section, in order. Any field not listed lands in "More".
const GROUPS = {
  general: [
    { title: 'Identity', text: 'How the school is named across the website.', keys: ['name', 'short_name', 'tagline', 'established', 'crest_url'] },
    { title: 'Contact', text: 'Shown in the footer, on the Contact page and on call / WhatsApp buttons.', keys: ['phone', 'phone2', 'email', 'email2', 'whatsapp'] },
    { title: 'Address & office hours', keys: ['address_line1', 'address_line2', 'office_days', 'office_hours'] },
    { title: 'Links', text: 'Leave a link empty to hide its button.', keys: ['facebook_url', 'instagram_url', 'prospectus_url', 'map_url'] },
    { title: 'Footer', keys: ['footer_about'] },
  ],
  notice: [{ title: 'Announcement', keys: ['enabled', 'text'] }],
  hero: [
    { title: 'Headline', keys: ['eyebrow', 'title', 'text'] },
    { title: 'Background picture', text: 'A wide, bright photo works best (at least 1600 pixels across).', keys: ['image'] },
  ],
  highlights: [{ title: 'Highlight cards', keys: ['items'] }],
  about: [
    { title: 'Introduction', keys: ['heading', 'lead', 'image'] },
    { title: 'Our story', text: 'Each paragraph appears in order on the About page.', keys: ['paragraphs'] },
    { title: 'Key facts', text: 'Short facts shown in a row (for example "Nursery – X" · "Classes Offered").', keys: ['stats'] },
  ],
  messages: [
    { title: 'Section', keys: ['heading'] },
    { title: 'Messages', keys: ['items'] },
  ],
  faculty: [
    { title: 'Section', keys: ['heading', 'intro'] },
    { title: 'People', text: 'The first eight people with photos also appear on the home page.', keys: ['items'] },
  ],
  academics: [
    { title: 'Introduction', keys: ['heading', 'intro'] },
    { title: 'Curriculum', keys: ['groups'] },
    { title: 'Educational programmes', keys: ['programs_intro', 'programs'] },
    { title: 'Assessment', keys: ['assessment_intro', 'assessment'] },
    { title: 'Academic calendar', keys: ['calendar'] },
  ],
  facilities: [
    { title: 'Introduction', keys: ['heading', 'intro'] },
    { title: 'Facilities', text: 'The first six also appear on the home page.', keys: ['items'] },
    { title: 'Infrastructure', keys: ['infrastructure'] },
  ],
  houses: [{ title: 'Houses page', text: 'House names, points and results are managed under Houses and Competitions.', keys: ['heading', 'text'] }],
  gallery: [
    { title: 'Introduction', keys: ['heading', 'intro'] },
    { title: 'Photos', text: 'Photos with a title appear in the home page’s Campus Life strip. The category becomes a Gallery filter.', keys: ['items'] },
  ],
  news: [
    { title: 'Introduction', keys: ['heading', 'intro'] },
    { title: 'Notices', text: 'The first three appear on the home page — put the newest at the top.', keys: ['items'] },
  ],
  admissions: [
    { title: 'Introduction', keys: ['heading', 'intro'] },
    { title: 'Admission steps', keys: ['steps'] },
    { title: 'Documents required', keys: ['documents'] },
  ],
};

const LABELS = {
  name: 'School name', short_name: 'Short name', tagline: 'Tagline', crest_url: 'School crest', established: 'Year established',
  address_line1: 'Address line 1', address_line2: 'Address line 2', phone: 'Main phone', phone2: 'Second phone',
  email: 'Main email', email2: 'Second email', whatsapp: 'WhatsApp number', office_days: 'Office days', office_hours: 'Office hours',
  facebook_url: 'Facebook page', instagram_url: 'Instagram', prospectus_url: 'Prospectus (PDF link)', map_url: 'Google Maps embed link',
  footer_about: 'Footer description', enabled: 'Show the notice bar', text: 'Text', eyebrow: 'Small line above the headline',
  title: 'Title', image: 'Picture', heading: 'Heading', lead: 'Introduction line', paragraphs: 'Paragraphs', stats: 'Key facts',
  value: 'Value', label: 'Label', items: 'Entries', role: 'Role', greeting: 'Greeting', credentials: 'Title / qualification',
  photo: 'Photo', intro: 'Introduction', groups: 'Curriculum groups', points: 'Points', programs_intro: 'Introduction',
  programs: 'Programmes', assessment_intro: 'Introduction', assessment: 'Assessment types', calendar: 'Key dates', date: 'Date',
  infrastructure: 'Infrastructure', qualification: 'Qualification', experience: 'Experience', category: 'Category',
  steps: 'Steps', documents: 'Documents',
};

const HINTS = {
  whatsapp: 'Country code and number, digits only — for example 918099375516.',
  prospectus_url: 'For example a Google Drive share link to the PDF.',
  map_url: 'Optional. In Google Maps choose Share → Embed a map and copy the link inside src="…". Empty uses the address.',
  crest_url: 'Shown in the header, footer and loading screen. Use a square picture with a transparent background.',
  category: 'Groups photos into filters on the Gallery page.',
  experience: 'For example “12+ years experience” or “Since 2019”.',
};

const ITEM_NAMES = {
  'faculty.items': 'person', 'gallery.items': 'photo', 'news.items': 'notice', 'messages.items': 'message',
  'highlights.items': 'highlight', 'facilities.items': 'facility', 'facilities.infrastructure': 'item',
  'about.stats': 'fact', 'about.paragraphs': 'paragraph', 'academics.groups': 'group', 'academics.programs': 'programme',
  'academics.assessment': 'assessment type', 'academics.calendar': 'date', 'admissions.steps': 'step',
  'admissions.documents': 'document', points: 'point',
};

const LONG_TEXT = new Set(['text', 'intro', 'footer_about', 'programs_intro', 'assessment_intro', 'lead', 'paragraphs']);
const IMAGE_KEYS = new Set(['image', 'photo', 'crest_url']);
const URL_KEYS = new Set(['facebook_url', 'instagram_url', 'prospectus_url', 'map_url']);
const SMALL_PHOTO_KEYS = new Set(['photo', 'crest_url']);

let current = null; // { key, data, saved }
let expanded = new Set();

const clone = (v) => JSON.parse(JSON.stringify(v));
const esc = escapeHtml;
const label = (key) => LABELS[key] || key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const pathKey = (path) => path.filter((p) => typeof p === 'string').join('.');
const listName = (path) => ITEM_NAMES[`${current.key}.${pathKey(path)}`] || ITEM_NAMES[path[path.length - 1]] || 'entry';
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pad2 = (n) => String(n).padStart(2, '0');
const isDirty = () => current && JSON.stringify(current.data) !== current.saved;
const sectionInfo = (key) => SECTION_LIST.find((s) => s.key === key);

function getAt(obj, path) { return path.reduce((o, k) => o?.[k], obj); }
function setAt(obj, path, value) { getAt(obj, path.slice(0, -1))[path[path.length - 1]] = value; }
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

// ── Fields ──

function fieldHtml(key, value, path, labelText = label(key)) {
  const id = `f-${path.join('-')}`;
  const dataPath = esc(JSON.stringify(path));
  const hint = HINTS[key] ? `<small class="se-hint">${esc(HINTS[key])}</small>` : '';

  if (key === 'enabled') {
    return `
      <div class="se-field se-field--wide">
        <span class="se-label">${esc(labelText)}</span>
        <div class="se-toggle" role="radiogroup" aria-label="${esc(labelText)}">
          <label><input type="radio" name="${id}" value="yes" data-path="${dataPath}"${value !== 'no' ? ' checked' : ''}><span>${icon('Check')} Show on every page</span></label>
          <label><input type="radio" name="${id}" value="no" data-path="${dataPath}"${value === 'no' ? ' checked' : ''}><span>Hide</span></label>
        </div>
      </div>`;
  }

  if (IMAGE_KEYS.has(key)) {
    const src = imageSrc(value);
    const external = /^https?:\/\//i.test(value || '');
    return `
      <div class="se-field se-field--wide se-image">
        <span class="se-label">${esc(labelText)}</span>
        <div class="se-image-box">
          <div class="se-thumb${key === 'crest_url' ? ' se-thumb--square se-thumb--checker' : key === 'photo' ? ' se-thumb--portrait' : ''}">
            ${src ? `<img src="${esc(src)}" alt="">` : `<span class="se-thumb-empty">${icon('ImagePlus')}<em>No picture</em></span>`}
          </div>
          <div class="se-image-side">
            <div class="se-image-buttons">
              <label class="btn btn-primary btn-sm se-upload">${icon('Upload')}<span>${src ? 'Replace picture' : 'Upload picture'}</span><input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${dataPath}" data-key="${key}" hidden></label>
              ${value ? `<button type="button" class="btn btn-secondary btn-sm" data-clear="${dataPath}">${icon('Trash2')}<span>Remove</span></button>` : ''}
            </div>
            <details class="se-link"${external ? ' open' : ''}>
              <summary>${icon('Link')} Use a link instead</summary>
              <input class="form-input" id="${id}" data-path="${dataPath}" value="${esc(value)}" placeholder="https://…  (Google Drive share links work)">
            </details>
            ${hint || '<small class="se-hint">JPG, PNG or WebP. Large photos are resized automatically.</small>'}
          </div>
        </div>
      </div>`;
  }

  const isLong = LONG_TEXT.has(key) || (typeof value === 'string' && value.length > 90);
  const type = key === 'date' ? 'date' : URL_KEYS.has(key) ? 'url' : key.startsWith('email') ? 'email' : key.startsWith('phone') ? 'tel' : 'text';
  const rows = Math.min(8, Math.max(3, Math.ceil((value || '').length / 85)));
  return `
    <div class="se-field${isLong ? ' se-field--wide' : ''}">
      <label class="se-label" for="${id}">${esc(labelText)}</label>
      ${isLong
        ? `<textarea class="form-input" id="${id}" data-path="${dataPath}" rows="${rows}">${esc(value)}</textarea>`
        : `<input class="form-input" type="${type}" id="${id}" data-path="${dataPath}" value="${esc(value)}">`}
      ${hint}
    </div>`;
}

const titleOf = (item) => (typeof item === 'string' ? item : item.name || item.title || item.value || item.role || item.date || '');
function subtitleOf(item) {
  if (typeof item !== 'object') return '';
  if (item.name) return [item.role, item.qualification].filter(Boolean).join(' · ') || item.credentials || '';
  if (item.value) return item.label || '';
  if (item.title && item.category) return [item.category, item.date].filter(Boolean).join(' · ');
  if (item.title && item.date) return item.date;
  if (item.role && item.name === undefined) return item.credentials || '';
  return (item.text || '').slice(0, 90);
}

function toolButtons(ipk, i, length, name) {
  return `
    <div class="se-tools">
      <button type="button" class="se-icon-btn" data-move="${esc(ipk)}" data-dir="-1" title="Move up" aria-label="Move up"${i === 0 ? ' disabled' : ''}>${icon('ChevronUp')}</button>
      <button type="button" class="se-icon-btn" data-move="${esc(ipk)}" data-dir="1" title="Move down" aria-label="Move down"${i === length - 1 ? ' disabled' : ''}>${icon('ChevronDown')}</button>
      <button type="button" class="se-icon-btn se-icon-btn--danger" data-remove="${esc(ipk)}" title="Remove" aria-label="Remove this ${esc(name)}">${icon('Trash2')}</button>
    </div>`;
}

function listHtml(key, list, template, path, { showTitle = true } = {}) {
  const name = listName(path);
  const itemTemplate = template[0];
  const isObject = itemTemplate && typeof itemTemplate === 'object';
  const pk = JSON.stringify(path);
  const itemKeys = list.map((_, i) => JSON.stringify([...path, i]));
  const allOpen = isObject && list.length > 0 && itemKeys.every((k) => expanded.has(k));

  const rows = list.map((item, i) => {
    const ipk = itemKeys[i];
    if (!isObject) {
      const fieldKey = path[path.length - 1] === 'paragraphs' ? 'paragraphs' : 'item';
      return `
        <div class="se-row">
          <span class="se-index">${pad2(i + 1)}</span>
          <div class="se-row-field">${fieldHtml(fieldKey, item, [...path, i], `${cap(name)} ${i + 1}`)}</div>
          ${toolButtons(ipk, i, list.length, name)}
        </div>`;
    }
    const open = expanded.has(ipk);
    const thumb = imageSrc(item.photo || item.image);
    const title = titleOf(item);
    const sub = subtitleOf(item);
    return `
      <div class="se-item${open ? ' is-open' : ''}">
        <div class="se-item-head">
          <button type="button" class="se-item-toggle" data-toggle="${esc(ipk)}" aria-expanded="${open}">
            <span class="se-index">${pad2(i + 1)}</span>
            ${thumb ? `<img class="se-item-thumb" src="${esc(thumb)}" alt="">` : ''}
            <span class="se-item-text">
              <strong>${title ? esc(title) : `<em>New ${esc(name)}</em>`}</strong>
              ${sub ? `<small>${esc(sub)}</small>` : ''}
            </span>
            <span class="se-chevron">${icon('ChevronDown')}</span>
          </button>
          ${toolButtons(ipk, i, list.length, name)}
        </div>
        ${open ? `<div class="se-item-body">${objectFields(item, itemTemplate, [...path, i])}</div>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="se-list">
      <div class="se-list-head">
        ${showTitle ? `<span class="se-list-title">${esc(label(key))}</span>` : ''}
        <span class="se-count">${list.length} ${esc(list.length === 1 ? name : `${name}s`)}</span>
        <div class="se-list-actions">
          ${isObject && list.length > 1 ? `<button type="button" class="se-text-btn" data-expand-all="${esc(pk)}">${allOpen ? 'Collapse all' : 'Expand all'}</button>` : ''}
        </div>
      </div>
      <div class="se-items">${rows || `<p class="se-empty">No ${esc(name)}s yet.</p>`}</div>
      <button type="button" class="se-add" data-add="${esc(pk)}">${icon('Plus')}<span>Add ${esc(name)}</span></button>
    </div>`;
}

function objectFields(obj, template, path) {
  const keys = Object.keys(template);
  const scalars = keys.filter((k) => !Array.isArray(template[k]));
  const lists = keys.filter((k) => Array.isArray(template[k]));
  return `
    ${scalars.length ? `<div class="se-grid">${scalars.map((k) => fieldHtml(k, obj[k] ?? '', [...path, k])).join('')}</div>` : ''}
    ${lists.map((k) => listHtml(k, obj[k] ?? [], template[k], [...path, k])).join('')}`;
}

function groupCard(group, data, template) {
  const scalars = group.keys.filter((k) => k in template && !Array.isArray(template[k]));
  const lists = group.keys.filter((k) => Array.isArray(template[k]));
  return `
    <section class="se-card">
      <header class="se-card-head">
        <h4>${esc(group.title)}</h4>
        ${group.text ? `<p>${esc(group.text)}</p>` : ''}
      </header>
      ${scalars.length ? `<div class="se-grid">${scalars.map((k) => fieldHtml(k, data[k] ?? '', [k])).join('')}</div>` : ''}
      ${lists.map((k) => listHtml(k, data[k] ?? [], template[k], [k], { showTitle: scalars.length > 0 })).join('')}
    </section>`;
}

function sectionBody(key, data) {
  const template = SITE_DEFAULTS[key];
  const groups = GROUPS[key] || [];
  const covered = new Set(groups.flatMap((g) => g.keys));
  const rest = Object.keys(template).filter((k) => !covered.has(k));
  const all = rest.length ? [...groups, { title: groups.length ? 'More' : 'Details', keys: rest }] : groups;
  return all.map((g) => groupCard(g, data, template)).join('');
}

// ── Page ──

function previewHref(page) {
  const [path, hash] = page.split('#');
  return `${path}?preview${hash ? `#${hash}` : ''}`;
}

function renderPanel(container) {
  const info = sectionInfo(current.key);
  const panel = container.querySelector('#se-panel');
  const scroll = window.scrollY;
  const dirty = isDirty();
  panel.innerHTML = `
    <header class="se-head">
      <span class="se-head-icon">${icon(info.icon)}</span>
      <div class="se-head-text">
        <h3>${esc(info.title)}</h3>
        <p>${esc(info.text)}</p>
      </div>
      <a class="btn btn-secondary btn-sm se-view" href="${previewHref(info.page)}" target="_blank" rel="noopener">${icon('ExternalLink')}<span>View on site</span></a>
    </header>
    <form id="se-form" class="se-body" autocomplete="off" onsubmit="return false">${sectionBody(current.key, current.data)}</form>
    <footer class="se-savebar${dirty ? ' is-dirty' : ''}">
      <span class="se-status"><i class="se-dot"></i><span>${dirty ? 'Unsaved changes' : 'All changes saved'}</span></span>
      <div class="se-save-actions">
        <button type="button" class="se-text-btn se-text-btn--muted" id="se-reset">${icon('RotateCcw')}<span>Restore original</span></button>
        <button type="button" class="btn btn-primary" id="se-save"${dirty ? '' : ' disabled'}>Save changes</button>
      </div>
    </footer>`;
  window.scrollTo(0, scroll);
  container.querySelectorAll('.se-rail [data-section]').forEach((b) => {
    b.classList.toggle('active', b.dataset.section === current.key);
    b.classList.toggle('is-dirty', b.dataset.section === current.key && dirty);
  });
  // On narrow screens the section list is a sideways strip: keep the open section in view.
  const rail = container.querySelector('.se-rail');
  const active = rail?.querySelector('.active');
  if (rail && active && rail.scrollWidth > rail.clientWidth) {
    rail.scrollLeft = active.offsetLeft - (rail.clientWidth - active.offsetWidth) / 2;
  }
}

function refreshDirty(container) {
  const dirty = isDirty();
  container.querySelector('.se-savebar')?.classList.toggle('is-dirty', dirty);
  const status = container.querySelector('.se-status > span');
  if (status) status.textContent = dirty ? 'Unsaved changes' : 'All changes saved';
  const save = container.querySelector('#se-save');
  if (save) save.disabled = !dirty;
  container.querySelector('.se-rail .active')?.classList.toggle('is-dirty', dirty);
}

function loadSection(container, key, site) {
  current = { key, data: clone(site[key]), saved: JSON.stringify(site[key]) };
  expanded = new Set();
  // Short lists start open; long lists start folded so the page stays tidy.
  for (const [k, v] of Object.entries(current.data)) {
    if (Array.isArray(v) && v.length <= 2 && v.every((x) => typeof x === 'object')) v.forEach((_, i) => expanded.add(JSON.stringify([k, i])));
  }
  renderPanel(container);
}

/** Shrink a photo in the browser before uploading (faster pages, smaller database). */
async function resizeImage(file, { maxSize, png }) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  if (png) return canvas.toDataURL('image/png');
  for (const quality of [0.86, 0.78, 0.65]) {
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
    container.innerHTML = `<div class="empty-state"><p>Could not load the website content: ${esc(err.message)}</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="se-layout">
      <nav class="se-rail" aria-label="Website sections">
        ${NAV.map((g) => `
          <div class="se-rail-group">
            <span class="se-rail-title">${esc(g.title)}</span>
            ${g.items.map((s) => `<button type="button" data-section="${s.key}"><span class="se-rail-icon">${icon(s.icon)}</span><span class="se-rail-text">${esc(s.title)}</span><i class="se-rail-dot" title="Unsaved changes"></i></button>`).join('')}
          </div>`).join('')}
      </nav>
      <section class="se-panel" id="se-panel" aria-live="polite"></section>
    </div>`;

  loadSection(container, SECTION_LIST.some((s) => s.key === initialKey) ? initialKey : 'general', site);

  const save = async () => {
    const btn = container.querySelector('#se-save');
    if (!btn || !isDirty()) return;
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const { data } = await api('site.update', { section: current.key, data: current.data });
      site[current.key] = data;
      current.data = clone(data);
      current.saved = JSON.stringify(data);
      clearSiteCache();
      renderPanel(container);
      showToast('Saved — the website is updated', 'success');
    } catch (err) {
      showToast(err.message || 'Could not save', 'error');
      btn.disabled = false;
      btn.textContent = 'Save changes';
    }
  };

  container.querySelector('.se-rail').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-section]');
    if (!btn || btn.dataset.section === current.key) return;
    if (isDirty() && !confirm('You have unsaved changes in this section. Leave without saving?')) return;
    loadSection(container, btn.dataset.section, site);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const panel = container.querySelector('#se-panel');

  panel.addEventListener('input', (e) => {
    const el = e.target.closest('[data-path]');
    if (!el) return;
    if (el.type === 'radio' && !el.checked) return;
    setAt(current.data, JSON.parse(el.dataset.path), el.value);
    refreshDirty(container);
    const box = el.closest('.se-image');
    if (box) {
      const src = imageSrc(el.value.trim());
      box.querySelector('.se-thumb').innerHTML = src ? `<img src="${esc(src)}" alt="">` : `<span class="se-thumb-empty">${icon('ImagePlus')}<em>No picture</em></span>`;
    }
  });

  panel.addEventListener('change', async (e) => {
    if (e.target.type === 'radio') { e.target.dispatchEvent(new Event('input', { bubbles: true })); return; }
    const input = e.target.closest('[data-upload]');
    if (!input?.files?.[0]) return;
    const path = JSON.parse(input.dataset.upload);
    const key = input.dataset.key;
    const button = input.closest('.se-upload');
    button.classList.add('is-busy');
    button.querySelector('span').textContent = 'Uploading…';
    try {
      const file = input.files[0];
      const dataUrl = await resizeImage(file, {
        maxSize: SMALL_PHOTO_KEYS.has(key) ? 900 : 2000,
        png: key === 'crest_url' && file.type === 'image/png',
      });
      const { url } = await api('media.upload', { data_url: dataUrl });
      setAt(current.data, path, url);
      renderPanel(container);
      showToast('Picture uploaded — press Save changes to publish it', 'success');
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error');
      button.classList.remove('is-busy');
      button.querySelector('span').textContent = 'Upload picture';
    }
  });

  panel.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;

    if (t.dataset.toggle) {
      const k = t.dataset.toggle;
      if (expanded.has(k)) expanded.delete(k); else expanded.add(k);
      renderPanel(container);
      return;
    }
    if (t.dataset.expandAll) {
      const path = JSON.parse(t.dataset.expandAll);
      const keys = getAt(current.data, path).map((_, i) => JSON.stringify([...path, i]));
      const allOpen = keys.every((k) => expanded.has(k));
      keys.forEach((k) => (allOpen ? expanded.delete(k) : expanded.add(k)));
      renderPanel(container);
      return;
    }
    if (t.dataset.clear) {
      setAt(current.data, JSON.parse(t.dataset.clear), '');
      renderPanel(container);
      return;
    }
    if (t.dataset.add) {
      const path = JSON.parse(t.dataset.add);
      const list = getAt(current.data, path);
      const template = getAt(SITE_DEFAULTS[current.key], path.map((p) => (typeof p === 'number' ? 0 : p)))[0];
      list.push(blankLike(template));
      expanded.add(JSON.stringify([...path, list.length - 1]));
      renderPanel(container);
      const items = panel.querySelectorAll(`[data-add='${CSS.escape(t.dataset.add)}']`);
      items[0]?.previousElementSibling?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (t.dataset.remove) {
      const path = JSON.parse(t.dataset.remove);
      const list = getAt(current.data, path.slice(0, -1));
      const item = list[path[path.length - 1]];
      const what = titleOf(item) ? `"${titleOf(item).slice(0, 60)}"` : 'this entry';
      if (!confirm(`Remove ${what}? (Nothing changes on the website until you press Save changes.)`)) return;
      list.splice(path[path.length - 1], 1);
      expanded = new Set();
      renderPanel(container);
      return;
    }
    if (t.dataset.move) {
      const path = JSON.parse(t.dataset.move);
      const list = getAt(current.data, path.slice(0, -1));
      const i = path[path.length - 1];
      const j = i + Number(t.dataset.dir);
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      const parent = JSON.stringify(path.slice(0, -1)).slice(0, -1);
      const a = `${parent},${i}]`; const b = `${parent},${j}]`;
      const aOpen = expanded.has(a); const bOpen = expanded.has(b);
      expanded.delete(a); expanded.delete(b);
      if (aOpen) expanded.add(b);
      if (bOpen) expanded.add(a);
      renderPanel(container);
      return;
    }
    if (t.id === 'se-save') { await save(); return; }
    if (t.id === 'se-reset') {
      if (!confirm(`Restore "${sectionInfo(current.key).title}" to the original content? Your edits to this section will be lost.`)) return;
      try {
        const { data } = await api('site.reset', { section: current.key });
        site[current.key] = data;
        clearSiteCache();
        loadSection(container, current.key, site);
        showToast('Restored the original content', 'success');
      } catch (err) {
        showToast(err.message || 'Could not restore', 'error');
      }
    }
  });

  // Ctrl+S / Cmd+S saves the open section.
  container.onkeydown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  };
}

/** Ask before leaving the admin page with unsaved website edits. */
export function hasUnsavedWebsiteChanges() {
  return isDirty();
}

export function forgetWebsiteEditor() {
  current = null;
}
