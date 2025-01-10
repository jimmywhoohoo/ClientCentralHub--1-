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

export async function initializeAdmin() {
  try {
    // Check if admin already exists
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"))
      .limit(1);

    if (!existingAdmin) {
      const hashedPassword = await hashPassword("admin123");
      
      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        email: "admin@example.com",
        fullName: "Administrator",
        companyName: "Admin",
        role: "admin",
      });
      
      console.log("Admin user created successfully");
    }
  } catch (error) {
    console.error("Error initializing admin user:", error);
    throw error;
  }
}
