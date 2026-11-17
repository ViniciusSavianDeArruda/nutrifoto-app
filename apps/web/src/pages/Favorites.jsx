import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Star, Trash2 } from "lucide-react";
import { api } from "../lib/api.js";
import { fmt, mealLabel } from "../lib/nutrition.js";
import { MacroLine } from "../components/ItemCard.jsx";
import ErrorNotice from "../components/ErrorNotice.jsx";
import { Confirm, Empty, Spinner } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";

export default function Favorites() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [toDelete, setToDelete] = useState(null);
  const [scale, setScale] = useState({});
  const list = useQuery({ queryKey: ["favorites"], queryFn: api.favorites });

  const log = useMutation({
    mutationFn: ({ id, s }) => api.logFavorite(id, { scale: s }),
    onSuccess: () => { qc.invalidateQueries(); toast("Refeição registrada"); nav("/"); },
  });
  const del = useMutation({
    mutationFn: (id) => api.deleteFavorite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  return (
    <>
      <header className="mb-4 flex items-center gap-2">
        <button className="btn-quiet !w-11 !px-0" onClick={() => nav(-1)} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="text-xl font-bold">Favoritos</h1>
      </header>

      {list.isLoading && <Spinner />}
      <ErrorNotice error={list.error || log.error} />
      {list.data?.length === 0 && (
        <div className="card">
          <Empty icon={Star} title="Nenhum favorito ainda">Abra uma refeição do histórico e toque em Favoritar.</Empty>
        </div>
      )}

      <ul className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0 xl:grid-cols-3">
        {list.data?.map((f) => {
          const s = scale[f.id] ?? 1;
          return (
            <li key={f.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{f.name}</p>
                  <p className="text-sm text-soft">{f.items.map((i) => i.name).join(", ")}</p>
                </div>
                <button className="btn-quiet !w-11 !px-0 shrink-0" onClick={() => setToDelete(f)} aria-label={`Apagar favorito ${f.name}`}>
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <p className="num mt-2 leading-none">
                <span className="text-[2rem] font-semibold">{fmt(f.totals.kcal * s)}</span>
                <span className="ml-1 text-soft">kcal · {mealLabel(f.meal_type)}</span>
              </p>
              <MacroLine t={{ protein_g: f.totals.protein_g * s, carbs_g: f.totals.carbs_g * s, fat_g: f.totals.fat_g * s, fiber_g: f.totals.fiber_g * s }} className="mt-2" />
              <div className="mt-3 flex items-center gap-2">
                <label htmlFor={`s-${f.id}`} className="sr-only">Porção</label>
                <select id={`s-${f.id}`} className="input !w-auto" value={s} onChange={(e) => setScale({ ...scale, [f.id]: Number(e.target.value) })}>
                  {[0.5, 0.75, 1, 1.5, 2].map((v) => <option key={v} value={v}>{v === 1 ? "1 porção" : `${String(v).replace(".", ",")}×`}</option>)}
                </select>
                <button className="btn-primary flex-1" disabled={log.isPending} onClick={() => log.mutate({ id: f.id, s })}>Registrar agora</button>
              </div>
            </li>
          );
        })}
      </ul>

      {toDelete && (
        <Confirm
          title="Apagar favorito?"
          message={`“${toDelete.name}” sai da lista. As refeições já registradas não mudam.`}
          confirmLabel="Apagar"
          danger
          onConfirm={() => del.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}
