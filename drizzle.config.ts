import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./db/schema.ts",
  driver: "better-sqlite",
  dbCredentials: {
    url: "sqlite.db"
  }
});