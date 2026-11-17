import { createContext, useContext, useEffect } from "react";

/** O app tem só o tema claro. O contexto continua existindo para o que depende dele (gráficos). */
const Ctx = createContext({ mode: "light" });

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    try { localStorage.removeItem("nutrifoto.theme"); } catch { /* sem storage */ }
  }, []);
  return <Ctx.Provider value={{ mode: "light" }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
