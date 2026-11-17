import { describe, expect, it } from "vitest";
import { invites } from "../src/schema";
import { JPEG, setup } from "./helpers";

const reg = (t: Awaited<ReturnType<typeof setup>>, extra: object = {}, email = "a@x.com") =>
  t.json("/api/auth/register", "POST", { email, password: "senha-forte-1", accept_terms: true, ...extra });
const tokenFrom = (text: string) => /token=([0-9a-f]+)/.exec(text)![1]!;

describe("termos e configuração pública", () => {
  it("exige aceitar os termos", async () => {
    const t = await setup();
    const r = await t.json("/api/auth/register", "POST", { email: "a@x.com", password: "senha-forte-1" });
    expect(r.status).toBe(422);
    const r2 = await t.json("/api/auth/register", "POST", { email: "a@x.com", password: "senha-forte-1", accept_terms: false });
    expect(r2.status).toBe(422);
  });
  it("/config mostra o modo de cadastro", async () => {
    expect(((await (await (await setup({ REGISTRATION_MODE: "invite" })).req("/api/auth/config")).json()) as any).registration).toBe("invite");
    expect(((await (await (await setup()).req("/api/auth/config")).json()) as any)).toEqual({ registration: "open", email_enabled: true });
    expect(((await (await (await setup({ ALLOW_REGISTRATION: "false", REGISTRATION_MODE: "invite" })).req("/api/auth/config")).json()) as any).registration).toBe("closed");
  });
});

describe("convite por código", () => {
  it("sem código ou com código errado é recusado; com código bom entra e gasta o uso", async () => {
    const t = await setup({ REGISTRATION_MODE: "invite" });
    expect(((await (await reg(t)).json()) as any).detail.code).toBe("invite_required");
    expect(((await (await reg(t, { invite_code: "NADA" })).json()) as any).detail.code).toBe("invite_invalid");
    await t.db.insert(invites).values({ code: "NUTRI-TESTE", maxUses: 1 });
    expect((await reg(t, { invite_code: "nutri-teste" })).status).toBe(201); // minúsculas funcionam
    expect(((await (await reg(t, { invite_code: "NUTRI-TESTE" }, "b@x.com")).json()) as any).detail.code).toBe("invite_invalid"); // esgotado
  });
  it("convite vencido não vale; código com mais usos vale mais de uma vez", async () => {
    const t = await setup({ REGISTRATION_MODE: "invite" });
    await t.db.insert(invites).values({ code: "VELHO", expiresAt: new Date(Date.now() - 1000) });
    expect((await reg(t, { invite_code: "VELHO" })).status).toBe(403);
    await t.db.insert(invites).values({ code: "DOIS", maxUses: 2 });
    expect((await reg(t, { invite_code: "DOIS" }, "a@x.com")).status).toBe(201);
    expect((await reg(t, { invite_code: "DOIS" }, "b@x.com")).status).toBe(201);
    expect((await reg(t, { invite_code: "DOIS" }, "c@x.com")).status).toBe(403);
  });
  it("e-mail repetido não gasta o convite", async () => {
    const t = await setup({ REGISTRATION_MODE: "invite" });
    await t.db.insert(invites).values({ code: "UM", maxUses: 2 });
    await reg(t, { invite_code: "UM" });
    expect((await reg(t, { invite_code: "UM" })).status).toBe(409);
    expect((await reg(t, { invite_code: "UM" }, "b@x.com")).status).toBe(201);
  });
});

describe("confirmar e-mail", () => {
  it("o cadastro envia o e-mail e o link confirma a conta uma vez só", async () => {
    const t = await setup();
    const token = ((await (await reg(t)).json()) as any).access_token;
    expect(t.mailer.sent.length).toBe(1);
    expect(t.mailer.sent[0]!.to).toBe("a@x.com");
    expect(((await (await t.req("/api/auth/me", { token })).json()) as any).email_verified).toBe(false);
    const link = tokenFrom(t.mailer.sent[0]!.text);
    expect((await t.json("/api/auth/verify-email", "POST", { token: link })).status).toBe(200);
    expect(((await (await t.req("/api/auth/me", { token })).json()) as any).email_verified).toBe(true);
    expect((await t.json("/api/auth/verify-email", "POST", { token: link })).status).toBe(400);
    expect((await t.json("/api/auth/verify-email", "POST", { token: "0".repeat(64) })).status).toBe(400);
  });
  it("reenvia pelo Ajustes e limita os pedidos", async () => {
    const t = await setup();
    const token = ((await (await reg(t)).json()) as any).access_token;
    for (let i = 0; i < 3; i++) expect((await t.json("/api/auth/verify-email/send", "POST", {}, token)).status).toBe(200);
    expect((await t.json("/api/auth/verify-email/send", "POST", {}, token)).status).toBe(429);
    expect(t.mailer.sent.length).toBe(4);
  });
});

