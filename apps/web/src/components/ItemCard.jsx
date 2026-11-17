import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Minus, Plus, Trash2 } from "lucide-react";
import { ConfidenceBadge, NumberField } from "./ui.jsx";
import { fmt, rescaleItem } from "../lib/nutrition.js";

const MACROS = [
  { k: "protein_g", label: "P", dot: "bg-protein", name: "Proteína" },
  { k: "carbs_g", label: "C", dot: "bg-carb", name: "Carboidrato" },
  { k: "fat_g", label: "G", dot: "bg-fat", name: "Gordura" },
  { k: "fiber_g", label: "Fibra", dot: "bg-fiber", name: "Fibra" },
];

export function MacroLine({ t, className = "" }) {
  return (
    <ul className={`num flex flex-wrap gap-x-3 gap-y-1 text-[0.9375rem] text-soft ${className}`} aria-label="Macronutrientes">
      {MACROS.map((m) => (
        <li key={m.k} className="inline-flex items-center gap-1" title={m.name}>
          <span className={`h-2 w-2 rounded-full ${m.dot}`} aria-hidden="true" />
          <span className="font-semibold text-ink">{m.label}</span>
          <span>{fmt(t[m.k])} g</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Cartão editável de um alimento. Mudar os gramas recalcula calorias e macros na mesma proporção;
 * "Ajustar valores" permite corrigir cada número à mão.
 */
export default function ItemCard({ item, index, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  // Ponto de partida das contas de proporção: evita acumular arredondamentos enquanto a pessoa digita os gramas.
  const base = useRef(item);
  const setField = (k, v) => onChange({ ...item, [k]: v, edited_by_user: true });
  const step = (delta) => {
    const g = Math.max(5, Math.round((item.grams + delta) * 10) / 10);
    onChange(rescaleItem(item, g));
  };
  const commitGrams = (g) => onChange(rescaleItem(base.current, g));
  const id = `item-${index}`;

  return (
    <li className="card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-name`} className="sr-only">Nome do alimento</label>
          <input
            id={`${id}-name`}
            className="w-full min-h-[44px] rounded-md border border-transparent bg-transparent px-1 text-lg font-bold hover:border-line focus:border-line"
            value={item.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Nome do alimento"
          />
          <div className="mt-1 flex flex-wrap items-center gap-2 px-1">
            <ConfidenceBadge level={item.confidence} />
            {item.edited_by_user && <span className="text-[0.8125rem] text-soft">editado por você</span>}
          </div>
        </div>
        <button className="btn-quiet !min-h-[44px] !w-11 !px-0 shrink-0" onClick={onRemove} aria-label={`Remover ${item.name || "alimento"}`}>
          <Trash2 className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <div className="flex items-end gap-1.5">
          <button className="btn-quiet !w-11 !px-0" onClick={() => step(-10)} aria-label="Diminuir 10 gramas">
            <Minus className="h-5 w-5" aria-hidden="true" />
          </button>
          <NumberField
            id={`${id}-g`}
            label="Porção"
            suffix="g"
            min={1}
            allowZero={false}
            value={item.grams}
            onFocus={() => { base.current = item; }}
            onValue={commitGrams}
            max={5000}
            className="w-28"
          />
          <button className="btn-quiet !w-11 !px-0" onClick={() => step(10)} aria-label="Aumentar 10 gramas">
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="num ml-auto text-right leading-none">
          <span className="text-[2rem] font-semibold">{fmt(item.kcal)}</span>
          <span className="ml-1 text-sm text-soft">kcal</span>
        </p>
      </div>

      <MacroLine t={item} className="mt-3" />

      <button
        className="mt-2 flex min-h-[44px] items-center gap-1 text-sm font-semibold text-night"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Ajustar valores
        {open ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
      </button>
      {open && (
        <div className="mt-1 grid grid-cols-2 gap-3">
          <NumberField id={`${id}-kcal`} label="Calorias" suffix="kcal" value={item.kcal} onValue={(v) => setField("kcal", v)} />
          <NumberField id={`${id}-p`} label="Proteína" suffix="g" value={item.protein_g} onValue={(v) => setField("protein_g", v)} />
          <NumberField id={`${id}-c`} label="Carboidrato" suffix="g" value={item.carbs_g} onValue={(v) => setField("carbs_g", v)} />
          <NumberField id={`${id}-f`} label="Gordura" suffix="g" value={item.fat_g} onValue={(v) => setField("fat_g", v)} />
          <NumberField id={`${id}-fi`} label="Fibra" suffix="g" value={item.fiber_g} onValue={(v) => setField("fiber_g", v)} />
        </div>
      )}
    </li>
  );
}
