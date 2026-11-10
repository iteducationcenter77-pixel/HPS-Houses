// Sets (or resets) the admin password for the site. Run:  npm run admin:password
// The password is typed here, hashed, and only the hash is stored in MongoDB.

import readline from 'node:readline';
import { dbName } from './env.mjs';
import { getDb, closeDb } from '../server/db.js';
import { setAdminPassword, MIN_PASSWORD_LENGTH } from '../server/auth.js';

function ask(question) {
  return new Promise((resolvePrompt) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Hide what is typed.
    rl._writeToOutput = (chunk) => {
      if (chunk.includes(question)) rl.output.write(chunk);
    };
    rl.question(question, (answer) => {
      rl.output.write('\n');
      rl.close();
      resolvePrompt(answer);
    });
  });
}

const password = await ask(`New admin password (min ${MIN_PASSWORD_LENGTH} characters): `);
const again = await ask('Type it again: ');

if (password !== again) {
  console.error('The two passwords did not match. Nothing was changed.');
  process.exit(1);
}

try {
  const db = await getDb();
  await setAdminPassword(db, password);
  console.log(`Admin password saved for database "${dbName}". Anyone signed in before has been signed out.`);
} catch (err) {
  console.error(`Could not save the password: ${err.message}`);
  process.exitCode = 1;
} finally {
  await closeDb();
}
