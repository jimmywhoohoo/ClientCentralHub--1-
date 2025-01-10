import "reflect-metadata";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Document } from "./Document";
import { User } from "./User";

@Entity("document_versions")
export class DocumentVersion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "document_id", type: "integer" })
  documentId!: number;

  @ManyToOne(() => Document, (document) => document.versions)
  @JoinColumn({ name: "document_id" })
  document!: Document;

  @Column({ type: "integer" })
  version!: number;

  @Column({ type: "text" })
  content!: string;

  @Column({ name: "created_by_id", type: "integer" })
  createdById!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by_id" })
  createdBy!: User;

  @Column({ name: "created_at", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ nullable: true, type: "text" })
  comment?: string;
}
