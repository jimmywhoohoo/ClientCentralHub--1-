import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Create a new pool with explicit configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // reduce max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

// Add error handler for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      console.log('Database connection successful');
    } finally {
      client.release();
    }
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

export const db = drizzle(pool, { schema });