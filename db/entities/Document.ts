import "reflect-metadata";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { User } from "./User";
import { DocumentVersion } from "./DocumentVersion";

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

  @ManyToOne(() => User, (user) => user.documents)
  @JoinColumn({ name: "owner_id" })
  owner!: User;

  @Column({ 
    name: "created_at",
    type: "datetime",
    default: () => "CURRENT_TIMESTAMP"
  })
  createdAt!: Date;

  @Column({ 
    name: "updated_at",
    type: "datetime",
    default: () => "CURRENT_TIMESTAMP"
  })
  updatedAt!: Date;

  @Column({ name: "is_archived", type: "boolean", default: false })
  isArchived!: boolean;

  @Column({ type: "text", nullable: true })
  metadata?: string;

  @Column({ 
    type: "text",
    default: JSON.stringify({ public: false, collaborators: [] })
  })
  permissions!: string;

  @OneToMany(() => DocumentVersion, (version) => version.document)
  versions?: DocumentVersion[];

  // Getters for JSON fields
  getMetadata(): Record<string, any> | null {
    return this.metadata ? JSON.parse(this.metadata) : null;
  }

  getPermissions(): { public: boolean; collaborators: number[] } {
    return this.permissions ? JSON.parse(this.permissions) : { public: false, collaborators: [] };
  }

  // Setters for JSON fields
  setMetadata(value: Record<string, any> | null) {
    this.metadata = value ? JSON.stringify(value) : null;
  }

  setPermissions(value: { public: boolean; collaborators: number[] }) {
    this.permissions = JSON.stringify(value);
  }
}