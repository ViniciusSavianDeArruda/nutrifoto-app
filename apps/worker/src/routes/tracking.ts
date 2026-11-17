import { and, asc, eq, gte, lt } from "drizzle-orm";
import { Hono } from "hono";
import { ApiError } from "../errors";
import { intParam, readJson, type AppEnv } from "../lib";
import { requireUser } from "../middleware";
import { waterLogs, weightLogs } from "../schema";
import { waterIn, weightIn } from "../schemas";
import { addDays, isDay, localDayBounds, localToday } from "../time";

export const waterRouter = new Hono<AppEnv>();
export const weightRouter = new Hono<AppEnv>();
waterRouter.use("*", requireUser);
weightRouter.use("*", requireUser);

const waterOut = (w: typeof waterLogs.$inferSelect) => ({ id: w.id, logged_at: w.loggedAt.toISOString(), ml: w.ml });

waterRouter.get("/", async (c) => {
  const user = c.get("user");
  const tz = intParam(c.req.query("tz"), 0);
  const dayQ = c.req.query("day");
  if (dayQ && !isDay(dayQ)) throw new ApiError(422, "invalid_date", "Data inválida.");
  const [start, end] = localDayBounds(dayQ ?? localToday(tz), tz);
  const entries = await c.get("db").select().from(waterLogs)
    .where(and(eq(waterLogs.userId, user.id), gte(waterLogs.loggedAt, start), lt(waterLogs.loggedAt, end)))
    .orderBy(asc(waterLogs.loggedAt), asc(waterLogs.id));
  return c.json({ total_ml: entries.reduce((a, e) => a + e.ml, 0), goal_ml: user.waterGoalMl, entries: entries.map(waterOut) });
});

waterRouter.post("/", async (c) => {
  const body = await readJson(c, waterIn);
  const [row] = await c.get("db").insert(waterLogs).values({ userId: c.get("user").id, ml: body.ml, loggedAt: body.logged_at ?? new Date() }).returning();
  return c.json(waterOut(row!), 201);
});

waterRouter.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const gone = Number.isInteger(id)
    ? await c.get("db").delete(waterLogs).where(and(eq(waterLogs.id, id), eq(waterLogs.userId, c.get("user").id))).returning({ id: waterLogs.id })
    : [];
  if (!gone.length) throw new ApiError(404, "not_found", "Registro de água não encontrado.");
  return c.body(null, 204);
});

weightRouter.get("/", async (c) => {
  const tz = intParam(c.req.query("tz"), 0);
  const days = Math.max(1, Math.min(intParam(c.req.query("days"), 90), 730));
  const since = addDays(localToday(tz), -days);
  const rows = await c.get("db").select({ day: weightLogs.day, kg: weightLogs.kg }).from(weightLogs)
    .where(and(eq(weightLogs.userId, c.get("user").id), gte(weightLogs.day, since)))
    .orderBy(asc(weightLogs.day));
  return c.json(rows);
});

weightRouter.put("/", async (c) => {
  const body = await readJson(c, weightIn);
  if (!isDay(body.day)) throw new ApiError(422, "invalid_date", "Data inválida.");
  const [row] = await c.get("db").insert(weightLogs).values({ userId: c.get("user").id, day: body.day, kg: body.kg })
    .onConflictDoUpdate({ target: [weightLogs.userId, weightLogs.day], set: { kg: body.kg } })
    .returning({ day: weightLogs.day, kg: weightLogs.kg });
  return c.json(row!);
});

weightRouter.delete("/:day", async (c) => {
  const day = c.req.param("day");
  const gone = isDay(day)
    ? await c.get("db").delete(weightLogs).where(and(eq(weightLogs.userId, c.get("user").id), eq(weightLogs.day, day))).returning({ id: weightLogs.id })
    : [];
  if (!gone.length) throw new ApiError(404, "not_found", "Peso não encontrado nesse dia.");
  return c.body(null, 204);
});
