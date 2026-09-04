import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/db/schema';
import { setDb } from '../src/db/client';

/**
 * A fresh in-memory SQLite database per test file, migrated with the exact
 * same generated SQL the on-device app runs — so a passing test suite means
 * the on-device schema actually works, not just some hand-rolled substitute.
 * Run `npm run db:generate` (in this package) after editing db/schema.ts.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(__dirname, '../../../app/drizzle');

const sqlite = new Database(':memory:');
const db = drizzle(sqlite, { schema });
migrate(db, { migrationsFolder });

setDb(db);
