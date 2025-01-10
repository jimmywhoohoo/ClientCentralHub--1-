import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Document } from "./entities/Document";
import { DocumentVersion } from "./entities/DocumentVersion";
import path from "path";

// Create TypeORM data source
export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "database.sqlite",
  synchronize: true, // Only for development
  logging: ["error", "warn"],
  entities: [User, Document, DocumentVersion],
  subscribers: [],
  migrations: [],
});

// Initialize the data source
export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log("Data Source has been initialized!");
    return true;
  } catch (error) {
    console.error("Error during Data Source initialization:", error);
    throw error;
  }
};