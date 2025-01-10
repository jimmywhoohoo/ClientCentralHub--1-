import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure SQL client with proper SSL settings
const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  ssl: { rejectUnauthorized: false }, // Always use SSL with rejectUnauthorized: false
  connection: {
    application_name: "secure-client-portal"
  }
});

// Create the database instance with schema
export const db = drizzle(client, { schema });

// Export function for testing connection
export async function testConnection() {
  let retries = 5;
  while (retries > 0) {
    try {
      const result = await client`SELECT NOW()`;
      console.log('Database connection successful');
      console.log("Database connection established with:");
      console.log(`- Host: ${process.env.PGHOST}`);
      console.log(`- Database: ${process.env.PGDATABASE}`);
      console.log(`- Port: ${process.env.PGPORT}`);

      return true;
    } catch (error) {
      console.error(`Database connection attempt failed (${retries} retries left):`, error);
      retries--;
      if (retries === 0) throw error;
      // Wait for 2 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
}

// Handle client cleanup
process.on('exit', () => {
  client.end().catch(console.error);
});