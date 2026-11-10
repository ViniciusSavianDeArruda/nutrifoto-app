import { desc, eq, and } from "drizzle-orm";
import { Hono } from "hono";
import { ApiError } from "../errors";
import { attachItems, getStorage, insertMealRow, mealOut, readJson, toItemIn, totalColumns, type AppEnv } from "../lib";
import { requireUser } from "../middleware";
import { scaleItems, sumTotals } from "../nutrition";
import { favorites, mealItems, meals, type MealItemRow } from "../schema";
import { favoriteCreate, favoriteLogIn, itemIn, type ItemIn } from "../schemas";
import { z } from "zod";

export const favoritesRouter = new Hono<AppEnv>();
favoritesRouter.use("*", requireUser);

const parseItems = (json: string): ItemIn[] => z.array(itemIn).parse(JSON.parse(json));
const out = (f: typeof favorites.$inferSelect) => {
  const items = parseItems(f.itemsJson);
  return { id: f.id, name: f.name, meal_type: f.mealType, items, totals: sumTotals(items) };
};

const getFav = async (c: Parameters<typeof getStorage>[0], id: number) => {
  const [fav] = await c.get("db").select().from(favorites).where(and(eq(favorites.id, id), eq(favorites.userId, c.get("user").id))).limit(1);
  if (!fav) throw new ApiError(404, "not_found", "Favorito não encontrado.");
  return fav;
};
const favId = (c: Parameters<typeof getStorage>[0]) => {
  const n = Number(c.req.param("id"));
  if (!Number.isInteger(n)) throw new ApiError(404, "not_found", "Favorito não encontrado.");
  return n;
};

favoritesRouter.get("/", async (c) => {
  const rows = await c.get("db").select().from(favorites).where(eq(favorites.userId, c.get("user").id)).orderBy(desc(favorites.createdAt), desc(favorites.id));
  return c.json(rows.map(out));
});

favoritesRouter.post("/", async (c) => {
  const body = await readJson(c, favoriteCreate);
  const db = c.get("db");
  const user = c.get("user");
  let mealType: string | null = body.meal_type ?? null;
  let items: ItemIn[] | null | undefined = body.items;
  if (body.from_meal_id != null) {
    const [meal] = await db.select().from(meals).where(and(eq(meals.id, body.from_meal_id), eq(meals.userId, user.id))).limit(1);
    if (!meal) throw new ApiError(404, "not_found", "Refeição não encontrada.");
    const rows: MealItemRow[] = await db.select().from(mealItems).where(eq(mealItems.mealId, meal.id)).orderBy(mealItems.position, mealItems.id);
    items = rows.map(toItemIn);
    mealType ??= meal.mealType;
  }
  if (!items?.length) throw new ApiError(422, "no_items", "O favorito precisa ter pelo menos um alimento.");
  const [fav] = await db.insert(favorites).values({ userId: user.id, name: body.name.trim(), mealType, itemsJson: JSON.stringify(items) }).returning();
  return c.json(out(fav!), 201);
});

favoritesRouter.delete("/:id", async (c) => {
  const fav = await getFav(c, favId(c));
  await c.get("db").delete(favorites).where(eq(favorites.id, fav.id));
  return c.body(null, 204);
});

/** Registra o favorito como refeição em um toque. */
favoritesRouter.post("/:id/log", async (c) => {
  const body = await readJson(c, favoriteLogIn, true);
  const fav = await getFav(c, favId(c));
  const db = c.get("db");
  let items = parseItems(fav.itemsJson);
  if (body.scale !== 1) items = scaleItems(items, body.scale);
  const row = await insertMealRow(db, {
    userId: c.get("user").id, eatenAt: body.eaten_at ?? new Date(), mealType: body.meal_type ?? fav.mealType ?? "outro",
    aiStatus: "favorite", ...totalColumns(items),
  }, items);
  return c.json(await mealOut((await attachItems(db, [row]))[0]!, getStorage(c)), 201);
});
