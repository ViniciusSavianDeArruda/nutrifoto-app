import { asc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { ApiError } from "../errors";
import { aiUsedToday, getStorage, type AppEnv } from "../lib";
import { requireUser } from "../middleware";
import { decodeFileToken } from "../security";
import { favorites, mealItems, meals, waterLogs, weightLogs } from "../schema";

export const dataRouter = new Hono<AppEnv>();

dataRouter.get("/api/usage", requireUser, async (c) => {
  const cfg = c.get("cfg");
  const user = c.get("user");
  const db = c.get("db");
  const [agg] = await db
    .select({ bytes: sql<number>`coalesce(sum(${meals.photoBytes}), 0)::float8`, count: sql<number>`count(*)::int` })
    .from(meals)
    .where(eq(meals.userId, user.id));
  return c.json({
    ai_used_today: await aiUsedToday(db, user.id, cfg),
    ai_limit: cfg.dailyAiLimit,
    photo_bytes_used: Math.round(agg?.bytes ?? 0),
    photo_bytes_limit: cfg.storageQuotaMb * 1024 * 1024,
    meals_count: agg?.count ?? 0,
    ai_provider: cfg.aiProvider,
  });
});

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/** Exporta tudo da conta. `format=json` (completo) ou `format=csv` (uma linha por alimento). */
dataRouter.get("/api/export", requireUser, async (c) => {
  const format = c.req.query("format") ?? "json";
  const user = c.get("user");
  const db = c.get("db");
  if (format !== "csv" && format !== "json") throw new ApiError(400, "bad_format", "Use format=json ou format=csv.");

  const rows = await db.select().from(meals).where(eq(meals.userId, user.id)).orderBy(asc(meals.eatenAt), asc(meals.id));
  const items = rows.length
    ? await db.select({ i: mealItems }).from(mealItems).innerJoin(meals, eq(mealItems.mealId, meals.id)).where(eq(meals.userId, user.id)).orderBy(asc(mealItems.position), asc(mealItems.id))
    : [];
  const itemsOf = (id: number) => items.filter((r) => r.i.mealId === id).map((r) => r.i);

  if (format === "csv") {
    const lines = [["data_hora_utc", "tipo", "alimento", "gramas", "kcal", "proteina_g", "carboidrato_g", "gordura_g", "fibra_g", "confianca", "notas"].join(",")];
    for (const m of rows) {
      for (const i of itemsOf(m.id)) {
        lines.push([m.eatenAt.toISOString(), m.mealType, i.name, i.grams, i.kcal, i.proteinG, i.carbsG, i.fatG, i.fiberG, i.confidence, m.notes ?? ""].map(csvCell).join(","));
      }
    }
    // BOM para o Excel abrir acentos corretamente
    return new Response("﻿" + lines.join("\n") + "\n", {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="nutrifoto.csv"' },
    });
  }

  const favs = await db.select().from(favorites).where(eq(favorites.userId, user.id));
  const water = await db.select().from(waterLogs).where(eq(waterLogs.userId, user.id)).orderBy(asc(waterLogs.loggedAt));
  const weight = await db.select().from(weightLogs).where(eq(weightLogs.userId, user.id)).orderBy(asc(weightLogs.day));
  const payload = {
    user: {
      email: user.email, name: user.name, daily_kcal_goal: user.dailyKcalGoal, protein_goal_g: user.proteinGoalG,
      carbs_goal_g: user.carbsGoalG, fat_goal_g: user.fatGoalG, water_goal_ml: user.waterGoalMl,
    },
    meals: rows.map((m) => ({
      eaten_at: m.eatenAt.toISOString(), meal_type: m.mealType, notes: m.notes, ai_status: m.aiStatus, ai_provider: m.aiProvider,
      totals: { kcal: m.totalKcal, protein_g: m.totalProteinG, carbs_g: m.totalCarbsG, fat_g: m.totalFatG, fiber_g: m.totalFiberG },
      items: itemsOf(m.id).map((i) => ({
        name: i.name, grams: i.grams, kcal: i.kcal, protein_g: i.proteinG, carbs_g: i.carbsG, fat_g: i.fatG,
        fiber_g: i.fiberG, confidence: i.confidence, edited_by_user: i.editedByUser,
      })),
    })),
    favorites: favs.map((f) => ({ name: f.name, meal_type: f.mealType, items: JSON.parse(f.itemsJson) })),
    water: water.map((w) => ({ logged_at: w.loggedAt.toISOString(), ml: w.ml })),
    weight: weight.map((w) => ({ day: w.day, kg: w.kg })),
    note: "As fotos não vão neste arquivo; elas ficam no armazenamento do app.",
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="nutrifoto.json"' },
  });
});

/** Serve fotos do armazenamento em memória (desenvolvimento) por token assinado e de curta duração. */
dataRouter.get("/api/files/:token", async (c) => {
  const storage = getStorage(c);
  if (!storage.read) throw new ApiError(404, "not_found", "Arquivo não encontrado.");
  const path = await decodeFileToken(c.req.param("token"), c.get("cfg"));
  const file = path ? await storage.read(path) : null;
  if (!file) throw new ApiError(404, "not_found", "Arquivo não encontrado.");
  return new Response(file.data, { headers: { "Content-Type": file.contentType, "Cache-Control": "private, max-age=3000" } });
});
