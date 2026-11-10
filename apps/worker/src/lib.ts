import { and, eq, inArray, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { Context } from "hono";
import { z } from "zod";
import type { BaseProvider } from "./ai/base";
import { buildProvider } from "./ai";
import type { Config, Env } from "./env";
import { ApiError } from "./errors";
import { sumTotals } from "./nutrition";
import * as schema from "./schema";
import { aiUsage, mealItems, meals, type MealItemRow, type MealRow, type UserRow } from "./schema";
import type { ItemIn } from "./schemas";
import { appToday } from "./time";
import { buildStorage, type Storage } from "./storage";
import { buildMailer, type Mailer } from "./mail";

export type Db = PgDatabase<any, typeof schema>;

export interface Deps {
  getDb(env: Env): { db: Db; close: () => Promise<void> | void };
  storage?(cfg: Config): Storage;
  provider?(cfg: Config): BaseProvider;
  mailer?(cfg: Config): Mailer;
}

export type AppEnv = {
  Bindings: Env;
  Variables: { cfg: Config; db: Db; deps: Deps; user: UserRow; storageInst?: Storage; providerInst?: BaseProvider; mailerInst?: Mailer };
};
export type Ctx = Context<AppEnv>;

export function getStorage(c: Ctx): Storage {
  let s = c.get("storageInst");
  if (!s) {
    try {
      s = (c.get("deps").storage ?? buildStorage)(c.get("cfg"));
    } catch (e) {
      throw new ApiError(503, "storage_config", (e as Error).message);
    }
    c.set("storageInst", s);
  }
  return s;
}

export function getMailer(c: Ctx): Mailer {
  let m = c.get("mailerInst");
  if (!m) {
    m = (c.get("deps").mailer ?? buildMailer)(c.get("cfg"));
    c.set("mailerInst", m);
  }
  return m;
}

export function getProvider(c: Ctx): BaseProvider {
  let p = c.get("providerInst");
  if (!p) {
    p = (c.get("deps").provider ?? buildProvider)(c.get("cfg")); // AIError é tratado em app.onError
    c.set("providerInst", p);
  }
  return p;
}

/** Valida o corpo JSON; erros viram 422 no formato { detail: { code, message, errors } }. */
export async function readJson<T extends z.ZodType>(c: Ctx, schemaDef: T, optional = false): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    if (!optional) throw new ApiError(422, "invalid_json", "Corpo da requisição inválido.");
    raw = {};
  }
  return schemaDef.parse(raw);
}

export const intParam = (v: string | undefined, def: number) => {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isInteger(n) ? n : def;
};

const urlsFor = async (storage: Storage, paths: (string | null)[]) => {
  const list = [...new Set(paths.filter((p): p is string => !!p))];
  if (!list.length) return {} as Record<string, string>;
  try {
    return await storage.signedUrls(list);
  } catch {
    return {} as Record<string, string>; // a lista continua funcionando mesmo sem as imagens
  }
};

const totalsOf = (m: MealRow) => ({
  kcal: m.totalKcal, protein_g: m.totalProteinG, carbs_g: m.totalCarbsG, fat_g: m.totalFatG, fiber_g: m.totalFiberG,
});

const itemOut = (i: MealItemRow) => ({
  id: i.id, name: i.name, grams: i.grams, kcal: i.kcal, protein_g: i.proteinG, carbs_g: i.carbsG,
  fat_g: i.fatG, fiber_g: i.fiberG, confidence: i.confidence, edited_by_user: i.editedByUser,
});

export type MealWithItems = { meal: MealRow; items: MealItemRow[] };

export async function attachItems(db: Db, rows: MealRow[]): Promise<MealWithItems[]> {
  if (!rows.length) return [];
  const items = await db.select().from(mealItems).where(inArray(mealItems.mealId, rows.map((m) => m.id))).orderBy(mealItems.position, mealItems.id);
  return rows.map((meal) => ({ meal, items: items.filter((i) => i.mealId === meal.id) }));
}

export async function loadMeal(db: Db, userId: number, id: number): Promise<MealWithItems> {
  const [row] = await db.select().from(meals).where(and(eq(meals.id, id), eq(meals.userId, userId))).limit(1);
  if (!row) throw new ApiError(404, "not_found", "Refeição não encontrada.");
  return (await attachItems(db, [row]))[0]!;
}

export async function mealOut({ meal, items }: MealWithItems, storage: Storage) {
  const urls = await urlsFor(storage, [meal.photoPath, meal.thumbPath]);
  return {
    id: meal.id,
    eaten_at: meal.eatenAt.toISOString(),
    meal_type: meal.mealType,
    notes: meal.notes,
    ai_status: meal.aiStatus,
    ai_provider: meal.aiProvider,
    photo_url: meal.photoPath ? (urls[meal.photoPath] ?? null) : null,
    thumb_url: meal.thumbPath ? (urls[meal.thumbPath] ?? null) : null,
    totals: totalsOf(meal),
    items: items.map(itemOut),
  };
}

