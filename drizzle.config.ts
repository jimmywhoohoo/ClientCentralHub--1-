import { defineConfig } from "drizzle-kit";
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export default defineConfig({
  out: "./migrations",
  schema: "./db/schema.ts",
  driver: 'pg',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  }
});