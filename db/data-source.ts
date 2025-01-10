import "reflect-metadata";
import { DataSource } from "typeorm";
import { join } from "path";
import { User } from "./entities/User";
import { Document } from "./entities/Document";
import { DocumentVersion } from "./entities/DocumentVersion";

// Create TypeORM data source
export const AppDataSource = new DataSource({
  type: "sqlite",
  database: join(process.cwd(), "database.sqlite"),
  entities: [User, Document, DocumentVersion],
  synchronize: true, // Only for development
  logging: true,
  subscribers: [],
  migrations: [],
});

// Initialize the data source
export const initializeDatabase = async () => {
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
};