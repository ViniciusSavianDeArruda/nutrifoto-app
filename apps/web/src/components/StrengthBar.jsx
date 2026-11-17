function passwordStrength(pw) {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return "fraca";
  if (score <= 3) return "média";
  return "forte";
}

const LEVEL = {
  fraca: { bars: 1, bar: "bg-error", label: "text-error" },
  média: { bars: 2, bar: "bg-notice", label: "text-notice" },
  forte: { bars: 3, bar: "bg-fiber", label: "text-fiber" },
};

export default function StrengthBar({ password }) {
  const level = passwordStrength(password);
  if (!level) return null;
  const { bars, bar, label } = LEVEL[level];
  return (
    <div className="mt-1">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= bars ? bar : "bg-line"}`} />
        ))}
      </div>
      <p className={`mt-1 text-xs ${label}`} role="status" aria-live="polite">
        Senha {level}
      </p>
    </div>
  );
}
