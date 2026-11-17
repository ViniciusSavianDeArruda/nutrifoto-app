import { describe, expect, it } from "vitest";
import { GarbageProvider, JPEG, QuotaProvider, setup } from "./helpers";

const item = (o = {}) => ({ name: "Arroz", grams: 100, kcal: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, fiber_g: 0.4, confidence: "alta", ...o });
const meal = (o = {}) => ({ meal_type: "almoco", items: [item()], ...o });

describe("auth", () => {
  it("registra, faz login e lê /me", async () => {
    const t = await setup();
    const token = await t.register("a@x.com");
    expect((await (await t.req("/api/auth/me", { token })).json()) as any).toMatchObject({ email: "a@x.com" });
    const login = await t.json("/api/auth/login", "POST", { email: "A@x.com", password: "senha-forte-1" });
    expect(login.status).toBe(200);
    const bad = await t.json("/api/auth/login", "POST", { email: "a@x.com", password: "errada-errada" });
    expect(bad.status).toBe(401);
    expect(((await bad.json()) as any).detail.code).toBe("bad_credentials");
  });
  it("e-mail duplicado, cadastro fechado e validação", async () => {
    const t = await setup();
    await t.register("a@x.com");
    const dup = await t.json("/api/auth/register", "POST", { email: "a@x.com", password: "senha-forte-1", accept_terms: true });
    expect(dup.status).toBe(409);
    expect((await t.json("/api/auth/register", "POST", { email: "x", password: "1" })).status).toBe(422);
    const closed = await setup({ ALLOW_REGISTRATION: "false" });
    const r = await closed.json("/api/auth/register", "POST", { email: "b@x.com", password: "senha-forte-1", accept_terms: true });
    expect(r.status).toBe(403);
  });
  it("exige token e limita tentativas de login", async () => {
    const t = await setup();
    expect((await t.req("/api/meals")).status).toBe(401);
    let last = 0;
    for (let i = 0; i < 11; i++) last = (await t.json("/api/auth/login", "POST", { email: "a@x.com", password: "senha-forte-1" })).status;
    expect(last).toBe(429);
  });
  it("login com e-mail inexistente retorna 401 com a mesma mensagem que senha errada", async () => {
    const t = await setup();
    await t.register("real@x.com");
    const withUser = await t.json("/api/auth/login", "POST", { email: "real@x.com", password: "errada-errada" });
    const noUser = await t.json("/api/auth/login", "POST", { email: "naoexiste@x.com", password: "errada-errada" });
    expect(withUser.status).toBe(401);
    expect(noUser.status).toBe(401);
    const msgWith = ((await withUser.json()) as any).detail.message;
    const msgNo = ((await noUser.json()) as any).detail.message;
    expect(msgWith).toBe("E-mail ou senha incorretos.");
    expect(msgNo).toBe(msgWith);
  });
  it("apaga a conta com a senha", async () => {
    const t = await setup();
    const token = await t.register("a@x.com");
    expect((await t.json("/api/auth/me", "DELETE", { password: "errada-errada" }, token)).status).toBe(403);
    expect((await t.json("/api/auth/me", "DELETE", { password: "senha-forte-1" }, token)).status).toBe(204);
    expect((await t.req("/api/auth/me", { token })).status).toBe(401);
  });
});

describe("análise", () => {
  it("analisa imagem com o mock e conta o uso", async () => {
    const t = await setup();
    const token = await t.register();
    const r = await t.req("/api/meals/analyze", { method: "POST", token, body: t.form({ file: new Blob([JPEG], { type: "image/jpeg" }) }) });
    expect(r.status).toBe(200);
    const j = (await r.json()) as any;
    expect(j.items.length).toBe(4);
    expect(j.ai_used_today).toBe(1);
    expect(j.totals.kcal).toBeGreaterThan(400);
  });
  it("rejeita arquivo que não é imagem", async () => {
    const t = await setup();
    const token = await t.register();
    const r = await t.req("/api/meals/analyze", { method: "POST", token, body: t.form({ file: new Blob(["texto"], { type: "image/jpeg" }) }) });
    expect(r.status).toBe(400);
  });
  it("limite diário vira 429 daily_limit", async () => {
    const t = await setup({ DAILY_AI_LIMIT: "1" });
    const token = await t.register();
    expect((await t.json("/api/meals/analyze-text", "POST", { text: "arroz e feijão" }, token)).status).toBe(200);
    const r = await t.json("/api/meals/analyze-text", "POST", { text: "pão" }, token);
    expect(r.status).toBe(429);
    expect(((await r.json()) as any).detail.code).toBe("daily_limit");
  });
  it("cota do provedor vira 429 ai_quota e não consome o limite", async () => {
    const t = await setup({}, () => new QuotaProvider());
    const token = await t.register();
    const r = await t.json("/api/meals/analyze-text", "POST", { text: "arroz" }, token);
    expect(r.status).toBe(429);
    expect(((await r.json()) as any).detail.code).toBe("ai_quota");
    const usage = (await (await t.req("/api/usage", { token })).json()) as any;
    expect(usage.ai_used_today).toBe(0);
  }, 20000);
  it("resposta inválida da IA vira 502", async () => {
    const t = await setup({}, () => new GarbageProvider());
    const token = await t.register();
    const r = await t.json("/api/meals/analyze-text", "POST", { text: "arroz" }, token);
    expect(r.status).toBe(502);
  }, 20000);
  it("texto novo e correção", async () => {
    const t = await setup();
    const token = await t.register();
    const a = (await (await t.json("/api/meals/analyze-text", "POST", { text: "arroz, feijão e ovo" }, token)).json()) as any;
    expect(a.items.length).toBe(3);
    const b = (await (await t.json("/api/meals/analyze-text", "POST", { text: "era integral", current_items: a.items }, token)).json()) as any;
    expect(b.items[0].name).toBe("Era integral");
  });
});

