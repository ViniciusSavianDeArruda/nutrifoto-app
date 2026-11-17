import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AIError, AIQuotaError, BaseProvider } from "../src/ai/base";
import { MockProvider } from "../src/ai/mock";
import { ConsoleMailer } from "../src/mail";
import { createApp } from "../src/app";
import type { Env } from "../src/env";
import type { Db } from "../src/lib";
import { resetRateLimits } from "../src/limiter";
import * as schema from "../src/schema";
import { MemoryStorage } from "../src/storage";

export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);

export async function setup(env: Partial<Env> = {}, provider?: () => BaseProvider) {
  resetRateLimits();
  const pg = new PGlite();
  await pg.exec(readFileSync(join(process.cwd(), "migrations/0001_initial.sql"), "utf8"))
  await pg.exec(readFileSync(join(process.cwd(), "migrations/0002_accounts.sql"), "utf8"));
  const db = drizzle(pg, { schema }) as unknown as Db;
  let storage: MemoryStorage | undefined;
  const mailer = new ConsoleMailer(true);
  const app = createApp({
    getDb: () => ({ db, close: () => {} }),
    storage: (cfg) => (storage ??= new MemoryStorage(cfg)),
    mailer: () => mailer,
    provider: provider ? () => provider() : (cfg) => (cfg.aiProvider === "mock" ? new MockProvider() : new MockProvider()),
  });
  const fullEnv: Env = { AI_PROVIDER: "mock", ...env };
  let n = 0;
  const req = (path: string, init: RequestInit & { token?: string; ip?: string } = {}) => {
    const { token, ip, ...rest } = init;
    const headers = new Headers(rest.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("x-forwarded-for", ip ?? "1.1.1.1");
    return app.request(path, { ...rest, headers }, fullEnv);
  };
  const json = (path: string, method: string, body?: unknown, token?: string) =>
    req(path, { method, token, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const register = async (email = `u${++n}@x.com`) => {
    const r = await json("/api/auth/register", "POST", { email, password: "senha-forte-1", name: "Teste", accept_terms: true });
    const j = (await r.json()) as { access_token: string };
    return j.access_token;
  };
  const form = (fields: Record<string, string | Blob>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) { if (typeof v === "string") f.set(k, v); else f.set(k, v, "a.jpg"); }
    return f;
  };
  return { app, req, json, register, form, db, getStorage: () => storage, pg, mailer };
}

export class QuotaProvider extends BaseProvider {
  name = "quota";
  protected async chamarImagem(): Promise<string> { throw new AIQuotaError(); }
  protected async chamarTexto(): Promise<string> { throw new AIQuotaError(); }
}
export class GarbageProvider extends BaseProvider {
  name = "garbage";
  protected async chamarImagem() { return "isto não é json"; }
  protected async chamarTexto() { return "nada"; }
}
export { AIError };
