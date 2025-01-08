import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./websocket";
import { db } from "@db";
import { tasks, users } from "@db/schema";
import { eq, desc, or } from "drizzle-orm";
import { errorHandler, apiErrorLogger } from "./error-handler";
import { createTaskSchema, updateTaskSchema } from "@db/schema";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Add error logging middleware
  app.use(apiErrorLogger);

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