describe("refeições", () => {
  it("salva sem análise, lista, filtra, atualiza e apaga", async () => {
    const t = await setup();
    const token = await t.register();
    const c = await t.req("/api/meals", { method: "POST", token, body: t.form({ payload: JSON.stringify(meal()) }) });
    expect(c.status).toBe(201);
    const m = (await c.json()) as any;
    expect(m.total_kcal ?? m.totals?.kcal).toBe(130);
    await t.req("/api/meals", { method: "POST", token, body: t.form({ payload: JSON.stringify(meal({ meal_type: "jantar", items: [item({ name: "Sopa", kcal: 90 })] })) }) });

    const all = (await (await t.req("/api/meals", { token })).json()) as any;
    expect((all.items ?? all).length).toBe(2);
    const byType = (await (await t.req("/api/meals?type=jantar", { token })).json()) as any;
    expect((byType.items ?? byType).length).toBe(1);
    const byQ = (await (await t.req("/api/meals?q=sopa", { token })).json()) as any;
    expect((byQ.items ?? byQ).length).toBe(1);

    const up = await t.json(`/api/meals/${m.id}`, "PUT", { items: [item({ grams: 200, kcal: 260 })] }, token);
    expect(up.status).toBe(200);
    const upj = (await up.json()) as any;
    expect(upj.total_kcal ?? upj.totals?.kcal).toBe(260);

    expect((await t.req(`/api/meals/${m.id}`, { method: "DELETE", token })).status).toBe(204);
    expect((await t.req(`/api/meals/${m.id}`, { token })).status).toBe(404);
  });
  it("guarda foto e miniatura, serve por /api/files e apaga ao excluir", async () => {
    const t = await setup();
    const token = await t.register();
    const blob = new Blob([JPEG], { type: "image/jpeg" });
    const c = await t.req("/api/meals", { method: "POST", token, body: t.form({ payload: JSON.stringify(meal()), photo: blob, thumb: blob }) });
    expect(c.status).toBe(201);
    const m = (await c.json()) as any;
    expect(t.getStorage()!.files.size).toBe(2);
    const url = new URL(m.photo_url);
    const f = await t.req(url.pathname);
    expect(f.status).toBe(200);
    expect(new Uint8Array(await f.arrayBuffer())).toEqual(JPEG);
    expect((await t.req("/api/files/token-falso")).status).toBe(404);
    await t.req(`/api/meals/${m.id}`, { method: "DELETE", token });
    expect(t.getStorage()!.files.size).toBe(0);
  });
  it("sem miniatura, a foto serve de miniatura", async () => {
    const t = await setup();
    const token = await t.register();
    const c = await t.req("/api/meals", { method: "POST", token, body: t.form({ payload: JSON.stringify(meal()), photo: new Blob([JPEG], { type: "image/jpeg" }) }) });
    expect(c.status).toBe(201);
    expect(t.getStorage()!.files.size).toBe(1);
  });
  it("duplica com escala e isola usuários", async () => {
    const t = await setup();
    const a = await t.register();
    const b = await t.register();
    const m = (await (await t.req("/api/meals", { method: "POST", token: a, body: t.form({ payload: JSON.stringify(meal()) }) })).json()) as any;
    const d = await t.json(`/api/meals/${m.id}/duplicate`, "POST", { scale: 2 }, a);
    expect(d.status).toBe(201);
    const dj = (await d.json()) as any;
    expect(dj.total_kcal ?? dj.totals?.kcal).toBe(260);
    expect((await t.req(`/api/meals/${m.id}`, { token: b })).status).toBe(404);
    expect((await t.json(`/api/meals/${m.id}`, "PUT", { notes: "x" }, b)).status).toBe(404);
    expect((await t.req(`/api/meals/${m.id}`, { method: "DELETE", token: b })).status).toBe(404);
  });
});

