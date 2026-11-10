// Vercel Function: the site's single API endpoint (POST /api/rpc).
// The real logic lives in /server so local dev and production share it.

import { handleRpc } from '../server/handler.js';

export function POST(request) {
  return handleRpc(request);
}
