import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./websocket";
import { db } from "@db";
import { tasks, users, files, companyProfiles, notificationPreferences } from "@db/schema";
import { eq, desc, or, asc, and } from "drizzle-orm";
import { errorHandler, apiErrorLogger } from "./error-handler";
import { createTaskSchema, updateTaskSchema, updateCompanyProfileSchema, updateNotificationPreferencesSchema } from "@db/schema";
import { sql } from "drizzle-orm";
import { generateThumbnail } from './services/thumbnail';
import path from 'path';
import multer from 'multer';
import fs from 'fs/promises';

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Add error logging middleware
  app.use(apiErrorLogger);

  // Company Profile Routes
  app.get("/api/company-profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const [profile] = await db.query.companyProfiles.findMany({
        where: eq(companyProfiles.userId, req.user.id),
        limit: 1,
      });

      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching company profile:", error);
      res.status(500).json({ error: "Failed to fetch company profile" });
    }
  });

  app.post("/api/company-profile/logo", upload.single('logo'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const [profile] = await db.query.companyProfiles.findMany({
        where: eq(companyProfiles.userId, req.user.id),
        limit: 1,
      });

      // Delete old logo if it exists
      if (profile?.logo) {
        try {
          await fs.unlink(profile.logo);
        } catch (err) {
          console.error("Error deleting old logo:", err);
        }
      }

      // Update or create company profile with new logo
      if (profile) {
        await db.update(companyProfiles)
          .set({ logo: req.file.path })
          .where(eq(companyProfiles.id, profile.id));
      } else {
        await db.insert(companyProfiles)
          .values({
            userId: req.user.id,
            companyName: req.user.companyName,
            logo: req.file.path,
          });
      }

      res.json({ message: "Logo uploaded successfully" });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ error: "Failed to upload logo" });
    }
  });

  app.put("/api/company-profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const result = updateCompanyProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid input: " + result.error.issues.map(i => i.message).join(", ") 
        });
      }

      const [profile] = await db.query.companyProfiles.findMany({
        where: eq(companyProfiles.userId, req.user.id),
        limit: 1,
      });

      if (profile) {
        const [updated] = await db.update(companyProfiles)
          .set({ ...result.data, updatedAt: new Date() })
          .where(eq(companyProfiles.id, profile.id))
          .returning();
        res.json(updated);
      } else {
        const [created] = await db.insert(companyProfiles)
          .values({
            userId: req.user.id,
            ...result.data,
          })
          .returning();
        res.json(created);
      }
    } catch (error) {
      console.error("Error updating company profile:", error);
      res.status(500).json({ error: "Failed to update company profile" });
    }
  });

  // Serve company logo
  app.get("/api/company-profile/logo/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const [profile] = await db.query.companyProfiles.findMany({
        where: eq(companyProfiles.id, parseInt(req.params.id)),
        limit: 1,
      });

      if (!profile || !profile.logo) {
        return res.status(404).json({ error: "Logo not found" });
      }

      res.sendFile(profile.logo);
    } catch (error) {
      console.error("Error serving logo:", error);
      res.status(500).json({ error: "Failed to serve logo" });
    }
  });


  // Add notification preferences routes
  app.get("/api/notification-preferences", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const [preferences] = await db.query.notificationPreferences.findMany({
        where: eq(notificationPreferences.userId, req.user.id),
        limit: 1,
      });

      if (!preferences) {
        // Create default preferences if they don't exist
        const [newPreferences] = await db.insert(notificationPreferences)
          .values({
            userId: req.user.id,
          })
          .returning();

        return res.json(newPreferences);
      }

      res.json(preferences);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ error: "Failed to fetch notification preferences" });
    }
  });

  app.put("/api/notification-preferences", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const result = updateNotificationPreferencesSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        });
      }

      const [preferences] = await db.query.notificationPreferences.findMany({
        where: eq(notificationPreferences.userId, req.user.id),
        limit: 1,
      });

      if (preferences) {
        const [updated] = await db.update(notificationPreferences)
          .set({
            ...result.data,
            updatedAt: new Date(),
          })
          .where(eq(notificationPreferences.id, preferences.id))
          .returning();
        res.json(updated);
      } else {
        const [created] = await db.insert(notificationPreferences)
          .values({
            userId: req.user.id,
            ...result.data,
          })
          .returning();
        res.json(created);
      }
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });

  // Admin Routes
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const allUsers = await db.query.users.findMany({
        orderBy: [asc(users.username)],
        limit,
        offset,
      });

      const totalUsers = await db.select({ count: sql<number>`count(*)` })
        .from(users);

      res.json({
        users: allUsers,
        pagination: {
          total: totalUsers[0].count,
          page,
          limit,
          pages: Math.ceil(totalUsers[0].count / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get files for a specific user
  app.get("/api/admin/users/:userId/files", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const userFiles = await db.query.files.findMany({
        where: eq(files.uploadedBy, parseInt(userId)),
        orderBy: [desc(files.uploadedAt)],
        limit,
        offset,
      });

      const totalFiles = await db.select({ count: sql<number>`count(*)` })
        .from(files)
        .where(eq(files.uploadedBy, parseInt(userId)));

      res.json({
        files: userFiles,
        pagination: {
          total: totalFiles[0].count,
          page,
          limit,
          pages: Math.ceil(totalFiles[0].count / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching user files:", error);
      res.status(500).json({ error: "Failed to fetch user files" });
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const { id } = req.params;
      const { role, active } = req.body;

      // Prevent changing own role
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: "Cannot modify own account" });
      }

      const [updatedUser] = await db.update(users)
        .set({
          role: role as string,
          active: active as boolean,
        })
        .where(eq(users.id, parseInt(id)))
        .returning();

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // File Management Routes
  app.get("/api/admin/files", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const allFiles = await db.query.files.findMany({
        with: {
          uploader: true,
        },
        orderBy: [desc(files.uploadedAt)],
        limit,
        offset,
      });

      const totalFiles = await db.select({ count: sql<number>`count(*)` })
        .from(files);

      res.json({
        files: allFiles,
        pagination: {
          total: totalFiles[0].count,
          page,
          limit,
          pages: Math.ceil(totalFiles[0].count / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  // Serve thumbnails
  app.get("/api/files/thumbnail/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { id } = req.params;
      const [file] = await db.select()
        .from(files)
        .where(eq(files.id, parseInt(id)))
        .limit(1);

      if (!file || !file.thumbnailPath) {
        return res.status(404).json({ error: "Thumbnail not found" });
      }

      res.sendFile(file.thumbnailPath);
    } catch (error) {
      console.error("Error serving thumbnail:", error);
      res.status(500).json({ error: "Failed to serve thumbnail" });
    }
  });

  // Handle file upload with thumbnail generation
  app.post("/api/files/upload", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const thumbnailPath = await generateThumbnail(req.file.path);

      const [file] = await db.insert(files)
        .values({
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          path: req.file.path,
          thumbnailPath,
          uploadedBy: req.user.id,
        })
        .returning();

      res.json(file);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Add delete file endpoint
  app.delete("/api/admin/files/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const { id } = req.params;
      const [file] = await db.select()
        .from(files)
        .where(eq(files.id, parseInt(id)))
        .limit(1);

      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // Delete the actual file and thumbnail
      if (file.path) {
        try {
          await fs.unlink(file.path);
        } catch (err) {
          console.error("Error deleting file:", err);
        }
      }

      if (file.thumbnailPath) {
        try {
          await fs.unlink(file.thumbnailPath);
        } catch (err) {
          console.error("Error deleting thumbnail:", err);
        }
      }

      // Delete the database record
      await db.delete(files)
        .where(eq(files.id, parseInt(id)));

      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Task Management Routes
  app.post("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const result = createTaskSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        });
      }

      const { deadline, ...otherData } = result.data;

      const [task] = await db.insert(tasks)
        .values({
          ...otherData,
          deadline: deadline ? new Date(deadline) : null,
          assignedBy: req.user.id,
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.get("/api/tasks/stats", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    try {
      const { status, priority, dateRange, search } = req.query;
      const now = new Date();

      let conditions = [];

      // Add status filter
      if (status) {
        conditions.push(eq(tasks.status, status as string));
      }

      // Add priority filter
      if (priority) {
        conditions.push(eq(tasks.priority, priority as string));
      }

      // Add date range filter
      if (dateRange) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (dateRange) {
          case 'today':
            conditions.push(sql`DATE(${tasks.createdAt}) = DATE(${today})`);
            break;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            conditions.push(sql`${tasks.createdAt} >= ${weekAgo}`);
            break;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            conditions.push(sql`${tasks.createdAt} >= ${monthAgo}`);
            break;
        }
      }

      // Add search filter
      if (search) {
        conditions.push(
          or(
            sql`${tasks.title} ILIKE ${`%${search}%`}`,
            sql`${tasks.description} ILIKE ${`%${search}%`}`
          )
        );
      }

      const whereClause = conditions.length > 0
        ? and(...conditions)
        : undefined;

      const [stats] = await db.select({
        pending: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'pending')`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'completed')`,
        overdue: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'pending' AND ${tasks.deadline} < ${now})`,
      })
        .from(tasks)
        .where(whereClause);

      const upcomingDeadlines = await db.query.tasks.findMany({
        where: whereClause ? 
          and(
            whereClause,
            or(
              eq(tasks.status, "pending"),
              eq(tasks.status, "in_progress")
            )
          ) :
          or(
            eq(tasks.status, "pending"),
            eq(tasks.status, "in_progress")
          ),
        orderBy: [asc(tasks.deadline)],
        limit: 5,
      });

      const recentlyCompleted = await db.query.tasks.findMany({
        where: whereClause ?
          and(whereClause, eq(tasks.status, "completed")) :
          eq(tasks.status, "completed"),
        orderBy: [desc(tasks.completedAt)],
        limit: 5,
      });

      res.json({
        ...stats,
        upcomingDeadlines,
        recentlyCompleted,
      });
    } catch (error) {
      console.error("Error fetching task stats:", error);
      res.status(500).json({ error: "Failed to fetch task stats" });
    }
  });

  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  // Add error handler middleware last
  app.use(errorHandler);

  return httpServer;
}