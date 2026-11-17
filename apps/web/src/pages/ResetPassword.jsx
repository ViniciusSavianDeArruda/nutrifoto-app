import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { api } from "../lib/api.js";
import { useOnline } from "../hooks/useOnline.js";
import { Notice } from "../components/ui.jsx";
import AuthShell from "../components/AuthShell.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import StrengthBar from "../components/StrengthBar.jsx";

export default function ResetPassword() {
  const online = useOnline();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const reset = useMutation({ mutationFn: () => api.resetPassword(token, password) });
  const short = password.length > 0 && password.length < 8;
  const mismatch = again.length > 0 && again !== password;

  if (!token) {
    return (
      <AuthShell title="Link incompleto">
        <Notice tone="warn">Abra o link do e-mail inteiro ou peça um novo.</Notice>
        <Link to="/esqueci-senha" className="mt-4 inline-flex min-h-[44px] items-center justify-center text-sm font-semibold text-night underline underline-offset-2">Pedir novo link</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Criar nova senha" subtitle="Escolha uma senha com pelo menos 8 caracteres.">
      {reset.isSuccess ? (
        <>
          <Notice title="Senha alterada">Pronto! Entre com a senha nova. Os outros aparelhos conectados saíram da conta.</Notice>
          <Link to="/" className="btn-primary mt-4 w-full">Entrar</Link>
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (!short && !mismatch && password) reset.mutate(); }} className="space-y-4" noValidate>
          <div>
            <label htmlFor="password" className="label">Senha nova</label>
            <PasswordInput id="password" autoComplete="new-password" maxLength={128} placeholder="Mínimo de 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={short} leftIcon={<Lock className="h-4 w-4" />} />
            {short && <p className="mt-1 text-sm text-error" role="alert">A senha precisa ter pelo menos 8 caracteres.</p>}
            <StrengthBar password={password} />
          </div>
          <div>
            <label htmlFor="again" className="label">Repita a senha</label>
            <PasswordInput id="again" autoComplete="new-password" maxLength={128} placeholder="Mínimo de 8 caracteres" value={again} onChange={(e) => setAgain(e.target.value)} aria-invalid={mismatch} leftIcon={<Lock className="h-4 w-4" />} />
            {mismatch && <p className="mt-1 text-sm text-error" role="alert">As senhas não são iguais.</p>}
          </div>
          {reset.error && (
            <Notice tone="error" action={reset.error.code === "invalid_token" ? <Link to="/esqueci-senha" className="btn-quiet">Pedir novo link</Link> : null}>{reset.error.message}</Notice>
          )}
          <button className="btn-primary w-full" disabled={reset.isPending || !password || short || mismatch || !online}>{reset.isPending ? "Salvando…" : "Salvar senha"}</button>
        </form>
      )}
    </AuthShell>
  );
}
