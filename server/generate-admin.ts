import { db } from "@db";
import { users } from "@db/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdminUser() {
  const hashedPassword = await hashPassword("admin123");

  try {
    const [user] = await db.insert(users)
      .values({
        username: "admin",
        password: hashedPassword,
        email: "admin@example.com", 
        fullName: "System Administrator", 
        companyName: "System", 
        role: "admin",
        active: true,
      })
      .returning();

    console.log("Admin user created successfully:", user);
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

createAdminUser();