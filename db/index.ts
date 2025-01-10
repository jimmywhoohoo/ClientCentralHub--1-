import { AppDataSource } from "./data-source";
import { User, Document, DocumentVersion } from "./entities";

// Export all entities
export { User, Document, DocumentVersion };

// Export the initialized data source
export const db = AppDataSource;

// Export function for testing connection
export async function testConnection() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}