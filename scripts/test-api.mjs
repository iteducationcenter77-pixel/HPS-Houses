// End-to-end check of the API against the throwaway test database.
// Run:  npm run test:api      (uses .env.test.local → database "hps_test")
// It wipes and refills that database, so it refuses to run against anything else.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dbName } from './env.mjs';
import { getDb, closeDb } from '../server/db.js';
import { setAdminPassword } from '../server/auth.js';
import { handleRpc } from '../server/handler.js';
import { handleMedia } from '../server/media.js';
import { SITE_DEFAULTS } from '../shared/site-defaults.js';

if (!dbName.endsWith('_test')) {
  console.error(`Refusing to run: database "${dbName}" is not a test database. Use: npm run test:api`);
  process.exit(1);
}
const PASSWORD = process.env.TEST_ADMIN_PASSWORD;
assert.ok(PASSWORD, 'TEST_ADMIN_PASSWORD must be set in .env.test.local');

let cookie = '';
async function call(action, params = {}, { auth = true, headers = {} } = {}) {
  const res = await handleRpc(new Request('http://localhost:3100/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', host: 'localhost:3100', ...(auth && cookie ? { cookie } : {}), ...headers },
    body: JSON.stringify({ action, params }),
  }));
  const setCookie = res.headers.getSetCookie()[0];
  if (setCookie) cookie = setCookie.split(';')[0];
  const body = await res.json();
  return { status: res.status, data: body.data, error: body.error, setCookie };
}

