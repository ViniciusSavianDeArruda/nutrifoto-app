import { fmt } from "../lib/nutrition.js";

/**
 * Macros do dia: uma barra de progresso por nutriente (com a meta) e, embaixo,
 * a composição das calorias em uma faixa só. Passar da meta nunca vira alarme: a barra enche e ganha "+".
 */
const ROWS = [
  { key: "carbs_g", label: "Carboidrato", bar: "bg-carb", kcal: 4 },
  { key: "protein_g", label: "Proteína", bar: "bg-protein", kcal: 4 },
  { key: "fat_g", label: "Gordura", bar: "bg-fat", kcal: 9 },
];

export default function Macros({ totals, goals }) {
  const parts = ROWS.map((r) => ({ ...r, cal: (totals[r.key] || 0) * r.kcal }));
  const calTotal = parts.reduce((a, p) => a + p.cal, 0);
  return (
    <div>
      <ul className="space-y-3">
        {ROWS.map((r) => {
          const goal = goals[r.key] || 0;
          const value = totals[r.key] || 0;
          const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
          return (
            <li key={r.key}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className={`h-2.5 w-2.5 rounded-full ${r.bar}`} aria-hidden="true" />
                  {r.label}
                </span>
                <span className="num text-sm text-soft">
                  <span className="text-lg font-semibold text-ink">{fmt(value)}{goal > 0 && value > goal ? " +" : ""}</span> / {fmt(goal)} g
                </span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-ground"
                role="progressbar"
                aria-label={r.label}
                aria-valuemin={0}
                aria-valuemax={goal}
                aria-valuenow={Math.min(value, goal)}
                aria-valuetext={`${fmt(value)} de ${fmt(goal)} gramas`}
              >
                <div className={`h-full rounded-full ${r.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2 text-[0.8125rem] font-semibold text-soft">De onde vêm as calorias</p>
        {calTotal > 0 ? (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-ground" role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.cal / calTotal) * 100)}%`).join(", ")}>
              {parts.map((p) => p.cal > 0 && <div key={p.key} className={p.bar} style={{ width: `${(p.cal / calTotal) * 100}%` }} />)}
            </div>
            <ul className="num mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-soft">
              {parts.map((p) => (
                <li key={p.key} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${p.bar}`} aria-hidden="true" />
                  {p.label} <span className="font-semibold text-ink">{Math.round((p.cal / calTotal) * 100)}%</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-soft">Aparece aqui depois da primeira refeição.</p>
        )}
        <p className="num mt-3 text-sm text-soft">Fibra <span className="font-semibold text-ink">{fmt(totals.fiber_g)}</span> g</p>
      </div>
    </div>
  );
}
