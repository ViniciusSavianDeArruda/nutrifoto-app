import { beforeAll, describe, expect, it } from "vitest";
import { setup } from "./helpers";

type T = Awaited<ReturnType<typeof setup>>;

const item = (o = {}) => ({ name: "Arroz", grams: 100, kcal: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, fiber_g: 0.4, confidence: "alta", ...o });
const postMeal = (t: T, token: string, payload: object) =>
  t.req("/api/meals", { method: "POST", token, body: t.form({ payload: JSON.stringify(payload) }) });

describe("/api/usage", () => {
  let t: T;
  let token: string;

  beforeAll(async () => {
    t = await setup();
    token = await t.register();
  });

  it("retorna zeros para conta nova", async () => {
    const r = await t.req("/api/usage", { token });
    expect(r.status).toBe(200);
    const j = (await r.json()) as any;
    expect(j.ai_used_today).toBe(0);
    expect(j.ai_limit).toBeGreaterThan(0);
    expect(j.photo_bytes_used).toBe(0);
    expect(j.meals_count).toBe(0);
  });

  it("conta refeições após criar", async () => {
    await postMeal(t, token, { meal_type: "almoco", items: [item()] });
    const j = (await (await t.req("/api/usage", { token })).json()) as any;
    expect(j.meals_count).toBe(1);
  });

  it("exige autenticação", async () => {
    expect((await t.req("/api/usage")).status).toBe(401);
  });
});

describe("/api/export", () => {
  let t: T;
  let token: string;
  let tokenB: string;

  beforeAll(async () => {
    t = await setup();
    token = await t.register();
    tokenB = await t.register();
    await postMeal(t, token, { meal_type: "almoco", items: [item()] });
    await t.json("/api/water", "POST", { ml: 250, logged_at: "2025-06-15T10:00:00.000Z" }, token);
    await t.json("/api/weight", "PUT", { day: "2025-06-15", kg: 70.0 }, token);
  });

  it("exporta JSON com estrutura esperada", async () => {
    const r = await t.req("/api/export?format=json", { token });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("application/json");
    expect(r.headers.get("content-disposition")).toContain("nutrifoto.json");

    const j = (await r.json()) as any;
    expect(j.user).toHaveProperty("email");
    expect(j.meals).toHaveLength(1);
    expect(j.meals[0].items).toHaveLength(1);
    expect(j.water).toHaveLength(1);
    expect(j.weight).toHaveLength(1);
    expect(j.note).toBeDefined();
  });

  it("exporta CSV com cabeçalho correto", async () => {
    const r = await t.req("/api/export?format=csv", { token });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/csv");
    expect(r.headers.get("content-disposition")).toContain("nutrifoto.csv");

    const text = await r.text();
    expect(text).toContain("data_hora_utc");
    expect(text).toContain("Arroz");
  });

  it("CSV sem refeições retorna só cabeçalho", async () => {
    const r = await t.req("/api/export?format=csv", { token: tokenB });
    expect(r.status).toBe(200);
    const lines = (await r.text()).trim().split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("data_hora_utc");
  });

  it("retorna 400 para format inválido", async () => {
    expect((await t.req("/api/export?format=xml", { token })).status).toBe(400);
  });

  it("exporta somente dados do próprio usuário", async () => {
    const j = (await (await t.req("/api/export?format=json", { token: tokenB })).json()) as any;
    expect(j.meals).toHaveLength(0);
  });

  it("exige autenticação", async () => {
    expect((await t.req("/api/export")).status).toBe(401);
  });
});
