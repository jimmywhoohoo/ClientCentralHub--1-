import { db } from "@db";
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
    // First test the connection
    await db.execute(sql`SELECT 1`);
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
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Database tables initialized");

    // Check if admin exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"));

    if (!existingAdmin.length) {
      // Create admin user with specified credentials
      const hashedPassword = await hashPassword("admin123");

      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        email: "admin@example.com",
        fullName: "Administrator",
        companyName: "Admin",
        role: UserRole.ADMIN,
        active: true,
      });

      console.log("Admin user created successfully with username: admin and password: admin123");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}