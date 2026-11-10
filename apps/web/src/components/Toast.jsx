import { createContext, useCallback, useContext, useMemo, useState } from "react";

const Ctx = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const show = useCallback((message, action) => {
    const id = Date.now();
    setToast({ id, message, action });
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), action ? 6000 : 3500);
  }, []);

  const value = useMemo(() => show, [show]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 lg:bottom-8 lg:pl-64 flex justify-center px-4">
        {toast && (
          <div className="pointer-events-auto flex max-w-[448px] items-center gap-3 rounded-md bg-night-deep px-4 py-3 text-sm text-white shadow-lg">
            <span>{toast.message}</span>
            {toast.action && (
              <button
                className="min-h-[44px] font-bold text-yolk"
                onClick={() => { toast.action.run(); setToast(null); }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
