import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const db = drizzle({
  connection: process.env.DATABASE_URL,
  schema,
  ws: ws,
});

// Handle cleanup on application shutdown
process.on('SIGTERM', async () => {
  console.log("Closing database connections...");
  // No pool to end with neon-serverless
});

process.on('SIGINT', async () => {
  console.log("Closing database connections...");
  // No pool to end with neon-serverless
});

// Export function for testing connection
export const testConnection = async () => {
  try {
    // For neon-serverless, we'll test by running a simple select query
    const result = await db.select().from(schema.users).limit(1);
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};