import { db, testConnection } from "@db";
import { users, UserRole } from "@db/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { sql } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function initializeDatabase() {
  try {
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error("Failed to establish database connection");
    }

    console.log("Database connection successful");

    // Create tables if they don't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        full_name TEXT NOT NULL,
        company_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'client',
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Database tables initialized");

    // Check if admin exists
    const adminExists = await db.select()
      .from(users)
      .where(eq(users.username, "admin"))
      .execute();

    if (adminExists.length === 0) {
      // Create admin user
      const hashedPassword = await hashPassword("admin123");
      await db.insert(users)
        .values({
          username: "admin",
          password: hashedPassword,
          email: "admin@example.com",
          fullName: "System Administrator",
          companyName: "System",
          role: UserRole.ADMIN,
          active: true,
        })
        .execute();

      console.log("Admin user created successfully");
    }

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}