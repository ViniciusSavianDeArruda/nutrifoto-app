import { Link } from "react-router-dom";
import { useOnline } from "../hooks/useOnline.js";
import AuthIllustration from "./AuthIllustration.jsx";

export default function AuthShell({ title, subtitle, children, footer, illustrationClass = null }) {
  const online = useOnline();
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL;
  return (
    <div className="auth-shell min-h-screen bg-ground flex flex-col items-center px-4 py-4 md:justify-center md:py-6">
      <div className="w-full max-w-[480px] rounded-lg border border-line bg-surface px-6 py-6 shadow-sm md:py-8">
        <Link to="/" className="mb-4 inline-flex items-center gap-2" aria-label="NutriFoto, início">
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <span className="text-sm font-bold text-night">NutriFoto</span>
        </Link>
        {illustrationClass && <AuthIllustration className={illustrationClass} />}
        <h1 className="text-[1.625rem] font-bold leading-tight">{title}</h1>
        {subtitle && <p className="mb-5 mt-1 text-sm text-soft">{subtitle}</p>}
        {!online && (
          <p className="mb-4 rounded-md bg-notice-bg px-3 py-2 text-sm text-notice" role="status">
            Sem internet. Conecte-se para entrar.
          </p>
        )}
        {children}
        {footer}
        <p className="mt-8 text-center text-[0.8125rem] text-soft">
          <Link to="/termos" className="underline">Termos de uso</Link> · <Link to="/privacidade" className="underline">Privacidade</Link>
        </p>
        {contactEmail && (
          <p className="mt-2 text-center text-[0.8125rem] text-soft">
            <a href={`mailto:${contactEmail}`} className="underline">Precisa de ajuda? Fale com a gente</a>
          </p>
        )}
      </div>
    </div>
  );
}
