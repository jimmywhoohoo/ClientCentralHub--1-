import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function initializeDatabase() {
  try {
    // Run migrations
    console.log("Running migrations...");
    migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations completed");

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