// ============================================
// Uploaded images: stored in MongoDB, served from /api/media?id=…
// ============================================

import crypto from 'node:crypto';
import { getDb, HttpError } from './db.js';

export const MAX_IMAGE_BYTES = 1_500_000;

const SIGNATURES = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/webp': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
};

/** Save an image sent as a data: URL; returns the address the site can use. */
export async function storeImage(db, dataUrl) {
  const match = typeof dataUrl === 'string' && /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new HttpError(400, 'Please choose a JPG, PNG or WebP image');

  const type = match[1];
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length) throw new HttpError(400, 'The image is empty');
  if (bytes.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'The image is too large (max 1.5 MB after resizing)');
  if (!SIGNATURES[type](bytes)) throw new HttpError(400, 'The file is not a valid image');

  const _id = crypto.randomUUID();
  await db.collection('media').insertOne({ _id, type, size: bytes.length, data: bytes, created_at: new Date().toISOString() });
  return { id: _id, url: `/api/media?id=${_id}` };
}

const MEDIA_ID = /\/api\/media\?id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g;

/** Every uploaded-image id mentioned anywhere inside `value`. */
export function mediaIdsIn(value) {
  return new Set([...JSON.stringify(value ?? null).matchAll(MEDIA_ID)].map((m) => m[1]));
}

/**
 * Deletes uploaded images that are no longer used anywhere — for example photos just removed
 * from the gallery — so they stop taking up database space. Only the given ids are considered,
 * and each one is kept if any website section, student, house or setting still points at it.
 */
export async function pruneMedia(db, ids) {
  const candidates = [...ids];
  if (!candidates.length) return 0;
  const [site, settings, houses, students] = await Promise.all([
    db.collection('site_content').find().toArray(),
    db.collection('admin_settings').find().toArray(),
    db.collection('houses').find().toArray(),
    db.collection('students').find({ photo_url: { $in: candidates.map((id) => `/api/media?id=${id}`) } }, { projection: { photo_url: 1 } }).toArray(),
  ]);
  const inUse = mediaIdsIn([site, settings, houses, students]);
  const unused = candidates.filter((id) => !inUse.has(id));
  if (!unused.length) return 0;
  const { deletedCount } = await db.collection('media').deleteMany({ _id: { $in: unused } });
  return deletedCount;
}

/** How much space uploaded images take. */
export async function mediaUsage(db) {
  const [row] = await db.collection('media').aggregate([{ $group: { _id: null, count: { $sum: 1 }, bytes: { $sum: '$size' } } }]).toArray();
  return { count: row?.count || 0, bytes: row?.bytes || 0 };
}

/** GET /api/media?id=… */
export async function handleMedia(request) {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 });
    }
    const id = new URL(request.url).searchParams.get('id') || '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
      return new Response('Not found', { status: 404 });
    }
    const db = await getDb();
    const doc = await db.collection('media').findOne({ _id: id });
    if (!doc) return new Response('Not found', { status: 404 });

    const bytes = doc.data?.buffer ?? doc.data;
    return new Response(request.method === 'HEAD' ? null : bytes, {
      headers: {
        'Content-Type': doc.type,
        'Content-Length': String(bytes.length),
        // Each upload gets a new id, so the bytes behind an id never change.
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('[media] error:', err);
    return new Response('Something went wrong', { status: 500 });
  }
}
