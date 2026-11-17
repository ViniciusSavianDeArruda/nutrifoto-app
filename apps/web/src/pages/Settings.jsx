import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Download, LogOut, MailCheck, Star, Trash2 } from "lucide-react";
import { api } from "../lib/api.js";
import { fmt, fmtBytes } from "../lib/nutrition.js";
import { makeAvatar } from "../lib/image.js";
import Avatar from "../components/Avatar.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { useToast } from "../components/Toast.jsx";
import ErrorNotice from "../components/ErrorNotice.jsx";
import GoalCalculator from "../components/GoalCalculator.jsx";
import { Dialog, Header, Notice, Segmented } from "../components/ui.jsx";

const num = (min, max, msg) => z.coerce.number({ invalid_type_error: msg }).int(msg).min(min, msg).max(max, msg);
const schema = z.object({
  name: z.string().max(100),
  daily_kcal_goal: num(800, 10000, "Entre 800 e 10.000 kcal."),
  protein_goal_g: num(0, 1000, "Entre 0 e 1.000 g."),
  carbs_goal_g: num(0, 2000, "Entre 0 e 2.000 g."),
  fat_goal_g: num(0, 1000, "Entre 0 e 1.000 g."),
  water_goal_ml: num(0, 20000, "Entre 0 e 20.000 ml."),
});

