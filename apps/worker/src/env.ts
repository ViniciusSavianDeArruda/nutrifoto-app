export interface Env {
  HYPERDRIVE?: { connectionString: string };
  DATABASE_URL?: string; // alternativa ao Hyperdrive (scripts e testes locais)
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
  ALLOW_REGISTRATION?: string;
  CORS_ORIGINS?: string;
  APP_TIMEZONE?: string;
  DAILY_AI_LIMIT?: string;
  MAX_UPLOAD_MB?: string;
  STORAGE_QUOTA_MB?: string;
  AI_PROVIDER?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  STORAGE_BACKEND?: string;
  PUBLIC_API_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_BUCKET?: string;
  REGISTRATION_MODE?: string; // open | invite | closed
  APP_URL?: string; // endereço do front, usado nos links dos e-mails
  MAIL_FROM?: string;
  RESEND_API_KEY?: string;
}

export interface Config {
  environment: string;
  jwtSecret: string;
  jwtExpireDays: number;
  corsOrigins: string[];
  appTimezone: string;
  dailyAiLimit: number;
  maxUploadMb: number;
  storageQuotaMb: number;
  aiProvider: string;
  geminiApiKey: string;
  geminiModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
  storageBackend: string;
  publicApiUrl: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseBucket: string;
  registrationMode: "open" | "invite" | "closed";
  appUrl: string;
  mailFrom: string;
  resendApiKey: string;
}

const DEV_SECRET = "dev-only-change-me";
const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isFinite(n) ? n : d;
};

export class ConfigError extends Error {}

export function loadConfig(env: Env): Config {
  const cfg: Config = {
    environment: env.ENVIRONMENT || "development",
    jwtSecret: env.JWT_SECRET || DEV_SECRET,
    jwtExpireDays: 30,
    corsOrigins: (env.CORS_ORIGINS || "http://localhost:5173").split(",").map((s) => s.trim()).filter(Boolean),
    appTimezone: env.APP_TIMEZONE || "America/Sao_Paulo",
    dailyAiLimit: num(env.DAILY_AI_LIMIT, 20),
    maxUploadMb: num(env.MAX_UPLOAD_MB, 8),
    storageQuotaMb: num(env.STORAGE_QUOTA_MB, 1024),
    aiProvider: env.AI_PROVIDER || "gemini",
    geminiApiKey: env.GEMINI_API_KEY || "",
    geminiModel: env.GEMINI_MODEL || "",
    anthropicApiKey: env.ANTHROPIC_API_KEY || "",
    anthropicModel: env.ANTHROPIC_MODEL || "",
    storageBackend: env.STORAGE_BACKEND || "memory",
    publicApiUrl: (env.PUBLIC_API_URL || "http://localhost:8787").replace(/\/$/, ""),
    supabaseUrl: (env.SUPABASE_URL || "").replace(/\/$/, ""),
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
    supabaseBucket: env.SUPABASE_BUCKET || "meal-photos",
    registrationMode: "open",
    appUrl: (env.APP_URL || "http://localhost:5173").replace(/\/$/, ""),
    mailFrom: env.MAIL_FROM || "NutriFoto <onboarding@resend.dev>",
    resendApiKey: env.RESEND_API_KEY || "",
  };
  const mode = (env.REGISTRATION_MODE || "").toLowerCase();
  cfg.registrationMode = (env.ALLOW_REGISTRATION ?? "true").toLowerCase() === "false" ? "closed" : mode === "invite" || mode === "closed" || mode === "open" ? mode : "open";
  const problems = validateEnv(env, cfg);
  if (problems.length) {
    throw new ConfigError(`Configuração incompleta ou inválida:\n- ${problems.join("\n- ")}`);
  }
  return cfg;
}

/** Lista, em português, o que está faltando ou errado. Vazia = tudo certo. */
export function validateEnv(env: Env, cfg: Config): string[] {
  const problems: string[] = [];
  const set = (v: string | undefined) => v !== undefined && v !== "";

  if (cfg.environment === "production" && (cfg.jwtSecret === DEV_SECRET || cfg.jwtSecret.length < 16)) {
    problems.push("JWT_SECRET não definida (mínimo de 16 caracteres) em produção. Defina com: npx wrangler secret put JWT_SECRET");
  }
  if (set(env.REGISTRATION_MODE) && !["open", "invite", "closed"].includes(env.REGISTRATION_MODE!.toLowerCase())) {
    problems.push(`REGISTRATION_MODE inválido: ${JSON.stringify(env.REGISTRATION_MODE)}. Use open, invite ou closed.`);
  }
  if (!["supabase", "memory"].includes(cfg.storageBackend)) {
    problems.push(`STORAGE_BACKEND inválido: ${JSON.stringify(cfg.storageBackend)}. Use supabase ou memory.`);
  }
  if (cfg.storageBackend === "supabase") {
    if (!cfg.supabaseUrl) problems.push("SUPABASE_URL não definida (obrigatória com STORAGE_BACKEND=supabase). Está em Project Settings > API do Supabase.");
    if (!cfg.supabaseServiceRoleKey) problems.push("SUPABASE_SERVICE_ROLE_KEY não definida (obrigatória com STORAGE_BACKEND=supabase). Defina com: npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY");
  }
  for (const name of ["DAILY_AI_LIMIT", "MAX_UPLOAD_MB", "STORAGE_QUOTA_MB"] as const) {
    if (set(env[name]) && !Number.isFinite(Number(env[name]))) problems.push(`${name} precisa ser um número, mas veio ${JSON.stringify(env[name])}.`);
  }
  return problems;
}
