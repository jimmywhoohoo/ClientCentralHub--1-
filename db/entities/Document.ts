import "reflect-metadata";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import type { User } from "./User";
import type { DocumentVersion } from "./DocumentVersion";

@Entity("documents")
export class Document {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ name: "owner_id", type: "integer" })
  ownerId!: number;

  @ManyToOne("User", (user: User) => user.documents)
  @JoinColumn({ name: "owner_id" })
  owner!: User;

  @Column({ 
    name: "created_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP"
  })
  createdAt!: Date;

  @Column({ 
    name: "updated_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP"
  })
  updatedAt!: Date;

  @Column({ name: "is_archived", type: "boolean", default: false })
  isArchived!: boolean;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, any>;

  @Column({ 
    type: "jsonb",
    default: () => "'{ \"public\": false, \"collaborators\": [] }'"
  })
  permissions!: { public: boolean; collaborators: number[] };

  @OneToMany("DocumentVersion", (version: DocumentVersion) => version.document)
  versions?: DocumentVersion[];

  setMetadata(metadata: Record<string, any>) {
    this.metadata = metadata;
  }

  setPermissions(permissions: { public: boolean; collaborators: number[] }) {
    this.permissions = permissions;
  }
}