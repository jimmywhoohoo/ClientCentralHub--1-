import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Document } from "./entities/Document";
import { DocumentVersion } from "./entities/DocumentVersion";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Create TypeORM data source
export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true, // Only for development
  logging: ["error", "warn", "info"],
  entities: [User, Document, DocumentVersion],
  subscribers: [],
  migrations: [],
  ssl: {
    rejectUnauthorized: false
  },
  extra: {
    max: 20,
    ssl: {
      rejectUnauthorized: false
    }
  },
  connectTimeoutMS: 10000,
  poolSize: 20,
  applicationName: "secure-client-portal"
});

// Initialize the data source
export async function initializeDatabase() {
  try {
    if (!AppDataSource.isInitialized) {
      console.log("Initializing database connection...");
      await AppDataSource.initialize();
      console.log("Data Source has been initialized!");

      // Log connection details (without sensitive info)
      console.log("Database connection established with:");
      console.log(`- Host: ${process.env.PGHOST}`);
      console.log(`- Database: ${process.env.PGDATABASE}`);
      console.log(`- Port: ${process.env.PGPORT}`);

      return true;
    }
    return true;
  } catch (error) {
    console.error("Error during Data Source initialization:", error);
    throw error;
  }
}