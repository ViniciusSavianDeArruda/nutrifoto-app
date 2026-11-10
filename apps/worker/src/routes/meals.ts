import { and, desc, eq, exists, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { ApiError } from "../errors";
import { checkRate } from "../limiter";
import {
  aiUsedToday, attachItems, getProvider, getStorage, insertMealRow, intParam, itemRows, loadMeal, mealOut, mealSummaries,
  readImage, readJson, registerAiUse, toItemIn, totalColumns, type AppEnv, type Ctx, type Img,
} from "../lib";
import { requireUser } from "../middleware";
import { scaleItems, sumTotals } from "../nutrition";
import { mealItems, meals } from "../schema";
import { analyzeTextIn, mealCreate, mealDuplicateIn, mealUpdate, MEAL_TYPES, type ItemIn } from "../schemas";
import { isDay, localDayBounds } from "../time";

export const mealsRouter = new Hono<AppEnv>();
mealsRouter.use("*", requireUser);

async function checkDailyLimit(c: Ctx) {
  if ((await aiUsedToday(c.get("db"), c.get("user").id, c.get("cfg"))) >= c.get("cfg").dailyAiLimit) {
    throw new ApiError(429, "daily_limit", "Você atingiu o limite diário de análises. Registre por texto ou salve sem análise.");
  }
}

async function analyzeResponse(c: Ctx, result: { items: ItemIn[]; notes?: string | null }, providerName: string) {
  const used = await registerAiUse(c.get("db"), c.get("user").id, c.get("cfg"));
  return c.json({
    items: result.items, notes: result.notes ?? null, totals: sumTotals(result.items),
    provider: providerName, ai_used_today: used, ai_limit: c.get("cfg").dailyAiLimit,
  });
}

const tooMany = () => new ApiError(429, "rate_limited", "Muitas tentativas. Aguarde um instante e tente de novo.");

/** Analisa a foto SEM salvar nada. A refeição só é criada depois, quando a pessoa confirma. */
mealsRouter.post("/analyze", async (c) => {
  if (!checkRate(`analyze:${c.get("user").id}`, 8, 60)) throw tooMany();
  await checkDailyLimit(c);
  const form = await c.req.parseBody();
  const img = await readImage(form["file"], c);
  const provider = getProvider(c);
  const result = await provider.analisarImagem(img.bytes, img.mime);
  return analyzeResponse(c, result, provider.name);
});

/** Estima uma refeição descrita em texto, ou corrige a lista atual quando current_items é enviado. */
mealsRouter.post("/analyze-text", async (c) => {
  if (!checkRate(`analyze:${c.get("user").id}`, 8, 60)) throw tooMany();
  const body = await readJson(c, analyzeTextIn);
  await checkDailyLimit(c);
  const provider = getProvider(c);
  const result = await provider.analisarTexto(body.text, body.current_items);
  return analyzeResponse(c, result, provider.name);
});

mealsRouter.post("/", async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const storage = getStorage(c);
  const form = await c.req.parseBody();
  if (typeof form["payload"] !== "string") throw new ApiError(422, "invalid_payload", "Dados da refeição inválidos.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(form["payload"]);
  } catch {
    throw new ApiError(422, "invalid_payload", "Dados da refeição inválidos.");
  }
  const body = mealCreate.parse(parsed);

  let photoPath: string | null = null;
  let thumbPath: string | null = null;
  let photoBytes = 0;
  const uploaded: string[] = [];
  if (form["photo"] && typeof form["photo"] !== "string") {
    const main = await readImage(form["photo"], c);
    const thumb = form["thumb"] && typeof form["thumb"] !== "string" ? await readImage(form["thumb"], c) : null;
    const base = `${user.id}/${crypto.randomUUID().replaceAll("-", "")}`;
    photoPath = `${base}.${main.ext}`;
    thumbPath = thumb ? `${base}_thumb.${thumb.ext}` : photoPath; // sem miniatura própria, a foto serve de miniatura
    try {
      await storage.save(photoPath, main.bytes, main.mime);
      uploaded.push(photoPath);
      if (thumb) {
        await storage.save(thumbPath, thumb.bytes, thumb.mime);
        uploaded.push(thumbPath);
      }
    } catch {
      await storage.delete(uploaded).catch(() => {});
      throw new ApiError(502, "storage_error", "Não consegui guardar a foto agora. Tente de novo.");
    }
    photoBytes = main.bytes.length + (thumb?.bytes.length ?? 0);
  }

  try {
    const row = await insertMealRow(db, {
      userId: user.id, eatenAt: body.eaten_at ?? new Date(), mealType: body.meal_type, notes: body.notes ?? null,
      aiStatus: body.ai_status, aiProvider: body.ai_provider ?? null, photoPath, thumbPath, photoBytes,
      ...totalColumns(body.items),
    }, body.items);
    return c.json(await mealOut((await attachItems(db, [row]))[0]!, storage), 201);
  } catch (e) {
    await storage.delete(uploaded).catch(() => {});
    throw e;
  }
});

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

