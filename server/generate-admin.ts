import { db } from "@db";
import { users } from "@db/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdminUser() {
  console.log("Starting admin user creation...");

  try {
    // First check if admin already exists
    const existingAdmin = await db.select()
      .from(users)
      .where(eq(users.username, "admin"))
      .execute();

    if (existingAdmin.length > 0) {
      console.log("Admin user already exists");
      return;
    }

    const hashedPassword = await hashPassword("admin123");

    const [newUser] = await db.insert(users)
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

    console.log("Admin user created successfully:", newUser);
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  }
}

createAdminUser().catch(console.error);