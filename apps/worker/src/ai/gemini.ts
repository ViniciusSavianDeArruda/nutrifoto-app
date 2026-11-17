import { AIConfigError, AIInvalidResponse, AIQuotaError, AIUnavailable, BaseProvider, toBase64 } from "./base";
import { IMAGE_USER_PROMPT, SYSTEM_PROMPT, textUserPrompt } from "./prompt";

export class GeminiProvider extends BaseProvider {
  name = "gemini";

  constructor(private apiKey: string, private model: string, private doFetch: typeof fetch = fetch) {
    super();
    if (!apiKey) throw new AIConfigError("GEMINI_API_KEY não configurada.");
    if (!model) throw new AIConfigError("GEMINI_MODEL não configurado (defina o nome do modelo no ambiente).");
  }

  protected chamarImagem(imagem: Uint8Array, mime: string) {
    return this.gerar([{ text: IMAGE_USER_PROMPT }, { inline_data: { mime_type: mime, data: toBase64(imagem) } }]);
  }

  protected chamarTexto(texto: string, itensAtuais: Record<string, unknown>[] | null) {
    return this.gerar([{ text: textUserPrompt(texto, itensAtuais) }]);
  }

  private async gerar(parts: unknown[]): Promise<string> {
    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    };
    let resp: Response;
    try {
      resp = await this.doFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify(body),
      });
    } catch {
      throw new AIUnavailable();
    }
    if (resp.status === 429) throw new AIQuotaError();
    if ([400, 401, 403, 404].includes(resp.status)) throw new AIConfigError(`O Gemini recusou a requisição (${resp.status}). Confira a chave e o modelo.`);
    if (resp.status >= 500) throw new AIUnavailable();
    try {
      const data = (await resp.json()) as { candidates: { content: { parts: { text?: string }[] } }[] };
      return data.candidates[0]!.content.parts.map((p) => p.text ?? "").join("");
    } catch {
      throw new AIInvalidResponse();
    }
  }
}
