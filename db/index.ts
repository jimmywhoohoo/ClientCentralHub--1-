import { Pool } from 'pg';
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@db/schema";

// Get database configuration from environment variables
const {
  PGHOST,
  PGUSER,
  PGPASSWORD,
  PGDATABASE,
  PGPORT
} = process.env;

if (!PGHOST || !PGUSER || !PGPASSWORD || !PGDATABASE || !PGPORT) {
  throw new Error("Database configuration missing. Database not provisioned correctly.");
}

// Create connection pool with retry logic
const pool = new Pool({
  host: PGHOST,
  user: PGUSER,
  password: PGPASSWORD,
  database: PGDATABASE,
  port: parseInt(PGPORT, 10),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test database connection
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Create the database connection with proper configuration
export const db = drizzle(pool, { schema });

// Handle cleanup on application shutdown
process.on('SIGTERM', async () => {
  console.log("Closing database connections...");
  await pool.end();
});

process.on('SIGINT', async () => {
  console.log("Closing database connections...");
  await pool.end();
});

// Export pool for testing connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};