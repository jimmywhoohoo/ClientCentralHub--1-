import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import documentsRouter from "./routes/documents";

export function registerRoutes(app: Express): Server {
  // Set up authentication and its routes
  setupAuth(app);

  // Register document management routes
  app.use("/api/documents", documentsRouter);

  // Create and return the HTTP server
  const httpServer = createServer(app);

  return httpServer;
}