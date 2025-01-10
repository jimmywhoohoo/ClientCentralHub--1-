import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Document } from "./entities/Document";
import { DocumentVersion } from "./entities/DocumentVersion";
import pg from "pg-connection-string";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const connectionOptions = pg.parse(process.env.DATABASE_URL);

// Create TypeORM data source
export const AppDataSource = new DataSource({
  type: "postgres",
  host: connectionOptions.host || process.env.PGHOST,
  port: parseInt(connectionOptions.port || process.env.PGPORT || "5432", 10),
  username: connectionOptions.user || process.env.PGUSER,
  password: connectionOptions.password || process.env.PGPASSWORD,
  database: connectionOptions.database || process.env.PGDATABASE,
  synchronize: true, // Only for development
  logging: ["error", "warn", "info"],
  entities: [User, Document, DocumentVersion],
  subscribers: [],
  migrations: [],
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// Initialize the data source
export async function initializeDatabase() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("Data Source has been initialized!");
      return true;
    }
    return true;
  } catch (error) {
    console.error("Error during Data Source initialization:", error);
    throw error;
  }
}