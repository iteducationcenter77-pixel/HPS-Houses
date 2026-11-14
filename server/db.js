// ============================================
// MongoDB connection (shared by the API and the scripts)
// ============================================

import { MongoClient } from 'mongodb';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// One client per server instance, reused across requests.
const cache = (globalThis.__hpsMongo ??= { uri: null, promise: null });

export function getClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new HttpError(500, 'Database is not configured (MONGODB_URI is missing)');

  if (!cache.promise || cache.uri !== uri) {
    const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 });
    cache.uri = uri;
    cache.promise = client.connect().catch((err) => {
      cache.promise = null; // let the next request retry
      throw err;
    });
  }
  return cache.promise;
}

export async function getDb() {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || 'hps');
}

export async function closeDb() {
  if (!cache.promise) return;
  const client = await cache.promise.catch(() => null);
  cache.promise = null;
  if (client) await client.close();
}

/** Create the indexes the app relies on. Safe to run repeatedly. */
export async function ensureIndexes(db) {
  await db.collection('houses').createIndex({ name: 1 }, { unique: true });

  await db.collection('students').createIndex(
    { class: 1, roll_number: 1 },
    { unique: true, partialFilterExpression: { is_active: true } }
  );
  await db.collection('students').createIndex({ house_id: 1 });
  // Chest numbers are unique among current students (blank is allowed for any number of them).
  await db.collection('students').createIndex(
    { chest_number: 1 },
    { unique: true, name: 'chest_number_active', partialFilterExpression: { is_active: true, chest_number: { $type: 'string' } } }
  );

  await db.collection('competitions').createIndex({ competition_date: -1 });
  await db.collection('competitions').createIndex({ status: 1 });

  await db.collection('participation').createIndex({ competition_id: 1, student_id: 1 }, { unique: true });
  await db.collection('participation').createIndex({ student_id: 1 });
  await db.collection('participation').createIndex({ house_id: 1 });

  await db.collection('enquiries').createIndex({ created_at: -1 });
  await db.collection('enquiries').createIndex({ status: 1 });
  // Records of recent form sends (for the 5-per-hour limit) expire after an hour.
  await db.collection('enquiry_sends').createIndex({ at: 1 }, { expireAfterSeconds: 3600 });
  await db.collection('enquiry_sends').createIndex({ ip_hash: 1, at: -1 });

  // Failed-login records expire on their own after 15 minutes.
  await db.collection('login_attempts').createIndex({ at: 1 }, { expireAfterSeconds: 900 });
  await db.collection('login_attempts').createIndex({ ip: 1 });
}

/** Mongo documents use `_id`; the site expects `id`. */
export function toClient(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}
