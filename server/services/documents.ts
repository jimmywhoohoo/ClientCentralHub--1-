import { AppDataSource } from "@db/data-source";
import { Document } from "@db/entities/Document";
import { DocumentVersion } from "@db/entities/DocumentVersion";
import { User } from "@db/entities/User";

export class DocumentService {
  private static documentRepository = AppDataSource.getRepository(Document);
  private static versionRepository = AppDataSource.getRepository(DocumentVersion);

  static async createDocument(data: Partial<Document>, userId: number): Promise<Document> {
    const document = this.documentRepository.create({
      ...data,
      ownerId: userId,
    });
    return this.documentRepository.save(document);
  }

  static async createVersion(data: Partial<DocumentVersion>): Promise<DocumentVersion> {
    const version = this.versionRepository.create(data);
    return this.versionRepository.save(version);
  }

  static async getDocument(id: number, userId: number): Promise<Document | null> {
    return this.documentRepository.findOne({
      where: { id, ownerId: userId },
      relations: ["versions"],
    });
  }

  static async getLatestVersion(documentId: number): Promise<DocumentVersion | null> {
    return this.versionRepository.findOne({
      where: { documentId },
      order: { version: "DESC" },
    });
  }

  static async listDocuments(userId: number, page = 1, limit = 10) {
    const [documents, total] = await this.documentRepository.findAndCount({
      where: { ownerId: userId },
      order: { updatedAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      documents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async updateDocument(id: number, userId: number, data: Partial<Document>): Promise<Document | null> {
    await this.documentRepository.update(
      { id, ownerId: userId },
      { ...data, updatedAt: new Date() }
    );
    return this.getDocument(id, userId);
  }

  static async getVersionHistory(documentId: number): Promise<DocumentVersion[]> {
    return this.versionRepository.find({
      where: { documentId },
      order: { version: "DESC" },
      relations: ["createdBy"],
    });
  }
}