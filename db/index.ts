import { AppDataSource } from "./data-source";
export * from "./entities/User";
export * from "./entities/Document";
export * from "./entities/DocumentVersion";

// Export the initialized data source
export const db = AppDataSource;

// Export function for testing connection
export async function testConnection() {
  try {
    await AppDataSource.initialize();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}