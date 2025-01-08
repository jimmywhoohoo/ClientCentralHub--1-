import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  companyName: text("company_name").notNull(),
  address: text("address").notNull(),
  role: text("role").notNull().default("client"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  driveFileId: text("drive_file_id").notNull(),
  type: text("type").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  tags: text("tags").array(),
  industry: varchar("industry", { length: 100 }),
  accessCount: integer("access_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documentInteractions = pgTable("document_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  documentId: integer("document_id").references(() => documents.id),
  interactionType: varchar("interaction_type", { length: 20 }).notNull(), // 'view', 'download', 'share'
  createdAt: timestamp("created_at").defaultNow(),
});

export const questionnaires = pgTable("questionnaires", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  questions: jsonb("questions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  questionnaireId: integer("questionnaire_id").references(() => questionnaires.id),
  answers: jsonb("answers").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const userRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  responses: many(responses),
  documentInteractions: many(documentInteractions),
}));

export const documentRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  interactions: many(documentInteractions),
}));

export const documentInteractionRelations = relations(documentInteractions, ({ one }) => ({
  user: one(users, {
    fields: [documentInteractions.userId],
    references: [users.id],
  }),
  document: one(documents, {
    fields: [documentInteractions.documentId],
    references: [documents.id],
  }),
}));

export const responseRelations = relations(responses, ({ one }) => ({
  user: one(users, {
    fields: [responses.userId],
    references: [users.id],
  }),
  questionnaire: one(questionnaires, {
    fields: [responses.questionnaireId],
    references: [questionnaires.id],
  }),
}));

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type DocumentInteraction = typeof documentInteractions.$inferSelect;
export type Questionnaire = typeof questionnaires.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type LoginInput = z.infer<typeof loginSchema>;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);