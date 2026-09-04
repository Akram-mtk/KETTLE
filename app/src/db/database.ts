import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { setDb } from '@kettle/shared';
import migrations from '../../drizzle/migrations';

const sqlite = openDatabaseSync('kettle.db');

// Enforce FK constraints — off by default in SQLite.
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite);

setDb(db);

/** Runs the bundled migrations once on app start; renders null until it's done. */
export function useDatabaseReady() {
  return useMigrations(db, migrations);
}
