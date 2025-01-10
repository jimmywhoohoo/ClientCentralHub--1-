import { db } from "@db";
import { users, UserRole } from "@db/schema";
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
    // First test the connection using a simple query
    const result = await db.execute(sql`SELECT 1`);
    console.log("Database connection successful");

    // Create admin user if it doesn't exist
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"));

    if (!existingAdmin.length) {
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

      console.log("Admin user created successfully");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}