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

  // Task Management Routes
  app.get("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userTasks = await db.query.tasks.findMany({
        where: or(
          eq(tasks.assignedTo, req.user.id),
          eq(tasks.assignedBy, req.user.id)
        ),
        with: {
          assignee: true,
          assigner: true,
        },
        orderBy: [desc(tasks.deadline), desc(tasks.createdAt)],
      });

      res.json(userTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const result = createTaskSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: result.error.issues.map((issue) => issue.message).join(", ")
        });
      }

      const { title, description, priority, assignedTo, deadline } = result.data;

      const [task] = await db.insert(tasks)
        .values({
          title,
          description,
          priority,
          assignedTo,
          assignedBy: req.user.id,
          deadline: deadline ? new Date(deadline) : null,
        })
        .returning();

      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const result = updateTaskSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error: result.error.issues.map((issue) => issue.message).join(", ")
        });
      }

      const { id } = req.params;
      const updates = result.data;

      // Check if user has permission to update this task
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, parseInt(id)))
        .limit(1);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (task.assignedTo !== req.user.id && task.assignedBy !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to update this task" });
      }

      const updateData: Partial<typeof tasks.$inferInsert> = {
        ...updates,
        updatedAt: new Date(),
      };

      // Convert deadline string to Date if present
      if (updates.deadline) {
        updateData.deadline = new Date(updates.deadline);
      }

      // If status is being updated to completed, set completedAt
      if (updates.status === "completed" && task.status !== "completed") {
        updateData.completedAt = new Date();
      }

      const [updatedTask] = await db.update(tasks)
        .set(updateData)
        .where(eq(tasks.id, parseInt(id)))
        .returning();

      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Add error logging endpoint
  app.post("/api/errors/log", async (req, res) => {
    const { error, componentStack, timestamp, url } = req.body;

    await errorLogger.log({
      message: `Client Error: ${error}`,
      stack: componentStack,
    } as Error, req, 'error');

    res.json({ success: true });
  });

  const httpServer = createServer(app);
  setupWebSocket(httpServer);

  // Add error handler middleware last
  app.use(errorHandler);

  return httpServer;
}