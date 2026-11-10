// ============================================
// Website content: stored per section in MongoDB, checked against the defaults
// ============================================

import { HttpError } from './db.js';
import { SITE_DEFAULTS } from '../shared/site-defaults.js';

// Fields that become links or image sources on the site.
const URL_KEYS = new Set([
  'image', 'photo', 'logo_url', 'crest_url', 'facebook_url', 'instagram_url', 'prospectus_url', 'map_url',
]);
const MAX_TEXT = 8000;
const MAX_ITEMS = 300;

/** Allows site-relative paths, web links, email and phone links — never javascript: or data: */
export function isSafeUrl(value) {
  if (!value) return true;
  if (/^\/(?!\/)/.test(value)) return true;
  return /^(https?:\/\/|mailto:|tel:)/i.test(value);
}

const humanize = (key) => key.replace(/_url$/, '').replace(/_/g, ' ');

/**
 * Reshape `value` to match `template`: same keys, same kinds of values.
 * Unknown keys are dropped; missing text becomes ''.
 */
function clean(value, template, key) {
  if (typeof template === 'string') {
    if (value === undefined || value === null) return '';
    if (typeof value !== 'string') throw new HttpError(400, `"${humanize(key)}" must be text`);
    const text = value.trim();
    if (text.length > MAX_TEXT) throw new HttpError(400, `"${humanize(key)}" is too long`);
    if (URL_KEYS.has(key) && !isSafeUrl(text)) {
      throw new HttpError(400, `"${humanize(key)}" must be a web link starting with https:// (or a site path starting with /)`);
    }
    return text;
  }

  if (Array.isArray(template)) {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) throw new HttpError(400, `"${humanize(key)}" must be a list`);
    if (value.length > MAX_ITEMS) throw new HttpError(400, `"${humanize(key)}" has too many entries`);
    return value.map((item) => clean(item, template[0], key));
  }

  if (template && typeof template === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new HttpError(400, `"${humanize(key)}" is invalid`);
    }
    const out = {};
    for (const k of Object.keys(template)) out[k] = clean(value[k], template[k], k);
    return out;
  }

  throw new HttpError(500, 'Website content template is invalid');
}

export function sanitizeSection(section, data) {
  if (typeof section !== 'string' || !Object.hasOwn(SITE_DEFAULTS, section)) {
    throw new HttpError(400, 'Unknown website section');
  }
  return clean(data, SITE_DEFAULTS[section], section);
}

/** Every section, with saved edits laid over the defaults. */
export async function getSiteContent(db) {
  const docs = await db.collection('site_content').find().toArray();
  const saved = new Map(docs.map((d) => [d._id, d.data]));
  const out = {};
  for (const [section, defaults] of Object.entries(SITE_DEFAULTS)) {
    out[section] = saved.has(section) ? { ...defaults, ...saved.get(section) } : defaults;
  }
  return out;
}

export async function saveSection(db, section, data) {
  const clean = sanitizeSection(section, data);
  await db.collection('site_content').updateOne(
    { _id: section },
    { $set: { data: clean, updated_at: new Date().toISOString() } },
    { upsert: true }
  );
  return clean;
}

export async function resetSection(db, section) {
  sanitizeSection(section, SITE_DEFAULTS[section] ?? null); // validates the name
  await db.collection('site_content').deleteOne({ _id: section });
  return SITE_DEFAULTS[section];
}
