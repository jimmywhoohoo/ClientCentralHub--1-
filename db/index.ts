import { neon } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a Neon client with WebSocket support
const sql_client = neon(process.env.DATABASE_URL);
export const db = drizzle(sql_client, { schema });

// Test database connection
async function testConnection() {
  try {
    const result = await db.execute(sql`SELECT NOW()`);
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