import { sign, verify } from "hono/jwt";
import type { Config } from "./env";

// PBKDF2 nativo do Workers. O runtime limita a 100.000 iterações; é menos que o recomendado hoje
// para o argon2, por isso o app exige senha de 8+ caracteres e limita tentativas de login.
const ITERATIONS = 100_000;
const enc = new TextEncoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2-sha256$${ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, iter, salt, hash] = stored.split("$");
  if (alg !== "pbkdf2-sha256" || !iter || !salt || !hash) return false;
  try {
    const got = await derive(password, unb64(salt), Number(iter));
    const want = unb64(hash);
    if (got.length !== want.length) return false;
    let diff = 0;
    for (let i = 0; i < got.length; i++) diff |= got[i]! ^ want[i]!;
    return diff === 0;
  } catch {
    return false;
  }
}

const nowSec = () => Math.floor(Date.now() / 1000);

/** `pwv` = versão da senha (momento da última troca, em ms; 0 se nunca trocou). Trocar a senha derruba as sessões antigas. */
export const createAccessToken = (userId: number, cfg: Config, pwv = 0) =>
  sign({ sub: String(userId), typ: "access", pwv, iat: nowSec(), exp: nowSec() + cfg.jwtExpireDays * 86400 }, cfg.jwtSecret, "HS256");

export async function decodeAccessToken(token: string, cfg: Config): Promise<{ id: number; pwv: number } | null> {
  try {
    const p = await verify(token, cfg.jwtSecret, "HS256");
    if (p.typ !== "access") return null;
    const id = Number(p.sub);
    return Number.isInteger(id) ? { id, pwv: Number(p.pwv) || 0 } : null;
  } catch {
    return null;
  }
}

/** Token curto que autoriza ler UMA foto do armazenamento em memória (tags <img> não enviam header). */
export const createFileToken = (path: string, cfg: Config, seconds = 3600) =>
  sign({ p: path, typ: "file", exp: nowSec() + seconds }, cfg.jwtSecret, "HS256");

export async function decodeFileToken(token: string, cfg: Config): Promise<string | null> {
  try {
    const p = await verify(token, cfg.jwtSecret, "HS256");
    return p.typ === "file" && typeof p.p === "string" ? p.p : null;
  } catch {
    return null;
  }
}

/**
 * Hash fixo para nivelar o tempo de resposta do login quando o e-mail não está cadastrado.
 * verifyPassword roda 100k iterações PBKDF2 e sempre retorna false contra este valor.
 * Formato: pbkdf2-sha256$iterações$salt-base64$hash-base64 (salt e hash: 16 e 32 bytes de zeros).
 */
export const DUMMY_HASH = "pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

/** Token aleatório para e-mails (recuperar senha, confirmar e-mail). Só o hash vai para o banco. */
export function randomToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}
