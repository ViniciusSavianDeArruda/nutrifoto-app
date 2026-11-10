import type { Config } from "../env";
import { AIConfigError, type BaseProvider } from "./base";
import { GeminiProvider } from "./gemini";
import { MockProvider } from "./mock";

export * from "./base";

export function buildProvider(cfg: Config): BaseProvider {
  switch (cfg.aiProvider) {
    case "gemini": return new GeminiProvider(cfg.geminiApiKey, cfg.geminiModel);
    case "mock": return new MockProvider();
    default: throw new AIConfigError(`AI_PROVIDER inválido: ${JSON.stringify(cfg.aiProvider)}. Use gemini ou mock.`);
  }
}
