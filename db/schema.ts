import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, date } from "drizzle-orm/pg-core";
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
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companyProfiles = pgTable("company_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  companyName: text("company_name").notNull(),
  logo: text("logo_path"),
  description: text("description"),
  website: text("website"),
  industry: text("industry"),
  employeeCount: text("employee_count"),
  foundedYear: integer("founded_year"),
  headquarters: text("headquarters"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isArchived: boolean("is_archived").default(false),
});

export const documentMessages = pgTable("document_messages", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  versionNumber: integer("version_number").notNull(),
  content: text("content").notNull(),
  commitMessage: text("commit_message"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  path: text("path").notNull(),
  thumbnailPath: text("thumbnail_path"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  description: text("description"),
  isArchived: boolean("is_archived").default(false),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  assignedTo: integer("assigned_to").references(() => users.id),
  assignedBy: integer("assigned_by").references(() => users.id),
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const documentComments = pgTable("document_comments", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  selectionRange: jsonb("selection_range").notNull(),
  mentions: varchar("mentions").array(),
  parentId: integer("parent_id").references(() => documentComments.id),
  resolved: boolean("resolved").default(false),
});

export const fileShares = pgTable("file_shares", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").references(() => files.id).notNull(),
  sharedWithUserId: integer("shared_with_user_id").references(() => users.id).notNull(),
  sharedByUserId: integer("shared_by_user_id").references(() => users.id).notNull(),
  sharedAt: timestamp("shared_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  revoked: boolean("revoked").default(false),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull(),
  criteria: jsonb("criteria").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  achievementId: integer("achievement_id").references(() => achievements.id).notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  progress: jsonb("progress"),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  emailNotifications: boolean("email_notifications").default(true),
  taskAssignments: boolean("task_assignments").default(true),
  taskUpdates: boolean("task_updates").default(true),
  documentSharing: boolean("document_sharing").default(true),
  documentComments: boolean("document_comments").default(true),
  achievementUnlocks: boolean("achievement_unlocks").default(true),
  dailyDigest: boolean("daily_digest").default(false),
  weeklyDigest: boolean("weekly_digest").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taskActivities = pgTable("task_activities", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documentRelations = relations(documents, ({ one, many }) => ({
  creator: one(users, {
    fields: [documents.createdBy],
    references: [users.id],
  }),
  messages: many(documentMessages),
  versions: many(documentVersions),
  comments: many(documentComments),
}));

export const documentMessageRelations = relations(documentMessages, ({ one }) => ({
  document: one(documents, {
    fields: [documentMessages.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [documentMessages.userId],
    references: [users.id],
  }),
}));

export const documentVersionRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, {
    fields: [documentVersions.documentId],
    references: [documents.id],
  }),
  creator: one(users, {
    fields: [documentVersions.createdBy],
    references: [users.id],
  }),
}));

export const fileRelations = relations(files, ({ one, many }) => ({
  uploader: one(users, {
    fields: [files.uploadedBy],
    references: [users.id],
  }),
  shares: many(fileShares),
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
  assigner: one(users, {
    fields: [tasks.assignedBy],
    references: [users.id],
  }),
  activities: many(taskActivities),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  companyProfile: one(companyProfiles),
  notificationPreferences: one(notificationPreferences),
  assignedTasks: many(tasks, { relationName: "assignee" }),
  createdTasks: many(tasks, { relationName: "assigner" }),
  uploadedFiles: many(files),
  receivedFileShares: many(fileShares, { relationName: "sharedWithUser" }),
  sharedFiles: many(fileShares, { relationName: "sharedByUser" }),
  createdDocuments: many(documents),
  documentMessages: many(documentMessages),
  documentComments: many(documentComments),
  achievements: many(userAchievements),
}));

export const companyProfileRelations = relations(companyProfiles, ({ one }) => ({
  user: one(users, {
    fields: [companyProfiles.userId],
    references: [users.id],
  }),
}));

export const documentCommentRelations = relations(documentComments, ({ one, many }) => ({
  document: one(documents, {
    fields: [documentComments.documentId],
    references: [documents.id],
  }),
  author: one(users, {
    fields: [documentComments.userId],
    references: [users.id],
  }),
  parent: one(documentComments, {
    fields: [documentComments.parentId],
    references: [documentComments.id],
  }),
  replies: many(documentComments),
}));

export const fileShareRelations = relations(fileShares, ({ one }) => ({
  file: one(files, {
    fields: [fileShares.fileId],
    references: [files.id],
  }),
  sharedWithUser: one(users, {
    fields: [fileShares.sharedWithUserId],
    references: [users.id],
  }),
  sharedByUser: one(users, {
    fields: [fileShares.sharedByUserId],
    references: [users.id],
  }),
}));

export const achievementRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const taskActivityRelations = relations(taskActivities, ({ one }) => ({
  task: one(tasks, {
    fields: [taskActivities.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskActivities.userId],
    references: [users.id],
  }),
}));


export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const createDocumentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  content: z.string(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  assignedTo: z.number(),
  deadline: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
});

export const updateCompanyProfileSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  description: z.string().optional(),
  website: z.string().url("Invalid website URL").optional(),
  industry: z.string().optional(),
  employeeCount: z.string().optional(),
  foundedYear: z.number().min(1800).max(new Date().getFullYear()).optional(),
  headquarters: z.string().optional(),
});

export const createDocumentCommentSchema = z.object({
  documentId: z.number(),
  content: z.string().min(1, "Comment is required"),
  selectionRange: z.object({
    start: z.number(),
    end: z.number(),
    text: z.string(),
  }),
  mentions: z.array(z.number()).optional(),
  parentId: z.number().optional(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentMessage = typeof documentMessages.$inferSelect;
export type NewDocumentMessage = typeof documentMessages.$inferInsert;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type LoginInput = z.infer<typeof loginSchema>;
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type NewCompanyProfile = typeof companyProfiles.$inferInsert;
export type DocumentComment = typeof documentComments.$inferSelect;
export type NewDocumentComment = typeof documentComments.$inferInsert;
export type FileShare = typeof fileShares.$inferSelect;
export type NewFileShare = typeof fileShares.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferences = typeof notificationPreferences.$inferInsert;
export type TaskActivity = typeof taskActivities.$inferSelect;
export type NewTaskActivity = typeof taskActivities.$inferInsert;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertDocumentSchema = createInsertSchema(documents);
export const selectDocumentSchema = createSelectSchema(documents);
export const insertFileSchema = createInsertSchema(files);
export const selectFileSchema = createSelectSchema(files);
export const insertCompanyProfileSchema = createInsertSchema(companyProfiles);
export const selectCompanyProfileSchema = createSelectSchema(companyProfiles);
export const insertFileShareSchema = createInsertSchema(fileShares);
export const selectFileShareSchema = createSelectSchema(fileShares);
export const insertAchievementSchema = createInsertSchema(achievements);
export const selectAchievementSchema = createSelectSchema(achievements);
export const insertUserAchievementSchema = createInsertSchema(userAchievements);
export const selectUserAchievementSchema = createSelectSchema(userAchievements);
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences);
export const selectNotificationPreferencesSchema = createSelectSchema(notificationPreferences);

export const updateNotificationPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  taskAssignments: z.boolean(),
  taskUpdates: z.boolean(),
  documentSharing: z.boolean(),
  documentComments: z.boolean(),
  achievementUnlocks: z.boolean(),
  dailyDigest: z.boolean(),
  weeklyDigest: z.boolean(),
});