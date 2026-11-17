/** Estimativa de metas diárias (Mifflin-St Jeor). É um ponto de partida, não prescrição: ajuste pelo que a balança mostrar. */
export const ACTIVITY = [
  { id: "sedentario", label: "Pouco ativo (quase sem exercício)", factor: 1.2 },
  { id: "leve", label: "Leve (1 a 3 treinos por semana)", factor: 1.375 },
  { id: "moderado", label: "Moderado (3 a 5 treinos por semana)", factor: 1.55 },
  { id: "intenso", label: "Intenso (6 a 7 treinos por semana)", factor: 1.725 },
];

export const OBJECTIVES = [
  { id: "ganhar", label: "Ganhar massa", kcal: 400, protein: 1.8 },
  { id: "manter", label: "Manter", kcal: 0, protein: 1.4 },
  { id: "perder", label: "Perder peso", kcal: -400, protein: 1.8 },
];

export const MIN_AGE = 18;

export function imc(weightKg, heightCm) {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

export function imcLabel(v) {
  if (v < 18.5) return "abaixo do peso";
  if (v < 25) return "faixa normal";
  if (v < 30) return "sobrepeso";
  return "obesidade";
}

/** Retorna null se os dados não servem (idade menor que 18 ou valores fora do razoável). */
export function calcGoals({ sex, age, heightCm, weightKg, activity, objective }) {
  const a = Number(age), h = Number(heightCm), w = Number(weightKg);
  if (!(a >= MIN_AGE && a <= 90 && h >= 120 && h <= 230 && w >= 30 && w <= 300)) return null;
  const act = ACTIVITY.find((x) => x.id === activity) ?? ACTIVITY[1];
  const obj = OBJECTIVES.find((x) => x.id === objective) ?? OBJECTIVES[0];
  const bmr = 10 * w + 6.25 * h - 5 * a + (sex === "f" ? -161 : 5);
  const tdee = bmr * act.factor;
  const kcal = Math.round(Math.max(tdee + obj.kcal, bmr) / 50) * 50; // nunca abaixo do metabolismo basal
  const protein = Math.round(w * obj.protein);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const water = Math.round((w * 35) / 50) * 50;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), daily_kcal_goal: kcal, protein_goal_g: protein, carbs_goal_g: carbs, fat_goal_g: fat, water_goal_ml: water };
}
