import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

/**
 * Driver-agnostic handle: the app wires up `drizzle-orm/expo-sqlite` on-device
 * and tests wire up `drizzle-orm/better-sqlite3` in plain Node — both satisfy
 * this type, and every service below only ever calls `getDb()`.
 */
export type Database = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>;

let currentDb: Database | undefined;

export function setDb(db: Database): void {
  currentDb = db;
}

export function getDb(): Database {
  if (!currentDb) throw new Error('Base de données non initialisée — appeler setDb() au démarrage.');
  return currentDb;
}
