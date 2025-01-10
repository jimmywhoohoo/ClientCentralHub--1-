import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { User } from "./User";
import { DocumentVersion } from "./DocumentVersion";

@Entity("documents")
export class Document {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ name: "owner_id" })
  ownerId!: number;

  @ManyToOne(() => User, user => user.documents)
  @JoinColumn({ name: "owner_id" })
  owner!: User;

  @Column({ name: "created_at", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ name: "updated_at", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  updatedAt!: Date;

  @Column({ name: "is_archived", default: false })
  isArchived!: boolean;

  @Column("simple-json", { nullable: true })
  metadata?: Record<string, any>;

  @Column("simple-json", { default: '{"public": false, "collaborators": []}' })
  permissions!: {
    public: boolean;
    collaborators: number[];
  };

  @OneToMany(() => DocumentVersion, version => version.document)
  versions?: DocumentVersion[];
}