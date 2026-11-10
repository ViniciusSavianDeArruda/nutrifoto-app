import { useEffect, useRef, useState } from "react";
import { AlertTriangle, BadgeCheck, CircleHelp, Gauge, Info, Loader2, X } from "lucide-react";
import { CONFIDENCE } from "../lib/nutrition.js";

export function Spinner({ label = "Carregando…" }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-soft" role="status">
      <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Notice({ tone = "info", title, children, action }) {
  const tones = {
    info: "border-line bg-surface text-ink",
    warn: "border-notice/40 bg-notice-bg text-ink",
    error: "border-error/40 bg-error-bg text-ink",
  };
  const Icon = tone === "info" ? Info : AlertTriangle;
  const iconCls = tone === "error" ? "text-error" : tone === "warn" ? "text-notice" : "text-soft";
  return (
    <div className={`flex gap-3 rounded-lg border p-4 ${tones[tone]}`} role={tone === "error" ? "alert" : "status"}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconCls}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-bold">{title}</p>}
        <div className={title ? "mt-0.5" : ""}>{children}</div>
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

export function ConfidenceBadge({ level }) {
  const map = {
    alta: { Icon: BadgeCheck, cls: "text-fiber border-fiber/50" },
    media: { Icon: Gauge, cls: "text-notice border-notice/50" },
    baixa: { Icon: CircleHelp, cls: "text-soft border-soft/60 border-dashed" },
  };
  const { Icon, cls } = map[level] || map.media;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.8125rem] font-semibold ${cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {CONFIDENCE[level]?.label ?? CONFIDENCE.media.label}
    </span>
  );
}

export function Header({ title, subtitle, right, left }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      {left}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-soft">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

/** Campo numérico que aceita vírgula e permite apagar enquanto digita. */
export function NumberField({ value, onValue, min = 0, max = Infinity, step = "any", id, label, suffix, allowZero = true, className = "", onFocus }) {
  const [text, setText] = useState(String(value ?? ""));
  const [invalid, setInvalid] = useState(false);
  const last = useRef(value);

  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(String(value ?? "").replace(".", ","));
    }
  }, [value]);

  const handle = (e) => {
    const raw = e.target.value;
    setText(raw);
    const n = Number(raw.replace(",", "."));
    const ok = raw.trim() !== "" && Number.isFinite(n) && n >= min && n <= max && (allowZero || n > 0);
    setInvalid(raw.trim() !== "" && !ok);
    if (ok) {
      last.current = n;
      onValue(n);
    }
  };
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <div className="relative">
        <input
          id={id}
          className={`input num ${suffix ? "pr-10" : ""}`}
          inputMode="decimal"
          step={step}
          value={text}
          onChange={handle}
          onFocus={onFocus}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-err` : undefined}
          onBlur={() => { setInvalid(false); setText(String(last.current ?? "").replace(".", ",")); }}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-soft">{suffix}</span>}
      </div>
      {invalid && (
        <p id={`${id}-err`} className="mt-1 text-[0.8125rem] text-error">
          {Number.isFinite(max) ? `Use um valor de ${min} a ${max}.` : `Use um valor a partir de ${min}.`}
        </p>
      )}
    </div>
  );
}

export function Dialog({ title, children, onClose }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose; // o efeito roda só uma vez: foco no diálogo ao abrir, sem roubar o foco dos campos a cada tecla
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night-deep/60 sm:items-center" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] rounded-t-lg bg-surface p-5 shadow-xl outline-none sm:rounded-lg"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn-quiet !min-h-[44px] !w-11 !px-0" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ title, message, confirmLabel = "Confirmar", danger, onConfirm, onClose }) {
  return (
    <Dialog title={title} onClose={onClose}>
      <p className="mb-4 text-soft">{message}</p>
      <div className="flex gap-2">
        <button className="btn-quiet flex-1" onClick={onClose}>Cancelar</button>
        <button className={`${danger ? "btn-danger" : "btn-primary"} flex-1`} onClick={() => { onConfirm(); onClose(); }}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          aria-label={o.short ? o.label : undefined}
          onClick={() => onChange(o.id)}
          className={`min-h-[44px] rounded-full border px-3.5 text-sm font-semibold ${
            value === o.id ? "border-night bg-night text-white" : "border-line bg-surface text-ink"
          }`}
        >
          {o.short ?? o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="px-6 py-10 text-center">
      {Icon && <Icon className="mx-auto mb-3 h-8 w-8 text-soft" aria-hidden="true" />}
      <p className="font-bold">{title}</p>
      {children && <p className="mt-1 text-sm text-soft">{children}</p>}
    </div>
  );
}
