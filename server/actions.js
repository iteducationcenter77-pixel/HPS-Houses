// ============================================
// API actions — every read and write the site performs
// ============================================

import crypto from 'node:crypto';
import { HttpError, toClient } from './db.js';
import { getSiteContent, saveSection, resetSection } from './site-content.js';
import { storeImage } from './media.js';
import {
  verifyPassword, setAdminPassword, getAdminAuth, isAdminRequest,
  sessionCookie, clearedCookie, clientIp, assertLoginAllowed, recordFailedLogin,
} from './auth.js';

// ── Input helpers ──

function text(value, field, { max, required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new HttpError(400, `${field} is required`);
    return null;
  }
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text`);
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new HttpError(400, `${field} is required`);
    return null;
  }
  if (trimmed.length > max) throw new HttpError(400, `${field} is too long (max ${max} characters)`);
  return trimmed;
}

function int(value, field, { min, required = false, fallback = null } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new HttpError(400, `${field} is required`);
    return fallback;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n)) throw new HttpError(400, `${field} must be a whole number`);
  if (min !== undefined && n < min) throw new HttpError(400, `${field} must be at least ${min}`);
  return n;
}

function id(value, field = 'id') {
  if (typeof value !== 'string' || !value || value.length > 64) throw new HttpError(400, `${field} is invalid`);
  return value;
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const now = () => new Date().toISOString();
const isDuplicate = (err) => err?.code === 11000;

// Postgres sorted empty positions last; keep that order.
const positionOf = (e) => e.position ?? Number.MAX_SAFE_INTEGER;
const byPosition = (a, b) => positionOf(a) - positionOf(b);

async function houseMap(db) {
  const houses = await db.collection('houses').find().toArray();
  return new Map(houses.map((h) => [h._id, h]));
}

const houseRef = (h) => (h ? { name: h.name, color_hex: h.color_hex } : null);

// ── Field sets ──

function studentFields(p, { partial = false } = {}) {
  const out = {};
  const has = (k) => !partial || p[k] !== undefined;
  if (has('name')) out.name = text(p.name, 'Name', { max: 200, required: true });
  if (has('class')) out.class = text(p.class, 'Class', { max: 20, required: true });
  if (has('roll_number')) out.roll_number = int(p.roll_number, 'Roll number', { min: 1, required: true });
  if (has('house_id')) out.house_id = id(p.house_id, 'House');
  if (has('contact_number')) out.contact_number = text(p.contact_number, 'Contact number', { max: 15 });
  if (has('photo_url')) out.photo_url = text(p.photo_url, 'Photo URL', { max: 2000 });
  return out;
}

const STATUSES = ['upcoming', 'ongoing', 'completed'];
const ENQUIRY_STATUSES = ['new', 'read', 'done'];

function competitionFields(p, { partial = false } = {}) {
  const out = {};
  const has = (k) => !partial || p[k] !== undefined;
  if (has('name')) out.name = text(p.name, 'Competition name', { max: 200, required: true });
  if (has('type')) out.type = text(p.type, 'Type', { max: 50 }) || 'Other';
  if (has('competition_date')) {
    const date = text(p.competition_date, 'Date', { max: 10, required: true });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new HttpError(400, 'Date is invalid');
    out.competition_date = date;
  }
  if (has('status')) {
    const status = p.status || 'upcoming';
    if (!STATUSES.includes(status)) throw new HttpError(400, 'Status is invalid');
    out.status = status;
  }
  if (has('description')) out.description = text(p.description, 'Description', { max: 5000 });
  return out;
}

async function assertHouseExists(db, houseId) {
  if (!(await db.collection('houses').findOne({ _id: houseId }, { projection: { _id: 1 } }))) {
    throw new HttpError(400, 'Selected house does not exist');
  }
}

async function recalculateHousePoints(db) {
  const sums = await db.collection('participation')
    .aggregate([{ $group: { _id: '$house_id', total: { $sum: '$points_earned' } } }])
    .toArray();
  const totals = new Map(sums.map((s) => [s._id, s.total]));
  const houses = await db.collection('houses').find({}, { projection: { _id: 1 } }).toArray();
  const updated_at = now();
  await Promise.all(houses.map((h) =>
    db.collection('houses').updateOne({ _id: h._id }, { $set: { total_points: totals.get(h._id) || 0, updated_at } })
  ));
}

// ── Actions ──
// `admin: true` actions require a signed-in admin; the rest are public.

export const actions = {
  // ---- Public ----

  'dashboard.get': {
    async run(db) {
      const houses = await db.collection('houses').find().sort({ total_points: -1, name: 1 }).toArray();
      const housesById = new Map(houses.map((h) => [h._id, h]));

      const completed = await db.collection('competitions')
        .find({ status: 'completed' }).sort({ competition_date: -1 }).limit(5).toArray();

      const results = [];
      for (const comp of completed) {
        const entries = await db.collection('participation').find({ competition_id: comp._id }).toArray();
        const top = entries.sort(byPosition).slice(0, 3);
        const students = await db.collection('students')
          .find({ _id: { $in: top.map((e) => e.student_id) } }, { projection: { name: 1, photo_url: 1 } })
          .toArray();
        const studentsById = new Map(students.map((s) => [s._id, s]));
        results.push({
          ...toClient(comp),
          winners: top.map((e) => ({
            name: studentsById.get(e.student_id)?.name || 'Unknown',
            house: housesById.get(e.house_id)?.name || '',
            position: e.position,
            points: e.points_earned,
            photo_url: studentsById.get(e.student_id)?.photo_url || '',
          })),
        });
      }

      const upcoming = await db.collection('competitions')
        .find({ status: { $in: ['upcoming', 'ongoing'] } }).sort({ competition_date: 1 }).limit(5).toArray();

      return { houses: houses.map(toClient), results, upcoming: upcoming.map(toClient) };
    },
  },

  'houses.list': {
    async run(db) {
      const houses = await db.collection('houses').find().sort({ total_points: -1, name: 1 }).toArray();
      return houses.map(toClient);
    },
  },

  'settings.get': {
    async run(db) {
      const doc = await db.collection('admin_settings').findOne({ _id: 1 });
      return { school_logo_url: doc?.school_logo_url || '' };
    },
  },

  'site.get': {
    async run(db) {
      return getSiteContent(db);
    },
  },

  // Admission / contact form on the public site. Lands in Admin → Enquiries.
  'enquiry.submit': {
    async run(db, params, ctx) {
      // Bots fill every field, including this hidden one; pretend success.
      if (params.website) return { sent: true };

      const ip_hash = crypto.createHash('sha256')
        .update(`${process.env.AUTH_SECRET || ''}:${clientIp(ctx.request)}`).digest('hex').slice(0, 32);
      const since = new Date(Date.now() - 60 * 60 * 1000);
      if (await db.collection('enquiry_sends').countDocuments({ ip_hash, at: { $gte: since } }) >= 5) {
        throw new HttpError(429, 'You have sent several messages already. Please call or WhatsApp us instead.');
      }

      const kind = params.kind === 'admission' ? 'admission' : 'general';
      const phone = text(params.phone, 'Phone number', { max: 20, required: true });
      if (!/^[+\d][\d\s-]{6,19}$/.test(phone)) throw new HttpError(400, 'Please enter a valid phone number');
      const email = text(params.email, 'Email', { max: 120 });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Please enter a valid email address');

      const doc = {
        _id: crypto.randomUUID(),
        kind,
        name: text(params.name, 'Name', { max: 100, required: true }),
        phone,
        email,
        student_name: text(params.student_name, 'Student name', { max: 100 }),
        student_class: text(params.student_class, 'Class', { max: 40 }),
        message: text(params.message, 'Message', { max: 2000, required: kind === 'general' }),
        status: 'new',
        ip_hash,
        created_at: now(),
      };
      await db.collection('enquiries').insertOne(doc);
      await db.collection('enquiry_sends').insertOne({ ip_hash, at: new Date() });
      return { sent: true };
    },
  },

  'auth.session': {
    async run(db, _params, ctx) {
      return { loggedIn: await isAdminRequest(db, ctx.request), canLocalReset: ctx.isLocal };
    },
  },

  // Set or reset the admin password without knowing the old one. Only works when the
  // site is opened on the owner's own computer (see `isLocal` in handler.js) — whoever
  // runs it there already holds the database credentials.
  'auth.localReset': {
    async run(db, params, ctx) {
      if (!ctx.isLocal) throw new HttpError(403, 'This is only available on the site owner\'s computer');
      const version = await setAdminPassword(db, params.password);
      await db.collection('login_attempts').deleteMany({});
      ctx.cookies.push(sessionCookie(ctx.request, version));
      return { loggedIn: true };
    },
  },

  'auth.login': {
    async run(db, params, ctx) {
      const ip = clientIp(ctx.request);
      await assertLoginAllowed(db, ip);

      const auth = await getAdminAuth(db);
      if (!auth) throw new HttpError(503, 'Admin password has not been set up yet');

      if (!(await verifyPassword(params.password, auth.password_hash))) {
        await recordFailedLogin(db, ip);
        throw new HttpError(401, 'Invalid password. Please try again.');
      }
      ctx.cookies.push(sessionCookie(ctx.request, auth.version));
      return { loggedIn: true };
    },
  },

  'auth.logout': {
    async run(_db, _params, ctx) {
      ctx.cookies.push(clearedCookie(ctx.request));
      return { loggedIn: false };
    },
  },

  // ---- Admin ----

  'auth.changePassword': {
    admin: true,
    async run(db, params, ctx) {
      const auth = await getAdminAuth(db);
      if (!(await verifyPassword(params.current, auth.password_hash))) {
        throw new HttpError(400, 'Current password is incorrect');
      }
      const version = await setAdminPassword(db, params.next);
      ctx.cookies.push(sessionCookie(ctx.request, version)); // keep this browser signed in
      return { changed: true };
    },
  },

  'stats.get': {
    admin: true,
    async run(db) {
      const [students, competitions, newEnquiries] = await Promise.all([
        db.collection('students').countDocuments({ is_active: true }),
        db.collection('competitions').countDocuments(),
        db.collection('enquiries').countDocuments({ status: 'new' }),
      ]);
      return { students, competitions, newEnquiries };
    },
  },

  // ---- Website content ----

  'site.update': {
    admin: true,
    async run(db, params) {
      return { section: params.section, data: await saveSection(db, params.section, params.data) };
    },
  },

  'site.reset': {
    admin: true,
    async run(db, params) {
      return { section: params.section, data: await resetSection(db, params.section) };
    },
  },

  'media.upload': {
    admin: true,
    async run(db, params) {
      return storeImage(db, params.data_url);
    },
  },

  // ---- Enquiries inbox ----

  'enquiries.list': {
    admin: true,
    async run(db) {
      const items = await db.collection('enquiries')
        .find({}, { projection: { ip_hash: 0 } }).sort({ created_at: -1 }).limit(500).toArray();
      return items.map(toClient);
    },
  },

  'enquiries.update': {
    admin: true,
    async run(db, params) {
      if (!ENQUIRY_STATUSES.includes(params.status)) throw new HttpError(400, 'Status is invalid');
      const res = await db.collection('enquiries').updateOne({ _id: id(params.id) }, { $set: { status: params.status } });
      if (!res.matchedCount) throw new HttpError(404, 'Enquiry not found');
      return { updated: true };
    },
  },

  'enquiries.delete': {
    admin: true,
    async run(db, params) {
      const res = await db.collection('enquiries').deleteOne({ _id: id(params.id) });
      if (!res.deletedCount) throw new HttpError(404, 'Enquiry not found');
      return { deleted: true };
    },
  },

  'settings.update': {
    admin: true,
    async run(db, params) {
      const school_logo_url = text(params.school_logo_url, 'Logo URL', { max: 2000 }) || '';
      await db.collection('admin_settings').updateOne(
        { _id: 1 }, { $set: { school_logo_url, updated_at: now() } }, { upsert: true }
      );
      return { school_logo_url };
    },
  },

  'houses.update': {
    admin: true,
    async run(db, params) {
      const u = params.updates || {};
      const set = { updated_at: now() };
      if (u.motto !== undefined) set.motto = text(u.motto, 'Motto', { max: 255 });
      if (u.logo_url !== undefined) set.logo_url = text(u.logo_url, 'Logo URL', { max: 2000 });
      if (u.total_points !== undefined) set.total_points = int(u.total_points, 'Total points', { min: 0, fallback: 0 });
      const res = await db.collection('houses').updateOne({ _id: id(params.id) }, { $set: set });
      if (!res.matchedCount) throw new HttpError(404, 'House not found');
      return { updated: true };
    },
  },

  'students.list': {
    admin: true,
    async run(db, params) {
      const filter = { is_active: true };
      if (params.house_id) filter.house_id = id(params.house_id, 'House');
      const search = text(params.search, 'Search', { max: 100 });
      if (search) filter.name = { $regex: escapeRegex(search), $options: 'i' };

      const sort = params.sort === 'name' ? { name: 1 } : { class: 1, roll_number: 1 };
      const [students, houses] = await Promise.all([
        db.collection('students').find(filter).sort(sort).toArray(),
        houseMap(db),
      ]);
      return students.map((s) => ({ ...toClient(s), houses: houseRef(houses.get(s.house_id)) }));
    },
  },

  'students.add': {
    admin: true,
    async run(db, params) {
      const fields = studentFields(params.student || {});
      await assertHouseExists(db, fields.house_id);
      const doc = { _id: crypto.randomUUID(), ...fields, is_active: true, created_at: now() };
      try {
        await db.collection('students').insertOne(doc);
      } catch (err) {
        if (isDuplicate(err)) throw new HttpError(409, 'A student with this class and roll number already exists');
        throw err;
      }
      return toClient(doc);
    },
  },

  'students.update': {
    admin: true,
    async run(db, params) {
      const fields = studentFields(params.updates || {}, { partial: true });
      if (fields.house_id) await assertHouseExists(db, fields.house_id);
      if (!Object.keys(fields).length) throw new HttpError(400, 'Nothing to update');
      try {
        const res = await db.collection('students').updateOne({ _id: id(params.id) }, { $set: fields });
        if (!res.matchedCount) throw new HttpError(404, 'Student not found');
      } catch (err) {
        if (isDuplicate(err)) throw new HttpError(409, 'A student with this class and roll number already exists');
        throw err;
      }
      return { updated: true };
    },
  },

  // Students are hidden rather than erased, so past results keep their names.
  'students.delete': {
    admin: true,
    async run(db, params) {
      const res = await db.collection('students').updateOne({ _id: id(params.id) }, { $set: { is_active: false } });
      if (!res.matchedCount) throw new HttpError(404, 'Student not found');
      return { deleted: true };
    },
  },

  'competitions.list': {
    admin: true,
    async run(db) {
      const comps = await db.collection('competitions').find().sort({ competition_date: -1 }).toArray();
      return comps.map(toClient);
    },
  },

  'competitions.add': {
    admin: true,
    async run(db, params) {
      const doc = { _id: crypto.randomUUID(), ...competitionFields(params.competition || {}), created_at: now() };
      await db.collection('competitions').insertOne(doc);
      return toClient(doc);
    },
  },

  'competitions.update': {
    admin: true,
    async run(db, params) {
      const fields = competitionFields(params.updates || {}, { partial: true });
      if (!Object.keys(fields).length) throw new HttpError(400, 'Nothing to update');
      const res = await db.collection('competitions').updateOne({ _id: id(params.id) }, { $set: fields });
      if (!res.matchedCount) throw new HttpError(404, 'Competition not found');
      return { updated: true };
    },
  },

  'competitions.delete': {
    admin: true,
    async run(db, params) {
      const compId = id(params.id);
      await db.collection('participation').deleteMany({ competition_id: compId });
      const res = await db.collection('competitions').deleteOne({ _id: compId });
      if (!res.deletedCount) throw new HttpError(404, 'Competition not found');
      return { deleted: true };
    },
  },

  'participation.list': {
    admin: true,
    async run(db, params) {
      const entries = await db.collection('participation').find({ competition_id: id(params.competition_id) }).toArray();
      const [students, houses] = await Promise.all([
        db.collection('students').find({ _id: { $in: entries.map((e) => e.student_id) } }).toArray(),
        houseMap(db),
      ]);
      const studentsById = new Map(students.map((s) => [s._id, s]));
      return entries.sort(byPosition).map((e) => {
        const s = studentsById.get(e.student_id);
        return {
          ...toClient(e),
          students: s ? { name: s.name, class: s.class, photo_url: s.photo_url ?? null } : null,
          houses: houseRef(houses.get(e.house_id)),
        };
      });
    },
  },

  // Replaces a competition's results, marks it completed and refreshes house totals.
  'results.save': {
    admin: true,
    async run(db, params) {
      const compId = id(params.competition_id, 'Competition');
      if (!(await db.collection('competitions').findOne({ _id: compId }, { projection: { _id: 1 } }))) {
        throw new HttpError(404, 'Competition not found');
      }
      if (!Array.isArray(params.results) || params.results.length > 2000) throw new HttpError(400, 'Results are invalid');

      // Validate everything before touching the stored results.
      const studentIds = params.results.map((r) => id(r?.student_id, 'Student'));
      if (new Set(studentIds).size !== studentIds.length) {
        throw new HttpError(400, 'The same student is listed more than once');
      }
      const students = await db.collection('students')
        .find({ _id: { $in: studentIds } }, { projection: { house_id: 1 } }).toArray();
      const studentsById = new Map(students.map((s) => [s._id, s]));

      const docs = params.results.map((r) => {
        const student = studentsById.get(r.student_id);
        if (!student) throw new HttpError(400, 'One of the selected students no longer exists');
        return {
          _id: crypto.randomUUID(),
          competition_id: compId,
          student_id: r.student_id,
          house_id: student.house_id,
          position: int(r.position, 'Position', { min: 1 }),
          points_earned: int(r.points_earned, 'Points', { min: 0, fallback: 0 }),
          remarks: text(r.remarks, 'Remarks', { max: 1000 }),
        };
      });

      await db.collection('participation').deleteMany({ competition_id: compId });
      if (docs.length) await db.collection('participation').insertMany(docs);
      await db.collection('competitions').updateOne({ _id: compId }, { $set: { status: 'completed' } });
      await recalculateHousePoints(db);
      return { saved: docs.length };
    },
  },
};
