import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { documents, questionnaires, responses } from "@db/schema";
import { and, eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Documents
  app.get("/api/documents", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const userDocs = await db.query.documents.findMany({
      where: eq(documents.userId, req.user.id),
      with: {
        user: true,
      },
    });

    res.json(userDocs);
  });

  // Questionnaires
  app.get("/api/questionnaires", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const allQuestionnaires = await db.query.questionnaires.findMany();
    res.json(allQuestionnaires);
  });

  app.post("/api/questionnaires/:id/respond", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const { id } = req.params;
    const { answers } = req.body;

    const [response] = await db
      .insert(responses)
      .values({
        userId: req.user.id,
        questionnaireId: parseInt(id),
        answers,
      })
      .returning();

    res.json(response);
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).send("Not authorized");
    }

    const allUsers = await db.query.users.findMany();
    res.json(allUsers);
  });

  const httpServer = createServer(app);
  return httpServer;
}
