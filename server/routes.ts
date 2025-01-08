import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { documents, documentInteractions, users } from "@db/schema";
import { and, eq, desc, sql } from "drizzle-orm";

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

  // New route for document recommendations
  app.get("/api/documents/recommendations", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const userId = req.user.id;

    // Get user's recent interactions
    const recentInteractions = await db.query.documentInteractions.findMany({
      where: eq(documentInteractions.userId, userId),
      with: {
        document: true,
      },
      orderBy: desc(documentInteractions.createdAt),
      limit: 5,
    });

    // Extract categories and industries from user's recent interactions
    const userPreferences = recentInteractions.reduce((acc, interaction) => {
      if (interaction.document) {
        acc.categories.add(interaction.document.category);
        if (interaction.document.industry) {
          acc.industries.add(interaction.document.industry);
        }
      }
      return acc;
    }, { categories: new Set<string>(), industries: new Set<string>() });

    // Find similar documents based on user preferences
    const recommendations = await db.query.documents.findMany({
      where: and(
        sql`${documents.category} = ANY(${Array.from(userPreferences.categories)})`,
        sql`${documents.industry} = ANY(${Array.from(userPreferences.industries)})`,
        sql`${documents.userId} != ${userId}`
      ),
      orderBy: desc(documents.accessCount),
      limit: 5,
    });

    res.json(recommendations);
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

  // Add interaction tracking
  app.post("/api/documents/:id/interact", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const { id } = req.params;
    const { type } = req.body;

    const [interaction] = await db
      .insert(documentInteractions)
      .values({
        userId: req.user.id,
        documentId: parseInt(id),
        interactionType: type,
      })
      .returning();

    // Update document access count
    await db
      .update(documents)
      .set({
        accessCount: sql`${documents.accessCount} + 1`,
      })
      .where(eq(documents.id, parseInt(id)));

    res.json(interaction);
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