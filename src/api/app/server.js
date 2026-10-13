"use strict";

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const { create42PayService } = require("../modules/42pay/service");
const payHandlers = require("../modules/42pay/httpHandlers");
const { createUserRepository } = require("../modules/system/users");

const PORT = Number(process.env.PORT || process.env.API_PORT || 3001);
const HOST = String(process.env.HOST || "127.0.0.1");
const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");
const DATA_DIR = path.resolve(process.env.XTRAVEL84_DATA_DIR || path.join(PROJECT_ROOT, "data"));
const SQLITE_PATH = path.resolve(process.env.XTRAVEL84_SQLITE_PATH || path.join(DATA_DIR, "xtravel84.sqlite"));
const SESSION_COOKIE = "xtravel84_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

fs.mkdirSync(path.dirname(SQLITE_PATH), { recursive: true, mode: 0o700 });
const objectStore = { provider: "sqlite", sqlitePath: SQLITE_PATH };
const users = createUserRepository({ objectStore, defaultRoles: ["buyer"] });
const pay42 = create42PayService({ sqlitePath: SQLITE_PATH, objectStore });
const sessions = new Map();

function nowIso() { return new Date().toISOString(); }
function makeSalt() { return crypto.randomBytes(16).toString("hex"); }
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password || ""), String(salt || ""), 120000, 32, "sha256").toString("hex");
}
function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function publicUser(user) {
  if (!user) return null;
  const { password_hash, password_salt, ...safe } = user;
  return safe;
}
function json(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body), ...headers });
  res.end(body);
}
function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return index < 0 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
  }));
}
async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}
function hasRole(user, role) { return Array.isArray(user?.roles) && user.roles.includes(role); }
function requireAdmin(user) {
  if (!hasRole(user, "admin")) {
    const error = new Error("Admin access is required");
    error.statusCode = 403;
    throw error;
  }
}
async function currentUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return users.getUserById(session.userId);
}
function setSessionCookie(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}
function clearSessionCookie() { return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`; }
function routeMatch(pathname, pattern) {
  const names = [];
  const expression = pattern.split("/").map((part) => {
    if (!part.startsWith(":")) return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    names.push(part.slice(1));
    return "([^/]+)";
  }).join("/");
  const match = pathname.match(new RegExp(`^${expression}$`));
  return match ? Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])])) : null;
}
async function seedUser({ user_id, name, email, roles, password }) {
  const existing = await users.getUserById(user_id);
  if (existing) return existing;
  const salt = makeSalt();
  return (await users.upsertUser({
    user_id, name, email, roles, permissions: [], is_active: true,
    password_salt: salt, password_hash: hashPassword(password, salt),
    metadata: { demo: true, source: "xtravel84-bootstrap" },
    created_at: nowIso(), updated_at: nowIso(),
  })).user;
}
async function bootstrap() {
  const password = String(process.env.XTRAVEL84_DEMO_PASSWORD || "123456");
  await seedUser({ user_id: "admin", name: "admin", email: "admin@example.test", roles: ["admin"], password });
  await seedUser({ user_id: "seller", name: "seller", email: "seller@example.test", roles: ["seller"], password });
  await seedUser({ user_id: "user", name: "user", email: "user@example.test", roles: ["buyer"], password });
  await pay42.seedInitialData();
}

async function handleAuth(req, res, url, actor) {
  const { method } = req;
  const pathname = url.pathname;
  if (method === "POST" && pathname === "/auth/login") {
    const payload = await readJson(req);
    const login = String(payload.login || payload.username || payload.email || "").trim();
    const user = (await users.getUserByEmail(login)) || (await users.getUserByName(login)) || (await users.getUserById(login));
    if (!user || user.is_active === false || !safeEqual(hashPassword(payload.password, user.password_salt), user.password_hash)) {
      return json(res, 401, { ok: false, error: "Invalid username or password" });
    }
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { userId: user.user_id, expiresAt: Date.now() + SESSION_TTL_MS });
    return json(res, 200, { ok: true, user: publicUser(user) }, { "set-cookie": setSessionCookie(token) });
  }
  if (method === "POST" && pathname === "/auth/logout") {
    const token = parseCookies(req)[SESSION_COOKIE];
    if (token) sessions.delete(token);
    return json(res, 200, { ok: true }, { "set-cookie": clearSessionCookie() });
  }
  if (!actor) return json(res, 401, { ok: false, error: "Authentication required" });
  if (method === "GET" && pathname === "/auth/me") return json(res, 200, { ok: true, user: publicUser(actor) });
  if (method === "GET" && pathname === "/auth/profile") return json(res, 200, { ok: true, user: publicUser(actor) });
  if (method === "PUT" && pathname === "/auth/profile") {
    const payload = await readJson(req);
    const out = await users.upsertUser({ ...actor, name: payload.name, email: payload.email, updated_at: nowIso() });
    return json(res, 200, { ok: true, user: publicUser(out.user) });
  }
  if (method === "PUT" && pathname === "/auth/metadata") {
    const payload = await readJson(req);
    const out = await users.upsertUser({ ...actor, metadata: { ...(actor.metadata || {}), ...(payload || {}) }, updated_at: nowIso() });
    return json(res, 200, { ok: true, user: publicUser(out.user) });
  }
  if (method === "POST" && pathname === "/auth/password") {
    const payload = await readJson(req);
    if (!safeEqual(hashPassword(payload.currentPassword, actor.password_salt), actor.password_hash)) {
      return json(res, 400, { ok: false, error: "Current password is incorrect" });
    }
    if (String(payload.newPassword || "").length < 6) return json(res, 400, { ok: false, error: "New password must be at least 6 characters" });
    const salt = makeSalt();
    await users.upsertUser({ ...actor, password_salt: salt, password_hash: hashPassword(payload.newPassword, salt), updated_at: nowIso() });
    return json(res, 200, { ok: true });
  }
  if (pathname === "/auth/users" && method === "GET") {
    requireAdmin(actor);
    return json(res, 200, { ok: true, items: (await users.listUsers()).map(publicUser) });
  }
  if (pathname === "/auth/users" && method === "POST") {
    requireAdmin(actor);
    const payload = await readJson(req);
    const userId = String(payload.user_id || payload.name || "").trim();
    if (!userId) return json(res, 400, { ok: false, error: "user_id is required" });
    if (await users.getUserById(userId)) return json(res, 409, { ok: false, error: "User already exists" });
    const salt = makeSalt();
    const out = await users.upsertUser({ ...payload, user_id: userId, roles: Array.isArray(payload.roles) && payload.roles.length ? payload.roles : ["buyer"], is_active: payload.is_active !== false, password_salt: salt, password_hash: hashPassword(payload.password || "123456", salt), created_at: nowIso(), updated_at: nowIso() });
    return json(res, 201, { ok: true, user: publicUser(out.user) });
  }
  const userRoute = routeMatch(pathname, "/auth/users/:userId");
  if (userRoute && method === "PUT") {
    requireAdmin(actor);
    const existing = await users.getUserById(userRoute.userId);
    if (!existing) return json(res, 404, { ok: false, error: "User not found" });
    const payload = await readJson(req);
    const patch = { ...existing, ...payload, user_id: existing.user_id, updated_at: nowIso() };
    if (payload.password) {
      patch.password_salt = makeSalt();
      patch.password_hash = hashPassword(payload.password, patch.password_salt);
      delete patch.password;
    }
    const out = await users.upsertUser(patch);
    return json(res, 200, { ok: true, user: publicUser(out.user) });
  }
  if (userRoute && method === "DELETE") {
    requireAdmin(actor);
    const out = await users.deleteUserById(userRoute.userId);
    return json(res, out.ok ? 200 : 400, out);
  }
  const deactivateRoute = routeMatch(pathname, "/auth/users/:userId/deactivate");
  if (deactivateRoute && method === "POST") {
    requireAdmin(actor);
    const existing = await users.getUserById(deactivateRoute.userId);
    if (!existing) return json(res, 404, { ok: false, error: "User not found" });
    const out = await users.upsertUser({ ...existing, is_active: false, updated_at: nowIso() });
    return json(res, 200, { ok: true, user: publicUser(out.user) });
  }
  return false;
}

async function handlePay(req, res, url, actor) {
  if (!url.pathname.startsWith("/api/42pay/")) return false;
  if (!actor) return json(res, 401, { ok: false, error: "Authentication required" });
  const context = { service: pay42, actor: publicUser(actor), url };
  const allUsers = async () => (await users.listUsers()).map(publicUser);
  let out;
  if (req.method === "GET" && url.pathname === "/api/42pay/dashboard") out = await payHandlers.handle42PayDashboard({ ...context, users: await allUsers() });
  else if (req.method === "GET" && url.pathname === "/api/42pay/products") out = await payHandlers.handle42PayProductsList(context);
  else if (req.method === "POST" && url.pathname === "/api/42pay/products") out = await payHandlers.handle42PayProductUpsert({ ...context, payload: await readJson(req) });
  else if (req.method === "GET" && url.pathname === "/api/42pay/offers") out = await payHandlers.handle42PayOffersList(context);
  else if (req.method === "POST" && url.pathname === "/api/42pay/offers") out = await payHandlers.handle42PayOfferUpsert({ ...context, payload: await readJson(req) });
  else if (req.method === "GET" && url.pathname === "/api/42pay/orders") out = await payHandlers.handle42PayOrdersList(context);
  else if (req.method === "POST" && url.pathname === "/api/42pay/orders") out = await payHandlers.handle42PayOrderCreate({ ...context, payload: await readJson(req) });
  else if (req.method === "GET" && url.pathname === "/api/42pay/wallet") out = await payHandlers.handle42PayWalletSummary(context);
  else if (req.method === "GET" && url.pathname === "/api/42pay/wallet/topups") out = await payHandlers.handle42PayWalletTopupsList(context);
  else if (req.method === "POST" && url.pathname === "/api/42pay/wallet/topups") out = await payHandlers.handle42PayWalletTopup({ ...context, payload: await readJson(req) });
  else if (req.method === "POST" && url.pathname === "/api/42pay/scan/preview") out = await payHandlers.handle42PayScanPreview({ ...context, payload: await readJson(req) });
  else if (req.method === "POST" && url.pathname === "/api/42pay/scan") out = await payHandlers.handle42PayOrderCreate({ ...context, payload: await readJson(req) });
  else if (req.method === "GET" && url.pathname === "/api/42pay/admin/users") out = await payHandlers.handle42PayAdminUsers({ ...context, users: await allUsers() });
  else {
    const productRoute = routeMatch(url.pathname, "/api/42pay/products/:sid");
    const offerRoute = routeMatch(url.pathname, "/api/42pay/offers/:sid");
    if (req.method === "PUT" && productRoute) out = await payHandlers.handle42PayProductUpsert({ ...context, route: productRoute, payload: await readJson(req) });
    else if (req.method === "PUT" && offerRoute) out = await payHandlers.handle42PayOfferUpsert({ ...context, route: offerRoute, payload: await readJson(req) });
    else return false;
  }
  return json(res, 200, out);
}

function corsHeaders(req) {
  const origin = String(req.headers.origin || "");
  return origin ? { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", vary: "Origin" } : {};
}
async function appHandler(req, res) {
  const headers = corsHeaders(req);
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  if (req.method === "OPTIONS") {
    res.writeHead(204, { ...headers, "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS", "access-control-allow-headers": "content-type" });
    return res.end();
  }
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
  if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true, service: "xtravel84-api", database: path.basename(SQLITE_PATH) });
  try {
    const actor = await currentUser(req);
    const authResult = url.pathname.startsWith("/auth/") ? await handleAuth(req, res, url, actor) : false;
    if (authResult !== false) return authResult;
    const payResult = await handlePay(req, res, url, actor);
    if (payResult !== false) return payResult;
    return json(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    const message = String(error?.message || error || "Internal server error");
    const status = Number(error?.statusCode) || (/required|forbidden|not allowed/i.test(message) ? 403 : 400);
    if (status >= 500) console.error(error);
    return json(res, status, { ok: false, error: message });
  }
}
async function start() {
  await bootstrap();
  const server = http.createServer((req, res) => void appHandler(req, res));
  server.listen(PORT, HOST, () => {
    console.log(`[xtravel84] API listening on http://${HOST}:${PORT}`);
    console.log(`[xtravel84] SQLite: ${SQLITE_PATH}`);
  });
  return server;
}
if (require.main === module) start().catch((error) => { console.error(error); process.exitCode = 1; });

module.exports = { appHandler, bootstrap, hashPassword, start };
