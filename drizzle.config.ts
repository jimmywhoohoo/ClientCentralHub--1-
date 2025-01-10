import { defineConfig } from "drizzle-kit";
import { resolve } from "path";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "better-sqlite3",
  dbCredentials: {
    url: resolve("./sqlite.db")
  },
  verbose: true,
  strict: true,
});