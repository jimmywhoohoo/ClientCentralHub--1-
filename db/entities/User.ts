import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Document } from "./Document";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  @Column()
  email!: string;

  @Column({ name: "full_name" })
  fullName!: string;

  @Column({ name: "company_name" })
  companyName!: string;

  @Column({ default: "user" })
  role!: "admin" | "user";

  @Column({ default: true })
  active!: boolean;

  @Column({ name: "created_at", type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @OneToMany(() => Document, document => document.owner)
  documents?: Document[];
}