describe("estatísticas, favoritos, água, peso e dados", () => {
  it("resumo do dia e do período respeitam o fuso", async () => {
    const t = await setup();
    const token = await t.register();
    // 01:30 UTC = 22:30 do dia anterior em Brasília
    await t.req("/api/meals", { method: "POST", token, body: t.form({ payload: JSON.stringify(meal({ eaten_at: "2026-03-10T01:30:00Z" })) }) });
    const br = (await (await t.req("/api/stats/day?day=2026-03-09&tz=-180", { token })).json()) as any;
    expect(br.totals.kcal).toBe(130);
    const utc = (await (await t.req("/api/stats/day?day=2026-03-09&tz=0", { token })).json()) as any;
    expect(utc.totals.kcal).toBe(0);
    const rg = (await (await t.req("/api/stats/range?days=7&end=2026-03-10&tz=-180", { token })).json()) as any;
    expect(rg.daily.length).toBe(7);
    expect(rg.logged_days).toBe(1);
    expect(rg.hours[22].meals).toBe(1);
    expect((await t.req("/api/stats/range?days=0", { token })).status).toBe(422);
  });
  it("favoritos: cria de uma refeição e registra em um toque", async () => {
    const t = await setup();
    const token = await t.register();
    const m = (await (await t.req("/api/meals", { method: "POST", token, body: t.form({ payload: JSON.stringify(meal()) }) })).json()) as any;
    const f = await t.json("/api/favorites", "POST", { name: "Meu almoço", from_meal_id: m.id }, token);
    expect(f.status).toBe(201);
    const fj = (await f.json()) as any;
    const log = await t.json(`/api/favorites/${fj.id}/log`, "POST", { scale: 1.5 }, token);
    expect(log.status).toBe(201);
    expect(((await log.json()) as any).total_kcal ?? 195).toBe(195);
    expect((await t.json("/api/favorites", "POST", { name: "vazio" }, token)).status).toBe(422);
    expect((await t.req(`/api/favorites/${fj.id}`, { method: "DELETE", token })).status).toBe(204);
  });
  it("água soma e apaga; peso faz upsert", async () => {
    const t = await setup();
    const token = await t.register();
    const w = (await (await t.json("/api/water", "POST", { ml: 250 }, token)).json()) as any;
    await t.json("/api/water", "POST", { ml: 300 }, token);
    const day = (await (await t.req("/api/water?tz=0", { token })).json()) as any;
    expect(day.total_ml).toBe(550);
    expect((await t.req(`/api/water/${w.id}`, { method: "DELETE", token })).status).toBe(204);
    expect((await t.req(`/api/water/${w.id}`, { method: "DELETE", token })).status).toBe(404);

    await t.json("/api/weight", "PUT", { day: "2026-11-06", kg: 80 }, token);
    await t.json("/api/weight", "PUT", { day: "2026-11-06", kg: 79.5 }, token);
    const list = (await (await t.req("/api/weight?days=365&tz=0", { token })).json()) as any[];
    expect(list).toEqual([{ day: "2026-11-06", kg: 79.5 }]);
    expect((await t.req("/api/weight/2026-11-06", { method: "DELETE", token })).status).toBe(204);
  });
  it("exporta CSV e JSON e mostra o uso", async () => {
    const t = await setup();
    const token = await t.register();
    await t.req("/api/meals", { method: "POST", token, body: t.form({ payload: JSON.stringify(meal({ items: [item({ name: 'Pão, "francês"' })] })) }) });
    const csv = await (await t.req("/api/export?format=csv", { token })).text();
    expect(csv).toContain('"Pão, ""francês"""');
    const js = (await (await t.req("/api/export?format=json", { token })).json()) as any;
    expect(js.meals.length).toBe(1);
    expect((await t.req("/api/export?format=xml", { token })).status).toBe(400);
    const u = (await (await t.req("/api/usage", { token })).json()) as any;
    expect(u.meals_count).toBe(1);
  });
  it("health e CORS", async () => {
    const t = await setup();
    expect((await t.req("/health")).status).toBe(200);
    const r = await t.req("/api/meals", { method: "OPTIONS", headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": "GET" } });
    expect(r.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect((await t.req("/nada")).status).toBe(404);
  });
});
