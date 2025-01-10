import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@db/schema";

const sqlite = new Database('sqlite.db');
export const db = drizzle(sqlite, { schema });

// Export function for testing connection
export async function testConnection() {
  try {
    // Use a simple raw query to test the connection
    sqlite.prepare('SELECT 1').get();
    console.log('SQLite database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection attempt failed:', error);
    throw error;
  }
}

// Handle cleanup
process.on('exit', () => {
  sqlite.close();
});