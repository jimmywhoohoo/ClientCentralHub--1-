import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config();

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./migrations",
  driver: "better-sqlite",
  dbCredentials: {
    url: "./sqlite.db"
  },
  verbose: true,
  strict: true,
});