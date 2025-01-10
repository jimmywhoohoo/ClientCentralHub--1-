import { defineConfig } from "drizzle-kit";
import { resolve } from "path";

export default defineConfig({
  schema: "./db/schema.ts",
  driver: "better-sqlite3",
  dbCredentials: {
    url: resolve("sqlite.db"),
  },
  out: "./migrations",
  verbose: true,
  strict: true,
});