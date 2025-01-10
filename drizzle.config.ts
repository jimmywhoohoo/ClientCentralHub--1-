import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const [protocol, rest] = process.env.DATABASE_URL.split('://');
const [credentials, hostAndDb] = rest.split('@');
const [username, password] = credentials.split(':');
const [hostAndPort, database] = hostAndDb.split('/');
const [host, port] = hostAndPort.split(':');

export default defineConfig({
  out: "./migrations",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    host,
    port: parseInt(port || "5432", 10),
    user: username,
    password,
    database,
    ssl: true
  },
  verbose: true,
  strict: true,
});