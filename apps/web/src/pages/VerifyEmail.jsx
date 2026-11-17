import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { Notice, Spinner } from "../components/ui.jsx";
import AuthShell from "../components/AuthShell.jsx";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { user, setUser } = useAuth();
  const verify = useMutation({
    mutationFn: () => api.verifyEmail(token),
    onSuccess: () => { if (user) api.me().then(setUser).catch(() => {}); },
  });
  useEffect(() => { if (token) verify.mutate(); /* uma vez ao abrir */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthShell title="Confirmar e-mail">
      {!token ? (
        <Notice tone="warn">Abra o link do e-mail inteiro.</Notice>
      ) : verify.isSuccess ? (
        <Notice title="E-mail confirmado">Obrigado! Agora você pode recuperar a senha por este e-mail se precisar.</Notice>
      ) : verify.error ? (
        <Notice tone="error">{verify.error.message}</Notice>
      ) : (
        <Spinner label="Confirmando…" />
      )}
      <Link to="/" className="btn-primary mt-4 w-full">{user ? "Ir para o app" : "Entrar"}</Link>
    </AuthShell>
  );
}
