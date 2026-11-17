import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "../lib/api.js";
import { makeThumb } from "../lib/image.js";
import { MEAL_TYPES } from "../lib/nutrition.js";
import { useDraft } from "../hooks/useDraft.jsx";
import { useToast } from "../components/Toast.jsx";
import MealEditor from "../components/MealEditor.jsx";
import ErrorNotice from "../components/ErrorNotice.jsx";
import { Notice, Segmented } from "../components/ui.jsx";

const toLocalInput = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function Review() {
  const { draft, patch, clear } = useDraft();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [problem, setProblem] = useState(null);
  const saved = useRef(false); // evita que o "sem rascunho → voltar" dispute com a navegação depois de salvar

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        meal_type: draft.mealType,
        eaten_at: new Date(draft.eatenAt).toISOString(),
        notes: draft.userNotes?.trim() || null,
        items: draft.items.map(({ name, grams, kcal, protein_g, carbs_g, fat_g, fiber_g, confidence, edited_by_user }) => ({
          name: name.trim(), grams, kcal, protein_g, carbs_g, fat_g, fiber_g, confidence, edited_by_user: Boolean(edited_by_user),
        })),
        ai_status: draft.aiStatus,
        ai_provider: draft.provider || null,
      };
      const thumb = draft.photo ? await makeThumb(draft.photo) : null;
      return api.createMeal(payload, draft.photo, thumb);
    },
    onSuccess: () => {
      saved.current = true;
      qc.invalidateQueries();
      toast("Refeição salva");
      nav("/", { replace: true });
      clear();
    },
  });

  if (!draft) return saved.current ? null : <Navigate to="/registrar" replace />;

  const setItems = (items) => patch({ items });
  const emptyNames = draft.items.some((i) => !i.name.trim());
  const canSave = (draft.items.length > 0 || draft.photo) && !emptyNames;

  const onSave = () => {
    if (emptyNames) { setProblem("Dê um nome a todos os alimentos antes de salvar."); return; }
    setProblem(null);
    save.mutate();
  };

  return (
    <>
      <header className="mb-4 flex items-center gap-2">
        <button className="btn-quiet !w-11 !px-0" onClick={() => { clear(); nav(-1); }} aria-label="Descartar e voltar">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="text-xl font-bold">Confira a refeição</h1>
      </header>

      {draft.previewUrl && <img src={draft.previewUrl} alt="Foto da refeição" className="mb-3 aspect-[4/3] w-full rounded-lg object-cover" />}

      <div className="mb-3 space-y-2">
        {draft.aiStatus === "analyzed" && (
          <Notice title="Estimativa da IA">
            Os números são uma estimativa e podem errar. Ajuste porções e valores até ficar certo.
            {draft.notes && <span className="mt-1 block text-soft">{draft.notes}</span>}
          </Notice>
        )}
        {draft.aiStatus === "skipped" && (
          <Notice tone="warn" title="Foto sem análise">
            Salve a foto agora e complete depois, ou adicione os alimentos abaixo.
          </Notice>
        )}
      </div>

      <div className="mb-3">
        <Segmented label="Tipo da refeição" options={MEAL_TYPES} value={draft.mealType} onChange={(mealType) => patch({ mealType })} />
      </div>

      <MealEditor items={draft.items} setItems={setItems} />

      <div className="mt-5 grid gap-3">
        <div>
          <label htmlFor="when" className="label">Quando</label>
          <input
            id="when"
            type="datetime-local"
            className="input"
            value={toLocalInput(new Date(draft.eatenAt))}
            max={toLocalInput(new Date())}
            onChange={(e) => e.target.value && patch({ eatenAt: new Date(e.target.value) })}
          />
        </div>
        <div>
          <label htmlFor="notes" className="label">Observação (opcional)</label>
          <input id="notes" className="input" maxLength={500} value={draft.userNotes || ""} onChange={(e) => patch({ userNotes: e.target.value })} />
        </div>
      </div>

      {problem && <div className="mt-3"><Notice tone="error">{problem}</Notice></div>}
      {save.error && <div className="mt-3"><ErrorNotice error={save.error} /></div>}

      <button className="btn-primary mt-5 w-full !min-h-[52px] text-lg" disabled={!canSave || save.isPending} onClick={onSave}>
        {save.isPending ? "Salvando…" : draft.items.length ? "Salvar refeição" : "Salvar só a foto"}
      </button>
    </>
  );
}
