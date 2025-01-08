import { defineConfig } from "drizzle-kit";
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./db/schema.ts",
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
});