function Field({ id, label, suffix, error, register }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input id={id} inputMode="numeric" className="input num pr-12" aria-invalid={Boolean(error)} {...register(id)} />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-soft">{suffix}</span>
      </div>
      {error && <p className="mt-1 text-sm text-error">{error.message}</p>}
    </div>
  );
}

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const usage = useQuery({ queryKey: ["usage"], queryFn: api.usage });
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [exportError, setExportError] = useState(null);
  const avatarInput = useRef(null);
  const upAvatar = useMutation({
    mutationFn: async (file) => api.uploadAvatar(await makeAvatar(file)),
    onSuccess: (me) => { setUser(me); toast("Foto atualizada"); },
  });
  const delAvatar = useMutation({ mutationFn: api.deleteAvatar, onSuccess: (me) => { setUser(me); toast("Foto removida"); } });
  const resend = useMutation({ mutationFn: api.sendVerification, onSuccess: () => toast("E-mail enviado. Olhe a caixa de entrada e o spam.") });

  const { register, handleSubmit, formState: { errors, isDirty }, reset, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user.name ?? "",
      daily_kcal_goal: user.daily_kcal_goal,
      protein_goal_g: user.protein_goal_g,
      carbs_goal_g: user.carbs_goal_g,
      fat_goal_g: user.fat_goal_g,
      water_goal_ml: user.water_goal_ml,
    },
  });

  const saveGoals = useMutation({
    mutationFn: (d) => api.updateMe({ ...d, name: d.name.trim() || null }),
    onSuccess: (me) => { setUser(me); qc.invalidateQueries(); reset({ ...me, name: me.name ?? "" }); toast("Metas salvas"); },
  });
  const delAccount = useMutation({
    mutationFn: () => api.deleteAccount(password),
    onSuccess: () => logout(),
  });

  const download = async (format) => {
    setExportError(null);
    try {
      const blob = await api.exportFile(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nutrifoto.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { setExportError(e); }
  };

  const u = usage.data;
  const photoPct = u ? Math.min(100, (u.photo_bytes_used / u.photo_bytes_limit) * 100) : 0;

  return (
    <>
      <Header title="Ajustes" subtitle={user.email} />

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:[&>*]:mt-0">
      <section className="card p-4" aria-label="Perfil">
        <div className="flex items-center gap-4">
          <Avatar user={user} className="h-16 w-16" text="text-2xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{user.name || "Sem nome"}</p>
            <p className="flex items-center gap-1 truncate text-sm text-soft">
              {user.email_verified ? <><MailCheck className="h-4 w-4 shrink-0 text-fiber" aria-hidden="true" /> E-mail confirmado</> : "E-mail ainda não confirmado"}
            </p>
          </div>
        </div>
        <input ref={avatarInput} type="file" accept="image/*" className="sr-only" aria-label="Escolher foto de perfil" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upAvatar.mutate(f); }} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-quiet" disabled={upAvatar.isPending} onClick={() => avatarInput.current?.click()}><Camera className="h-5 w-5" aria-hidden="true" /> {upAvatar.isPending ? "Enviando…" : user.avatar_url ? "Trocar foto" : "Adicionar foto"}</button>
          {user.avatar_url && <button className="btn-quiet" disabled={delAvatar.isPending} onClick={() => delAvatar.mutate()}>Remover foto</button>}
          {!user.email_verified && user.mail_enabled && <button className="btn-quiet" disabled={resend.isPending} onClick={() => resend.mutate()}>{resend.isPending ? "Enviando…" : "Reenviar e-mail de confirmação"}</button>}
        </div>
        {upAvatar.error && <p className="mt-2 text-sm text-error" role="alert">{upAvatar.error.message}</p>}
        {resend.error && <p className="mt-2 text-sm text-error" role="alert">{resend.error.status === 429 ? "Muitas tentativas. Aguarde alguns minutos." : resend.error.message}</p>}
      </section>

      <section className="card mt-4 p-4" aria-label="Uso">
        <h2 className="mb-3 font-bold">Uso</h2>
        {u ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between">
                <p className="text-sm">Análises por IA hoje</p>
                <p className="num"><span className="text-lg font-semibold">{u.ai_used_today}</span> <span className="text-soft">/ {u.ai_limit}</span></p>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ground" role="progressbar" aria-valuemin={0} aria-valuemax={u.ai_limit} aria-valuenow={u.ai_used_today} aria-label="Análises por IA hoje">
                <div className="h-full rounded-full bg-night" style={{ width: `${Math.min(100, (u.ai_used_today / u.ai_limit) * 100)}%` }} />
              </div>
              <p className="mt-1 text-[0.8125rem] text-soft">Provedor: {u.ai_provider}. Zera à meia-noite.</p>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <p className="text-sm">Espaço das fotos</p>
                <p className="num text-sm"><span className="text-lg font-semibold">{fmtBytes(u.photo_bytes_used)}</span> <span className="text-soft">de {fmtBytes(u.photo_bytes_limit)}</span></p>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ground" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(photoPct)} aria-label="Espaço usado pelas fotos">
                <div className="h-full rounded-full bg-night" style={{ width: `${photoPct}%` }} />
              </div>
              <p className="num mt-1 text-[0.8125rem] text-soft">{fmt(u.meals_count)} {u.meals_count === 1 ? "refeição salva" : "refeições salvas"}.</p>
            </div>
          </div>
        ) : (
          <p className="text-soft">Carregando…</p>
        )}
      </section>

      <GoalCalculator
        onApply={(g) => {
          for (const k of ["daily_kcal_goal", "protein_goal_g", "carbs_goal_g", "fat_goal_g", "water_goal_ml"]) setValue(k, g[k], { shouldDirty: true, shouldValidate: true });
          toast("Metas preenchidas: confira e toque em Salvar metas");
        }}
      />

      <section className="card mt-4 p-4" aria-label="Metas">
        <h2 className="mb-3 font-bold">Metas diárias</h2>
        <form onSubmit={handleSubmit((d) => saveGoals.mutate(d))} className="grid grid-cols-2 gap-3" noValidate>
          <div className="col-span-2">
            <label htmlFor="name" className="label">Seu nome</label>
            <input id="name" className="input" autoComplete="name" {...register("name")} />
          </div>
          <div className="col-span-2"><Field id="daily_kcal_goal" label="Calorias" suffix="kcal" error={errors.daily_kcal_goal} register={register} /></div>
          <Field id="protein_goal_g" label="Proteína" suffix="g" error={errors.protein_goal_g} register={register} />
          <Field id="carbs_goal_g" label="Carboidrato" suffix="g" error={errors.carbs_goal_g} register={register} />
          <Field id="fat_goal_g" label="Gordura" suffix="g" error={errors.fat_goal_g} register={register} />
          <Field id="water_goal_ml" label="Água" suffix="ml" error={errors.water_goal_ml} register={register} />
          <div className="col-span-2">
            {saveGoals.error && <div className="mb-2"><ErrorNotice error={saveGoals.error} /></div>}
            <button className="btn-primary w-full" disabled={!isDirty || saveGoals.isPending}>{saveGoals.isPending ? "Salvando…" : "Salvar metas"}</button>
          </div>
        </form>
      </section>

      <section className="card mt-4 p-2" aria-label="Atalhos">
        <Link to="/favoritos" className="flex min-h-[48px] items-center gap-3 rounded-md px-2 font-semibold hover:bg-ground">
          <Star className="h-5 w-5" aria-hidden="true" /> Favoritos
        </Link>
      </section>

      <section className="card mt-4 p-4" aria-label="Seus dados">
        <h2 className="mb-1 font-bold">Seus dados</h2>
        <p className="mb-3 text-sm text-soft">Baixe tudo o que você registrou. As fotos não vão no arquivo.</p>
        <div className="flex gap-2">
          <button className="btn-quiet flex-1" onClick={() => download("csv")}><Download className="h-5 w-5" aria-hidden="true" /> CSV</button>
          <button className="btn-quiet flex-1" onClick={() => download("json")}><Download className="h-5 w-5" aria-hidden="true" /> JSON</button>
        </div>
        {exportError && <div className="mt-2"><ErrorNotice error={exportError} /></div>}
      </section>
      </div>

      <div className="mt-6 space-y-2 lg:flex lg:gap-3 lg:space-y-0 lg:[&>*]:flex-1">
        <button className="btn-quiet w-full" onClick={logout}><LogOut className="h-5 w-5" aria-hidden="true" /> Sair</button>
        <button className="btn-danger w-full" onClick={() => { setPassword(""); setDeleting(true); }}><Trash2 className="h-5 w-5" aria-hidden="true" /> Apagar minha conta</button>
      </div>
      <p className="mt-6 text-center text-[0.8125rem] text-soft">NutriFoto · as calorias são estimativas, não orientação médica.<br /><Link to="/termos" className="underline">Termos de uso</Link> · <Link to="/privacidade" className="underline">Privacidade</Link></p>

      {deleting && (
        <Dialog title="Apagar a conta?" onClose={() => setDeleting(false)}>
          <Notice tone="warn">Refeições, fotos, favoritos, água e peso serão apagados de vez. Não dá para desfazer.</Notice>
          <label htmlFor="pw" className="label mt-3">Digite sua senha para confirmar</label>
          <input id="pw" type="password" className="input mb-3" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {delAccount.error && <div className="mb-3"><ErrorNotice error={delAccount.error} /></div>}
          <button className="btn-danger w-full" disabled={!password || delAccount.isPending} onClick={() => delAccount.mutate()}>
            {delAccount.isPending ? "Apagando…" : "Apagar tudo"}
          </button>
        </Dialog>
      )}
    </>
  );
}
