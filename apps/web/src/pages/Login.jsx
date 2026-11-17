import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useOnline } from "../hooks/useOnline.js";
import { Notice } from "../components/ui.jsx";
import AuthShell from "../components/AuthShell.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import StrengthBar from "../components/StrengthBar.jsx";
import InstallBanner from "../components/InstallBanner.jsx";
import { emailHint } from "../lib/emailHint.js";
import { Mail, Lock } from "lucide-react";

const schema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().trim().min(1, "Digite seu e-mail.").email("Esse e-mail não parece certo."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
  invite_code: z.string().max(40).optional(),
  accept_terms: z.boolean().optional(),
});

const EMAIL_KEY = "nutrifoto.email";

export default function Login() {
  const { login, register: signUp } = useAuth();
  const online = useOnline();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState(null);
  const [expiredMsg, setExpiredMsg] = useState(() => {
    try {
      const v = sessionStorage.getItem("nutrifoto.expired");
      if (v) { sessionStorage.removeItem("nutrifoto.expired"); return "Sua sessão expirou, entre novamente."; }
    } catch {}
    return null;
  });
  const [savedEmail] = useState(() => { try { return localStorage.getItem(EMAIL_KEY) || ""; } catch { return ""; } });
  const [rememberEmail, setRememberEmail] = useState(Boolean(savedEmail));
  const [showInvite, setShowInvite] = useState(false);
  const [emailHintValue, setEmailHintValue] = useState(null);

  const config = useQuery({ queryKey: ["auth-config"], queryFn: api.authConfig, staleTime: 300_000 });
  const registration = config.data?.registration ?? null;
  const canRegister = registration !== null && registration !== "closed";
  const { register, handleSubmit, watch, setValue, setError: setFieldError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: savedEmail },
    shouldFocusError: true,
  });

  const watchedPassword = watch("password");
  const inviteCodeValue = watch("invite_code");

  const onSubmit = async (data) => {
    setError(null);
    setExpiredMsg(null);
    const email = data.email.trim().toLowerCase();
    try {
      if (rememberEmail) {
        try { localStorage.setItem(EMAIL_KEY, email); } catch {}
      } else {
        try { localStorage.removeItem(EMAIL_KEY); } catch {}
      }
      if (mode === "login") {
        await login({ email, password: data.password });
      } else {
        if (!data.accept_terms) { setFieldError("accept_terms", { message: "Aceite os termos para criar a conta." }); return; }
        if (registration === "invite" && !data.invite_code?.trim()) {
          setFieldError("invite_code", { message: "Digite o código de convite." });
          setShowInvite(true);
          return;
        }
        await signUp({ email, password: data.password, name: data.name || null, invite_code: data.invite_code?.trim() || null, accept_terms: true });
      }
    } catch (e) {
      setError(
        e.status === 429
          ? "Muitas tentativas. Aguarde alguns minutos e tente de novo."
          : e.status === 401
          ? "E-mail ou senha incorretos."
          : e.message,
      );
    }
  };

  return (
    <AuthShell
      title={mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
      subtitle="Fotografe a refeição, confira os números e guarde tudo no seu diário."
      illustrationClass={mode === "login" ? "mx-auto mb-4 block h-16 w-auto md:h-24" : "mx-auto mb-4 hidden md:block h-16 w-auto md:h-24"}
      footer={
        canRegister ? (
          <button className="mt-4 inline-flex min-h-[44px] items-center justify-center text-sm font-semibold text-night underline underline-offset-2" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); setShowInvite(false); setEmailHintValue(null); }}>
            {mode === "login" ? "Ainda não tenho conta" : "Já tenho conta"}
          </button>
        ) : (
          registration === "closed"
            ? <p className="mt-4 text-center text-sm text-soft">Novos cadastros estão fechados neste app.</p>
            : null
        )
      }
    >
      {mode === "login" && <InstallBanner />}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {mode === "register" && (
          <div className="auth-fade-in">
            <label htmlFor="name" className="label">Seu nome (opcional)</label>
            <input id="name" className="input" autoComplete="name" maxLength={100} placeholder="Como você quer ser chamado" {...register("name")} />
          </div>
        )}
        <div>
          <label htmlFor="email" className="label">E-mail</label>
          {(() => {
            const { onBlur: rhfBlur, onChange: rhfChange, ...emailReg } = register("email");
            return (
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  className="input pl-10"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={255}
                  placeholder="voce@exemplo.com"
                  aria-invalid={Boolean(errors.email)}
                  onBlur={(e) => { if (mode === "register") setEmailHintValue(emailHint(e.target.value)); rhfBlur(e); }}
                  onChange={(e) => { setEmailHintValue(null); rhfChange(e); }}
                  {...emailReg}
                />
              </div>
            );
          })()}
          {errors.email && <p className="mt-1 text-sm text-error" role="alert">{errors.email.message}</p>}
          {!errors.email && emailHintValue && (
            <p className="mt-1 text-sm text-soft" role="status">
              Você quis dizer {emailHintValue}?{" "}
              <button type="button" className="font-semibold text-night underline" onClick={() => { setValue("email", emailHintValue); setEmailHintValue(null); }}>Corrigir</button>
            </p>
          )}
        </div>
        <div>
          <div>
            <label htmlFor="password" className="label">Senha</label>
            <PasswordInput id="password" autoComplete={mode === "login" ? "current-password" : "new-password"} maxLength={128} placeholder={mode === "register" ? "Mínimo de 8 caracteres" : undefined} aria-invalid={Boolean(errors.password)} leftIcon={<Lock className="h-4 w-4" />} {...register("password")} />
            {errors.password
              ? <p className="mt-1 text-sm text-error" role="alert">{errors.password.message}</p>
              : mode === "register" && <p className="mt-1 text-sm text-soft">Mínimo de 8 caracteres.</p>
            }
            {mode === "register" && <StrengthBar password={watchedPassword || ""} />}
            {mode === "login" && config.data?.email_enabled && (
              <Link to="/esqueci-senha" className="mt-1 inline-flex min-h-[44px] items-center text-sm font-semibold text-night underline underline-offset-2">Esqueci minha senha</Link>
            )}
          </div>
          {mode === "login" && (
            <label className="auth-fade-in flex min-h-[44px] items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-[#16533C]"
                checked={rememberEmail}
                onChange={(e) => {
                  setRememberEmail(e.target.checked);
                  if (!e.target.checked) { try { localStorage.removeItem(EMAIL_KEY); } catch {} }
                }}
              />
              <span>Lembrar meu e-mail</span>
            </label>
          )}
        </div>
        {mode === "register" && registration === "invite" && (
          <div className="auth-fade-in">
            {!showInvite && !inviteCodeValue && !errors.invite_code ? (
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center text-sm font-semibold text-night"
                aria-expanded={false}
                aria-controls="invite_code"
                onClick={() => setShowInvite(true)}
              >
                Tem um código de convite?
              </button>
            ) : (
              <>
                <label htmlFor="invite_code" className="label">Código de convite</label>
                <input id="invite_code" className="input num uppercase" autoCapitalize="characters" autoComplete="off" placeholder="NUTRI-XXXX-XXXX" maxLength={40} aria-invalid={Boolean(errors.invite_code)} {...register("invite_code")} />
                {errors.invite_code && <p className="mt-1 text-sm text-error" role="alert">{errors.invite_code.message}</p>}
              </>
            )}
          </div>
        )}
        {mode === "register" && (
          <div className="auth-fade-in">
            <label htmlFor="accept_terms" className="flex min-h-[44px] items-start gap-3 text-sm">
              <input id="accept_terms" type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#16533C]" aria-invalid={Boolean(errors.accept_terms)} {...register("accept_terms")} />
              <span>Li e aceito os <Link to="/termos" className="font-semibold text-night underline">termos de uso</Link> e a <Link to="/privacidade" className="font-semibold text-night underline">política de privacidade</Link>. Tenho 18 anos ou mais.</span>
            </label>
            {errors.accept_terms && <p className="mt-1 text-sm text-error" role="alert">{errors.accept_terms.message}</p>}
          </div>
        )}
        {mode === "login" && expiredMsg && <div className="auth-fade-in"><Notice tone="warn">{expiredMsg}</Notice></div>}
        {error && <div className="auth-fade-in"><Notice tone="error">{error}</Notice></div>}
        <button className="btn-primary w-full" disabled={isSubmitting || !online}>
          {isSubmitting ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>
    </AuthShell>
  );
}
