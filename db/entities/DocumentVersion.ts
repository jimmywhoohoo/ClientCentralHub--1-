import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Document } from "./Document";
import { User } from "./User";

@Entity("document_versions")
export class DocumentVersion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "document_id" })
  documentId!: number;

  @ManyToOne(() => Document, document => document.versions)
  @JoinColumn({ name: "document_id" })
  document!: Document;

  @Column()
  version!: number;

  @Column("text")
  content!: string;

  @Column({ name: "created_by_id" })
  createdById!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by_id" })
  createdBy!: User;

  @Column({ name: "created_at", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ nullable: true })
  comment?: string;
}