import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@db/schema";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const db = drizzle({
  connectionString: process.env.DATABASE_URL,
  schema,
  webSocket: ws,
});

// Test database connection
async function testConnection() {
  try {
    await db.execute(sql`SELECT 1`);
    console.log('Database connection successful');
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