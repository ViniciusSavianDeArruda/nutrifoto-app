import { describe, expect, it } from "vitest";
import { calcGoals, imc, imcLabel } from "./goals.js";

const base = { sex: "m", age: 22, heightCm: 169, weightKg: 58, activity: "moderado", objective: "ganhar" };

describe("calcGoals", () => {
  it("calcula o metabolismo basal pela fórmula de Mifflin-St Jeor", () => {
    expect(calcGoals(base).bmr).toBe(1531);
  });
  it("ganhar massa fica acima do gasto; manter fica igual", () => {
    const g = calcGoals(base), m = calcGoals({ ...base, objective: "manter" });
    expect(g.daily_kcal_goal).toBeGreaterThan(m.daily_kcal_goal);
    expect(Math.abs(m.daily_kcal_goal - m.tdee)).toBeLessThanOrEqual(25);
  });
  it("proteína por kg e macros fecham com as calorias", () => {
    const g = calcGoals(base);
    expect(g.protein_goal_g).toBe(104);
    const kcal = g.protein_goal_g * 4 + g.carbs_goal_g * 4 + g.fat_goal_g * 9;
    expect(Math.abs(kcal - g.daily_kcal_goal)).toBeLessThan(10);
  });
  it("perder peso nunca vai abaixo do metabolismo basal", () => {
    const g = calcGoals({ ...base, objective: "perder", activity: "sedentario" });
    expect(g.daily_kcal_goal).toBeGreaterThanOrEqual(g.bmr - 25);
  });
  it("recusa menores de 18 e valores absurdos", () => {
    expect(calcGoals({ ...base, age: 16 })).toBeNull();
    expect(calcGoals({ ...base, heightCm: 20 })).toBeNull();
    expect(calcGoals({ ...base, weightKg: "" })).toBeNull();
  });
  it("IMC", () => {
    expect(imc(58, 169).toFixed(1)).toBe("20.3");
    expect(imcLabel(20.3)).toBe("faixa normal");
  });
});
