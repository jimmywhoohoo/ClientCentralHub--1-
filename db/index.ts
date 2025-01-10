import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });

// Export function for testing connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      console.log('Database connection successful');

      // Log connection details (without sensitive info)
      console.log("Database connection established with:");
      console.log(`- Host: ${process.env.PGHOST}`);
      console.log(`- Database: ${process.env.PGDATABASE}`);
      console.log(`- Port: ${process.env.PGPORT}`);

      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}