import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";

export function registerRoutes(app: Express): Server {
  // Set up authentication and its routes
  setupAuth(app);

  // Create and return the HTTP server
  const httpServer = createServer(app);

  return httpServer;
}