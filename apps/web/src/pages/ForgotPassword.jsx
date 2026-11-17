import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { useOnline } from "../hooks/useOnline.js";
import { Notice } from "../components/ui.jsx";
import AuthShell from "../components/AuthShell.jsx";
import { emailHint } from "../lib/emailHint.js";
import { Mail } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const online = useOnline();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(null);
  const [hint, setHint] = useState(null);
  const send = useMutation({ mutationFn: () => api.forgotPassword(email.trim()) });

  const onSubmit = (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) { setEmailError("Digite seu e-mail."); return; }
    if (!EMAIL_RE.test(trimmed)) { setEmailError("Esse e-mail não parece certo."); return; }
    setEmailError(null);
    send.mutate();
  };

  return (
    <AuthShell title="Esqueci minha senha" subtitle="Digite o e-mail da sua conta e enviaremos um link para criar uma senha nova.">
      {send.isSuccess ? (
        <Notice title="Pedido enviado">Se existir uma conta com <b>{email}</b>, o link chega em instantes. Olhe também a caixa de spam. O link vale por 1 hora.</Notice>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="label">E-mail</label>
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
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null); setHint(null); }}
                onBlur={(e) => setHint(emailHint(e.target.value))}
                aria-invalid={Boolean(emailError)}
              />
            </div>
            {emailError && <p className="mt-1 text-sm text-error" role="alert">{emailError}</p>}
            {!emailError && hint && (
              <p className="auth-fade-in mt-1 text-sm text-soft" role="status">
                Você quis dizer {hint}?{" "}
                <button type="button" className="font-semibold text-night underline" onClick={() => { setEmail(hint); setHint(null); }}>Corrigir</button>
              </p>
            )}
          </div>
          {send.error && (
            <Notice tone="error">
              {send.error.status === 429 ? "Muitas tentativas. Aguarde alguns minutos e tente de novo." : send.error.message}
            </Notice>
          )}
          <button className="btn-primary w-full" disabled={send.isPending || !email.trim() || !online}>{send.isPending ? "Enviando…" : "Enviar link"}</button>
        </form>
      )}
      <Link to="/" className="mt-4 inline-flex min-h-[44px] items-center justify-center text-sm font-semibold text-night underline underline-offset-2">Voltar para entrar</Link>
    </AuthShell>
  );
}
