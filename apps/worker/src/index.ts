import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createApp } from "./app";
import type { Env } from "./env";
import type { Db } from "./lib";
import * as schema from "./schema";

// Uma conexão por requisição: o Hyperdrive mantém o pool de verdade perto do banco.
const app = createApp({
  getDb(env: Env) {
    const url = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
    if (!url) throw new Error("Banco não configurado: faltam o binding HYPERDRIVE ou DATABASE_URL.");
    const sql = postgres(url, { max: 1, fetch_types: false, idle_timeout: 5, connect_timeout: 10 });
    return { db: drizzle(sql, { schema }) as unknown as Db, close: () => sql.end({ timeout: 1 }) };
  },
});

export default app;
