import { drizzle } from 'drizzle-orm/node-postgres';
import PgPool from 'pg-pool';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a connection pool with proper SSL and timeout settings
const pool = new PgPool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

// Create the database instance with schema
export const db = drizzle(pool, { schema });

// Export function for testing connection
export async function testConnection() {
  try {
    // Test using raw query with timeout
    const result = await Promise.race([
      pool.query('SELECT NOW()'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      )
    ]);

    console.log('Database connection successful');
    console.log("Database connection established with:");
    console.log(`- Host: ${process.env.PGHOST}`);
    console.log(`- Database: ${process.env.PGDATABASE}`);
    console.log(`- Port: ${process.env.PGPORT}`);

    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

// Cleanup function for graceful shutdown
export async function closeDatabase() {
  await pool.end();
}