import { db } from "@db";
import { documents, documentVersions, type NewDocument, type NewDocumentVersion } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export class DocumentService {
  static async createDocument(data: NewDocument): Promise<typeof documents.$inferSelect> {
    const [document] = await db.insert(documents).values(data).returning();
    return document;
  }

  static async createVersion(data: NewDocumentVersion): Promise<typeof documentVersions.$inferSelect> {
    const [version] = await db.insert(documentVersions).values(data).returning();
    return version;
  }

  static async getDocument(id: number, userId: number) {
    const [document] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, id),
          eq(documents.ownerId, userId)
        )
      );
    return document;
  }

  static async getLatestVersion(documentId: number) {
    const [version] = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.version))
      .limit(1);
    return version;
  }

  static async listDocuments(userId: number, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const [docs, [{ count }]] = await Promise.all([
      db
        .select()
        .from(documents)
        .where(eq(documents.ownerId, userId))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(documents.updatedAt)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(eq(documents.ownerId, userId))
    ]);

    return {
      documents: docs,
      pagination: {
        total: Number(count),
        page,
        limit,
        pages: Math.ceil(Number(count) / limit)
      }
    };
  }

  static async updateDocument(id: number, userId: number, data: Partial<NewDocument>) {
    const [document] = await db
      .update(documents)
      .set(data)
      .where(
        and(
          eq(documents.id, id),
          eq(documents.ownerId, userId)
        )
      )
      .returning();
    return document;
  }

  static async getVersionHistory(documentId: number) {
    return db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.version));
  }
}
