import { Hono } from "hono";
import { cors } from "hono/cors";
import { ZodError } from "zod";
import { AI_STATUS, AIError } from "./ai/base";
import { ConfigError, loadConfig } from "./env";
import { ApiError } from "./errors";
import type { AppEnv, Deps } from "./lib";
import { auth } from "./routes/auth";
import { dataRouter } from "./routes/data";
import { favoritesRouter } from "./routes/favorites";
import { mealsRouter } from "./routes/meals";
import { statsRouter } from "./routes/stats";
import { waterRouter, weightRouter } from "./routes/tracking";

export function createApp(deps: Deps) {
  const app = new Hono<AppEnv>();

  // Config, CORS e banco. O banco só é aberto nas rotas que precisam (o /health não toca nele).
  app.use("*", async (c, next) => {
    c.set("cfg", loadConfig(c.env ?? {}));
    c.set("deps", deps);
    await next();
  });
  app.use("*", (c, next) =>
    cors({
      origin: (origin) => (c.get("cfg").corsOrigins.includes(origin) ? origin : null),
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      maxAge: 86400,
    })(c, next),
  );

  app.use("*", (c, next) => {
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    return next();
  });

  app.get("/health", (c) => c.json({ status: "ok" }));
  app.get("/api/health", (c) => c.json({ status: "ok" }));

  app.use("/api/*", async (c, next) => {
    if (c.req.method === "OPTIONS" || c.req.path === "/api/health") return next();
    const { db, close } = deps.getDb(c.env ?? {});
    c.set("db", db);
    try {
      await next();
    } finally {
      // Fecha a conexão sem atrasar a resposta (no Workers, via waitUntil).
      try {
        c.executionCtx.waitUntil(Promise.resolve(close()));
      } catch {
        await close();
      }
    }
  });

  app.route("/api/auth", auth);
  app.route("/api/meals", mealsRouter);
  app.route("/api/favorites", favoritesRouter);
  app.route("/api/stats", statsRouter);
  app.route("/api/water", waterRouter);
  app.route("/api/weight", weightRouter);
  app.route("/", dataRouter);

  app.notFound((c) => c.json({ detail: { code: "not_found", message: "Rota não encontrada." } }, 404));

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json({ detail: { code: err.code, message: err.message, ...err.extra } }, err.status);
    }
    if (err instanceof AIError) {
      return c.json({ detail: { code: err.code, message: err.message } }, AI_STATUS[err.code] ?? 502);
    }
    if (err instanceof ZodError) {
      return c.json(
        {
          detail: {
            code: "validation",
            message: "Alguns dados estão inválidos. Confira os campos.",
            errors: err.issues.map((i) => ({ loc: i.path, msg: i.message })),
          },
        },
        422,
      );
    }
    if (err instanceof ConfigError) return c.json({ detail: { code: "server_config", message: err.message } }, 500);
    console.error(err);
    return c.json({ detail: { code: "server_error", message: "Erro interno. Tente de novo em instantes." } }, 500);
  });

  return app;
}
