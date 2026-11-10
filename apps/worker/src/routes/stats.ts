import { and, eq, gte, lt } from "drizzle-orm";
import { Hono } from "hono";
import { ApiError } from "../errors";
import { goalsOf, intParam, type AppEnv } from "../lib";
import { requireUser } from "../middleware";
import { round1 } from "../nutrition";
import { meals, waterLogs } from "../schema";
import { addDays, isDay, localDate, localDayBounds, localHour, localToday } from "../time";

export const statsRouter = new Hono<AppEnv>();
statsRouter.use("*", requireUser);

/** Resumo de um dia: totais, metas e água. Padrão: hoje no fuso do cliente. */
statsRouter.get("/day", async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const tz = intParam(c.req.query("tz"), 0);
  const dayQ = c.req.query("day");
  if (dayQ && !isDay(dayQ)) throw new ApiError(422, "invalid_date", "Data inválida.");
  const day = dayQ ?? localToday(tz);
  const [start, end] = localDayBounds(day, tz);
  const rows = await db.select().from(meals).where(and(eq(meals.userId, user.id), gte(meals.eatenAt, start), lt(meals.eatenAt, end)));
  const water = await db.select({ ml: waterLogs.ml }).from(waterLogs).where(and(eq(waterLogs.userId, user.id), gte(waterLogs.loggedAt, start), lt(waterLogs.loggedAt, end)));
  const sum = (f: (m: (typeof rows)[number]) => number) => round1(rows.reduce((a, m) => a + f(m), 0));
  return c.json({
    day,
    totals: { kcal: sum((m) => m.totalKcal), protein_g: sum((m) => m.totalProteinG), carbs_g: sum((m) => m.totalCarbsG), fat_g: sum((m) => m.totalFatG), fiber_g: sum((m) => m.totalFiberG) },
    goals: goalsOf(user),
    meals_count: rows.length,
    water_ml: water.reduce((a, w) => a + w.ml, 0),
  });
});

function streak(days: Set<string>, today: string): number {
  // Se hoje ainda não tem registro, a sequência continua contando a partir de ontem.
  let cursor = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

/** Série diária, médias, divisão de macros, horários das refeições, sequência e resumo em texto. */
statsRouter.get("/range", async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const tz = intParam(c.req.query("tz"), 0);
  const days = intParam(c.req.query("days"), 7);
  if (days < 1 || days > 90) throw new ApiError(422, "invalid_days", "O período vai de 1 a 90 dias.");
  const endQ = c.req.query("end");
  if (endQ && !isDay(endQ)) throw new ApiError(422, "invalid_date", "Data inválida.");
  const endDay = endQ ?? localToday(tz);
  const firstDay = addDays(endDay, -(days - 1));
  const rows = await db
    .select()
    .from(meals)
    .where(and(eq(meals.userId, user.id), gte(meals.eatenAt, localDayBounds(firstDay, tz)[0]), lt(meals.eatenAt, localDayBounds(endDay, tz)[1])));

  type Row = { kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; meals: number };
  const series = new Map<string, Row>();
  for (let i = 0; i < days; i++) series.set(addDays(firstDay, i), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, meals: 0 });
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, meals: 0, kcal: 0 }));
  for (const m of rows) {
    const row = series.get(localDate(m.eatenAt, tz));
    if (!row) continue;
    row.kcal += m.totalKcal;
    row.protein_g += m.totalProteinG;
    row.carbs_g += m.totalCarbsG;
    row.fat_g += m.totalFatG;
    row.fiber_g += m.totalFiberG;
    row.meals += 1;
    const h = hours[localHour(m.eatenAt, tz)]!;
    h.meals += 1;
    h.kcal += m.totalKcal;
  }
  const daily = [...series].map(([date, r]) => ({
    date, kcal: round1(r.kcal), protein_g: round1(r.protein_g), carbs_g: round1(r.carbs_g), fat_g: round1(r.fat_g), fiber_g: round1(r.fiber_g), meals: r.meals,
  }));
  const logged = daily.filter((r) => r.meals > 0);
  const n = logged.length;
  const avg = (k: "kcal" | "protein_g" | "carbs_g" | "fat_g" | "fiber_g") => (n ? round1(logged.reduce((a, r) => a + r[k], 0) / n) : 0);

  const pK = logged.reduce((a, r) => a + r.protein_g, 0) * 4;
  const cK = logged.reduce((a, r) => a + r.carbs_g, 0) * 4;
  const fK = logged.reduce((a, r) => a + r.fat_g, 0) * 9;
  const total = pK + cK + fK;
  const pct = (v: number) => (total ? round1((v * 100) / total) : 0);

  // Sequência: olha até 120 dias para trás.
  const today = localToday(tz);
  const back = await db.select({ at: meals.eatenAt }).from(meals).where(and(eq(meals.userId, user.id), gte(meals.eatenAt, localDayBounds(addDays(today, -120), tz)[0])));
  const streakDays = streak(new Set(back.map((m) => localDate(m.at, tz))), today);

  const goal = user.dailyKcalGoal;
  let summary: string;
  if (n) {
    const hi = logged.reduce((a, b) => (b.kcal > a.kcal ? b : a));
    const lo = logged.reduce((a, b) => (b.kcal < a.kcal ? b : a));
    summary =
      `Nos últimos ${days} dias você registrou refeições em ${n} dia${n !== 1 ? "s" : ""}. ` +
      `A média nos dias registrados foi de ${Math.round(avg("kcal"))} kcal, ` +
      `cerca de ${goal ? Math.round((avg("kcal") * 100) / goal) : 0}% da sua meta. ` +
      `Proteína média: ${Math.round(avg("protein_g"))} g por dia.`;
    if (n > 1) summary += ` O dia mais alto foi ${hi.date} (${Math.round(hi.kcal)} kcal) e o mais leve ${lo.date} (${Math.round(lo.kcal)} kcal).`;
  } else {
    summary = `Ainda não há refeições registradas nos últimos ${days} dias.`;
  }

  return c.json({
    days, daily, goals: goalsOf(user),
    averages: { kcal: avg("kcal"), protein_g: avg("protein_g"), carbs_g: avg("carbs_g"), fat_g: avg("fat_g"), fiber_g: avg("fiber_g") },
    logged_days: n,
    macro_split: { protein_pct: pct(pK), carbs_pct: pct(cK), fat_pct: pct(fK) },
    hours: hours.map((h) => ({ hour: h.hour, meals: h.meals, kcal: round1(h.kcal) })),
    streak_days: streakDays,
    summary,
  });
});
