import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey(),
  githubRepo: text("github_repo"),
  githubBranch: text("github_branch").default("main"),
  githubWorkflow: text("github_workflow").default("apk-builder.yml"),
  keystoreAlias: text("keystore_alias").default("apkbuilder-release-key"),
  keystoreFingerprint: text("keystore_fingerprint"),
  keystoreConfigured: boolean("keystore_configured").default(false),
  retentionDays: integer("retention_days").default(14),
  callbackSecret: text("callback_secret").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const builds = pgTable("builds", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  appName: text("app_name").notNull(),
  packageId: text("package_id").notNull(),
  versionName: text("version_name").default("1.0.0").notNull(),
  versionCode: integer("version_code").default(1).notNull(),
  buildType: text("build_type").notNull(), // 'website' | 'zip' | 'pwa'
  sourceUrl: text("source_url"),
  zipFileName: text("zip_file_name"),
  zipFileSize: integer("zip_file_size"),
  zipStoragePath: text("zip_storage_path"),
  status: text("status").default("pending").notNull(), // 'pending' | 'queued' | 'validating' | 'building' | 'signing' | 'completed' | 'failed' | 'cancelled'
  progressPercent: integer("progress_percent").default(0).notNull(),
  currentStep: text("current_step"),
  errorMessage: text("error_message"),
  appIconUrl: text("app_icon_url"),
  configJson: text("config_json").notNull(), // JSON string of customization options
  manifestJson: text("manifest_json"),
  logs: text("logs").default("").notNull(),
  githubRunId: text("github_run_id"),
  githubRunUrl: text("github_run_url"),
  apkFileName: text("apk_file_name"),
  apkFileSize: integer("apk_file_size"),
  apkSha256: text("apk_sha256"),
  apkStoragePath: text("apk_storage_path"), // private storage key / path
  retryCount: integer("retry_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type User = typeof users.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
export type Build = typeof builds.$inferSelect;
export type NewBuild = typeof builds.$inferInsert;
