const API_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

const query = (values = {}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const suffix = params.toString();
  return suffix ? `?${suffix}` : "";
};

const get = (path) => request(path);
const post = (path, body = {}) => request(path, { method: "POST", body: JSON.stringify(body) });
const put = (path, body = {}) => request(path, { method: "PUT", body: JSON.stringify(body) });
const del = (path) => request(path, { method: "DELETE" });

export const api = {
  health: () => get("/health"),
  login: (login, password) => post("/auth/login", { login, password }),
  logout: () => post("/auth/logout"),
  authMe: () => get("/auth/me"),
  authProfile: () => get("/auth/profile"),
  updateAuthProfile: (name, email) => put("/auth/profile", { name, email }),
  updateMetadata: (payload = {}) => put("/auth/metadata", payload),
  changePassword: (currentPassword, newPassword) => post("/auth/password", { currentPassword, newPassword }),
  listUsers: () => get("/auth/users"),
  createUser: (payload = {}) => post("/auth/users", payload),
  updateUser: (userId, payload = {}) => put(`/auth/users/${encodeURIComponent(userId)}`, payload),
  deactivateUser: (userId) => post(`/auth/users/${encodeURIComponent(userId)}/deactivate`),
  deleteUser: (userId) => del(`/auth/users/${encodeURIComponent(userId)}`),
  pay42Dashboard: () => get("/api/42pay/dashboard"),
  pay42Products: (filters = {}) => get(`/api/42pay/products${query(filters)}`),
  pay42CreateProduct: (payload = {}) => post("/api/42pay/products", payload),
  pay42UpdateProduct: (sid, payload = {}) => put(`/api/42pay/products/${encodeURIComponent(sid)}`, payload),
  pay42Offers: (filters = {}) => get(`/api/42pay/offers${query(filters)}`),
  pay42CreateOffer: (payload = {}) => post("/api/42pay/offers", payload),
  pay42UpdateOffer: (sid, payload = {}) => put(`/api/42pay/offers/${encodeURIComponent(sid)}`, payload),
  pay42Orders: (filters = {}) => get(`/api/42pay/orders${query(filters)}`),
  pay42Wallet: () => get("/api/42pay/wallet"),
  pay42WalletTopups: (filters = {}) => get(`/api/42pay/wallet/topups${query(filters)}`),
  pay42TopupWallet: (payload = {}) => post("/api/42pay/wallet/topups", payload),
  pay42CreateOrder: (payload = {}) => post("/api/42pay/orders", payload),
  pay42PreviewQrCode: (payload = {}) => post("/api/42pay/scan/preview", payload),
  pay42ScanQrCode: (payload = {}) => post("/api/42pay/scan", payload),
  pay42AdminUsers: () => get("/api/42pay/admin/users"),
};

export function getRuntimeApiBase() { return API_BASE; }
export function getRuntimeDirectDevApiBase() { return API_BASE; }
