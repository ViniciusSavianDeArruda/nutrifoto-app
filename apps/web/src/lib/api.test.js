import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, getToken, setToken, setUnauthorizedHandler } from "./api.js";

const reply = (status, body) =>
  Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.restoreAllMocks(); });

describe("api", () => {
  it("manda o token e devolve o JSON", async () => {
    setToken("abc");
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(() => reply(200, { id: 1 }));
    expect(await api.me()).toEqual({ id: 1 });
    expect(spy.mock.calls[0][1].headers.Authorization).toBe("Bearer abc");
  });

  it("converte erro da API em ApiError com código e mensagem", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => reply(429, { detail: { code: "daily_limit", message: "Limite diário atingido." } }));
    await expect(api.analyzeText("arroz")).rejects.toMatchObject({ status: 429, code: "daily_limit", message: "Limite diário atingido." });
  });

  it("erro de validação (422) vira mensagem amigável", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => reply(422, { detail: [{ loc: ["body"], msg: "x" }] }));
    await expect(api.login({})).rejects.toMatchObject({ code: "validation" });
  });

  it("falha de rede vira 'network'", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fail"));
    const err = await api.me().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("network");
  });

  it("401 com token limpa a sessão e avisa o app", async () => {
    setToken("velho");
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.spyOn(globalThis, "fetch").mockImplementation(() => reply(401, { detail: "no" }));
    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
    expect(getToken()).toBeNull();
    expect(handler).toHaveBeenCalled();
  });

  it("204 devolve null", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(new Response(null, { status: 204 })));
    expect(await api.deleteMeal(1)).toBeNull();
  });

  it("envia o fuso do aparelho nas consultas por dia", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(() => reply(200, {}));
    await api.day("2026-11-07");
    expect(spy.mock.calls[0][0]).toMatch(/\/api\/stats\/day\?day=2026-11-07&tz=-?\d+$/);
  });
});