describe("recuperar senha", () => {
  it("fluxo completo: pede, usa o link, entra com a nova senha; sessão antiga cai", async () => {
    const t = await setup();
    const old = ((await (await reg(t)).json()) as any).access_token;
    t.mailer.sent.length = 0;
    expect((await t.json("/api/auth/forgot-password", "POST", { email: "A@x.com" })).status).toBe(200);
    expect(t.mailer.sent.length).toBe(1);
    const token = tokenFrom(t.mailer.sent[0]!.text);
    expect((await t.json("/api/auth/reset-password", "POST", { token, password: "outra-senha-9" })).status).toBe(200);
    expect((await t.json("/api/auth/reset-password", "POST", { token, password: "mais-outra-9" })).status).toBe(400); // uso único
    expect((await t.json("/api/auth/login", "POST", { email: "a@x.com", password: "senha-forte-1" })).status).toBe(401);
    const login = await t.json("/api/auth/login", "POST", { email: "a@x.com", password: "outra-senha-9" });
    expect(login.status).toBe(200);
    expect((await t.req("/api/auth/me", { token: old })).status).toBe(401); // a sessão de antes da troca não vale mais
    const fresh = ((await login.json()) as any).access_token;
    const me = (await (await t.req("/api/auth/me", { token: fresh })).json()) as any;
    expect(me.email_verified).toBe(true); // receber o link prova que o e-mail é dele
  });
  it("não revela se o e-mail existe e não envia para quem não tem conta", async () => {
    const t = await setup();
    const r = await t.json("/api/auth/forgot-password", "POST", { email: "ninguem@x.com" });
    expect(r.status).toBe(200);
    expect(t.mailer.sent.length).toBe(0);
  });
  it("um novo pedido invalida o link anterior; senha curta é recusada", async () => {
    const t = await setup();
    await reg(t);
    t.mailer.sent.length = 0;
    await t.json("/api/auth/forgot-password", "POST", { email: "a@x.com" });
    await t.json("/api/auth/forgot-password", "POST", { email: "a@x.com" });
    const [first, second] = t.mailer.sent.map((m) => tokenFrom(m.text));
    expect((await t.json("/api/auth/reset-password", "POST", { token: first, password: "outra-senha-9" })).status).toBe(400);
    expect((await t.json("/api/auth/reset-password", "POST", { token: second, password: "curta" })).status).toBe(422);
    expect((await t.json("/api/auth/reset-password", "POST", { token: second, password: "outra-senha-9" })).status).toBe(200);
  });
  it("limita pedidos por e-mail", async () => {
    const t = await setup();
    await reg(t);
    const codes: number[] = [];
    for (let i = 0; i < 4; i++) codes.push((await t.json("/api/auth/forgot-password", "POST", { email: "a@x.com" })).status);
    expect(codes).toEqual([200, 200, 200, 429]);
  });
  it("sem serviço de e-mail avisa com clareza", async () => {
    const { ConsoleMailer } = await import("../src/mail");
    const t = await setup();
    t.mailer.enabled = false;
    const r = await t.json("/api/auth/forgot-password", "POST", { email: "a@x.com" });
    expect(r.status).toBe(503);
    expect(((await r.json()) as any).detail.code).toBe("mail_disabled");
    void ConsoleMailer;
  });
});

describe("foto de perfil", () => {
  it("envia, aparece no /me, troca e remove", async () => {
    const t = await setup();
    const token = ((await (await reg(t)).json()) as any).access_token;
    const send = () => t.req("/api/auth/me/avatar", { method: "POST", token, body: t.form({ file: new Blob([JPEG], { type: "image/jpeg" }) }) });
    const r = await send();
    expect(r.status).toBe(200);
    const me = (await r.json()) as any;
    expect(me.avatar_url).toContain("/api/files/");
    expect((await t.req(new URL(me.avatar_url).pathname)).status).toBe(200);
    expect(t.getStorage()!.files.size).toBe(1);
    await send();
    expect(t.getStorage()!.files.size).toBe(1); // a anterior foi apagada
    const del = (await (await t.req("/api/auth/me/avatar", { method: "DELETE", token })).json()) as any;
    expect(del.avatar_url).toBeNull();
    expect(t.getStorage()!.files.size).toBe(0);
  });
  it("recusa arquivo que não é imagem e foto grande demais; excluir a conta apaga a foto", async () => {
    const t = await setup();
    const token = ((await (await reg(t)).json()) as any).access_token;
    const bad = await t.req("/api/auth/me/avatar", { method: "POST", token, body: t.form({ file: new Blob(["texto"], { type: "image/jpeg" }) }) });
    expect(bad.status).toBe(400);
    const big = new Uint8Array(1024 * 1024 + 10);
    big.set(JPEG);
    const r = await t.req("/api/auth/me/avatar", { method: "POST", token, body: t.form({ file: new Blob([big], { type: "image/jpeg" }) }) });
    expect(r.status).toBe(413);
    await t.req("/api/auth/me/avatar", { method: "POST", token, body: t.form({ file: new Blob([JPEG], { type: "image/jpeg" }) }) });
    expect(t.getStorage()!.files.size).toBe(1);
    await t.json("/api/auth/me", "DELETE", { password: "senha-forte-1" }, token);
    expect(t.getStorage()!.files.size).toBe(0);
  });
});
