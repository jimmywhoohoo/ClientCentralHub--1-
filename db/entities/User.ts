import "reflect-metadata";
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Document } from "./Document";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "text", unique: true })
  username!: string;

  @Column({ type: "text" })
  password!: string;

  @Column({ type: "text" })
  email!: string;

  @Column({ name: "full_name", type: "text" })
  fullName!: string;

  @Column({ name: "company_name", type: "text" })
  companyName!: string;

  @Column({ type: "text", default: "user" })
  role!: "admin" | "user";

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @Column({ 
    name: "created_at", 
    type: "datetime", 
    default: () => "CURRENT_TIMESTAMP" 
  })
  createdAt!: Date;

  @OneToMany(() => Document, (document) => document.owner)
  documents?: Document[];
}