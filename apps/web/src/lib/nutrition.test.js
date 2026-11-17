import { describe, expect, it } from "vitest";
import { emptyItem, fmt, fmtBytes, guessMealType, rescaleItem, sumTotals } from "./nutrition.js";

const arroz = { name: "Arroz", grams: 150, kcal: 195, protein_g: 3.8, carbs_g: 42, fat_g: 0.4, fiber_g: 0.5, confidence: "alta" };

describe("rescaleItem", () => {
  it("escala todos os valores na mesma proporção e marca como editado", () => {
    const r = rescaleItem(arroz, 300);
    expect(r).toMatchObject({ grams: 300, kcal: 390, protein_g: 7.6, carbs_g: 84, edited_by_user: true });
  });
  it("reduzir a porção reduz as calorias", () => {
    expect(rescaleItem(arroz, 75).kcal).toBe(97.5);
  });
  it("não deixa o valor quebrar com gramas inválidas", () => {
    expect(rescaleItem(arroz, 0).kcal).toBe(195);
    expect(rescaleItem(arroz, NaN).kcal).toBe(195);
  });
  it("recalcular sempre a partir da base evita acumular arredondamento (por isso o app guarda a base)", () => {
    const viaBase = rescaleItem(arroz, 200);
    const viaSteps = rescaleItem(rescaleItem(rescaleItem(arroz, 2), 20), 200); // digitando "2", "20", "200"
    expect(viaBase.protein_g).toBe(5.1);
    expect(viaSteps.protein_g).not.toBe(viaBase.protein_g);
  });
});

describe("sumTotals", () => {
  it("soma e arredonda a 1 casa", () => {
    const t = sumTotals([arroz, { ...arroz, kcal: 100.04, protein_g: 0.06 }]);
    expect(t.kcal).toBe(295);
    expect(t.protein_g).toBe(3.9);
  });
  it("lista vazia dá zero", () => {
    expect(sumTotals([])).toEqual({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 });
  });
});

describe("helpers", () => {
  it("sugere o tipo da refeição pela hora", () => {
    const at = (h) => guessMealType(new Date(2026, 0, 1, h));
    expect([at(7), at(12), at(16), at(20), at(23)]).toEqual(["cafe_da_manha", "almoco", "lanche", "jantar", "outro"]);
  });
  it("formata números em pt-BR", () => {
    expect(fmt(1234.5)).toBe("1.235");
    expect(fmt(72.46, 1)).toBe("72,5");
    expect(fmtBytes(22 * 1024)).toBe("22 KB");
    expect(fmtBytes(1024 ** 3)).toBe("1,00 GB");
  });
  it("item novo começa editável e válido", () => {
    expect(emptyItem()).toMatchObject({ grams: 100, edited_by_user: true });
  });
});