export async function mealSummaries(list: MealWithItems[], storage: Storage) {
  const urls = await urlsFor(storage, list.map((m) => m.meal.thumbPath));
  return list.map(({ meal, items }) => ({
    id: meal.id,
    eaten_at: meal.eatenAt.toISOString(),
    meal_type: meal.mealType,
    thumb_url: meal.thumbPath ? (urls[meal.thumbPath] ?? null) : null,
    ai_status: meal.aiStatus,
    totals: totalsOf(meal),
    item_names: items.map((i) => i.name),
  }));
}

/** Totais e linhas dos itens, prontos para gravar. */
export function itemRows(items: ItemIn[]) {
  return items.map((i, position) => ({
    position, name: i.name, grams: i.grams, kcal: i.kcal, proteinG: i.protein_g, carbsG: i.carbs_g,
    fatG: i.fat_g, fiberG: i.fiber_g, confidence: i.confidence, editedByUser: i.edited_by_user,
  }));
}

export function totalColumns(items: ItemIn[]) {
  const t = sumTotals(items);
  return { totalKcal: t.kcal, totalProteinG: t.protein_g, totalCarbsG: t.carbs_g, totalFatG: t.fat_g, totalFiberG: t.fiber_g };
}

export async function insertMealRow(db: Db, values: typeof meals.$inferInsert, items: ItemIn[]): Promise<MealRow> {
  return db.transaction(async (tx) => {
    const [meal] = await tx.insert(meals).values(values).returning();
    if (items.length) await tx.insert(mealItems).values(itemRows(items).map((r) => ({ ...r, mealId: meal!.id })));
    return meal!;
  });
}

export const toItemIn = (i: MealItemRow): ItemIn => ({
  name: i.name, grams: i.grams, kcal: i.kcal, protein_g: i.proteinG, carbs_g: i.carbsG, fat_g: i.fatG,
  fiber_g: i.fiberG, confidence: i.confidence as ItemIn["confidence"], edited_by_user: i.editedByUser,
});

export async function aiUsedToday(db: Db, userId: number, cfg: Config): Promise<number> {
  const [row] = await db.select().from(aiUsage).where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, appToday(cfg.appTimezone)))).limit(1);
  return row?.count ?? 0;
}

export async function registerAiUse(db: Db, userId: number, cfg: Config): Promise<number> {
  const [row] = await db
    .insert(aiUsage)
    .values({ userId, day: appToday(cfg.appTimezone), count: 1 })
    .onConflictDoUpdate({ target: [aiUsage.userId, aiUsage.day], set: { count: sql`${aiUsage.count} + 1` } })
    .returning({ count: aiUsage.count });
  return row!.count;
}

/** Perfil que o front recebe. A foto vai como link assinado e temporário. */
export async function userView(c: Ctx, u: UserRow) {
  let avatarUrl: string | null = null;
  if (u.avatarPath) {
    try {
      avatarUrl = (await getStorage(c).signedUrls([u.avatarPath]))[u.avatarPath] ?? null;
    } catch {
      avatarUrl = null; // storage fora do ar não pode derrubar o login
    }
  }
  return {
    id: u.id, email: u.email, name: u.name, daily_kcal_goal: u.dailyKcalGoal, protein_goal_g: u.proteinGoalG,
    carbs_goal_g: u.carbsGoalG, fat_goal_g: u.fatGoalG, water_goal_ml: u.waterGoalMl,
    email_verified: Boolean(u.emailVerifiedAt), avatar_url: avatarUrl, mail_enabled: getMailer(c).enabled,
  };
}

export const goalsOf = (u: UserRow) => ({
  kcal: u.dailyKcalGoal, protein_g: u.proteinGoalG, carbs_g: u.carbsGoalG, fat_g: u.fatGoalG, water_ml: u.waterGoalMl,
});

export function clientIp(c: Ctx): string {
  return c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export type Img = { bytes: Uint8Array; mime: string; ext: string };

function sniff(b: Uint8Array): { mime: string; ext: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: "image/png", ext: "png" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export async function readImage(file: unknown, c: Ctx): Promise<Img> {
  const limit = c.get("cfg").maxUploadMb * 1024 * 1024;
  if (!file || typeof file === "string" || typeof (file as File).arrayBuffer !== "function") {
    throw new ApiError(400, "empty_file", "Nenhuma foto recebida.");
  }
  const f = file as File;
  if (f.size > limit) throw new ApiError(413, "file_too_large", `A foto passa de ${c.get("cfg").maxUploadMb} MB.`);
  if (f.size === 0) throw new ApiError(400, "empty_file", "Nenhuma foto recebida.");
  const bytes = new Uint8Array(await f.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) throw new ApiError(400, "bad_image", "Esse arquivo não é uma imagem válida (use JPEG, PNG ou WebP).");
  return { bytes, ...kind };
}
