// Vercel Function: serves images uploaded from the admin panel (GET /api/media?id=…).

import { handleMedia } from '../server/media.js';

export function GET(request) {
  return handleMedia(request);
}

export function HEAD(request) {
  return handleMedia(request);
}