let passed = 0;
async function step(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const db = await getDb();
try {
  for (const c of await db.listCollections().toArray()) await db.collection(c.name).drop();
  execFileSync(process.execPath, ['scripts/setup-db.mjs', '--mode=test', '--houses'], { stdio: 'inherit' });
  await setAdminPassword(db, PASSWORD);

  let houses, orion, titans, s1, s2, s3, comp;

  await step('public: houses list has the 4 starter houses', async () => {
    const r = await call('houses.list', {}, { auth: false });
    assert.equal(r.status, 200);
    houses = r.data;
    assert.deepEqual(houses.map((h) => h.name).sort(), ['Orion', 'Phoenix', 'Spartans', 'Titans']);
    assert.ok(houses.every((h) => typeof h.id === 'string' && h._id === undefined));
    orion = houses.find((h) => h.name === 'Orion');
    titans = houses.find((h) => h.name === 'Titans');
  });

  await step('public: admin actions are refused without a session', async () => {
    for (const action of ['students.list', 'students.add', 'competitions.list', 'results.save', 'settings.update', 'houses.update', 'stats.get']) {
      assert.equal((await call(action, {}, { auth: false })).status, 401, action);
    }
  });

  await step('rejects unknown actions, non-JSON, and other websites', async () => {
    assert.equal((await call('constructor')).status, 404);
    assert.equal((await call('nope.nope')).status, 404);
    assert.equal((await call('houses.list', {}, { headers: { origin: 'https://evil.example' } })).status, 403);
    assert.equal((await call('houses.list', {}, { headers: { origin: 'http://localhost:3100' } })).status, 200);
    const bad = await handleRpc(new Request('http://localhost:3100/api/rpc', { method: 'POST', body: '{oops' }));
    assert.equal(bad.status, 400);
    const get = await handleRpc(new Request('http://localhost:3100/api/rpc'));
    assert.equal(get.status, 405);
  });

  await step('login: wrong password fails, right password sets an HttpOnly cookie', async () => {
    assert.equal((await call('auth.session')).data.loggedIn, false);
    const wrong = await call('auth.login', { password: 'definitely-wrong' });
    assert.equal(wrong.status, 401);
    assert.equal((await call('auth.login', { password: { $ne: null } })).status, 401);
    const ok = await call('auth.login', { password: PASSWORD });
    assert.equal(ok.status, 200);
    assert.match(ok.setCookie, /HttpOnly/);
    assert.match(ok.setCookie, /SameSite=Strict/);
    assert.equal((await call('auth.session')).data.loggedIn, true);
  });

  await step('login: a tampered cookie is rejected', async () => {
    const good = cookie;
    cookie = good.slice(0, -2) + (good.endsWith('aa') ? 'bb' : 'aa');
    assert.equal((await call('stats.get')).status, 401);
    cookie = good;
    assert.equal((await call('stats.get')).status, 200);
  });

  await step('students: add, validate, duplicate, update, search, filter', async () => {
    s1 = (await call('students.add', { student: { name: 'Test Asha', class: '10-A', roll_number: 1, house_id: orion.id, contact_number: '9000000001' } })).data;
    s2 = (await call('students.add', { student: { name: 'Test Bikram', class: '10-A', roll_number: 2, house_id: titans.id } })).data;
    s3 = (await call('students.add', { student: { name: 'Test Chitra', class: '9-B', roll_number: 1, house_id: orion.id } })).data;
    assert.ok(s1.id && s2.id && s3.id);

    const dup = await call('students.add', { student: { name: 'Dup', class: '10-A', roll_number: 1, house_id: orion.id } });
    assert.equal(dup.status, 409);
    assert.equal((await call('students.add', { student: { name: '', class: '1', roll_number: 1, house_id: orion.id } })).status, 400);
    assert.equal((await call('students.add', { student: { name: 'X', class: '1', roll_number: 'abc', house_id: orion.id } })).status, 400);
    assert.equal((await call('students.add', { student: { name: 'X', class: '1', roll_number: 5, house_id: 'no-such-house' } })).status, 400);
    assert.equal((await call('students.add', { student: { name: 'X', class: '1', roll_number: 5, house_id: { $ne: '' } } })).status, 400);

    assert.equal((await call('students.update', { id: s2.id, updates: { name: 'Test Bikram Das', contact_number: null } })).status, 200);

    const all = (await call('students.list')).data;
    assert.deepEqual(all.map((s) => s.name), ['Test Asha', 'Test Bikram Das', 'Test Chitra']); // class, then roll
    assert.deepEqual(all[0].houses, { name: 'Orion', color_hex: '#f0c244' });
    assert.equal((await call('students.list', { search: 'bikram' })).data.length, 1);
    assert.equal((await call('students.list', { search: '.*' })).data.length, 0); // treated as plain text
    assert.equal((await call('students.list', { house_id: orion.id })).data.length, 2);
  });

  await step('competitions: add, validate, update, list newest first', async () => {
    comp = (await call('competitions.add', { competition: { name: 'Test Quiz', type: 'Academic', competition_date: '2026-11-01', status: 'upcoming', description: null } })).data;
    const later = (await call('competitions.add', { competition: { name: 'Test Race', type: 'Sports', competition_date: '2026-12-15', status: 'upcoming' } })).data;
    assert.ok(comp.id && later.id);
    assert.equal((await call('competitions.add', { competition: { name: 'Bad', competition_date: '15/12/2026' } })).status, 400);
    assert.equal((await call('competitions.add', { competition: { name: 'Bad', competition_date: '2026-12-15', status: 'done' } })).status, 400);
    assert.equal((await call('competitions.update', { id: later.id, updates: { status: 'ongoing' } })).status, 200);
    assert.deepEqual((await call('competitions.list')).data.map((c) => c.name), ['Test Race', 'Test Quiz']);
  });

  await step('results: save, house points recalculated, competition completed', async () => {
    const twice = await call('results.save', { competition_id: comp.id, results: [{ student_id: s1.id, position: 1, points_earned: 10 }, { student_id: s1.id, position: 2, points_earned: 5 }] });
    assert.equal(twice.status, 400);

    const saved = await call('results.save', { competition_id: comp.id, results: [
      { student_id: s2.id, position: 2, points_earned: 30 },
      { student_id: s1.id, position: 1, points_earned: 50 },
      { student_id: s3.id, position: null, points_earned: 5 },
    ] });
    assert.equal(saved.status, 200);

    const byName = Object.fromEntries((await call('houses.list')).data.map((h) => [h.name, h.total_points]));
    assert.deepEqual(byName, { Orion: 55, Titans: 30, Phoenix: 0, Spartans: 0 });

    const entries = (await call('participation.list', { competition_id: comp.id })).data;
    assert.deepEqual(entries.map((e) => e.position), [1, 2, null]); // empty position sorts last
    assert.equal(entries[0].students.name, 'Test Asha');
    assert.equal(entries[1].houses.name, 'Titans'); // house taken from the student record

    assert.equal((await call('competitions.list')).data.find((c) => c.id === comp.id).status, 'completed');
  });

  await step('results: saving again replaces the old results', async () => {
    await call('results.save', { competition_id: comp.id, results: [{ student_id: s2.id, position: 1, points_earned: 40 }] });
    const byName = Object.fromEntries((await call('houses.list')).data.map((h) => [h.name, h.total_points]));
    assert.deepEqual(byName, { Orion: 0, Titans: 40, Phoenix: 0, Spartans: 0 });
    await call('results.save', { competition_id: comp.id, results: [
      { student_id: s1.id, position: 1, points_earned: 50 }, { student_id: s2.id, position: 2, points_earned: 30 },
    ] });
  });

  await step('public dashboard: leaderboard, winners and upcoming — no contact numbers', async () => {
    const r = await call('dashboard.get', {}, { auth: false });
    assert.equal(r.status, 200);
    assert.deepEqual(r.data.houses.map((h) => h.name).slice(0, 2), ['Orion', 'Titans']);
    assert.equal(r.data.results.length, 1);
    assert.deepEqual(r.data.results[0].winners.map((w) => [w.name, w.house, w.position, w.points]), [
      ['Test Asha', 'Orion', 1, 50], ['Test Bikram Das', 'Titans', 2, 30],
    ]);
    assert.deepEqual(r.data.upcoming.map((c) => c.name), ['Test Race']);
    assert.ok(!JSON.stringify(r.data).includes('9000000001'));
  });

  await step('houses + settings: update and read back', async () => {
    assert.equal((await call('houses.update', { id: orion.id, updates: { motto: 'New motto', logo_url: '', total_points: 60 } })).status, 200);
    const o = (await call('houses.list')).data.find((h) => h.id === orion.id);
    assert.equal(o.motto, 'New motto');
    assert.equal(o.total_points, 60);
    assert.equal((await call('houses.update', { id: orion.id, updates: { total_points: -5 } })).status, 400);

    await call('settings.update', { school_logo_url: 'https://example.com/logo.png' });
    assert.equal((await call('settings.get', {}, { auth: false })).data.school_logo_url, 'https://example.com/logo.png');
    assert.deepEqual((await call('stats.get')).data, { students: 3, competitions: 2, newEnquiries: 0 });
  });

  await step('students: delete hides the student but keeps past results', async () => {
    await call('students.delete', { id: s3.id });
    assert.equal((await call('students.list')).data.length, 2);
    assert.equal((await call('stats.get')).data.students, 2);
    // the freed class/roll can be reused
    assert.equal((await call('students.add', { student: { name: 'Test Dev', class: '9-B', roll_number: 1, house_id: titans.id } })).status, 200);
  });

  await step('competitions: delete removes its results', async () => {
    await call('competitions.delete', { id: comp.id });
    assert.equal((await call('participation.list', { competition_id: comp.id })).data.length, 0);
    assert.equal((await call('dashboard.get', {}, { auth: false })).data.results.length, 0);
  });

  await step('password: change signs out old sessions; logout clears the cookie', async () => {
    const oldCookie = cookie;
    const next = PASSWORD + '-changed';
    assert.equal((await call('auth.changePassword', { current: 'wrong', next })).status, 400);
    assert.equal((await call('auth.changePassword', { current: PASSWORD, next: 'short' })).status, 400);
    assert.equal((await call('auth.changePassword', { current: PASSWORD, next })).status, 200);
    const newCookie = cookie;
    assert.equal((await call('stats.get')).status, 200); // this browser stays signed in
    cookie = oldCookie;
    assert.equal((await call('stats.get')).status, 401); // the old session is dead
    cookie = newCookie;
    await call('auth.logout');
    assert.equal(cookie.split('=')[1], '');
    cookie = '';
    assert.equal((await call('auth.login', { password: PASSWORD })).status, 401);
    assert.equal((await call('auth.login', { password: next })).status, 200);
    await setAdminPassword(db, PASSWORD); // restore for the browser test
  });

  await step('login: locked after 10 failed attempts from one address', async () => {
    await db.collection('login_attempts').deleteMany({});
    const headers = { 'x-forwarded-for': '203.0.113.9' };
    for (let i = 0; i < 10; i += 1) {
      assert.equal((await call('auth.login', { password: 'nope' }, { auth: false, headers })).status, 401);
    }
    assert.equal((await call('auth.login', { password: PASSWORD }, { auth: false, headers })).status, 429);
    // a different address is unaffected
    assert.equal((await call('auth.login', { password: PASSWORD }, { auth: false, headers: { 'x-forwarded-for': '203.0.113.10' } })).status, 200);
    await db.collection('login_attempts').deleteMany({});
  });

  await step('website: public read returns the defaults; editing needs a signed-in admin', async () => {
    const saved = cookie;
    cookie = '';
    const site = (await call('site.get', {}, { auth: false })).data;
    assert.deepEqual(Object.keys(site).sort(), Object.keys(SITE_DEFAULTS).sort());
    assert.equal(site.general.name, 'Howly Public School');
    for (const action of ['site.update', 'site.reset', 'media.upload', 'enquiries.list', 'enquiries.update', 'enquiries.delete']) {
      assert.equal((await call(action, { section: 'notice', data: {} }, { auth: false })).status, 401, action);
    }
    cookie = saved;
  });

  await step('website: save, clean up input, reject unsafe links, restore original', async () => {
    const r = await call('site.update', { section: 'notice', data: { enabled: 'yes', text: '  Exams start 5 Dec  ', sneaky: 'dropped' } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.data.data, { enabled: 'yes', text: 'Exams start 5 Dec' });
    assert.equal((await call('site.get', {}, { auth: false })).data.notice.text, 'Exams start 5 Dec');

    const people = [{ name: 'New Teacher', role: 'Assistant Teacher', photo: 'https://example.com/a.jpg' }];
    const fac = await call('site.update', { section: 'faculty', data: { ...SITE_DEFAULTS.faculty, items: people } });
    assert.equal(fac.status, 200);
    assert.deepEqual(fac.data.data.items[0], { name: 'New Teacher', role: 'Assistant Teacher', qualification: '', experience: '', photo: 'https://example.com/a.jpg' });

    assert.equal((await call('site.update', { section: 'faculty', data: { ...SITE_DEFAULTS.faculty, items: [{ name: 'X', photo: 'javascript:alert(1)' }] } })).status, 400);
    assert.equal((await call('site.update', { section: 'general', data: { ...SITE_DEFAULTS.general, facebook_url: 'data:text/html,hi' } })).status, 400);
    assert.equal((await call('site.update', { section: 'hero', data: { ...SITE_DEFAULTS.hero, title: { $ne: 1 } } })).status, 400);
    assert.equal((await call('site.update', { section: 'nope', data: {} })).status, 400);
    assert.equal((await call('site.update', { section: '__proto__', data: {} })).status, 400);
    assert.equal((await call('site.update', { section: 'news', data: { ...SITE_DEFAULTS.news, items: 'not a list' } })).status, 400);

    assert.equal((await call('site.reset', { section: 'notice' })).status, 200);
    assert.equal((await call('site.reset', { section: 'faculty' })).status, 200);
    const back = (await call('site.get', {}, { auth: false })).data;
    assert.deepEqual(back.notice, SITE_DEFAULTS.notice);
    assert.equal(back.faculty.items.length, SITE_DEFAULTS.faculty.items.length);
  });

  await step('photos: upload is checked, stored and served with long caching', async () => {
    // 1×1 PNG
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const up = await call('media.upload', { data_url: `data:image/png;base64,${png}` });
    assert.equal(up.status, 200);
    assert.match(up.data.url, /^\/api\/media\?id=[0-9a-f-]{36}$/);

    const res = await handleMedia(new Request(`http://localhost:3100${up.data.url}`));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/png');
    assert.match(res.headers.get('cache-control'), /immutable/);
    assert.equal(Buffer.from(await res.arrayBuffer()).toString('base64'), png);

    assert.equal((await handleMedia(new Request('http://localhost:3100/api/media?id=../../etc'))).status, 404);
    assert.equal((await handleMedia(new Request(`http://localhost:3100/api/media?id=${crypto.randomUUID()}`))).status, 404);
    assert.equal((await call('media.upload', { data_url: `data:image/jpeg;base64,${png}` })).status, 400); // not really a JPEG
    assert.equal((await call('media.upload', { data_url: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' })).status, 400);
    assert.equal((await call('media.upload', { data_url: 'https://example.com/x.png' })).status, 400);
  });

  await step('enquiries: visitors can send, admin can read, mark and delete', async () => {
    const visitor = { auth: false, headers: { 'x-forwarded-for': '198.51.100.7' } };
    assert.equal((await call('enquiry.submit', { kind: 'admission', name: 'Parent One', phone: '+91 98765 43210', student_class: 'Class II', student_name: 'Kid' }, visitor)).status, 200);
    assert.equal((await call('enquiry.submit', { kind: 'general', name: 'Visitor', phone: '9876543210', message: 'When is the office open?' }, visitor)).status, 200);
    assert.equal((await call('enquiry.submit', { kind: 'general', name: 'Visitor', phone: '9876543210' }, visitor)).status, 400); // message required
    assert.equal((await call('enquiry.submit', { name: 'Bad', phone: 'call me maybe' }, visitor)).status, 400);
    assert.equal((await call('enquiry.submit', { name: 'Bad', phone: '9876543210', email: 'not-an-email' }, visitor)).status, 400);
    // honeypot: looks successful, stores nothing
    assert.equal((await call('enquiry.submit', { name: 'Bot', phone: '9876543210', message: 'spam', website: 'http://spam' }, visitor)).status, 200);

    const list = (await call('enquiries.list')).data;
    assert.equal(list.length, 2);
    assert.ok(list.every((e) => e.status === 'new' && e.ip_hash === undefined));
    assert.equal((await call('stats.get')).data.newEnquiries, 2);
    const admission = list.find((e) => e.kind === 'admission');
    assert.equal(admission.student_class, 'Class II');

    assert.equal((await call('enquiries.update', { id: admission.id, status: 'done' })).status, 200);
    assert.equal((await call('enquiries.update', { id: admission.id, status: 'archived' })).status, 400);
    assert.equal((await call('stats.get')).data.newEnquiries, 1);
    assert.equal((await call('enquiries.delete', { id: admission.id })).status, 200);
    assert.equal((await call('enquiries.list')).data.length, 1);

    // a 6th message from the same address within an hour is refused
    for (let i = 0; i < 3; i += 1) await call('enquiry.submit', { name: 'Again', phone: '9876543210', message: `hi ${i}` }, visitor);
    assert.equal((await call('enquiry.submit', { name: 'Again', phone: '9876543210', message: 'one more' }, visitor)).status, 429);
    assert.equal((await call('enquiry.submit', { name: 'Other', phone: '9876543210', message: 'hi' }, { auth: false, headers: { 'x-forwarded-for': '198.51.100.8' } })).status, 200);
  });

  await step("local password reset: refused unless it is the owner's own computer", async () => {
    cookie = '';
    const next = PASSWORD + '-local';
    const local = { headers: { 'x-hps-local': '1' } };
    assert.equal((await call('auth.session')).data.canLocalReset, false);
    assert.equal((await call('auth.localReset', { password: next })).status, 403); // ordinary visitor
    process.env.VERCEL = '1'; // on the live site, even a forged marker is refused
    assert.equal((await call('auth.localReset', { password: next }, local)).status, 403);
    assert.equal((await call('auth.session', {}, local)).data.canLocalReset, false);
    delete process.env.VERCEL;
    assert.equal((await call('auth.login', { password: next })).status, 401); // nothing changed so far
    assert.equal((await call('auth.session', {}, local)).data.canLocalReset, true);
    assert.equal((await call('auth.localReset', { password: 'short' }, local)).status, 400);
    assert.equal((await call('auth.localReset', { password: next }, local)).status, 200);
    assert.equal((await call('stats.get')).status, 200); // signed in straight away
    cookie = '';
    assert.equal((await call('auth.login', { password: PASSWORD })).status, 401);
    assert.equal((await call('auth.login', { password: next })).status, 200);
    await setAdminPassword(db, PASSWORD);
    await db.collection('login_attempts').deleteMany({});
  });

  console.log(`\nAll ${passed} checks passed against database "${dbName}".`);
} catch (err) {
  console.error(`\nFAILED after ${passed} passing checks:\n`, err);
  process.exitCode = 1;
} finally {
  await closeDb();
}
