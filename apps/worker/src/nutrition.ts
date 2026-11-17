import type { ItemIn } from "./schemas";

export const round1 = (n: number) => Math.round(n * 10) / 10;

export interface Totals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

/** Muda a porção e recalcula calorias e macros na mesma proporção. */
export function recalcItem(item: ItemIn, newGrams: number): ItemIn {
  if (!(newGrams > 0)) throw new Error("A porção precisa ser maior que zero.");
  const f = newGrams / item.grams;
  return {
    ...item,
    kcal: round1(item.kcal * f),
    protein_g: round1(item.protein_g * f),
    carbs_g: round1(item.carbs_g * f),
    fat_g: round1(item.fat_g * f),
    fiber_g: round1(item.fiber_g * f),
    grams: round1(newGrams),
    edited_by_user: true,
  };
}

export const scaleItems = (items: ItemIn[], factor: number) => items.map((i) => recalcItem(i, i.grams * factor));

export function sumTotals(items: Pick<ItemIn, "kcal" | "protein_g" | "carbs_g" | "fat_g" | "fiber_g">[]): Totals {
  const t: Totals = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
  for (const i of items) {
    t.kcal += i.kcal;
    t.protein_g += i.protein_g;
    t.carbs_g += i.carbs_g;
    t.fat_g += i.fat_g;
    t.fiber_g += i.fiber_g;
  }
  return { kcal: round1(t.kcal), protein_g: round1(t.protein_g), carbs_g: round1(t.carbs_g), fat_g: round1(t.fat_g), fiber_g: round1(t.fiber_g) };
}
