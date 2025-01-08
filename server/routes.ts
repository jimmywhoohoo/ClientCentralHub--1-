import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupWebSocket } from "./websocket";
import { db } from "@db";
import { documents, documentVersions, documentInteractions, documentCollaborators, users } from "@db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Theme customization
  app.post("/api/theme", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const theme = req.body;
      await fs.writeFile(
        path.resolve(process.cwd(), "theme.json"),
        JSON.stringify(theme, null, 2)
      );
      res.json({ message: "Theme updated successfully" });
    } catch (error) {
      console.error("Error updating theme:", error);
      res.status(500).send("Failed to update theme");
    }
  });

  // Document version history endpoints
  app.get("/api/documents/:id/versions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const versions = await db.query.documentVersions.findMany({
        where: eq(documentVersions.documentId, parseInt(req.params.id)),
        orderBy: desc(documentVersions.createdAt),
        with: {
          creator: true,
        },
      });

      res.json(versions);
    } catch (error) {
      console.error("Error fetching versions:", error);
      res.status(500).send("Failed to fetch versions");
    }
  });

  app.post("/api/documents/:id/versions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const { content, commitMessage } = req.body;
    const documentId = parseInt(req.params.id);

    try {
      // Get the latest version number
      const [latestVersion] = await db
        .select({ versionNumber: documentVersions.versionNumber })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.versionNumber))
        .limit(1);

      const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

      // Create new version
      const [version] = await db
        .insert(documentVersions)
        .values({
          documentId,
          versionNumber: nextVersionNumber,
          content,
          createdBy: req.user.id,
          commitMessage,
        })
        .returning();

      // Update document with new version
      await db
        .update(documents)
        .set({
          content,
          currentVersionId: version.id,
          lastEditedBy: req.user.id,
          lastEditedAt: new Date(),
        })
        .where(eq(documents.id, documentId));

      res.json(version);
    } catch (error) {
      console.error("Error creating version:", error);
      res.status(500).send("Failed to create version");
    }
  });

  app.post("/api/documents/:id/versions/:versionId/restore", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const { id, versionId } = req.params;

    try {
      const [version] = await db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.id, parseInt(versionId)))
        .limit(1);

      if (!version) {
        return res.status(404).send("Version not found");
      }

      // Create new version with restored content
      const [newVersion] = await db
        .insert(documentVersions)
        .values({
          documentId: parseInt(id),
          versionNumber: version.versionNumber + 1,
          content: version.content,
          createdBy: req.user.id,
          commitMessage: `Restored from version ${version.versionNumber}`,
        })
        .returning();

      // Update document with restored content
      await db
        .update(documents)
        .set({
          content: version.content,
          currentVersionId: newVersion.id,
          lastEditedBy: req.user.id,
          lastEditedAt: new Date(),
        })
        .where(eq(documents.id, parseInt(id)));

      res.json({
        content: version.content,
        version: newVersion,
      });
    } catch (error) {
      console.error("Error restoring version:", error);
      res.status(500).send("Failed to restore version");
    }
  });

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

  // Update document
  app.put("/api/documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const { id } = req.params;
    const { content } = req.body;

    // Check if user has write access
    const [collaborator] = await db
      .select()
      .from(documentCollaborators)
      .where(
        and(
          eq(documentCollaborators.documentId, parseInt(id)),
          eq(documentCollaborators.userId, req.user.id)
        )
      )
      .limit(1);

    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, parseInt(id)))
      .limit(1);

    if (!document) {
      return res.status(404).send("Document not found");
    }

    if (document.userId !== req.user.id && (!collaborator || collaborator.accessLevel === 'read')) {
      return res.status(403).send("No write access");
    }

    const [updatedDocument] = await db
      .update(documents)
      .set({
        content,
        lastEditedBy: req.user.id,
        lastEditedAt: new Date(),
      })
      .where(eq(documents.id, parseInt(id)))
      .returning();

    res.json(updatedDocument);
  });

  // Document recommendations
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

  // Document collaborators
  app.post("/api/documents/:id/collaborators", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const { id } = req.params;
    const { userId, accessLevel } = req.body;

    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, parseInt(id)))
      .limit(1);

    if (!document) {
      return res.status(404).send("Document not found");
    }

    if (document.userId !== req.user.id) {
      return res.status(403).send("Not authorized");
    }

    const [collaborator] = await db
      .insert(documentCollaborators)
      .values({
        documentId: parseInt(id),
        userId,
        accessLevel,
      })
      .returning();

    res.json(collaborator);
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
  setupWebSocket(httpServer);
  return httpServer;
}