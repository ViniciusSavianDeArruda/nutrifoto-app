import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Image as ImageIcon, PencilLine, Star, Type } from "lucide-react";
import { api } from "../lib/api.js";
import { compressPhoto } from "../lib/image.js";
import { fmt, guessMealType, MEAL_TYPES, mealLabel } from "../lib/nutrition.js";
import { useDraft } from "../hooks/useDraft.jsx";
import { useToast } from "../components/Toast.jsx";
import ErrorNotice from "../components/ErrorNotice.jsx";
import { Header, Segmented, Spinner } from "../components/ui.jsx";

export default function Capture() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { start } = useDraft();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const [mealType, setMealType] = useState(guessMealType());
  const [mode, setMode] = useState("photo"); // photo | text
  const [text, setText] = useState("");
  const [pending, setPending] = useState(null); // { file, previewUrl }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const favorites = useQuery({ queryKey: ["favorites"], queryFn: api.favorites });
  const usage = useQuery({ queryKey: ["usage"], queryFn: api.usage });

  const base = { mealType, eatenAt: new Date() };

  const goReview = (d) => { start({ ...base, notes: null, provider: null, ...d }); nav("/refeicao/nova"); };

  const analyze = async (file, previewUrl) => {
    setBusy(true);
    setError(null);
    try {
      const out = await api.analyzePhoto(file);
      qc.invalidateQueries({ queryKey: ["usage"] });
      goReview({ photo: file, previewUrl, items: out.items, notes: out.notes, provider: out.provider, aiStatus: "analyzed" });
    } catch (e) {
      setError(e);
      setPending({ file, previewUrl });
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e) => {
    const raw = e.target.files?.[0];
    e.target.value = "";
    if (!raw) return;
    setBusy(true);
    setError(null);
    try {
      const file = await compressPhoto(raw);
      await analyze(file, URL.createObjectURL(file));
    } catch (err) {
      setError({ code: "bad_image", message: err.message });
      setBusy(false);
    }
  };

  const analyzeText = useMutation({
    mutationFn: () => api.analyzeText(text.trim()),
    onSuccess: (out) => {
      qc.invalidateQueries({ queryKey: ["usage"] });
      goReview({ photo: null, previewUrl: null, items: out.items, notes: out.notes, provider: out.provider, aiStatus: "text" });
    },
    onError: (e) => setError(e),
  });

  const logFavorite = useMutation({
    mutationFn: (id) => api.logFavorite(id, { meal_type: mealType }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast("Refeição registrada");
      nav("/");
    },
    onError: (e) => setError(e),
  });

  const limitReached = usage.data && usage.data.ai_used_today >= usage.data.ai_limit;
  const aiProblem = error && ["ai_quota", "daily_limit", "ai_unavailable", "ai_invalid", "ai_config", "network"].includes(error.code);

  return (
    <>
      <Header title="Registrar refeição" subtitle="A IA sugere; você confere e ajusta." />

      <div className="mb-4">
        <Segmented label="Tipo da refeição" options={MEAL_TYPES} value={mealType} onChange={setMealType} />
      </div>

      {busy && <Spinner label={pending ? "Analisando…" : "Preparando a foto…"} />}

      {!busy && (
        <>
          <div className="mb-3 flex gap-2" role="tablist" aria-label="Como registrar">
            {[
              { id: "photo", label: "Foto", Icon: Camera },
              { id: "text", label: "Texto", Icon: Type },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={mode === id}
                onClick={() => { setMode(id); setError(null); }}
                className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md border font-semibold ${
                  mode === id ? "border-night bg-night text-white dark:text-night-deep" : "border-line bg-surface"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          {mode === "photo" ? (
            <div className="space-y-2">
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={onFile} aria-label="Tirar foto" tabIndex={-1} />
              <input ref={galleryRef} type="file" accept="image/*" className="sr-only" onChange={onFile} aria-label="Escolher da galeria" tabIndex={-1} />
              <button className="btn-primary w-full !min-h-[64px] text-lg" onClick={() => cameraRef.current?.click()} disabled={limitReached}>
                <Camera className="h-6 w-6" aria-hidden="true" /> Tirar foto do prato
              </button>
              <button className="btn-quiet w-full" onClick={() => galleryRef.current?.click()} disabled={limitReached}>
                <ImageIcon className="h-5 w-5" aria-hidden="true" /> Escolher da galeria
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="desc" className="label">O que você comeu?</label>
              <textarea
                id="desc"
                className="input min-h-[112px] py-2"
                placeholder="Ex.: 2 ovos mexidos, 1 fatia de pão integral e café com leite"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
              />
              <button className="btn-primary w-full" disabled={text.trim().length < 2 || analyzeText.isPending || limitReached} onClick={() => { setError(null); analyzeText.mutate(); }}>
                {analyzeText.isPending ? "Estimando…" : "Estimar calorias"}
              </button>
            </div>
          )}

          {limitReached && (
            <p className="mt-3 text-sm text-soft">
              Você usou as {usage.data.ai_limit} análises de hoje. Dá para registrar à mão ou por um favorito.
            </p>
          )}

          {error && (
            <div className="mt-4">
              <ErrorNotice error={error}>
                {pending && aiProblem && (
                  <button className="btn-quiet" onClick={() => goReview({ photo: pending.file, previewUrl: pending.previewUrl, items: [], aiStatus: "skipped" })}>
                    Salvar a foto sem análise
                  </button>
                )}
                {pending && aiProblem && error.code !== "daily_limit" && (
                  <button className="btn-quiet" onClick={() => analyze(pending.file, pending.previewUrl)}>Tentar de novo</button>
                )}
                {aiProblem && (
                  <button className="btn-quiet" onClick={() => goReview({ photo: pending?.file ?? null, previewUrl: pending?.previewUrl ?? null, items: [], aiStatus: "manual" })}>
                    Preencher à mão
                  </button>
                )}
              </ErrorNotice>
            </div>
          )}

          <div className="mt-3">
            <button
              className="flex min-h-[44px] w-full items-center justify-center gap-2 text-sm font-semibold text-night"
              onClick={() => goReview({ photo: null, previewUrl: null, items: [], aiStatus: "manual" })}
            >
              <PencilLine className="h-4 w-4" aria-hidden="true" /> Adicionar à mão, sem IA
            </button>
          </div>

          {favorites.data?.length > 0 && (
            <section className="mt-6" aria-label="Favoritos">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold"><Star className="h-5 w-5 text-carb" aria-hidden="true" /> Favoritos</h2>
                <Link to="/favoritos" className="flex min-h-[44px] items-center text-sm font-semibold text-night">Ver todos</Link>
              </div>
              <ul className="card divide-y divide-line">
                {favorites.data.slice(0, 3).map((f) => (
                  <li key={f.id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{f.name}</p>
                      <p className="num text-sm text-soft">{fmt(f.totals.kcal)} kcal · {mealLabel(f.meal_type)}</p>
                    </div>
                    <button className="btn-quiet" disabled={logFavorite.isPending} onClick={() => logFavorite.mutate(f.id)}>
                      Registrar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
