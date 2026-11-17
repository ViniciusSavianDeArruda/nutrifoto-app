import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

/**
 * O servidor gratuito dorme depois de ~15 min parado. Ao abrir o app chamamos /health e,
 * se demorar, mostramos "acordando o servidor…" em vez de uma tela quebrada.
 */
export function useWake() {
  const [state, setState] = useState("checking"); // checking | waking | ready | offline

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const slow = setTimeout(() => !cancelled && setState((s) => (s === "checking" ? "waking" : s)), 1500);

    (async () => {
      for (let attempt = 0; attempt < 8 && !cancelled; attempt += 1) {
        try {
          await api.health(ctrl.signal);
          if (!cancelled) setState("ready");
          return;
        } catch (e) {
          if (e.name === "AbortError") return;
          if (!cancelled) setState("waking");
          await new Promise((r) => setTimeout(r, 4000));
        }
      }
      if (!cancelled) setState("offline");
    })();

    return () => { cancelled = true; clearTimeout(slow); ctrl.abort(); };
  }, []);

  return state;
}
