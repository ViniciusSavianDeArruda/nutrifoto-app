import { analysisResult, type AnalysisResult, type ItemIn } from "../schemas";

export class AIError extends Error {
  code = "ai_error";
  constructor(message = "Não foi possível analisar agora.") {
    super(message);
  }
}
export class AIQuotaError extends AIError {
  override code = "ai_quota";
  constructor(m = "O limite diário da IA foi atingido. Tente mais tarde ou registre por texto.") { super(m); }
}
export class AIInvalidResponse extends AIError {
  override code = "ai_invalid";
  constructor(m = "A IA devolveu uma resposta que não consegui entender.") { super(m); }
}
export class AIUnavailable extends AIError {
  override code = "ai_unavailable";
  constructor(m = "O serviço de IA está indisponível no momento.") { super(m); }
}
export class AIConfigError extends AIError {
  override code = "ai_config";
  constructor(m = "A IA não está configurada no servidor.") { super(m); }
}

export const AI_STATUS: Record<string, 429 | 502 | 503> = { ai_quota: 429, ai_invalid: 502, ai_unavailable: 502, ai_config: 503 };

/** Converte o texto devolvido pelo modelo em AnalysisResult validado. */
export function parseAnalysis(raw: string): AnalysisResult {
  const text = (raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!text) throw new AIInvalidResponse();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    const a = text.indexOf("{");
    const b = text.lastIndexOf("}");
    if (a === -1 || b <= a) throw new AIInvalidResponse();
    try {
      data = JSON.parse(text.slice(a, b + 1));
    } catch {
      throw new AIInvalidResponse();
    }
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new AIInvalidResponse();
  const parsed = analysisResult.safeParse(data);
  if (!parsed.success) throw new AIInvalidResponse();
  return parsed.data;
}

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Interface única de análise. Subclasses só falam com a API do provedor e devolvem texto. */
export abstract class BaseProvider {
  abstract name: string;
  quotaBackoffMs = 1500;
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms));

  analisarImagem(imagem: Uint8Array, mime = "image/jpeg") {
    return this.executar(() => this.chamarImagem(imagem, mime));
  }

  analisarTexto(texto: string, itensAtuais?: ItemIn[] | null) {
    const atuais = itensAtuais?.length ? itensAtuais.map(({ edited_by_user: _e, ...rest }) => rest) : null;
    return this.executar(() => this.chamarTexto(texto, atuais));
  }

  /** No máximo 1 retry: curto backoff na cota, repetição direta se o JSON vier inválido. */
  private async executar(chamada: () => Promise<string>): Promise<AnalysisResult> {
    for (const tentativa of [0, 1]) {
      try {
        return parseAnalysis(await chamada());
      } catch (e) {
        if (e instanceof AIQuotaError) {
          if (tentativa === 1) throw e;
          await this.sleep(this.quotaBackoffMs);
        } else if (e instanceof AIInvalidResponse) {
          if (tentativa === 1) throw e;
        } else {
          throw e;
        }
      }
    }
    throw new AIInvalidResponse();
  }

  protected abstract chamarImagem(imagem: Uint8Array, mime: string): Promise<string>;
  protected abstract chamarTexto(texto: string, itensAtuais: Record<string, unknown>[] | null): Promise<string>;
}
