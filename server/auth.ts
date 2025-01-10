import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, UserRole } from "@db/schema";
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

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use('admin-local', new LocalStrategy(async (username, password, done) => {
    try {
      console.log('Attempting admin login for:', username);
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

      console.log('Found admin user:', user ? 'yes' : 'no');

      if (!user) {
        return done(null, false, { message: "Invalid admin credentials" });
      }

      const isMatch = await crypto.compare(password, user.password);
      console.log('Password match:', isMatch ? 'yes' : 'no');

      if (!isMatch) {
        return done(null, false, { message: "Invalid admin credentials" });
      }

      return done(null, user);
    } catch (err) {
      console.error('Admin auth error:', err);
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
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

  app.post("/api/admin/login", (req, res, next) => {
    console.log('Admin login attempt:', req.body);

    passport.authenticate("admin-local", (err: any, user: any, info: any) => {
      if (err) {
        console.error('Admin login error:', err);
        return res.status(500).json({
          ok: false,
          message: "An error occurred during login"
        });
      }

      if (!user) {
        return res.status(401).json({
          ok: false,
          message: info?.message || "Invalid admin credentials"
        });
      }

      req.login(user, (err) => {
        if (err) {
          console.error('Admin session error:', err);
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
      const user = req.user as any;
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