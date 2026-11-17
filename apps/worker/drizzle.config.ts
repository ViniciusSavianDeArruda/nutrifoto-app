import { defineConfig } from "drizzle-kit";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getDbUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const envPath = resolve(__dirname, "../../.env");
  const env: Record<string, string> = {};
  try {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) env[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    throw new Error(`DATABASE_URL não definida e não foi possível ler ${envPath}`);
  }

  const { POSTGRES_USER: user, POSTGRES_PASSWORD: pass, POSTGRES_DB: db, DB_PORT: port = "5432" } = env;
  if (!user || !pass || !db) {
    throw new Error("DATABASE_URL não definida e faltam POSTGRES_USER, POSTGRES_PASSWORD ou POSTGRES_DB no .env");
  }

  return `postgresql://${user}:${encodeURIComponent(pass)}@localhost:${port}/${db}`;
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: { url: getDbUrl() },
});