mealsRouter.get("/", async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const tz = intParam(c.req.query("tz"), 0);
  const from = c.req.query("date_from");
  const to = c.req.query("date_to");
  const type = c.req.query("type");
  const q = c.req.query("q")?.trim();
  if ((from && !isDay(from)) || (to && !isDay(to))) throw new ApiError(422, "invalid_date", "Data inválida.");
  if (type && !(MEAL_TYPES as readonly string[]).includes(type)) throw new ApiError(422, "invalid_type", "Tipo de refeição inválido.");

  const conds: (SQL | undefined)[] = [eq(meals.userId, user.id)];
  if (from) conds.push(gte(meals.eatenAt, localDayBounds(from, tz)[0]));
  if (to) conds.push(lt(meals.eatenAt, localDayBounds(to, tz)[1]));
  if (type) conds.push(eq(meals.mealType, type));
  if (q) {
    const like = `%${escapeLike(q)}%`;
    conds.push(
      or(
        ilike(meals.notes, like),
        exists(db.select({ x: sql`1` }).from(mealItems).where(and(eq(mealItems.mealId, meals.id), ilike(mealItems.name, like)))),
      ),
    );
  }
  const limit = Math.max(1, Math.min(intParam(c.req.query("limit"), 50), 200));
  const offset = Math.max(0, intParam(c.req.query("offset"), 0));
  const rows = await db.select().from(meals).where(and(...conds)).orderBy(desc(meals.eatenAt), desc(meals.id)).limit(limit).offset(offset);
  return c.json(await mealSummaries(await attachItems(db, rows), getStorage(c)));
});

const idParam = (c: Ctx) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) throw new ApiError(404, "not_found", "Refeição não encontrada.");
  return id;
};

mealsRouter.get("/:id", async (c) => c.json(await mealOut(await loadMeal(c.get("db"), c.get("user").id, idParam(c)), getStorage(c))));

mealsRouter.put("/:id", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = idParam(c);
  const body = await readJson(c, mealUpdate);
  const { meal } = await loadMeal(db, user.id, id);
  const set: Partial<typeof meals.$inferInsert> = {};
  if (body.eaten_at) set.eatenAt = body.eaten_at;
  if (body.meal_type) set.mealType = body.meal_type;
  if ("notes" in body) set.notes = body.notes ?? null;
  if (body.items) {
    Object.assign(set, totalColumns(body.items));
    if (meal.aiStatus === "skipped" || meal.aiStatus === "failed") set.aiStatus = "manual";
  }
  await db.transaction(async (tx) => {
    if (Object.keys(set).length) await tx.update(meals).set(set).where(eq(meals.id, id));
    if (body.items) {
      await tx.delete(mealItems).where(eq(mealItems.mealId, id));
      if (body.items.length) await tx.insert(mealItems).values(itemRows(body.items).map((r) => ({ ...r, mealId: id })));
    }
  });
  return c.json(await mealOut(await loadMeal(db, user.id, id), getStorage(c)));
});

mealsRouter.delete("/:id", async (c) => {
  const db = c.get("db");
  const { meal } = await loadMeal(db, c.get("user").id, idParam(c));
  const paths = [...new Set([meal.photoPath, meal.thumbPath].filter((p): p is string => !!p))];
  await db.delete(meals).where(eq(meals.id, meal.id));
  try {
    await getStorage(c).delete(paths);
  } catch {
    // a refeição já foi apagada; uma foto órfã não pode quebrar a resposta
  }
  return c.body(null, 204);
});

/** Copia uma refeição (sem a foto, para não gastar armazenamento), com porção opcionalmente escalada. */
mealsRouter.post("/:id/duplicate", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const body = await readJson(c, mealDuplicateIn, true);
  const src = await loadMeal(db, user.id, idParam(c));
  let items = src.items.map(toItemIn);
  if (body.scale !== 1) items = scaleItems(items, body.scale);
  const row = await insertMealRow(db, {
    userId: user.id, eatenAt: body.eaten_at ?? new Date(), mealType: src.meal.mealType, notes: src.meal.notes,
    aiStatus: "manual", ...totalColumns(items),
  }, items);
  return c.json(await mealOut((await attachItems(db, [row]))[0]!, getStorage(c)), 201);
});
