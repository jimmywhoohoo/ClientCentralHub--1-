import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a PostgreSQL client with explicit configuration
const queryClient = postgres(process.env.DATABASE_URL, {
  max: 1,
  ssl: true,
  idle_timeout: 20,
  max_lifetime: 60 * 30
});

// Create and export the database instance with schema
export const db = drizzle(queryClient, { schema });

// Test database connection
async function testConnection() {
  try {
    await queryClient`SELECT NOW()`;
    console.log('Database connection successful');
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  }
}

// Initialize connection
testConnection().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});