// Copies every row from the old Supabase project into MongoDB, keeping the
// original ids so students, competitions and results stay linked.
//
//   npm run db:migrate              copy (refuses if MongoDB already has data)
//   npm run db:migrate -- --dry-run only count what would be copied
//   npm run db:migrate -- --replace wipe the MongoDB copies first, then copy
//
// The old project must be awake (not paused) for this to work.

import { dbName } from './env.mjs';
import { getDb, closeDb, ensureIndexes } from '../server/db.js';

// The old project's public (anon) address and key, as previously shipped in the site.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mauqclwfdajqjctxnoqv.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hdXFjbHdmZGFqcWpjdHhub3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTUwMzMsImV4cCI6MjA5NjQ3MTAzM30.5pK1HIY8542EWZfNlyJ31MIfp40yRk8msAegN3WYEW0';

const TABLES = ['houses', 'students', 'competitions', 'participation', 'admin_settings'];
const PAGE = 1000;

const dryRun = process.argv.includes('--dry-run');
const replace = process.argv.includes('--replace');

async function fetchAll(table) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=id&limit=${PAGE}&offset=${offset}`;
    let res;
    try {
      res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
    } catch (err) {
      throw new Error(`Cannot reach the old Supabase project (${err.cause?.code || err.message}). Is it still paused?`);
    }
    if (!res.ok) throw new Error(`Supabase returned ${res.status} for "${table}": ${(await res.text()).slice(0, 200)}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

const toDoc = ({ id, ...rest }) => ({ _id: id, ...rest });

let failed = false;
try {
  // Read everything first, so nothing is written unless the whole source is readable.
  const source = {};
  for (const table of TABLES) {
    source[table] = await fetchAll(table);
    console.log(`Supabase ${table}: ${source[table].length} rows`);
  }

  if (dryRun) {
    console.log('Dry run — nothing was written.');
  } else {
    const db = await getDb();
    const existing = {};
    for (const table of TABLES) existing[table] = await db.collection(table).countDocuments();
    const hasData = TABLES.some((t) => t !== 'admin_settings' && existing[t] > 0);

    if (hasData && !replace) {
      console.error(`\nMongoDB database "${dbName}" already has data:`, existing);
      console.error('Nothing was copied. Run again with  -- --replace  to overwrite it with the Supabase data.');
      failed = true;
    } else {
      for (const table of TABLES) {
        if (replace || table === 'admin_settings') await db.collection(table).deleteMany({});
        if (source[table].length) await db.collection(table).insertMany(source[table].map(toDoc));
      }
      await ensureIndexes(db);

      console.log(`\nCopied into MongoDB database "${dbName}":`);
      for (const table of TABLES) {
        const count = await db.collection(table).countDocuments();
        const ok = count === source[table].length;
        if (!ok) failed = true;
        console.log(`  ${ok ? 'OK ' : 'MISMATCH'} ${table}: ${count} of ${source[table].length}`);
      }
      console.log('\nNote: the admin password is not copied (Supabase does not expose it).');
      console.log('Set a new one with:  npm run admin:password');
    }
  }
} catch (err) {
  console.error(`\nMigration failed: ${err.message}`);
  failed = true;
} finally {
  await closeDb();
}
process.exitCode = failed ? 1 : 0;
