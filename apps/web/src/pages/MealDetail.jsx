import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Star, Trash2 } from "lucide-react";
import { api } from "../lib/api.js";
import { fmtDayLong, fmtTime, MEAL_TYPES, sumTotals } from "../lib/nutrition.js";
import MealEditor from "../components/MealEditor.jsx";
import ErrorNotice from "../components/ErrorNotice.jsx";
import { Confirm, Dialog, Notice, Segmented, Spinner } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";

export default function MealDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [gone, setGone] = useState(false); // depois de apagar, não buscar a refeição de novo (daria 404)
  const meal = useQuery({ queryKey: ["meal", id], queryFn: () => api.meal(id), enabled: !gone });

  const [items, setItems] = useState(null);
  const [mealType, setMealType] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [favDialog, setFavDialog] = useState(false);
  const [favName, setFavName] = useState("");

  useEffect(() => {
    if (meal.data) {
      setItems(meal.data.items.map(({ id: _id, ...rest }) => rest));
      setMealType(meal.data.meal_type);
    }
  }, [meal.data]);

  const refresh = () => { qc.invalidateQueries(); };

  const save = useMutation({
    mutationFn: () => api.updateMeal(id, { meal_type: mealType, items: items.map((i) => ({ ...i, name: i.name.trim() })) }),
    onSuccess: () => { refresh(); toast("Alterações salvas"); },
  });
  const remove = useMutation({
    mutationFn: () => api.deleteMeal(id),
    onSuccess: () => {
      setGone(true);
      qc.removeQueries({ queryKey: ["meal", id] });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "meal" });
      toast("Refeição apagada"); nav("/historico", { replace: true }); },
  });
  const duplicate = useMutation({
    mutationFn: () => api.duplicateMeal(id),
    onSuccess: (m) => { refresh(); toast("Duplicada para agora"); nav(`/refeicao/${m.id}`); },
  });
  const favorite = useMutation({
    mutationFn: () => api.createFavorite({ name: favName.trim(), from_meal_id: Number(id) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["favorites"] }); setFavDialog(false); toast("Adicionada aos favoritos"); },
  });

  if (gone) return null; // apagada: a navegação para o histórico já está em curso
  if (meal.isLoading || !items) return meal.error ? <ErrorNotice error={meal.error} /> : <Spinner />;

  const m = meal.data;
  const dirty =
    JSON.stringify(items) !== JSON.stringify(m.items.map(({ id: _id, ...rest }) => rest)) || mealType !== m.meal_type;
  const invalid = items.length === 0 || items.some((i) => !i.name.trim());

  return (
    <>
      <header className="mb-4 flex items-center gap-2">
        <button className="btn-quiet !w-11 !px-0" onClick={() => nav(-1)} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-xl font-bold leading-tight first-letter:uppercase">{fmtDayLong(m.eaten_at)}</h1>
          <p className="num text-sm text-soft">{fmtTime(m.eaten_at)}</p>
        </div>
      </header>

      {m.photo_url && <img src={m.photo_url} alt="Foto da refeição" className="mb-3 aspect-[4/3] w-full rounded-lg object-cover" />}
      {m.ai_status === "skipped" && (
        <div className="mb-3"><Notice tone="warn" title="Sem análise">Esta foto foi salva sem estimativa. Adicione os alimentos abaixo.</Notice></div>
      )}
      {m.notes && <p className="mb-3 text-soft">“{m.notes}”</p>}

      <div className="mb-3">
        <Segmented label="Tipo da refeição" options={MEAL_TYPES} value={mealType} onChange={setMealType} />
      </div>

      <MealEditor items={items} setItems={setItems} />

      {save.error && <div className="mt-3"><ErrorNotice error={save.error} /></div>}
      <button className="btn-primary mt-4 w-full" disabled={!dirty || invalid || save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Salvando…" : dirty ? "Salvar alterações" : "Nada para salvar"}
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn-quiet" onClick={() => duplicate.mutate()} disabled={duplicate.isPending || dirty}>
          <Copy className="h-5 w-5" aria-hidden="true" /> Duplicar
        </button>
        <button className="btn-quiet" onClick={() => { setFavName(m.items[0]?.name || ""); setFavDialog(true); }} disabled={dirty || m.items.length === 0}>
          <Star className="h-5 w-5" aria-hidden="true" /> Favoritar
        </button>
      </div>
      <button className="btn-danger mt-2 w-full" onClick={() => setConfirmDelete(true)}>
        <Trash2 className="h-5 w-5" aria-hidden="true" /> Apagar refeição
      </button>

      {confirmDelete && (
        <Confirm
          title="Apagar esta refeição?"
          message="A refeição e a foto serão removidas de vez."
          confirmLabel="Apagar"
          danger
          onConfirm={() => remove.mutate()}
          onClose={() => setConfirmDelete(false)}
        />
      )}
      {favDialog && (
        <Dialog title="Salvar nos favoritos" onClose={() => setFavDialog(false)}>
          <label htmlFor="favname" className="label">Nome do favorito</label>
          <input id="favname" className="input mb-3" maxLength={100} value={favName} onChange={(e) => setFavName(e.target.value)} />
          <p className="num mb-3 text-sm text-soft">{sumTotals(m.items).kcal} kcal no total</p>
          {favorite.error && <div className="mb-3"><ErrorNotice error={favorite.error} /></div>}
          <button className="btn-primary w-full" disabled={!favName.trim() || favorite.isPending} onClick={() => favorite.mutate()}>Salvar</button>
        </Dialog>
      )}
    </>
  );
}
