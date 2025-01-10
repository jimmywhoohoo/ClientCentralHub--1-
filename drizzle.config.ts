import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const {
  PGHOST,
  PGUSER,
  PGPASSWORD,
  PGDATABASE,
  PGPORT
} = process.env;

if (!PGHOST || !PGUSER || !PGPASSWORD || !PGDATABASE || !PGPORT) {
  throw new Error("Database configuration missing. Please ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./db/schema.ts",
  driver: "pg",
  dbCredentials: {
    host: PGHOST,
    user: PGUSER,
    password: PGPASSWORD,
    database: PGDATABASE,
    port: parseInt(PGPORT, 10),
  },
  verbose: true,
  strict: true
});