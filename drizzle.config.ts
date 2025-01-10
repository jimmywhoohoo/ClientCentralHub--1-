import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config();

export default defineConfig({
  out: "./migrations",
  schema: "./db/schema.ts",
  driver: 'better-sqlite',
  dbCredentials: {
    url: 'sqlite.db'
  },
  verbose: true,
  strict: true
});