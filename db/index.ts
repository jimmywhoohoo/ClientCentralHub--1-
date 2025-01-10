import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";
import ws from "ws";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  ssl: "require",
  connect_timeout: 10,
  ws: { WebSocket: ws },
});

export const db = drizzle(client, { schema });