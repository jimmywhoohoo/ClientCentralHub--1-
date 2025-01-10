import { User } from "./entities/User";
import { Document } from "./entities/Document";
import { DocumentVersion } from "./entities/DocumentVersion";

// Re-export entities for easy access
export { User, Document, DocumentVersion };

// Define valid user roles
export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

// Export types for use in other files
export type { User as SelectUser };
export type { Document as SelectDocument };
export type { DocumentVersion as SelectDocumentVersion };

// Export enum type
export type UserRole = typeof UserRole[keyof typeof UserRole];