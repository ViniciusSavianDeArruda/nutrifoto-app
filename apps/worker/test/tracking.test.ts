import { beforeAll, describe, expect, it } from "vitest";
import { setup } from "./helpers";

type T = Awaited<ReturnType<typeof setup>>;

describe("water", () => {
  let t: T;
  let token: string;

  beforeAll(async () => {
    t = await setup();
    token = await t.register();
  });

  it("adiciona, lista e deleta registro de água", async () => {
    const cr = await t.json("/api/water", "POST", { ml: 300, logged_at: "2000-06-15T10:00:00.000Z" }, token);
    expect(cr.status).toBe(201);
    const entry = (await cr.json()) as any;
    expect(entry.ml).toBe(300);
    expect(entry.id).toBeDefined();

    const ls = (await (await t.req("/api/water?day=2000-06-15&tz=0", { token })).json()) as any;
    expect(ls.total_ml).toBeGreaterThanOrEqual(300);
    expect(ls.entries.some((e: any) => e.id === entry.id)).toBe(true);

    expect((await t.req(`/api/water/${entry.id}`, { method: "DELETE", token })).status).toBe(204);
  });

  it("soma múltiplas entradas no total_ml", async () => {
    const day = "2000-07-01";
    await t.json("/api/water", "POST", { ml: 200, logged_at: `${day}T08:00:00.000Z` }, token);
    await t.json("/api/water", "POST", { ml: 350, logged_at: `${day}T12:00:00.000Z` }, token);
    const j = (await (await t.req(`/api/water?day=${day}&tz=0`, { token })).json()) as any;
    expect(j.total_ml).toBe(550);
    expect(j.entries).toHaveLength(2);
  });

  it("delete retorna 404 para id inexistente", async () => {
    expect((await t.req("/api/water/99999", { method: "DELETE", token })).status).toBe(404);
  });

  it("rejeita ml inválido", async () => {
    expect((await t.json("/api/water", "POST", { ml: 0 }, token)).status).toBe(422);
    expect((await t.json("/api/water", "POST", { ml: -100 }, token)).status).toBe(422);
    expect((await t.json("/api/water", "POST", { ml: 6000 }, token)).status).toBe(422);
  });

  it("exige autenticação", async () => {
    expect((await t.req("/api/water")).status).toBe(401);
  });
});

describe("weight", () => {
  let t: T;
  let token: string;

  beforeAll(async () => {
    t = await setup();
    token = await t.register();
  });

  it("registra e lista peso", async () => {
    const r = await t.json("/api/weight", "PUT", { day: "2025-06-15", kg: 72.5 }, token);
    expect(r.status).toBe(200);
    const entry = (await r.json()) as any;
    expect(entry.day).toBe("2025-06-15");
    expect(entry.kg).toBe(72.5);

    const rows = (await (await t.req("/api/weight?days=730&tz=0", { token })).json()) as any[];
    expect(rows.some((w: any) => w.day === "2025-06-15")).toBe(true);
  });

  it("PUT sobrescreve peso do mesmo dia (upsert)", async () => {
    await t.json("/api/weight", "PUT", { day: "2025-07-01", kg: 72.5 }, token);
    await t.json("/api/weight", "PUT", { day: "2025-07-01", kg: 73.0 }, token);
    const rows = (await (await t.req("/api/weight?days=730&tz=0", { token })).json()) as any[];
    const entry = rows.find((w: any) => w.day === "2025-07-01");
    expect(entry?.kg).toBe(73.0);
  });

  it("deleta peso por dia", async () => {
    await t.json("/api/weight", "PUT", { day: "2025-08-01", kg: 72.5 }, token);
    expect((await t.req("/api/weight/2025-08-01", { method: "DELETE", token })).status).toBe(204);
    const rows = (await (await t.req("/api/weight?days=730&tz=0", { token })).json()) as any[];
    expect(rows.find((w: any) => w.day === "2025-08-01")).toBeUndefined();
  });

  it("delete retorna 404 para dia sem registro", async () => {
    expect((await t.req("/api/weight/1999-01-01", { method: "DELETE", token })).status).toBe(404);
  });

  it("rejeita data inválida no PUT", async () => {
    expect((await t.json("/api/weight", "PUT", { day: "nao-e-data", kg: 70 }, token)).status).toBe(422);
  });

  it("exige autenticação", async () => {
    expect((await t.req("/api/weight")).status).toBe(401);
  });
});
