import { BaseProvider } from "./base";

const DEMO = {
  items: [
    { name: "Arroz branco cozido", grams: 150, kcal: 195, protein_g: 3.8, carbs_g: 42.0, fat_g: 0.4, fiber_g: 0.6, confidence: "alta" },
    { name: "Feijão carioca", grams: 100, kcal: 76, protein_g: 4.8, carbs_g: 13.6, fat_g: 0.5, fiber_g: 8.5, confidence: "media" },
    { name: "Frango grelhado", grams: 120, kcal: 198, protein_g: 37.2, carbs_g: 0.0, fat_g: 4.3, fiber_g: 0.0, confidence: "alta" },
    { name: "Salada de alface e tomate", grams: 60, kcal: 12, protein_g: 0.7, carbs_g: 2.4, fat_g: 0.1, fiber_g: 1.0, confidence: "baixa" },
  ],
  notes: "Resposta simulada (modo de teste, sem IA real).",
};

/** Provedor de teste: não chama nenhuma API. Use AI_PROVIDER=mock para desenvolver sem chave. */
export class MockProvider extends BaseProvider {
  name = "mock";

  protected async chamarImagem() {
    return JSON.stringify(DEMO);
  }

  protected async chamarTexto(texto: string, itensAtuais: Record<string, unknown>[] | null) {
    if (itensAtuais?.length) {
      const items = itensAtuais.map((i) => ({ ...i }));
      const t = texto.trim();
      items[0]!.name = (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, 120);
      items[0]!.confidence = "media";
      return JSON.stringify({ items, notes: "Correção simulada (modo de teste)." });
    }
    const items = texto
      .split(/,| e /)
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 10)
      .map((p) => ({ name: p.slice(0, 120), grams: 100, kcal: 120, protein_g: 5, carbs_g: 15, fat_g: 4, fiber_g: 1, confidence: "baixa" }));
    return JSON.stringify({ items, notes: "Estimativa simulada (modo de teste)." });
  }
}
