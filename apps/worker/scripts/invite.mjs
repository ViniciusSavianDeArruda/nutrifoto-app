// Cria e lista códigos de convite. Uso:
//   DATABASE_URL="postgresql://..." npm run invite -- --note "Maria" --uses 1 --days 30
//   DATABASE_URL="postgresql://..." npm run invite -- --list
import { randomInt } from "node:crypto";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "Falta a variável DATABASE_URL (ex.: postgresql://usuario:senha@host:5432/banco). Use o Session pooler do Supabase (porta 5432) ou o Postgres local do Docker.",
  );
  process.exit(1);
}
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error(
    "DATABASE_URL inválida: ela precisa começar com postgresql:// (ex.: postgresql://usuario:senha@host:5432/banco).",
  );
  process.exit(1);
}
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  if (args.includes("--list")) {
    const rows =
      await sql`SELECT code, note, uses, max_uses, expires_at FROM invites ORDER BY id DESC LIMIT 50`;
    for (const r of rows)
      console.log(
        `${r.code}  usos ${r.uses}/${r.max_uses}  ${r.expires_at ? "vence " + r.expires_at.toISOString().slice(0, 10) : "sem validade"}  ${r.note ?? ""}`,
      );
    if (!rows.length) console.log("Nenhum convite ainda.");
  } else {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem O/0/I/1/L, para ninguém errar ao digitar
    const part = () =>
      Array.from(
        { length: 4 },
        () => alphabet[randomInt(alphabet.length)],
      ).join("");
    const code = (opt("code") ?? `NUTRI-${part()}-${part()}`).toUpperCase();
    const uses = Number(opt("uses", "1"));
    const days = opt("days") ? Number(opt("days")) : null;
    if (!Number.isInteger(uses) || uses < 1)
      throw new Error("--uses precisa ser um inteiro maior que 0.");
    const expires = days ? new Date(Date.now() + days * 86400_000) : null;
    await sql`INSERT INTO invites (code, note, max_uses, expires_at) VALUES (${code}, ${opt("note") ?? null}, ${uses}, ${expires})`;
    console.log(
      `Convite criado: ${code}  (${uses} ${uses === 1 ? "uso" : "usos"}${expires ? ", vence em " + expires.toISOString().slice(0, 10) : ", sem validade"})`,
    );
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
