// Aplica os arquivos de migrations/*.sql em ordem, uma vez cada (controle na tabela _migrations).
// Uso: DATABASE_URL="postgresql://..." npm run migrate
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta a variável DATABASE_URL (ex.: postgresql://usuario:senha@host:5432/banco). Use o Session pooler do Supabase (porta 5432) ou o Postgres local do Docker.");
  process.exit(1);
}
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error("DATABASE_URL inválida: ela precisa começar com postgresql:// (ex.: postgresql://usuario:senha@host:5432/banco).");
  process.exit(1);
}
const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  await sql`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  const done = new Set((await sql`SELECT name FROM _migrations`).map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    await sql.begin(async (tx) => {
      await tx.unsafe(await readFile(join(dir, file), "utf8"));
      await tx`INSERT INTO _migrations (name) VALUES (${file})`;
    });
    console.log(`✓ ${file}`);
  }
  console.log("Migrações em dia.");
} finally {
  await sql.end();
}
