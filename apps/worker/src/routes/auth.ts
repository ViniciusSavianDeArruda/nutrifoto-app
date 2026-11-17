import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { consumeToken, sendReset, sendVerification } from "../accounts";
import { ApiError } from "../errors";
import { checkRate } from "../limiter";
import { clientIp, getMailer, getStorage, readImage, readJson, userView, type AppEnv } from "../lib";
import { createAccessToken, DUMMY_HASH, hashPassword, verifyPassword } from "../security";
import { invites, meals, users } from "../schema";
import { deleteAccountIn, forgotIn, loginIn, registerIn, resetIn, userUpdate, verifyIn } from "../schemas";
import { requireUser } from "../middleware";

export const auth = new Hono<AppEnv>();

const tooMany = () => new ApiError(429, "rate_limited", "Muitas tentativas. Aguarde um instante e tente de novo.");
const AVATAR_MAX = 1024 * 1024;

/** Dados públicos que a tela de cadastro precisa antes do login. */
auth.get("/config", (c) => c.json({ registration: c.get("cfg").registrationMode, email_enabled: getMailer(c).enabled }));

auth.post("/register", async (c) => {
  if (!checkRate(`auth:${clientIp(c)}`, 10, 60)) throw tooMany();
  const cfg = c.get("cfg");
  const body = await readJson(c, registerIn);
  if (cfg.registrationMode === "closed") throw new ApiError(403, "registration_closed", "O cadastro está fechado neste app.");
  const code = body.invite_code?.trim().toUpperCase() || null;
  if (cfg.registrationMode === "invite" && !code) throw new ApiError(403, "invite_required", "O cadastro é só por convite. Peça um código a quem te indicou o app.");
  const db = c.get("db");
  const email = body.email.toLowerCase();
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (exists) throw new ApiError(409, "email_taken", "Já existe uma conta com esse e-mail.");
  const passwordHash = await hashPassword(body.password);

  // Convite e conta na mesma transação: se a criação falhar, o uso do código não se perde.
  const user = await db.transaction(async (tx) => {
    if (cfg.registrationMode === "invite") {
      const [used] = await tx
        .update(invites)
        .set({ uses: sql`${invites.uses} + 1` })
        .where(and(eq(invites.code, code!), sql`${invites.uses} < ${invites.maxUses}`, or(isNull(invites.expiresAt), gt(invites.expiresAt, sql`now()`))))
        .returning({ id: invites.id });
      if (!used) throw new ApiError(403, "invite_invalid", "Esse código de convite não é válido, venceu ou já foi usado.");
    }
    const [u] = await tx.insert(users).values({ email, passwordHash, name: body.name ?? null, termsAcceptedAt: new Date() }).returning();
    return u!;
  });

  try {
    await sendVerification(db, getMailer(c), cfg, user);
  } catch (e) {
    console.error("falha ao enviar e-mail de confirmação", e); // a conta já existe: o usuário pode pedir de novo depois
  }
  return c.json({ access_token: await createAccessToken(user.id, cfg), token_type: "bearer" }, 201);
});

auth.post("/login", async (c) => {
  if (!checkRate(`auth:${clientIp(c)}`, 10, 60)) throw tooMany();
  const body = await readJson(c, loginIn);
  const [user] = await c.get("db").select().from(users).where(eq(users.email, body.email.toLowerCase())).limit(1);
  // Sempre roda PBKDF2 (100k iterações) para igualar o tempo quando o e-mail não existe no banco.
  const hash = user?.passwordHash ?? DUMMY_HASH;
  if (!(await verifyPassword(body.password, hash)) || !user) {
    throw new ApiError(401, "bad_credentials", "E-mail ou senha incorretos.");
  }
  return c.json({ access_token: await createAccessToken(user.id, c.get("cfg"), user.passwordChangedAt?.getTime() ?? 0), token_type: "bearer" });
});

/** Recuperar senha. A resposta é sempre a mesma, exista a conta ou não, para não revelar quem tem cadastro. */
auth.post("/forgot-password", async (c) => {
  if (!checkRate(`forgot:${clientIp(c)}`, 5, 600)) throw tooMany();
  const body = await readJson(c, forgotIn);
  const mailer = getMailer(c);
  if (!mailer.enabled) throw new ApiError(503, "mail_disabled", "A recuperação por e-mail não está ativa neste app. Fale com quem administra o app.");
  const email = body.email.toLowerCase();
  if (!checkRate(`forgot-email:${email}`, 3, 3600)) throw tooMany();
  const [user] = await c.get("db").select().from(users).where(eq(users.email, email)).limit(1);
  if (user) {
    try {
      await sendReset(c.get("db"), mailer, c.get("cfg"), user);
    } catch (e) {
      console.error("falha ao enviar e-mail de recuperação", e);
    }
  }
  return c.json({ ok: true });
});

