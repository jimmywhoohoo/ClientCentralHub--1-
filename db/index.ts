import { neon } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@db/schema";
import ws from "ws";

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

// Handle connection errors.  Note: This needs adjustment as `sql` is no longer used.  Error handling should be implemented differently depending on how the drizzle client handles errors.
process.on('SIGTERM', () => {
  //  sql.end().catch(console.error);  //This line is removed because sql is no longer in use
  console.log("SIGTERM received. Attempting graceful shutdown...");
  // Add appropriate cleanup logic for the drizzle connection here if needed.
});