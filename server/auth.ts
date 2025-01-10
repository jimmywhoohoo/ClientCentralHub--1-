import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, UserRole, clientRegisterSchema, loginSchema, adminLoginSchema } from "@db/schema";
import { db } from "@db";
import { eq, and } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

export function setupAuth(app: Express) {
  // Session setup
  const MemoryStore = createMemoryStore(session);
  app.use(
    session({
      secret: process.env.REPL_ID || "secure-client-portal",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Passport setup
  app.use(passport.initialize());
  app.use(passport.session());

  // Client authentication strategy
  passport.use('client-local', new LocalStrategy(async (username, password, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.username, username),
            eq(users.role, UserRole.CLIENT),
            eq(users.active, true)
          )
        )
        .limit(1);

      if (!user) {
        return done(null, false, { message: "Invalid credentials." });
      }

      const isMatch = await crypto.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: "Invalid credentials." });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  // Admin authentication strategy
  passport.use('admin-local', new LocalStrategy(async (username, password, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.username, username),
            eq(users.role, UserRole.ADMIN),
            eq(users.active, true)
          )
        )
        .limit(1);

      if (!user) {
        return done(null, false, { message: "Invalid admin credentials." });
      }

      const isMatch = await crypto.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: "Invalid admin credentials." });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Client registration
  app.post("/api/register", async (req, res) => {
    try {
      const result = clientRegisterSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          ok: false,
          message: result.error.issues.map(i => i.message).join(", ")
        });
      }

      const { username, password, email, fullName, companyName } = result.data;

      // Check if username already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({
          ok: false,
          message: "Username already exists"
        });
      }

      // Hash password and create user
      const hashedPassword = await crypto.hash(password);
      const [user] = await db.insert(users)
        .values({
          username,
          password: hashedPassword,
          email,
          fullName,
          companyName,
          role: UserRole.CLIENT,
          active: true,
        })
        .returning();

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({
            ok: false,
            message: "Registration successful but login failed"
          });
        }

        res.json({
          ok: true,
          message: "Registration successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          }
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        ok: false,
        message: "Registration failed"
      });
    }
  });

  // Client login
  app.post("/api/login", (req, res, next) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        ok: false,
        message: result.error.issues.map(i => i.message).join(", ")
      });
    }

    passport.authenticate("client-local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        return res.status(500).json({
          ok: false,
          message: "Login failed"
        });
      }

      if (!user) {
        return res.status(400).json({
          ok: false,
          message: info.message || "Invalid credentials"
        });
      }

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({
            ok: false,
            message: "Login failed"
          });
        }

        return res.json({
          ok: true,
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          }
        });
      });
    })(req, res, next);
  });

  // Admin login
  app.post("/api/admin/login", (req, res, next) => {
    const result = adminLoginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        ok: false,
        message: result.error.issues.map(i => i.message).join(", ")
      });
    }

    passport.authenticate("admin-local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        return res.status(500).json({
          ok: false,
          message: "Login failed"
        });
      }

      if (!user) {
        return res.status(400).json({
          ok: false,
          message: info.message || "Invalid admin credentials"
        });
      }

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({
            ok: false,
            message: "Login failed"
          });
        }

        return res.json({
          ok: true,
          message: "Admin login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          }
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({
          ok: false,
          message: "Logout failed"
        });
      }
      res.json({
        ok: true,
        message: "Logout successful"
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user;
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      });
    }
    res.status(401).json({
      ok: false,
      message: "Not logged in"
    });
  });
}