// ============================================
// API entry point: POST /api/rpc  { action, params }  →  { data } | { error }
// ============================================

import { getDb, HttpError } from './db.js';
import { isAdminRequest } from './auth.js';
import { actions } from './actions.js';

const MAX_BODY_BYTES = 200_000;
const MAX_UPLOAD_BODY_BYTES = 2_200_000; // a 1.5 MB image, base64-encoded
const LARGE_BODY_ACTIONS = new Set(['media.upload', 'students.import']);

function json(status, body, cookies = []) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

/** Browsers send Origin on POST; reject calls made from other websites. */
function isCrossSite(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function handleRpc(request) {
  const cookies = [];
  try {
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    if (isCrossSite(request)) throw new HttpError(403, 'Cross-site requests are not allowed');

    const raw = await request.text();
    if (raw.length > MAX_UPLOAD_BODY_BYTES) throw new HttpError(413, 'Request is too large');

    let body;
    try {
      body = JSON.parse(raw || '{}');
    } catch {
      throw new HttpError(400, 'Request body must be JSON');
    }

    const action = typeof body?.action === 'string' && Object.hasOwn(actions, body.action) ? actions[body.action] : null;
    if (!action) throw new HttpError(404, 'Unknown action');
    if (!LARGE_BODY_ACTIONS.has(body.action) && raw.length > MAX_BODY_BYTES) throw new HttpError(413, 'Request is too large');

    const params = body.params && typeof body.params === 'object' && !Array.isArray(body.params) ? body.params : {};
    const db = await getDb();

    if (action.admin && !(await isAdminRequest(db, request))) {
      throw new HttpError(401, 'Please sign in again');
    }

    // True only on the owner's own computer (local dev server). Vercel sets VERCEL,
    // so a visitor to the live site can never get this, whatever headers they send.
    const isLocal = !process.env.VERCEL && request.headers.get('x-hps-local') === '1';

    const data = await action.run(db, params, { request, cookies, isLocal });
    return json(200, { data }, cookies);
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message }, cookies);
    console.error('[api] unexpected error:', err);
    return json(500, { error: 'Something went wrong on the server' });
  }
}
