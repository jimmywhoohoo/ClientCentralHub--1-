import { Router } from "express";
import { DocumentService } from "../services/documents";
import { Document } from "@db/entities/Document";
import { DocumentVersion } from "@db/entities/DocumentVersion";
import { User } from "@db/entities/User";

const router = Router();

// Middleware to ensure user is authenticated
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// List documents
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = req.user as User;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await DocumentService.listDocuments(user.id, page, limit);
    res.json(result);
  } catch (error) {
    console.error("Error listing documents:", error);
    res.status(500).json({ message: "Failed to list documents" });
  }
});

// Create document
router.post("/", requireAuth, async (req, res) => {
  try {
    const user = req.user as User;
    const documentData: Partial<Document> = {
      ...req.body,
      ownerId: user.id
    };

    const document = await DocumentService.createDocument(documentData);

    // Create initial version
    const version = await DocumentService.createVersion({
      documentId: document.id,
      version: 1,
      content: req.body.content || "",
      createdById: user.id,
      comment: "Initial version"
    });

    res.status(201).json({ document, version });
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({ message: "Failed to create document" });
  }
});

// Get document with latest version
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user as User;
    const documentId = Number(req.params.id);

    const document = await DocumentService.getDocument(documentId, user.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const version = await DocumentService.getLatestVersion(documentId);
    res.json({ document, version });
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ message: "Failed to fetch document" });
  }
});

// Create new version
router.post("/:id/versions", requireAuth, async (req, res) => {
  try {
    const user = req.user as User;
    const documentId = Number(req.params.id);

    const document = await DocumentService.getDocument(documentId, user.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const latestVersion = await DocumentService.getLatestVersion(documentId);
    const newVersion = latestVersion ? latestVersion.version + 1 : 1;

    const versionData: Partial<DocumentVersion> = {
      documentId,
      version: newVersion,
      content: req.body.content,
      createdById: user.id,
      comment: req.body.comment
    };

    const version = await DocumentService.createVersion(versionData);

    // Update document's updatedAt
    await DocumentService.updateDocument(documentId, user.id, {
      updatedAt: new Date()
    });

    res.status(201).json(version);
  } catch (error) {
    console.error("Error creating version:", error);
    res.status(500).json({ message: "Failed to create version" });
  }
});

// Get version history
router.get("/:id/versions", requireAuth, async (req, res) => {
  try {
    const user = req.user as User;
    const documentId = Number(req.params.id);

    const document = await DocumentService.getDocument(documentId, user.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const versions = await DocumentService.getVersionHistory(documentId);
    res.json(versions);
  } catch (error) {
    console.error("Error fetching versions:", error);
    res.status(500).json({ message: "Failed to fetch versions" });
  }
});

export default router;