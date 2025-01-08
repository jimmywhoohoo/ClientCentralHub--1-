import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./websocket";
import { db } from "@db";
import { tasks, users, files } from "@db/schema";
import { eq, desc, or, asc } from "drizzle-orm";
import { errorHandler, apiErrorLogger } from "./error-handler";
import { createTaskSchema, updateTaskSchema } from "@db/schema";
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

  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  // Add error handler middleware last
  app.use(errorHandler);

  return httpServer;
}