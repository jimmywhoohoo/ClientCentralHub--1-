import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@db/schema";

const sqlite = new Database('sqlite.db', { verbose: console.log });

export const db = drizzle(sqlite, { schema });

// Export sql tag for raw queries
export { sql } from 'drizzle-orm';

// Export function for testing connection
export async function testConnection() {
  try {
    const result = await db.select({ test: sql`1` }).all();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}