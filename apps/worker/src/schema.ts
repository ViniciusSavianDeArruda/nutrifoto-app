import { boolean, date, doublePrecision, index, integer, pgTable, serial, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }),
  dailyKcalGoal: integer("daily_kcal_goal").notNull().default(2000),
  proteinGoalG: integer("protein_goal_g").notNull().default(100),
  carbsGoalG: integer("carbs_goal_g").notNull().default(250),
  fatGoalG: integer("fat_goal_g").notNull().default(70),
  waterGoalMl: integer("water_goal_ml").notNull().default(2000),
  emailVerifiedAt: ts("email_verified_at"),
  avatarPath: varchar("avatar_path", { length: 255 }),
  termsAcceptedAt: ts("terms_accepted_at"),
  passwordChangedAt: ts("password_changed_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const authTokens = pgTable("auth_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 20 }).notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const invites = pgTable("invites", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull(),
  note: varchar("note", { length: 100 }),
  maxUses: integer("max_uses").notNull().default(1),
  uses: integer("uses").notNull().default(0),
  expiresAt: ts("expires_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const meals = pgTable(
  "meals",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    eatenAt: ts("eaten_at").notNull(),
    mealType: varchar("meal_type", { length: 20 }).notNull(),
    notes: varchar("notes", { length: 500 }),
    photoPath: varchar("photo_path", { length: 255 }),
    thumbPath: varchar("thumb_path", { length: 255 }),
    photoBytes: integer("photo_bytes").notNull().default(0),
    aiStatus: varchar("ai_status", { length: 20 }).notNull().default("manual"),
    aiProvider: varchar("ai_provider", { length: 30 }),
    totalKcal: doublePrecision("total_kcal").notNull().default(0),
    totalProteinG: doublePrecision("total_protein_g").notNull().default(0),
    totalCarbsG: doublePrecision("total_carbs_g").notNull().default(0),
    totalFatG: doublePrecision("total_fat_g").notNull().default(0),
    totalFiberG: doublePrecision("total_fiber_g").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("ix_meals_eaten_at").on(t.eatenAt), index("ix_meals_user_id").on(t.userId)],
);

export const mealItems = pgTable(
  "meal_items",
  {
    id: serial("id").primaryKey(),
    mealId: integer("meal_id").notNull().references(() => meals.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    name: varchar("name", { length: 120 }).notNull(),
    grams: doublePrecision("grams").notNull(),
    kcal: doublePrecision("kcal").notNull(),
    proteinG: doublePrecision("protein_g").notNull().default(0),
    carbsG: doublePrecision("carbs_g").notNull().default(0),
    fatG: doublePrecision("fat_g").notNull().default(0),
    fiberG: doublePrecision("fiber_g").notNull().default(0),
    confidence: varchar("confidence", { length: 10 }).notNull().default("media"),
    editedByUser: boolean("edited_by_user").notNull().default(false),
  },
  (t) => [index("ix_meal_items_meal_id").on(t.mealId)],
);

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  mealType: varchar("meal_type", { length: 20 }),
  itemsJson: text("items_json").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [unique("uq_ai_usage_user_day").on(t.userId, t.day)],
);

export const waterLogs = pgTable("water_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  loggedAt: ts("logged_at").notNull(),
  ml: integer("ml").notNull(),
});

export const weightLogs = pgTable(
  "weight_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    kg: doublePrecision("kg").notNull(),
  },
  (t) => [unique("uq_weight_user_day").on(t.userId, t.day)],
);

export type UserRow = typeof users.$inferSelect;
export type MealRow = typeof meals.$inferSelect;
export type MealItemRow = typeof mealItems.$inferSelect;
