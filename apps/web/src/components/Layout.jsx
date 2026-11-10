import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { BarChart3, Camera, History, Home, Settings } from "lucide-react";
import Avatar from "./Avatar.jsx";
import { useAuth } from "../hooks/useAuth.jsx";

const TABS = [
  { to: "/", label: "Hoje", Icon: Home, end: true },
  { to: "/historico", label: "Histórico", Icon: History },
  { to: "/graficos", label: "Gráficos", Icon: BarChart3 },
  { to: "/ajustes", label: "Ajustes", Icon: Settings },
];

const NAV_STYLES = {
  tab:  { wrapper: "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 text-[0.75rem] font-semibold", active: "text-night",        inactive: "text-soft" },
  side: { wrapper: "flex min-h-[48px] items-center gap-3 rounded-md px-3 font-semibold transition-colors",               active: "bg-white/15 text-white", inactive: "text-white/80 hover:bg-white/10 hover:text-white" },
};

function NavItem({ to, label, Icon, end, variant }) {
  const s = NAV_STYLES[variant];
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `${s.wrapper} ${isActive ? s.active : s.inactive}`}
    >
      {({ isActive }) => (
        <>
          <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

/** Menu lateral fixo, só de lg (1024px) para cima. Abaixo disso quem aparece é a barra de abas. */
function Sidebar({ hideCapture }) {
  const { user } = useAuth();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-night px-4 py-6 text-white lg:flex">
      <Link to="/" className="mb-6 flex items-center gap-3 rounded-md px-2" aria-label="NutriFoto, ir para Hoje">
        <img src="/icon.svg" alt="" className="h-10 w-10 rounded-md ring-1 ring-white/30" />
        <span className="text-xl font-bold">NutriFoto</span>
      </Link>

      {!hideCapture && (
        <NavLink
          to="/registrar"
          aria-label="Registrar refeição"
          className="mb-4 flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-yolk px-5 font-bold text-yolk-ink"
        >
          <Camera className="h-6 w-6" aria-hidden="true" />
          <span>Registrar</span>
        </NavLink>
      )}

      <nav aria-label="Navegação principal" className="flex flex-col gap-1">
        {TABS.map((t) => <NavItem key={t.to} {...t} variant="side" />)}
      </nav>

      <Link
        to="/ajustes"
        aria-label="Seu perfil e ajustes"
        className="mt-auto flex min-h-[56px] items-center gap-3 rounded-md px-2 hover:bg-white/10"
      >
        <Avatar user={user} className="h-10 w-10 ring-2 ring-white/40" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{user?.name || "Sem nome"}</span>
          <span className="block truncate text-[0.8125rem] text-white/80">{user?.email}</span>
        </span>
      </Link>
    </aside>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const hideCapture = pathname.startsWith("/registrar") || pathname.startsWith("/refeicao/nova");
  // Telas de formulário (registrar, revisar, detalhe da refeição) ficam estreitas e centralizadas no desktop.
  const narrow = pathname.startsWith("/registrar") || pathname.startsWith("/refeicao");
  return (
    <div className="mx-auto min-h-screen max-w-[480px] lg:mx-0 lg:max-w-none lg:pl-64">
      <Sidebar hideCapture={hideCapture} />
      <main
        className={`px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))] lg:mx-auto lg:px-8 lg:pb-12 lg:pt-8 ${
          narrow ? "lg:max-w-[720px]" : "lg:max-w-[1200px]"
        }`}
      >
        <Outlet />
      </main>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="relative mx-auto flex h-16 max-w-[480px] items-stretch">
          <NavItem variant="tab" {...TABS[0]} />
          <NavItem variant="tab" {...TABS[1]} />
          <div className="w-28 shrink-0" aria-hidden="true" />
          <NavItem variant="tab" {...TABS[2]} />
          <NavItem variant="tab" {...TABS[3]} />
          {!hideCapture && (
            <NavLink
              to="/registrar"
              aria-label="Registrar refeição"
              className="absolute left-1/2 top-0 flex h-16 -translate-x-1/2 -translate-y-1/3 items-center justify-center gap-2 rounded-full bg-yolk px-5 font-bold text-yolk-ink shadow-lg"
            >
              <Camera className="h-6 w-6" aria-hidden="true" />
              <span>Registrar</span>
            </NavLink>
          )}
        </div>
      </nav>
    </div>
  );
}
