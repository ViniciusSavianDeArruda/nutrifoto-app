// Cliente HTTP da API. Em desenvolvimento usa o proxy do Vite ("/"); em produção, VITE_API_URL.
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "nutrifoto.token";

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* sem storage */ }
};

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

/** Minutos de diferença do UTC no fuso do aparelho (positivo a leste), como a API espera em `tz`. */
export const tzOffset = () => -new Date().getTimezoneOffset();

async function request(path, { method = "GET", json, form, raw = false, signal } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(json); }
  if (form) body = form;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body, signal });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new ApiError(0, "network", "Sem conexão com o servidor. Verifique a internet e tente de novo.");
  }
  if (res.status === 401 && token) { setToken(null); onUnauthorized(); }
  if (!res.ok) {
    let detail = null;
    try { detail = (await res.json()).detail; } catch { /* corpo vazio */ }
    if (Array.isArray(detail)) detail = { code: "validation", message: "Alguns dados estão inválidos. Confira os campos." };
    throw new ApiError(
      res.status,
      detail?.code || "error",
      detail?.message || (typeof detail === "string" ? detail : "Algo deu errado. Tente novamente."),
    );
  }
  if (raw) return res;
  if (res.status === 204) return null;
  return res.json();
}

const qs = (o) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const api = {
  health: (signal) => request("/health", { signal }),
  register: (d) => request("/api/auth/register", { method: "POST", json: d }),
  login: (d) => request("/api/auth/login", { method: "POST", json: d }),
  authConfig: () => request("/api/auth/config"),
  forgotPassword: (email) => request("/api/auth/forgot-password", { method: "POST", json: { email } }),
  resetPassword: (token, password) => request("/api/auth/reset-password", { method: "POST", json: { token, password } }),
  verifyEmail: (token) => request("/api/auth/verify-email", { method: "POST", json: { token } }),
  sendVerification: () => request("/api/auth/verify-email/send", { method: "POST", json: {} }),
  uploadAvatar: (file) => { const f = new FormData(); f.append("file", file, "perfil.jpg"); return request("/api/auth/me/avatar", { method: "POST", form: f }); },
  deleteAvatar: () => request("/api/auth/me/avatar", { method: "DELETE" }),
  me: () => request("/api/auth/me"),
  updateMe: (d) => request("/api/auth/me", { method: "PATCH", json: d }),
  deleteAccount: (password) => request("/api/auth/me", { method: "DELETE", json: { password } }),
  usage: () => request("/api/usage"),

  analyzePhoto: (file) => { const f = new FormData(); f.append("file", file, "foto.jpg"); return request("/api/meals/analyze", { method: "POST", form: f }); },
  analyzeText: (text, current_items) => request("/api/meals/analyze-text", { method: "POST", json: { text, current_items } }),
  createMeal: (payload, photo, thumb) => {
    const f = new FormData();
    f.append("payload", JSON.stringify(payload));
    if (photo) f.append("photo", photo, "foto.jpg");
    if (photo && thumb) f.append("thumb", thumb, "mini.jpg");
    return request("/api/meals", { method: "POST", form: f });
  },
  meals: (params) => request(`/api/meals${qs({ tz: tzOffset(), ...params })}`),
  meal: (id) => request(`/api/meals/${id}`),
  updateMeal: (id, d) => request(`/api/meals/${id}`, { method: "PUT", json: d }),
  deleteMeal: (id) => request(`/api/meals/${id}`, { method: "DELETE" }),
  duplicateMeal: (id, d = {}) => request(`/api/meals/${id}/duplicate`, { method: "POST", json: d }),

  favorites: () => request("/api/favorites"),
  createFavorite: (d) => request("/api/favorites", { method: "POST", json: d }),
  deleteFavorite: (id) => request(`/api/favorites/${id}`, { method: "DELETE" }),
  logFavorite: (id, d = {}) => request(`/api/favorites/${id}/log`, { method: "POST", json: d }),

  day: (day) => request(`/api/stats/day${qs({ day, tz: tzOffset() })}`),
  range: (days) => request(`/api/stats/range${qs({ days, tz: tzOffset() })}`),

  water: (day) => request(`/api/water${qs({ day, tz: tzOffset() })}`),
  addWater: (ml) => request("/api/water", { method: "POST", json: { ml } }),
  deleteWater: (id) => request(`/api/water/${id}`, { method: "DELETE" }),
  weights: (days = 90) => request(`/api/weight${qs({ days, tz: tzOffset() })}`),
  setWeight: (day, kg) => request("/api/weight", { method: "PUT", json: { day, kg } }),
  deleteWeight: (day) => request(`/api/weight/${day}`, { method: "DELETE" }),

  exportFile: async (format) => {
    const res = await request(`/api/export?format=${format}`, { raw: true });
    return res.blob();
  },
};
