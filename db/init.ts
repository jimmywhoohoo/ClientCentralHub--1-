import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function initializeDatabase() {
  try {
    // Create tables using raw SQL since we're not using migrations
    // Use the underlying SQLite connection to create tables
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        full_name TEXT NOT NULL,
        company_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Access the underlying better-sqlite3 connection
    db.$client.exec(createTableSQL);

    console.log("Database tables created successfully");

    // Check if admin already exists
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"))
      .limit(1);

    if (!existingAdmin) {
      console.log("Creating admin user...");
      const hashedPassword = await hashPassword("admin123");
      
      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        email: "admin@example.com",
        fullName: "Administrator",
        companyName: "Admin",
        role: "admin",
        active: true,
      });
      
      console.log("Admin user created successfully");
    } else {
      console.log("Admin user already exists");
    }

    return true;
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}
