import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, getToken, setToken, setUnauthorizedHandler } from "../lib/api.js";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    qc.clear();
  }, [qc]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      try { sessionStorage.setItem("nutrifoto.expired", "1"); } catch {}
      logout();
    });
  }, [logout]);

  useEffect(() => {
    if (!getToken()) return;
    api.me().then(setUser).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const authenticate = useCallback(async (call, data) => {
    const { access_token } = await call(data);
    setToken(access_token);
    const me = await api.me();
    setUser(me);
    return me;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      login: (d) => authenticate(api.login, d),
      register: (d) => authenticate(api.register, d),
      logout,
    }),
    [user, loading, authenticate, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
