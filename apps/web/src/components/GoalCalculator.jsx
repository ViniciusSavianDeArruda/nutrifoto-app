import { useState } from "react";
import { ACTIVITY, MIN_AGE, OBJECTIVES, calcGoals, imc, imcLabel } from "../lib/goals.js";
import { fmt } from "../lib/nutrition.js";
import { Notice, Segmented } from "./ui.jsx";

/** Pergunta alguns dados e sugere as metas do dia. Quem aplica (e salva) é a tela de Ajustes. */
export default function GoalCalculator({ onApply }) {
  const [f, setF] = useState({ sex: "m", age: "", heightCm: "", weightKg: "", activity: "moderado", objective: "ganhar" });
  const [result, setResult] = useState(null);
  const [tried, setTried] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setResult(null); };
  const pick = (k) => (v) => { setF({ ...f, [k]: v }); setResult(null); };
  const young = f.age !== "" && Number(f.age) < MIN_AGE;

  const run = (e) => {
    e.preventDefault();
    setTried(true);
    setResult(calcGoals(f));
  };
  const bmi = f.weightKg && f.heightCm ? imc(Number(f.weightKg), Number(f.heightCm)) : null;

  return (
    <section className="card mt-4 p-4" aria-label="Calculadora de metas">
      <h2 className="mb-1 font-bold">Descobrir minha meta</h2>
      <p className="mb-3 text-sm text-soft">Responda e o app sugere calorias e macros. Depois você ajusta nas metas abaixo.</p>
      <form onSubmit={run} className="grid grid-cols-3 gap-3" noValidate>
        <div className="col-span-3">
          <Segmented label="Sexo biológico" options={[{ id: "m", label: "Masculino" }, { id: "f", label: "Feminino" }]} value={f.sex} onChange={pick("sex")} />
        </div>
        {[["age", "Idade", "anos"], ["heightCm", "Altura", "cm"], ["weightKg", "Peso", "kg"]].map(([k, label, suffix]) => (
          <div key={k}>
            <label htmlFor={`gc-${k}`} className="label">{label}</label>
            <div className="relative">
              <input id={`gc-${k}`} inputMode="decimal" className="input num pr-10" value={f[k]} onChange={set(k)} />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-soft">{suffix}</span>
            </div>
          </div>
        ))}
        <div className="col-span-3">
          <label htmlFor="gc-activity" className="label">Atividade física</label>
          <select id="gc-activity" className="input" value={f.activity} onChange={set("activity")}>
            {ACTIVITY.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
        <div className="col-span-3">
          <Segmented label="Objetivo" options={OBJECTIVES.map(({ id, label }) => ({ id, label }))} value={f.objective} onChange={pick("objective")} />
        </div>
        {young && (
          <div className="col-span-3"><Notice tone="warn" title="Só para maiores de 18 anos">Para menores de idade, as necessidades mudam com o crescimento. Procure um nutricionista.</Notice></div>
        )}
        {tried && !result && !young && (
          <p className="col-span-3 text-sm text-error" role="alert">Confira idade (18 a 90), altura (120 a 230 cm) e peso (30 a 300 kg).</p>
        )}
        <div className="col-span-3"><button className="btn-primary w-full">Calcular</button></div>
      </form>

      {result && (
        <div className="mt-4 rounded-md border border-line bg-ground p-3" aria-live="polite">
          <p className="text-sm text-soft">Sugestão para você</p>
          <p className="num"><span className="text-[2.25rem] font-semibold leading-none">{fmt(result.daily_kcal_goal)}</span> <span className="text-soft">kcal por dia</span></p>
          <p className="num mt-2 text-sm">Carboidrato <b>{fmt(result.carbs_goal_g)} g</b> · Proteína <b>{fmt(result.protein_goal_g)} g</b> · Gordura <b>{fmt(result.fat_goal_g)} g</b> · Água <b>{fmt(result.water_goal_ml)} ml</b></p>
          <p className="mt-2 text-[0.8125rem] text-soft">
            Seu corpo gasta cerca de {fmt(result.tdee)} kcal por dia{f.objective === "ganhar" ? "; a meta passa disso para você ganhar peso aos poucos" : ""}.
            {bmi && <> IMC {bmi.toFixed(1).replace(".", ",")} ({imcLabel(bmi)}).</>} É uma estimativa: acompanhe o peso por 2 a 3 semanas e ajuste de 100 a 200 kcal se não mudar. Não substitui nutricionista.
          </p>
          <button type="button" className="btn-quiet mt-3 w-full" onClick={() => onApply(result)}>Usar estas metas</button>
        </div>
      )}
    </section>
  );
}
