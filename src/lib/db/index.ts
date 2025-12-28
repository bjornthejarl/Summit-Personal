import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from "postgres";

// Lazy database connection - only connects when actually used
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
  }

  _db = drizzle(postgres(databaseUrl));
  return _db;
}

// Export a proxy that lazily initializes the database connection
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  },
});