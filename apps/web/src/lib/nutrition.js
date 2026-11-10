const r1 = (n) => Math.round(n * 10) / 10;

export function rescaleItem(item, grams) {
  const g = Number(grams);
  if (!Number.isFinite(g) || g <= 0 || !item.grams) return { ...item, grams: g };
  const f = g / item.grams;
  return {
    ...item,
    grams: r1(g),
    kcal: r1(item.kcal * f),
    protein_g: r1(item.protein_g * f),
    carbs_g: r1(item.carbs_g * f),
    fat_g: r1(item.fat_g * f),
    fiber_g: r1(item.fiber_g * f),
    edited_by_user: true,
  };
}

export function sumTotals(items) {
  const t = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
  for (const i of items) for (const k of Object.keys(t)) t[k] += Number(i[k]) || 0;
  for (const k of Object.keys(t)) t[k] = r1(t[k]);
  return t;
}

export const emptyItem = () => ({
  name: "", grams: 100, kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, confidence: "media", edited_by_user: true,
});

export const MEAL_TYPES = [
  { id: "cafe_da_manha", label: "Café da manhã", short: "Café" },
  { id: "almoco", label: "Almoço" },
  { id: "lanche", label: "Lanche" },
  { id: "jantar", label: "Jantar" },
  { id: "outro", label: "Outro" },
];
export const mealLabel = (id) => MEAL_TYPES.find((m) => m.id === id)?.label ?? "Refeição";

/** Sugere o tipo da refeição pela hora do dia. */
export function guessMealType(date = new Date()) {
  const h = date.getHours();
  if (h < 10) return "cafe_da_manha";
  if (h < 15) return "almoco";
  if (h < 18) return "lanche";
  if (h < 23) return "jantar";
  return "outro";
}

export const CONFIDENCE = {
  alta: { label: "Confiança alta", short: "alta" },
  media: { label: "Confiança média", short: "média" },
  baixa: { label: "Confiança baixa", short: "baixa" },
};

export const fmt = (n, d = 0) => Number(n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function fmtBytes(b) {
  if (b < 1024 * 1024) return `${fmt(b / 1024, 0)} KB`;
  if (b < 1024 ** 3) return `${fmt(b / 1024 / 1024, 1)} MB`;
  return `${fmt(b / 1024 ** 3, 2)} GB`;
}

export const isoDay = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const fmtTime = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
export const fmtDayLong = (iso) =>
  new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
