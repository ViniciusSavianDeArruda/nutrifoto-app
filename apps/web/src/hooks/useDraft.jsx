import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Rascunho da refeição em andamento (foto + itens estimados). Fica só em memória:
 * nada é gravado no servidor até a pessoa confirmar.
 */
const Ctx = createContext(null);

export function DraftProvider({ children }) {
  const [draft, setDraft] = useState(null);

  const start = useCallback((d) => {
    setDraft((old) => {
      if (old?.previewUrl && old.previewUrl !== d.previewUrl) URL.revokeObjectURL(old.previewUrl);
      return d;
    });
  }, []);
  const clear = useCallback(() => {
    setDraft((old) => {
      if (old?.previewUrl) URL.revokeObjectURL(old.previewUrl);
      return null;
    });
  }, []);
  const patch = useCallback((p) => setDraft((old) => (old ? { ...old, ...p } : old)), []);

  const value = useMemo(() => ({ draft, start, clear, patch }), [draft, start, clear, patch]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useDraft = () => useContext(Ctx);
