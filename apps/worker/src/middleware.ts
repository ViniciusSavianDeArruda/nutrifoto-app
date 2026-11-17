import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { ApiError } from "./errors";
import type { AppEnv } from "./lib";
import { users } from "./schema";
import { decodeAccessToken } from "./security";

export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const unauthorized = new ApiError(401, "unauthorized", "Entre na sua conta para continuar.");
  const header = c.req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) throw unauthorized;
  const decoded = await decodeAccessToken(token, c.get("cfg"));
  if (decoded === null) throw unauthorized;
  const [user] = await c.get("db").select().from(users).where(eq(users.id, decoded.id)).limit(1);
  if (!user) throw unauthorized;
  // A senha mudou depois que esta sessão começou: a sessão antiga deixa de valer.
  if (decoded.pwv !== (user.passwordChangedAt?.getTime() ?? 0)) throw unauthorized;
  c.set("user", user);
  await next();
});
