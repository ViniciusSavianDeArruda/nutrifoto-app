import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2, ServerCrash } from "lucide-react";
import Layout from "./components/Layout.jsx";
import { useAuth } from "./hooks/useAuth.jsx";
import { useWake } from "./hooks/useWake.js";
import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import { Privacy, Terms } from "./pages/Legal.jsx";
import Today from "./pages/Today.jsx";
import Capture from "./pages/Capture.jsx";
import Review from "./pages/Review.jsx";
import History from "./pages/History.jsx";
import MealDetail from "./pages/MealDetail.jsx";
import { Spinner } from "./components/ui.jsx";
const Charts = lazy(() => import("./pages/Charts.jsx"));
import Favorites from "./pages/Favorites.jsx";
import Settings from "./pages/Settings.jsx";

function WakeScreen({ state }) {
  if (state === "offline") {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
        <ServerCrash className="h-10 w-10 text-soft" aria-hidden="true" />
        <h1 className="text-xl font-bold">Não consegui falar com o servidor</h1>
        <p className="text-soft">Confira a internet. Se o servidor estiver parado, pode demorar mais um pouco para voltar.</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>Tentar de novo</button>
      </div>
    );
  }
  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-3 px-6 text-center" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-night motion-reduce:animate-none" aria-hidden="true" />
      <h1 className="text-xl font-bold">Acordando o servidor…</h1>
      <p className="text-soft">O servidor pode demorar um pouco para responder. Costuma levar menos de um minuto.</p>
    </div>
  );
}

export default function App() {
  const wake = useWake();
  const { user, loading } = useAuth();

  if (wake === "waking" || wake === "offline") return <WakeScreen state={wake} />;
  if (wake === "checking" || loading) return <div className="min-h-screen" aria-busy="true" />;
  if (!user) {
    return (
      <Routes>
        <Route path="termos" element={<Terms />} />
        <Route path="privacidade" element={<Privacy />} />
        <Route path="esqueci-senha" element={<ForgotPassword />} />
        <Route path="redefinir-senha" element={<ResetPassword />} />
        <Route path="confirmar-email" element={<VerifyEmail />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="termos" element={<Terms />} />
      <Route path="privacidade" element={<Privacy />} />
      <Route path="confirmar-email" element={<VerifyEmail />} />
      <Route element={<Layout />}>
        <Route index element={<Today />} />
        <Route path="registrar" element={<Capture />} />
        <Route path="refeicao/nova" element={<Review />} />
        <Route path="refeicao/:id" element={<MealDetail />} />
        <Route path="historico" element={<History />} />
        <Route path="graficos" element={<Suspense fallback={<Spinner />}><Charts /></Suspense>} />
        <Route path="favoritos" element={<Favorites />} />
        <Route path="ajustes" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
