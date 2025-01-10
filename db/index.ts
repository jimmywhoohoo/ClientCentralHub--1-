import { neon } from '@neondatabase/serverless';
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@db/schema";
import ws from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const sql = neon(process.env.DATABASE_URL, { webSocketConstructor: ws });
export const db = drizzle(sql, { schema });