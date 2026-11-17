import type { Config } from "./env";
import { createFileToken } from "./security";

export class StorageError extends Error {}

export interface Storage {
  save(path: string, data: Uint8Array, contentType: string): Promise<void>;
  delete(paths: string[]): Promise<void>;
  signedUrls(paths: string[]): Promise<Record<string, string>>;
  /** Só o armazenamento em memória lê arquivos (servidos por /api/files/:token). */
  read?(path: string): Promise<{ data: Uint8Array; contentType: string } | null>;
}

/** Guarda as fotos na memória do processo: só para desenvolvimento e testes (somem ao reiniciar). */
export class MemoryStorage implements Storage {
  files = new Map<string, { data: Uint8Array; contentType: string }>();
  constructor(private cfg: Config) {}

  async save(path: string, data: Uint8Array, contentType: string) {
    this.files.set(path, { data, contentType });
  }
  async delete(paths: string[]) {
    for (const p of paths) this.files.delete(p);
  }
  async signedUrls(paths: string[]) {
    const out: Record<string, string> = {};
    for (const p of paths) out[p] = `${this.cfg.publicApiUrl}/api/files/${await createFileToken(p, this.cfg)}`;
    return out;
  }
  async read(path: string) {
    return this.files.get(path) ?? null;
  }
}

/** Supabase Storage pela API REST, com a service_role key (só no servidor). */
export class SupabaseStorage implements Storage {
  private base: string;
  private bucket: string;
  private headers: Record<string, string>;
  private cache = new Map<string, { url: string; exp: number }>();
  private static TTL = 3600;
  private static MARGIN = 300;

  constructor(cfg: Config, private doFetch: typeof fetch = fetch) {
    if (!cfg.supabaseUrl || !cfg.supabaseServiceRoleKey) throw new StorageError("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configurados.");
    this.base = `${cfg.supabaseUrl}/storage/v1`;
    this.bucket = cfg.supabaseBucket;
    this.headers = { Authorization: `Bearer ${cfg.supabaseServiceRoleKey}`, apikey: cfg.supabaseServiceRoleKey };
  }

  async save(path: string, data: Uint8Array, contentType: string) {
    const r = await this.doFetch(`${this.base}/object/${this.bucket}/${path}`, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": contentType, "x-upsert": "true" },
      body: data,
    });
    if (!r.ok) throw new StorageError(`Falha ao enviar a foto (${r.status}).`);
  }

  async delete(paths: string[]) {
    if (!paths.length) return;
    const r = await this.doFetch(`${this.base}/object/${this.bucket}`, {
      method: "DELETE",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: paths }),
    });
    if (!r.ok) throw new StorageError(`Falha ao apagar fotos (${r.status}).`);
    for (const p of paths) this.cache.delete(p);
  }

  async signedUrls(paths: string[]) {
    const now = Date.now() / 1000;
    const out: Record<string, string> = {};
    const missing: string[] = [];
    for (const p of paths) {
      const c = this.cache.get(p);
      if (c && c.exp - SupabaseStorage.MARGIN > now) out[p] = c.url;
      else missing.push(p);
    }
    if (missing.length) {
      const r = await this.doFetch(`${this.base}/object/sign/${this.bucket}`, {
        method: "POST",
        headers: { ...this.headers, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: SupabaseStorage.TTL, paths: missing }),
      });
      if (!r.ok) throw new StorageError(`Falha ao assinar URLs (${r.status}).`);
      for (const e of (await r.json()) as { path?: string; signedURL?: string }[]) {
        if (e.signedURL && e.path) {
          const url = `${this.base}${e.signedURL}`;
          this.cache.set(e.path, { url, exp: now + SupabaseStorage.TTL });
          out[e.path] = url;
        }
      }
    }
    return out;
  }
}

// O armazenamento em memória precisa ser o mesmo objeto entre requisições do mesmo isolate.
let memory: MemoryStorage | null = null;

export function buildStorage(cfg: Config): Storage {
  if (cfg.storageBackend === "supabase") return new SupabaseStorage(cfg);
  memory ??= new MemoryStorage(cfg);
  return memory;
}
