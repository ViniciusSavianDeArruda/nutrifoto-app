import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Flame, Scale } from "lucide-react";
import { api } from "../lib/api.js";
import { fmt, isoDay } from "../lib/nutrition.js";
import { useChartColors } from "../hooks/useChartColors.js";
import ErrorNotice from "../components/ErrorNotice.jsx";
import { Header, NumberField, Segmented, Spinner } from "../components/ui.jsx";
import { useToast } from "../components/Toast.jsx";

const PERIODS = [
  { id: 7, label: "7 dias" },
  { id: 30, label: "30 dias" },
  { id: 90, label: "90 dias" },
];

const shortDate = (iso) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

function Section({ title, children, hint, className = "" }) {
  return (
    <section className={`card mt-4 p-4 ${className}`} aria-label={title}>
      <h2 className="font-bold">{title}</h2>
      {hint && <p className="mb-3 text-sm text-soft">{hint}</p>}
      {!hint && <div className="mb-2" />}
      {children}
    </section>
  );
}

export default function Charts() {
  const [days, setDays] = useState(7);
  const c = useChartColors();
  const range = useQuery({ queryKey: ["range", days], queryFn: () => api.range(days) });

  if (range.isLoading) return <Spinner />;
  if (range.error) return <ErrorNotice error={range.error} />;
  const r = range.data;
  const a = r.averages;
  const tick = { fill: c.soft, fontSize: 12 };
  const tooltip = { contentStyle: { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 10, color: c.ink }, labelStyle: { color: c.ink } };
  const peakHours = r.hours.filter((h) => h.meals > 0);
  const firstHour = peakHours.length ? Math.max(0, peakHours[0].hour - 1) : 6;
  const lastHour = peakHours.length ? Math.min(23, peakHours[peakHours.length - 1].hour + 1) : 22;

  return (
    <>
      <Header title="Gráficos" subtitle="Como estão seus dias." />
      <Segmented label="Período" options={PERIODS} value={days} onChange={setDays} />

      <section className="card mt-4 p-4" aria-label="Resumo do período">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[0.9375rem]">{r.summary}</p>
          {r.streak_days > 0 && (
            <p className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2.5 py-1 text-sm font-semibold" title="Dias seguidos com registro">
              <Flame className="h-4 w-4 text-carb" aria-hidden="true" /><span className="num">{r.streak_days}</span>
            </p>
          )}
        </div>
        {r.logged_days > 0 && (
          <dl className="num mt-3 grid grid-cols-5 gap-1 text-center">
            {[
              ["kcal", fmt(a.kcal), "kcal"],
              ["Prot.", fmt(a.protein_g), "g"],
              ["Carb.", fmt(a.carbs_g), "g"],
              ["Gord.", fmt(a.fat_g), "g"],
              ["Fibra", fmt(a.fiber_g), "g"],
            ].map(([k, v, u]) => (
              <div key={k} className="rounded-md bg-ground py-2">
                <dt className="text-[0.75rem] text-soft">{k}</dt>
                <dd className="text-lg font-semibold">{v}<span className="text-xs text-soft"> {u}</span></dd>
              </div>
            ))}
          </dl>
        )}
        {r.logged_days > 0 && <p className="mt-2 text-[0.8125rem] text-soft">Médias dos dias com registro.</p>}
      </section>

      <div className="lg:grid lg:grid-cols-2 lg:gap-x-4">
      {r.logged_days > 0 && (
        <>
          <Section title="Calorias por dia" hint={`A linha mostra a meta de ${fmt(r.goals.kcal)} kcal.`} className="lg:col-span-2">
            <div className="h-56 lg:h-72" role="img" aria-label={`Calorias por dia nos últimos ${days} dias. Média de ${fmt(a.kcal)} kcal.`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={r.daily} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={c.line} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={tick} tickLine={false} axisLine={false} interval={days <= 7 ? 0 : "preserveStartEnd"} minTickGap={24} />
                  <YAxis tick={tick} tickLine={false} axisLine={false} domain={[0, (max) => Math.ceil((Math.max(max, r.goals.kcal) * 1.08) / 100) * 100]} />
                  <Tooltip {...tooltip} labelFormatter={shortDate} formatter={(v) => [`${fmt(v)} kcal`, "Calorias"]} cursor={{ fill: c.line, opacity: 0.3 }} />
                  <ReferenceLine y={r.goals.kcal} stroke={c.ink} strokeDasharray="5 4" />
                  <Bar dataKey="kcal" fill={c.night} radius={[4, 4, 0, 0]} maxBarSize={days > 30 ? 6 : 28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <details className="mt-2 text-sm">
              <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold text-night">Ver os números</summary>
              <table className="num w-full text-left">
                <thead className="text-soft"><tr><th className="py-1 font-semibold">Dia</th><th className="font-semibold">kcal</th><th className="font-semibold">P</th><th className="font-semibold">C</th><th className="font-semibold">G</th></tr></thead>
                <tbody>
                  {[...r.daily].reverse().filter((d) => d.meals > 0).map((d) => (
                    <tr key={d.date} className="border-t border-line"><td className="py-1">{shortDate(d.date)}</td><td>{fmt(d.kcal)}</td><td>{fmt(d.protein_g)}</td><td>{fmt(d.carbs_g)}</td><td>{fmt(d.fat_g)}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          </Section>

          <Section title="Divisão dos macros" hint="Parte das calorias que vem de cada nutriente.">
            <div className="flex h-8 overflow-hidden rounded-md" role="img" aria-label={`Proteína ${r.macro_split.protein_pct}%, carboidrato ${r.macro_split.carbs_pct}%, gordura ${r.macro_split.fat_pct}%`}>
              <div style={{ width: `${r.macro_split.protein_pct}%`, background: c.protein }} />
              <div style={{ width: `${r.macro_split.carbs_pct}%`, background: c.carb }} />
              <div style={{ width: `${r.macro_split.fat_pct}%`, background: c.fat }} />
            </div>
            <ul className="num mt-3 grid grid-cols-3 gap-2 text-center">
              {[["Proteína", r.macro_split.protein_pct, "bg-protein"], ["Carboidrato", r.macro_split.carbs_pct, "bg-carb"], ["Gordura", r.macro_split.fat_pct, "bg-fat"]].map(([n, p, dot]) => (
                <li key={n}>
                  <p className="text-sm text-soft"><span className={`mr-1 inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />{n}</p>
                  <p className="text-xl font-semibold">{fmt(p)}%</p>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Quando você come" hint="Número de refeições por hora do dia.">
            <div className="h-40" role="img" aria-label="Refeições por hora do dia">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={r.hours.filter((h) => h.hour >= firstHour && h.hour <= lastHour)} margin={{ top: 4, right: 4, left: -26, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={c.line} />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={tick} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} />
                  <Tooltip {...tooltip} labelFormatter={(h) => `${h}h`} formatter={(v) => [v, "Refeições"]} cursor={{ fill: c.line, opacity: 0.3 }} />
                  <Bar dataKey="meals" fill={c.carb} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </>
      )}

      <WeightSection colors={c} tick={tick} tooltip={tooltip} />
      </div>
    </>
  );
}

function WeightSection({ colors: c, tick, tooltip }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [kg, setKg] = useState(null);
  const weights = useQuery({ queryKey: ["weights"], queryFn: () => api.weights(180) });
  const save = useMutation({
    mutationFn: () => api.setWeight(isoDay(), kg),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["weights"] }); toast("Peso registrado"); setKg(null); },
  });
  const data = weights.data ?? [];
  const last = data[data.length - 1];
  const first = data[0];

  return (
    <Section title="Peso" hint="Registre quando quiser. Um valor por dia; salvar de novo no mesmo dia atualiza." className="lg:col-span-2">
      <div className="flex items-end gap-2">
        <NumberField id="kg" label="Peso de hoje" suffix="kg" min={20} allowZero={false} value={kg ?? last?.kg ?? ""} onValue={setKg} className="flex-1" />
        <button className="btn-primary" disabled={kg == null || save.isPending} onClick={() => save.mutate()}>Salvar</button>
      </div>
      {save.error && <div className="mt-2"><ErrorNotice error={save.error} /></div>}
      {data.length >= 2 ? (
        <>
          <div className="mt-4 h-44" role="img" aria-label={`Peso: de ${fmt(first.kg, 1)} kg para ${fmt(last.kg, 1)} kg`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={c.line} />
                <XAxis dataKey="day" tickFormatter={shortDate} tick={tick} tickLine={false} axisLine={false} minTickGap={32} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v, 0)} />
                <Tooltip {...tooltip} labelFormatter={shortDate} formatter={(v) => [`${fmt(v, 1)} kg`, "Peso"]} />
                <Line type="monotone" dataKey="kg" stroke={c.night} strokeWidth={2.5} dot={{ r: 3, fill: c.night }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="num mt-1 flex items-center gap-1 text-sm text-soft">
            <Scale className="h-4 w-4" aria-hidden="true" /> Último: {fmt(last.kg, 1)} kg · variação no período: {last.kg - first.kg > 0 ? "+" : ""}{fmt(last.kg - first.kg, 1)} kg
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-soft">O gráfico aparece a partir de dois registros de peso.</p>
      )}
    </Section>
  );
}
