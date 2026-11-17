import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Wand2 } from "lucide-react";
import { api } from "../lib/api.js";
import { emptyItem, fmt, sumTotals } from "../lib/nutrition.js";
import ItemCard, { MacroLine } from "./ItemCard.jsx";
import ErrorNotice from "./ErrorNotice.jsx";

/** Lista de alimentos editável + totais + correção por texto. Usada ao revisar e ao editar. */
export default function MealEditor({ items, setItems, allowTextFix = true }) {
  const qc = useQueryClient();
  const [fix, setFix] = useState("");
  const [showFix, setShowFix] = useState(false);
  const totals = sumTotals(items);

  const correct = useMutation({
    mutationFn: () => api.analyzeText(fix.trim(), items.length ? items : null),
    onSuccess: (out) => {
      qc.invalidateQueries({ queryKey: ["usage"] });
      setItems(out.items);
      setFix("");
      setShowFix(false);
    },
  });

  return (
    <>
      <div className="card sticky top-2 z-10 mb-3 p-3 shadow-sm" aria-live="polite">
        <p className="num leading-none">
          <span className="text-[2.25rem] font-semibold">{fmt(totals.kcal)}</span>
          <span className="ml-1 text-soft">kcal no total</span>
        </p>
        <MacroLine t={totals} className="mt-2" />
      </div>

      {items.length === 0 ? (
        <p className="card px-4 py-6 text-center text-soft">Nenhum alimento ainda. Adicione um abaixo ou descreva em texto.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it, i) => (
            <ItemCard
              key={i}
              item={it}
              index={i}
              onChange={(n) => setItems(items.map((x, j) => (j === i ? n : x)))}
              onRemove={() => setItems(items.filter((_, j) => j !== i))}
            />
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-quiet flex-1" onClick={() => setItems([...items, emptyItem()])}>
          <Plus className="h-5 w-5" aria-hidden="true" /> Adicionar alimento
        </button>
        {allowTextFix && (
          <button className="btn-quiet flex-1" onClick={() => setShowFix((s) => !s)} aria-expanded={showFix}>
            <Wand2 className="h-5 w-5" aria-hidden="true" /> Corrigir com texto
          </button>
        )}
      </div>

      {showFix && (
        <div className="card mt-3 p-3">
          <label htmlFor="fix" className="label">
            {items.length ? "O que a IA errou?" : "Descreva a refeição"}
          </label>
          <textarea
            id="fix"
            className="input min-h-[88px] py-2"
            placeholder={items.length ? "Ex.: o arroz era integral e o frango tinha uns 100 g" : "Ex.: prato de macarrão com carne moída"}
            value={fix}
            onChange={(e) => setFix(e.target.value)}
            maxLength={500}
          />
          {correct.error && <div className="mt-2"><ErrorNotice error={correct.error} /></div>}
          <button className="btn-primary mt-2 w-full" disabled={fix.trim().length < 2 || correct.isPending} onClick={() => correct.mutate()}>
            {correct.isPending ? "Corrigindo…" : "Corrigir"}
          </button>
          <p className="mt-2 text-[0.8125rem] text-soft">Isso conta como uma análise do dia. Seus ajustes manuais podem mudar.</p>
        </div>
      )}
    </>
  );
}
