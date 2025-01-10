import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection with SSL and proper timeout
const client = postgres(process.env.DATABASE_URL, {
  ssl: true,
  max: 1
});

// Create Drizzle ORM instance
export const db = drizzle(client, { schema });

// Export schema for use in other files
export * from './schema';

// Export function for testing connection
export async function testConnection() {
  try {
    const result = await client`SELECT 1 as test`;
    console.log('Database connection successful:', result[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}