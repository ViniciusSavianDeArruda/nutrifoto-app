import { z } from "zod";

export const MEAL_TYPES = ["cafe_da_manha", "almoco", "lanche", "jantar", "outro"] as const;
export const AI_STATUSES = ["analyzed", "skipped", "failed", "manual", "text", "favorite"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

const CONFIDENCE_ALIASES: Record<string, string> = {
  baixa: "baixa", baixo: "baixa", low: "baixa",
  media: "media", média: "media", medio: "media", médio: "media", medium: "media",
  alta: "alta", alto: "alta", high: "alta",
};

const confidence = z.preprocess(
  (v) => (typeof v === "string" ? (CONFIDENCE_ALIASES[v.trim().toLowerCase()] ?? v) : v),
  z.enum(["baixa", "media", "alta"]),
);
const macro = z.number().min(0).max(1000);

export const itemIn = z.object({
  name: z.string().trim().min(1).max(120),
  grams: z.number().gt(0).max(5000),
  kcal: z.number().min(0).max(10000),
  protein_g: macro.default(0),
  carbs_g: macro.default(0),
  fat_g: macro.default(0),
  fiber_g: macro.default(0),
  confidence: confidence.default("media"),
  edited_by_user: z.boolean().default(false),
});
export type ItemIn = z.infer<typeof itemIn>;

const mealType = z.enum(MEAL_TYPES);
const dateTime = z.coerce.date();

export const analysisResult = z.object({
  items: z.array(itemIn).max(30).default([]),
  notes: z.string().max(500).nullish(),
});
export type AnalysisResult = z.infer<typeof analysisResult>;

export const analyzeTextIn = z.object({
  text: z.string().min(2).max(500),
  current_items: z.array(itemIn).max(40).nullish(),
});

export const mealCreate = z.object({
  eaten_at: dateTime.nullish(),
  meal_type: mealType,
  notes: z.string().max(500).nullish(),
  items: z.array(itemIn).max(40).default([]),
  ai_status: z.enum(AI_STATUSES).default("manual"),
  ai_provider: z.string().max(30).nullish(),
});

export const mealUpdate = z.object({
  eaten_at: dateTime.nullish(),
  meal_type: mealType.nullish(),
  notes: z.string().max(500).nullish(),
  items: z.array(itemIn).max(40).nullish(),
});

export const mealDuplicateIn = z.object({
  eaten_at: dateTime.nullish(),
  scale: z.number().gt(0).max(10).default(1),
});

export const favoriteCreate = z.object({
  name: z.string().min(1).max(100),
  meal_type: mealType.nullish(),
  items: z.array(itemIn).min(1).max(40).nullish(),
  from_meal_id: z.number().int().nullish(),
});

export const favoriteLogIn = z.object({
  eaten_at: dateTime.nullish(),
  meal_type: mealType.nullish(),
  scale: z.number().gt(0).max(10).default(1),
});

const email = z.string().trim().email().max(255);
export const registerIn = z.object({
  email,
  password: z.string().min(8).max(128),
  name: z.string().max(100).nullish(),
  accept_terms: z.boolean().refine((v) => v === true, "Aceite os termos para criar a conta."),
  invite_code: z.string().max(40).nullish(),
});
export const forgotIn = z.object({ email });
export const resetIn = z.object({ token: z.string().min(10).max(200), password: z.string().min(8).max(128) });
export const verifyIn = z.object({ token: z.string().min(10).max(200) });
export const loginIn = z.object({ email, password: z.string().min(1).max(128) });
export const deleteAccountIn = z.object({ password: z.string() });

export const userUpdate = z.object({
  name: z.string().max(100).nullish(),
  daily_kcal_goal: z.number().int().min(800).max(10000).nullish(),
  protein_goal_g: z.number().int().min(0).max(1000).nullish(),
  carbs_goal_g: z.number().int().min(0).max(2000).nullish(),
  fat_goal_g: z.number().int().min(0).max(1000).nullish(),
  water_goal_ml: z.number().int().min(0).max(20000).nullish(),
});

export const waterIn = z.object({ ml: z.number().int().gt(0).max(5000), logged_at: dateTime.nullish() });
export const weightIn = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kg: z.number().gt(20).lt(500),
});
