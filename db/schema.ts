import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// =========================================
// Independent Table Definitions
// =========================================

// Base tables (no foreign keys)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  companyName: text("company_name").notNull(),
  role: text("role").notNull().default("user"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =========================================
// Dependent Table Definitions
// =========================================

// Level 1 Dependencies (depend only on users)
export const clientProfiles = pgTable("client_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  companyName: text("company_name").notNull(),
  industry: text("industry"),
  location: text("location"),
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  status: text("status").default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const storageSettings = pgTable("storage_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  localEnabled: boolean("local_enabled").default(true).notNull(),
  googleDrive: boolean("google_drive").default(false).notNull(),
  dropbox: boolean("dropbox").default(false).notNull(),
  oneDrive: boolean("one_drive").default(false).notNull(),
  mega: boolean("mega").default(false).notNull(),
  googleDriveToken: text("google_drive_token"),
  dropboxToken: text("dropbox_token"),
  oneDriveToken: text("one_drive_token"),
  megaToken: text("mega_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teamPerformance = pgTable("team_performance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  clientSatisfaction: integer("client_satisfaction").notNull().default(0),
  communicationScore: integer("communication_score").notNull().default(0),
  period: text("period").notNull(), // daily, weekly, monthly
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Level 2 Dependencies (depend on users and level 1)
export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clientProfiles.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  clientId: integer("client_id").references(() => clientProfiles.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  deadline: timestamp("deadline"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull(),
  clientId: integer("client_id").references(() => clientProfiles.id),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Level 3 Dependencies
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

// Add proper return type for documentComments
export const documentComments = pgTable("document_comments", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  selectionRange: text("selection_range").notNull(),
  mentions: text("mentions"),
  parentId: integer("parent_id"),
  resolved: boolean("resolved").default(false),
});

// Add relation after declaration
export const documentCommentsRelations = relations(documentComments, ({ one }) => ({
  parent: one(documentComments, {
    fields: [documentComments.parentId],
    references: [documentComments.id],
  }),
}));

export const taskActivities = pgTable("task_activities", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Analytics & Achievement System
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  criteria: json("criteria").notNull(),
  points: integer("points").notNull(),
  icon: text("icon"),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  achievementId: integer("achievement_id").references(() => achievements.id).notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  clientId: integer("client_id").references(() => clientProfiles.id),
  eventType: text("event_type").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notification System
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Company Settings
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

// =========================================
// Relations
// =========================================

export const userRelations = relations(users, ({ many }) => ({
  clientProfiles: many(clientProfiles),
  tasks: many(tasks),
  communications: many(communications),
  files: many(files),
  analyticsEvents: many(analyticsEvents),
  achievements: many(userAchievements),
  performance: many(teamPerformance),
}));

export const documentRelations = relations(documents, ({ one, many }) => ({
  creator: one(users, {
    fields: [documents.createdBy],
    references: [users.id],
  }),
  versions: many(documentVersions),
  comments: many(documentComments),
  messages: many(documentMessages),
}));

export const storageSettingsRelations = relations(storageSettings, ({ one }) => ({
  user: one(users, {
    fields: [storageSettings.userId],
    references: [users.id],
  }),
}));

// =========================================
// Schema Validation
// =========================================

// Auth Schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Document Schemas
export const createDocumentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  content: z.string(),
});

// Task Schemas
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

// Comment Schemas
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

// Company Profile Schemas
export const updateCompanyProfileSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  description: z.string().optional(),
  website: z.string().url("Invalid website URL").optional(),
  industry: z.string().optional(),
  employeeCount: z.string().optional(),
  foundedYear: z.number().min(1800).max(new Date().getFullYear()).optional(),
  headquarters: z.string().optional(),
});

// Notification Schemas
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

// =========================================
// Types
// =========================================

// User Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type LoginInput = z.infer<typeof loginSchema>;

// Document Types
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentMessage = typeof documentMessages.$inferSelect;
export type NewDocumentMessage = typeof documentMessages.$inferInsert;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;
export type DocumentComment = typeof documentComments.$inferSelect;
export type NewDocumentComment = typeof documentComments.$inferInsert;

// Client Types
export type ClientProfile = typeof clientProfiles.$inferSelect;
export type NewClientProfile = typeof clientProfiles.$inferInsert;

// Task Types
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskActivity = typeof taskActivities.$inferSelect;
export type NewTaskActivity = typeof taskActivities.$inferInsert;

// File Types
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type FileShare = typeof fileShares.$inferSelect;
export type NewFileShare = typeof fileShares.$inferInsert;

// Storage Types
export type StorageSettings = typeof storageSettings.$inferSelect;
export type NewStorageSettings = typeof storageSettings.$inferInsert;

// Analytics and Achievement Types
export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;

// Notification Types
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferences = typeof notificationPreferences.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// Company Types
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type NewCompanyProfile = typeof companyProfiles.$inferInsert;

// Performance Types
export type TeamPerformance = typeof teamPerformance.$inferSelect;
export type NewTeamPerformance = typeof teamPerformance.$inferInsert;

// =========================================
// Schema Insert/Select
// =========================================

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertDocumentSchema = createInsertSchema(documents);
export const selectDocumentSchema = createSelectSchema(documents);

export const insertFileSchema = createInsertSchema(files);
export const selectFileSchema = createSelectSchema(files);

export const insertFileShareSchema = createInsertSchema(fileShares);
export const selectFileShareSchema = createSelectSchema(fileShares);

export const insertAchievementSchema = createInsertSchema(achievements);
export const selectAchievementSchema = createSelectSchema(achievements);

export const insertUserAchievementSchema = createInsertSchema(userAchievements);
export const selectUserAchievementSchema = createSelectSchema(userAchievements);

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences);
export const selectNotificationPreferencesSchema = createSelectSchema(notificationPreferences);

export const insertCompanyProfileSchema = createInsertSchema(companyProfiles);
export const selectCompanyProfileSchema = createSelectSchema(companyProfiles);

export const insertStorageSettingsSchema = createInsertSchema(storageSettings);
export const selectStorageSettingsSchema = createSelectSchema(storageSettings);

export const insertCommunicationSchema = createInsertSchema(communications);
export const selectCommunicationSchema = createSelectSchema(communications);

export const insertTeamPerformanceSchema = createInsertSchema(teamPerformance);
export const selectTeamPerformanceSchema = createSelectSchema(teamPerformance);

export const insertClientProfileSchema = createInsertSchema(clientProfiles);
export const selectClientProfileSchema = createSelectSchema(clientProfiles);