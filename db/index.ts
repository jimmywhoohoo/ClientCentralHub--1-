import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@db/schema";

const sqlite = new Database('sqlite.db');
export const db = drizzle(sqlite);

// Test database connection
async function testConnection() {
  try {
    const result = sqlite.prepare('SELECT 1').get();
    console.log('Database connection successful');
    return result;
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  }
}

// Initialize connection
testConnection().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});