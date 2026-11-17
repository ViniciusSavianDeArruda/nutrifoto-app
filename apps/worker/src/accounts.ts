import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Db } from "./lib";
import { resetMail, verifyMail, type Mailer } from "./mail";
import type { Config } from "./env";
import { authTokens, type UserRow } from "./schema";
import { randomToken, sha256Hex } from "./security";

type Kind = "reset" | "verify";
const TTL_HOURS: Record<Kind, number> = { reset: 1, verify: 48 };

/** Cria um token novo e invalida os anteriores ainda não usados do mesmo tipo. */
export async function issueToken(db: Db, userId: number, kind: Kind): Promise<string> {
  const token = randomToken();
  await db.update(authTokens).set({ usedAt: new Date() }).where(and(eq(authTokens.userId, userId), eq(authTokens.kind, kind), isNull(authTokens.usedAt)));
  await db.insert(authTokens).values({
    userId, kind, tokenHash: await sha256Hex(token), expiresAt: new Date(Date.now() + TTL_HOURS[kind] * 3600_000),
  });
  return token;
}

/** Gasta o token (uma vez só) e devolve o dono, ou null se for inválido, vencido ou já usado. */
export async function consumeToken(db: Db, token: string, kind: Kind): Promise<number | null> {
  const [row] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.tokenHash, await sha256Hex(token)), eq(authTokens.kind, kind), isNull(authTokens.usedAt), gt(authTokens.expiresAt, sql`now()`)))
    .returning({ userId: authTokens.userId });
  return row?.userId ?? null;
}

export async function sendVerification(db: Db, mailer: Mailer, cfg: Config, user: UserRow): Promise<void> {
  if (!mailer.enabled) return;
  const token = await issueToken(db, user.id, "verify");
  await mailer.send(verifyMail(user.email, `${cfg.appUrl}/confirmar-email?token=${token}`));
}

export async function sendReset(db: Db, mailer: Mailer, cfg: Config, user: UserRow): Promise<void> {
  if (!mailer.enabled) return;
  const token = await issueToken(db, user.id, "reset");
  await mailer.send(resetMail(user.email, `${cfg.appUrl}/redefinir-senha?token=${token}`));
}
