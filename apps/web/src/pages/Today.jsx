import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplets, Flame, UtensilsCrossed } from "lucide-react";
import { api } from "../lib/api.js";
import { fmt, fmtDayLong, isoDay } from "../lib/nutrition.js";
import Macros from "../components/Macros.jsx";
import MealRow from "../components/MealRow.jsx";
import ErrorNotice from "../components/ErrorNotice.jsx";
import { Empty, Header, Notice, Spinner } from "../components/ui.jsx";
import Avatar from "../components/Avatar.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { useToast } from "../components/Toast.jsx";

export default function Today() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const today = isoDay();

  const day = useQuery({ queryKey: ["day", today], queryFn: () => api.day(today) });
  const meals = useQuery({ queryKey: ["meals", "today", today], queryFn: () => api.meals({ date_from: today, date_to: today, limit: 50 }) });
  const week = useQuery({ queryKey: ["range", 7], queryFn: () => api.range(7) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["day"] });
  };
  const resend = useMutation({ mutationFn: api.sendVerification, onSuccess: () => toast("E-mail enviado. Olhe a caixa de entrada e o spam.") });
  const undoWater = useMutation({ mutationFn: (id) => api.deleteWater(id), onSuccess: refresh });
  const addWater = useMutation({
    mutationFn: (ml) => api.addWater(ml),
    onSuccess: (entry) => {
      refresh();
      toast(`+${fmt(entry.ml)} ml de água`, { label: "Desfazer", run: () => undoWater.mutate(entry.id) });
    },
  });

  if (day.isLoading) return <Spinner />;
  if (day.error) return <ErrorNotice error={day.error} />;

  const { totals, goals, water_ml: water } = day.data;
  const remaining = goals.kcal - totals.kcal;
  const waterGoal = goals.water_ml || user.water_goal_ml;
  const streak = week.data?.streak_days ?? 0;

  return (
    <>
      <Header
        title={user.name ? `Oi, ${user.name.split(" ")[0]}` : "Hoje"}
        left={<Avatar user={user} className="h-11 w-11" />}
        subtitle={fmtDayLong(new Date())}
        right={
          streak > 0 && (
            <p className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-sm font-semibold" title="Dias seguidos com registro">
              <Flame className="h-4 w-4 text-carb" aria-hidden="true" />
              <span className="num">{streak}</span> {streak === 1 ? "dia" : "dias"}
            </p>
          )
        }
      />

      {!user.email_verified && user.mail_enabled && (
        <div className="mb-4">
          <Notice
            title="Confirme seu e-mail"
            action={<button className="btn-quiet" disabled={resend.isPending || resend.isSuccess} onClick={() => resend.mutate()}>{resend.isSuccess ? "Enviado" : "Reenviar e-mail"}</button>}
          >
            Assim você consegue recuperar a senha se esquecer.
          </Notice>
          {resend.error && (
            <p className="mt-2 text-sm text-error" role="alert">
              {resend.error.status === 429 ? "Muitas tentativas. Aguarde alguns minutos." : resend.error.message}
            </p>
          )}
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-6">
      <section aria-label="Resumo do dia" className="card p-4 lg:col-start-1 lg:row-start-1">
        <p className="num leading-none">
          <span className="text-[3.5rem] font-semibold">{fmt(totals.kcal)}</span>
          <span className="ml-2 text-lg text-soft">de {fmt(goals.kcal)} kcal</span>
        </p>
        <p className="mb-4 mt-2 text-sm text-soft">
          {remaining >= 0 ? (
            <>Restam <span className="num font-semibold text-ink">{fmt(remaining)}</span> kcal para a meta.</>
          ) : (
            <><span className="num font-semibold text-ink">{fmt(-remaining)}</span> kcal acima da meta de hoje.</>
          )}
        </p>
        <Macros totals={totals} goals={goals} />
      </section>

      <section aria-label="Água" className="card mt-4 p-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold">
            <Droplets className="h-5 w-5 text-night" aria-hidden="true" /> Água
          </h2>
          <p className="num text-sm text-soft">
            <span className="text-lg font-semibold text-ink">{fmt(water)}</span> / {fmt(waterGoal)} ml
          </p>
        </div>
        <div
          className="mb-3 h-2.5 overflow-hidden rounded-full bg-ground"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={waterGoal}
          aria-valuenow={Math.min(water, waterGoal)}
          aria-label="Água do dia"
        >
          <div className="h-full rounded-full bg-night" style={{ width: `${waterGoal ? Math.min(100, (water / waterGoal) * 100) : 0}%` }} />
        </div>
        <div className="flex gap-2">
          {[200, 300, 500].map((ml) => (
            <button key={ml} className="btn-quiet flex-1" disabled={addWater.isPending} onClick={() => addWater.mutate(ml)}>
              <span className="num">+{ml}</span> ml
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Refeições de hoje" className="mt-6 lg:col-start-1 lg:row-start-2 lg:mt-0">
        <h2 className="mb-2 font-bold">Refeições de hoje</h2>
        {meals.isLoading ? (
          <Spinner />
        ) : meals.data?.length ? (
          <ul className="card divide-y divide-line overflow-hidden">
            {meals.data.map((m) => <MealRow key={m.id} meal={m} />)}
          </ul>
        ) : (
          <div className="card">
            <Empty icon={UtensilsCrossed} title="Nenhuma refeição registrada hoje">
              Toque em <strong>Registrar</strong> para fotografar o prato.
            </Empty>
          </div>
        )}
        {week.data && week.data.logged_days > 0 && (
          <Link to="/graficos" className="mt-3 block min-h-[44px] text-sm font-semibold text-night">Ver o resumo da semana →</Link>
        )}
      </section>
      </div>
    </>
  );
}
