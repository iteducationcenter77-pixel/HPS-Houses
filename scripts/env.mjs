// Loads .env.local (and .env.<mode>.local when --mode=<mode> is passed) for the scripts.

import { existsSync } from 'node:fs';

const modeArg = process.argv.find((a) => a.startsWith('--mode='));
export const mode = modeArg ? modeArg.split('=')[1] : null;

// Later files must win, and loadEnvFile never overwrites, so load the specific one first.
const files = [mode && `.env.${mode}.local`, '.env.local', '.env'].filter(Boolean);
for (const file of files) {
  if (existsSync(file)) process.loadEnvFile(file);
}

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.');
  process.exit(1);
}

export const dbName = process.env.MONGODB_DB || 'hps';
