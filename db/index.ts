import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@db/schema";

// Create SQLite database connection
const sqlite = new Database("sqlite.db");

// Create drizzle database instance
export const db = drizzle(sqlite, { schema });

// Export function for testing connection
export const testConnection = async () => {
  try {
    // Test connection with a simple query
    sqlite.prepare('SELECT 1').get();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// Export the raw sqlite connection for schema creation
export const getSqliteDb = () => sqlite;