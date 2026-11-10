import { fmt } from "../lib/nutrition.js";

/** Versão minúscula para as linhas do histórico: níveis relativos de proteína, carboidrato e gordura da refeição. */
export function MiniTray({ totals, className = "" }) {
  const kcal = { p: totals.protein_g * 4, c: totals.carbs_g * 4, f: totals.fat_g * 9 };
  const max = Math.max(kcal.p, kcal.c, kcal.f, 1);
  const lvl = (v) => Math.max(v / max, v > 0 ? 0.15 : 0);
  const cells = [
    { x: 1, y: 1, w: 15, h: 22, v: lvl(kcal.c), cls: "fill-carb" },
    { x: 18, y: 1, w: 13, h: 10.5, v: lvl(kcal.p), cls: "fill-protein" },
    { x: 18, y: 12.5, w: 13, h: 10.5, v: lvl(kcal.f), cls: "fill-fat" },
  ];
  return (
    <svg viewBox="0 0 32 24" className={className} aria-hidden="true">
      <rect width="32" height="24" rx="4" className="fill-night" />
      {cells.map((c, i) => (
        <g key={i}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="2" className="fill-ground" />
          <rect x={c.x} y={c.y + c.h * (1 - c.v)} width={c.w} height={c.h * c.v} rx="2" className={c.cls} />
        </g>
      ))}
    </svg>
  );
}
