import { AppDataSource } from "@db/data-source";
import { Document } from "@db/entities/Document";
import { DocumentVersion } from "@db/entities/DocumentVersion";
import { User } from "@db/entities/User";

export class DocumentService {
  private static documentRepository = AppDataSource.getRepository(Document);
  private static versionRepository = AppDataSource.getRepository(DocumentVersion);
  private static userRepository = AppDataSource.getRepository(User);

  static async createDocument(data: {
    name: string;
    description?: string;
    ownerId: number;
    metadata?: Record<string, any>;
    permissions?: { public: boolean; collaborators: number[] };
  }): Promise<Document> {
    const document = this.documentRepository.create({
      name: data.name,
      description: data.description,
      ownerId: data.ownerId,
    });

    if (data.metadata) {
      document.setMetadata(data.metadata);
    }

    if (data.permissions) {
      document.setPermissions(data.permissions);
    }

    return this.documentRepository.save(document);
  }

  static async createVersion(data: {
    documentId: number;
    version: number;
    content: string;
    createdById: number;
    comment?: string;
  }): Promise<DocumentVersion> {
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
    const document = await this.getDocument(id, userId);
    if (!document) return null;

    if (data.metadata) {
      document.setMetadata(data.metadata as Record<string, any>);
      delete data.metadata;
    }

    if (data.permissions) {
      document.setPermissions(data.permissions as { public: boolean; collaborators: number[] });
      delete data.permissions;
    }

    Object.assign(document, { ...data, updatedAt: new Date() });
    return this.documentRepository.save(document);
  }

  static async getVersionHistory(documentId: number): Promise<DocumentVersion[]> {
    return this.versionRepository.find({
      where: { documentId },
      order: { version: "DESC" },
      relations: ["createdBy"],
    });
  }
}