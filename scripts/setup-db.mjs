// Prepares the database: creates indexes, the settings row, and (with --houses)
// the four starter houses. Safe to run again at any time.
//
//   npm run db:setup              indexes + settings row only
//   npm run db:setup -- --houses  also add Orion, Titans, Phoenix, Spartans if no houses exist

import crypto from 'node:crypto';
import { dbName } from './env.mjs';
import { getDb, closeDb, ensureIndexes } from '../server/db.js';

const STARTER_HOUSES = [
  { name: 'Orion', color_hex: '#f0c244', motto: 'Shine Bright Like the Stars' },
  { name: 'Titans', color_hex: '#2ecc71', motto: 'Strength in Unity' },
  { name: 'Phoenix', color_hex: '#e74c3c', motto: 'Rise from the Ashes' },
  { name: 'Spartans', color_hex: '#3498db', motto: 'Courage and Honor' },
];

const db = await getDb();
try {
  await ensureIndexes(db);
  console.log(`[${dbName}] indexes ready`);

  await db.collection('admin_settings').updateOne(
    { _id: 1 }, { $setOnInsert: { school_logo_url: '', updated_at: new Date().toISOString() } }, { upsert: true }
  );

  if (process.argv.includes('--houses')) {
    const existing = await db.collection('houses').countDocuments();
    if (existing) {
      console.log(`[${dbName}] ${existing} houses already exist — left unchanged`);
    } else {
      const at = new Date().toISOString();
      await db.collection('houses').insertMany(STARTER_HOUSES.map((h) => ({
        _id: crypto.randomUUID(), ...h, logo_url: null, total_points: 0, created_at: at, updated_at: at,
      })));
      console.log(`[${dbName}] added the 4 starter houses`);
    }
  }
} finally {
  await closeDb();
}
