import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  companyName: text("company_name").notNull(),
  role: text("role").notNull().default("user"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default('CURRENT_TIMESTAMP'),
});

// Schema validation
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type LoginInput = z.infer<typeof loginSchema>;

export const companyProfiles = sqliteTable("company_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  companyName: text("company_name").notNull(),
  logo: text("logo_path"),
  description: text("description"),
  website: text("website"),
  industry: text("industry"),
  employeeCount: text("employee_count"),
  foundedYear: integer("founded_year"),
  headquarters: text("headquarters"),
  updatedAt: text("updated_at").notNull().default('CURRENT_TIMESTAMP'),
});

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: text("created_at").notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text("updated_at").notNull().default('CURRENT_TIMESTAMP'),
  isArchived: integer("is_archived", { mode: "boolean" }).default(0),
});

export const documentMessages = sqliteTable("document_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default('CURRENT_TIMESTAMP'),
});

export const documentVersions = sqliteTable("document_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  versionNumber: integer("version_number").notNull(),
  content: text("content").notNull(),
  commitMessage: text("commit_message"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: text("created_at").notNull().default('CURRENT_TIMESTAMP'),
});

export const files = sqliteTable("files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  path: text("path").notNull(),
  thumbnailPath: text("thumbnail_path"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  uploadedAt: text("uploaded_at").notNull().default('CURRENT_TIMESTAMP'),
  description: text("description"),
  isArchived: integer("is_archived", { mode: "boolean" }).default(0),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  assignedTo: integer("assigned_to").references(() => users.id),
  assignedBy: integer("assigned_by").references(() => users.id),
  deadline: text("deadline"),
  createdAt: text("created_at").notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text("updated_at").notNull().default('CURRENT_TIMESTAMP'),
  completedAt: text("completed_at"),
});

export const documentComments = sqliteTable("document_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default('CURRENT_TIMESTAMP'),
  selectionRange: text("selection_range").notNull(),
  mentions: text("mentions"),
  parentId: integer("parent_id").references(() => documentComments.id),
  resolved: integer("resolved", { mode: "boolean" }).default(0),
});

export const fileShares = sqliteTable("file_shares", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fileId: integer("file_id").references(() => files.id).notNull(),
  sharedWithUserId: integer("shared_with_user_id").references(() => users.id).notNull(),
  sharedByUserId: integer("shared_by_user_id").references(() => users.id).notNull(),
  sharedAt: text("shared_at").notNull().default('CURRENT_TIMESTAMP'),
  expiresAt: text("expires_at"),
  revoked: integer("revoked", { mode: "boolean" }).default(0),
});

export const achievements = sqliteTable("achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull(),
  criteria: text("criteria").notNull(),
  createdAt: text("created_at").notNull().default('CURRENT_TIMESTAMP'),
});

export const userAchievements = sqliteTable("user_achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull(),
  achievementId: integer("achievement_id").references(() => achievements.id).notNull(),
  unlockedAt: text("unlocked_at").notNull().default('CURRENT_TIMESTAMP'),
  progress: text("progress"),
});

export const notificationPreferences = sqliteTable("notification_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull(),
  emailNotifications: integer("email_notifications", { mode: "boolean" }).default(1),
  taskAssignments: integer("task_assignments", { mode: "boolean" }).default(1),
  taskUpdates: integer("task_updates", { mode: "boolean" }).default(1),
  documentSharing: integer("document_sharing", { mode: "boolean" }).default(1),
  documentComments: integer("document_comments", { mode: "boolean" }).default(1),
  achievementUnlocks: integer("achievement_unlocks", { mode: "boolean" }).default(1),
  dailyDigest: integer("daily_digest", { mode: "boolean" }).default(0),
  weeklyDigest: integer("weekly_digest", { mode: "boolean" }).default(1),
  createdAt: text("created_at").notNull().default('CURRENT_TIMESTAMP'),
  updatedAt: text("updated_at").notNull().default('CURRENT_TIMESTAMP'),
});

export const taskActivities = sqliteTable("task_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  createdAt: text("created_at").notNull().default('CURRENT_TIMESTAMP'),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  read: integer("read", { mode: "boolean" }).default(0).notNull(),
  createdAt: text("created_at").notNull().default('CURRENT_TIMESTAMP'),
});

export const teamPerformance = sqliteTable("team_performance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull(),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  onTimeCompletion: integer("on_time_completion").notNull().default(0),
  documentComments: integer("document_comments").notNull().default(0),
  collaborationScore: integer("collaboration_score").notNull().default(0),
  totalScore: integer("total_score").notNull().default(0),
  updatedAt: text("updated_at").notNull().default('CURRENT_TIMESTAMP'),
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
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type TeamPerformance = typeof teamPerformance.$inferSelect;

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