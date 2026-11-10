import { beforeAll, describe, expect, it } from "vitest";
import { setup } from "./helpers";

type T = Awaited<ReturnType<typeof setup>>;

const item = (o = {}) => ({ name: "Arroz", grams: 100, kcal: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, fiber_g: 0.4, confidence: "alta", ...o });
const postMeal = (t: T, token: string, payload: object) =>
  t.req("/api/meals", { method: "POST", token, body: t.form({ payload: JSON.stringify(payload) }) });

describe("stats /day", () => {
  let t: T;
  let token: string;

  beforeAll(async () => {
    t = await setup();
    token = await t.register();
  });

  it("retorna zeros para o dia sem refeições", async () => {
    const r = await t.req("/api/stats/day?tz=0&day=2000-01-01", { token });
    expect(r.status).toBe(200);
    const j = (await r.json()) as any;
    expect(j.day).toBe("2000-01-01");
    expect(j.totals.kcal).toBe(0);
    expect(j.meals_count).toBe(0);
    expect(j.water_ml).toBe(0);
  });

  it("soma totais das refeições do dia", async () => {
    const eatenAt = "2000-03-01T12:00:00.000Z";
    await postMeal(t, token, { meal_type: "almoco", items: [item()], eaten_at: eatenAt });
    await postMeal(t, token, { meal_type: "lanche", items: [item()], eaten_at: eatenAt });
    const r = await t.req("/api/stats/day?tz=0&day=2000-03-01", { token });
    expect(r.status).toBe(200);
    const j = (await r.json()) as any;
    expect(j.meals_count).toBe(2);
    expect(j.totals.kcal).toBeGreaterThan(0);
  });

  it("inclui água do dia", async () => {
    const day = "2000-04-01";
    await t.json("/api/water", "POST", { ml: 300, logged_at: `${day}T10:00:00.000Z` }, token);
    await t.json("/api/water", "POST", { ml: 200, logged_at: `${day}T14:00:00.000Z` }, token);
    const r = await t.req(`/api/stats/day?tz=0&day=${day}`, { token });
    expect(r.status).toBe(200);
    const j = (await r.json()) as any;
    expect(j.water_ml).toBe(500);
  });

  it("retorna 422 para data inválida", async () => {
    const r = await t.req("/api/stats/day?day=nao-e-data", { token });
    expect(r.status).toBe(422);
  });

  it("exige autenticação", async () => {
    expect((await t.req("/api/stats/day")).status).toBe(401);
  });
});

describe("stats /range", () => {
  let t: T;
  let token: string;

  beforeAll(async () => {
    t = await setup();
    token = await t.register();
  });

  it("retorna série com zeros para usuário sem dados", async () => {
    const r = await t.req("/api/stats/range?days=7&tz=0&end=2000-01-07", { token });
    expect(r.status).toBe(200);
    const j = (await r.json()) as any;
    expect(j.daily).toHaveLength(7);
    expect(j.logged_days).toBe(0);
    expect(j.averages.kcal).toBe(0);
    expect(j.streak_days).toBe(0);
  });

  it("retorna 422 para período fora do range 1–90", async () => {
    expect((await t.req("/api/stats/range?days=0", { token })).status).toBe(422);
    expect((await t.req("/api/stats/range?days=91", { token })).status).toBe(422);
  });

  it("calcula médias e logged_days corretamente", async () => {
    await t.req("/api/meals", {
      method: "POST", token,
      body: t.form({ payload: JSON.stringify({ meal_type: "almoco", items: [item()], eaten_at: "2000-06-10T12:00:00.000Z" }) }),
    });
    const r = await t.req("/api/stats/range?days=7&tz=0&end=2000-06-16", { token });
    expect(r.status).toBe(200);
    const j = (await r.json()) as any;
    expect(j.logged_days).toBe(1);
    expect(j.averages.kcal).toBeGreaterThan(0);
    expect(j.summary).toContain("1 dia");
  });

  it("exige autenticação", async () => {
    expect((await t.req("/api/stats/range")).status).toBe(401);
  });
});
