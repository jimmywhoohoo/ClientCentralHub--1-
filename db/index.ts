import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const queryClient = postgres(process.env.DATABASE_URL, {
  max: 1,
  connect_timeout: 10,
});

export const db = drizzle(queryClient);

// Test database connection
async function testConnection() {
  try {
    const result = await queryClient`SELECT NOW()`;
    console.log('Database connection successful');
    return result;
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