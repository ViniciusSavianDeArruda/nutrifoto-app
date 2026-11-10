import { beforeAll, describe, expect, it } from "vitest";
import { setup } from "./helpers";

type T = Awaited<ReturnType<typeof setup>>;

const item = (o = {}) => ({ name: "Frango", grams: 150, kcal: 220, protein_g: 35, carbs_g: 0, fat_g: 8, fiber_g: 0, confidence: "alta", ...o });
const postMeal = (t: T, token: string, payload: object) =>
  t.req("/api/meals", { method: "POST", token, body: t.form({ payload: JSON.stringify(payload) }) });

describe("favorites CRUD", () => {
  let t: T;
  let token: string;

  beforeAll(async () => {
    t = await setup();
    token = await t.register();
  });

  it("cria, lista e deleta um favorito", async () => {
    const cr = await t.json("/api/favorites", "POST", { name: "Frango grelhado", items: [item()] }, token);
    expect(cr.status).toBe(201);
    const fav = (await cr.json()) as any;
    expect(fav.name).toBe("Frango grelhado");
    expect(fav.items).toHaveLength(1);
    expect(fav.totals.kcal).toBeGreaterThan(0);

    const ls = (await (await t.req("/api/favorites", { token })).json()) as any[];
    expect(ls.some((f: any) => f.id === fav.id)).toBe(true);

    expect((await t.req(`/api/favorites/${fav.id}`, { method: "DELETE", token })).status).toBe(204);
  });

  it("cria favorito a partir de uma refeição existente", async () => {
    const mr = await postMeal(t, token, { meal_type: "almoco", items: [item()] });
    const meal = (await mr.json()) as any;

    const cr = await t.json("/api/favorites", "POST", { name: "Do almoço", from_meal_id: meal.id }, token);
    expect(cr.status).toBe(201);
    const fav = (await cr.json()) as any;
    expect(fav.meal_type).toBe("almoco");
  });

  it("rejeita favorito sem itens", async () => {
    const r = await t.json("/api/favorites", "POST", { name: "Vazio", items: [] }, token);
    expect(r.status).toBe(422);
  });

  it("delete retorna 404 para id inexistente", async () => {
    expect((await t.req("/api/favorites/99999", { method: "DELETE", token })).status).toBe(404);
  });

  it("não vê favoritos de outro usuário", async () => {
    const tokenB = await t.register();
    const cr = await t.json("/api/favorites", "POST", { name: "Privado", items: [item()] }, token);
    const fav = (await cr.json()) as any;

    const ls = (await (await t.req("/api/favorites", { token: tokenB })).json()) as any[];
    expect(ls.some((f: any) => f.id === fav.id)).toBe(false);

    expect((await t.req(`/api/favorites/${fav.id}`, { method: "DELETE", token: tokenB })).status).toBe(404);
  });

  it("exige autenticação", async () => {
    expect((await t.req("/api/favorites")).status).toBe(401);
  });
});

describe("favorites /log", () => {
  let t: T;
  let token: string;

  beforeAll(async () => {
    t = await setup();
    token = await t.register();
  });

  it("registra favorito como refeição", async () => {
    const cr = await t.json("/api/favorites", "POST", { name: "Favorito log", items: [item()] }, token);
    const fav = (await cr.json()) as any;

    const lr = await t.json(`/api/favorites/${fav.id}/log`, "POST", {}, token);
    expect(lr.status).toBe(201);
    const meal = (await lr.json()) as any;
    expect(meal.ai_status).toBe("favorite");
    expect(meal.items).toHaveLength(1);
    expect(meal.totals.kcal).toBeGreaterThan(0);
  });

  it("aplica escala ao registrar", async () => {
    const cr = await t.json("/api/favorites", "POST", { name: "Escalável", items: [item({ kcal: 100 })] }, token);
    const fav = (await cr.json()) as any;

    const lr = await t.json(`/api/favorites/${fav.id}/log`, "POST", { scale: 2 }, token);
    expect(lr.status).toBe(201);
    const meal = (await lr.json()) as any;
    expect(meal.totals.kcal).toBeCloseTo(200, 0);
  });

  it("log de favorito inexistente retorna 404", async () => {
    expect((await t.json("/api/favorites/99999/log", "POST", {}, token)).status).toBe(404);
  });
});