auth.post("/reset-password", async (c) => {
  if (!checkRate(`reset:${clientIp(c)}`, 10, 600)) throw tooMany();
  const body = await readJson(c, resetIn);
  const db = c.get("db");
  const userId = await consumeToken(db, body.token, "reset");
  if (userId === null) throw new ApiError(400, "invalid_token", "Esse link não vale mais. Peça um novo em “Esqueci a senha”.");
  const now = new Date();
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(body.password), passwordChangedAt: now, emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` })
    .where(eq(users.id, userId));
  return c.json({ ok: true });
});

auth.post("/verify-email", async (c) => {
  if (!checkRate(`verify:${clientIp(c)}`, 10, 600)) throw tooMany();
  const body = await readJson(c, verifyIn);
  const db = c.get("db");
  const userId = await consumeToken(db, body.token, "verify");
  if (userId === null) throw new ApiError(400, "invalid_token", "Esse link não vale mais. Peça um novo nos Ajustes.");
  await db.update(users).set({ emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` }).where(eq(users.id, userId));
  return c.json({ ok: true });
});

auth.post("/verify-email/send", requireUser, async (c) => {
  const user = c.get("user");
  if (user.emailVerifiedAt) return c.json({ ok: true });
  if (!checkRate(`verify-send:${user.id}`, 3, 600)) throw tooMany();
  const mailer = getMailer(c);
  if (!mailer.enabled) throw new ApiError(503, "mail_disabled", "O envio de e-mail não está ativo neste app.");
  try {
    await sendVerification(c.get("db"), mailer, c.get("cfg"), user);
  } catch {
    throw new ApiError(502, "mail_error", "Não consegui enviar o e-mail agora. Tente de novo em instantes.");
  }
  return c.json({ ok: true });
});

auth.get("/me", requireUser, async (c) => c.json(await userView(c, c.get("user"))));

auth.patch("/me", requireUser, async (c) => {
  const body = await readJson(c, userUpdate);
  const set: Partial<typeof users.$inferInsert> = {};
  if (body.name != null) set.name = body.name;
  if (body.daily_kcal_goal != null) set.dailyKcalGoal = body.daily_kcal_goal;
  if (body.protein_goal_g != null) set.proteinGoalG = body.protein_goal_g;
  if (body.carbs_goal_g != null) set.carbsGoalG = body.carbs_goal_g;
  if (body.fat_goal_g != null) set.fatGoalG = body.fat_goal_g;
  if (body.water_goal_ml != null) set.waterGoalMl = body.water_goal_ml;
  const user = c.get("user");
  if (!Object.keys(set).length) return c.json(await userView(c, user));
  const [updated] = await c.get("db").update(users).set(set).where(eq(users.id, user.id)).returning();
  return c.json(await userView(c, updated!));
});

/** Foto de perfil: o celular já reduz a imagem; aqui só validamos tipo e tamanho (até 1 MB). */
auth.post("/me/avatar", requireUser, async (c) => {
  const user = c.get("user");
  const form = await c.req.parseBody();
  const img = await readImage(form["file"], c);
  if (img.bytes.length > AVATAR_MAX) throw new ApiError(413, "file_too_large", "A foto de perfil passa de 1 MB.");
  const storage = getStorage(c);
  const path = `avatars/${user.id}/${crypto.randomUUID().replaceAll("-", "")}.${img.ext}`;
  try {
    await storage.save(path, img.bytes, img.mime);
  } catch {
    throw new ApiError(502, "storage_error", "Não consegui guardar a foto agora. Tente de novo.");
  }
  const [updated] = await c.get("db").update(users).set({ avatarPath: path }).where(eq(users.id, user.id)).returning();
  if (user.avatarPath) await storage.delete([user.avatarPath]).catch(() => {});
  return c.json(await userView(c, updated!));
});

auth.delete("/me/avatar", requireUser, async (c) => {
  const user = c.get("user");
  if (user.avatarPath) await getStorage(c).delete([user.avatarPath]).catch(() => {});
  const [updated] = await c.get("db").update(users).set({ avatarPath: null }).where(eq(users.id, user.id)).returning();
  return c.json(await userView(c, updated!));
});

auth.delete("/me", requireUser, async (c) => {
  const body = await readJson(c, deleteAccountIn);
  const user = c.get("user");
  if (!(await verifyPassword(body.password, user.passwordHash))) throw new ApiError(403, "bad_credentials", "Senha incorreta.");
  const db = c.get("db");
  const rows = await db.select({ p: meals.photoPath, t: meals.thumbPath }).from(meals).where(eq(meals.userId, user.id));
  const paths = [...new Set([...rows.flatMap((r) => [r.p, r.t]), user.avatarPath].filter((p): p is string => !!p))];
  try {
    await getStorage(c).delete(paths);
  } catch {
    // apagar a conta não pode travar por falha no storage
  }
  await db.delete(users).where(eq(users.id, user.id));
  return c.body(null, 204);
});
