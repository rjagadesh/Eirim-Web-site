import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getStore } from "@netlify/blobs";

// ---- config ----
function creds() {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "creds.json"), "utf8"));
  } catch {
    return {};
  }
}
export function config() {
  const c = creds();
  const adminPassword = process.env.ADMIN_PASSWORD || c.ADMIN_PASSWORD || "";
  const secret = process.env.SESSION_SECRET || c.SESSION_SECRET || adminPassword || "eirim-dev-secret";
  return { adminPassword, secret };
}

// ---- modules & role presets (IAM) ----
export const MODULES = ["contacts", "pipeline", "campaigns", "financials", "leads", "traffic", "chat", "tickets", "settings"];
export const MODULE_LABEL = {
  contacts: "Contacts", pipeline: "Pipeline", campaigns: "Campaigns", financials: "Financials",
  leads: "Demo requests", traffic: "Traffic", chat: "Chatbot", tickets: "Tickets", settings: "Settings",
};
export const ROLE_PRESETS = {
  owner: [...MODULES],
  admin: MODULES.filter((m) => m !== "settings"),
  sales: ["contacts", "pipeline", "campaigns", "leads", "chat", "tickets"],
  finance: ["financials", "contacts"],
  support: ["tickets", "contacts", "chat"],
  analyst: ["traffic", "contacts", "pipeline"],
};

// ---- password hashing (scrypt) ----
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(String(pw), salt, 32).toString("hex");
  return `${salt}:${h}`;
}
export function verifyPassword(pw, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, h] = stored.split(":");
  const h2 = crypto.scryptSync(String(pw), salt, 32).toString("hex");
  return h.length === h2.length && crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(h2, "hex"));
}

// ---- signed tokens (stateless sessions) ----
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const sig = (data, secret) => crypto.createHmac("sha256", secret).update(data).digest("base64url");

export function signToken(payload) {
  const { secret } = config();
  const body = { ...payload, exp: Date.now() + 12 * 3600 * 1000 };
  const b = b64(body);
  return `${b}.${sig(b, secret)}`;
}
export function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const { secret } = config();
  const [b, s] = token.split(".");
  if (sig(b, secret) !== s) return null;
  try {
    const p = JSON.parse(Buffer.from(b, "base64url").toString());
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}

// ---- users store ----
export const usersStore = () => getStore("users");
export async function listUsers() {
  const s = usersStore();
  const { blobs } = await s.list();
  const out = [];
  for (const b of blobs) {
    try {
      const u = await s.get(b.key, { type: "json" });
      if (u) out.push(u);
    } catch {}
  }
  out.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  return out;
}
export const userKey = (email) => String(email || "").trim().toLowerCase();
export const getUser = (email) => usersStore().get(userKey(email), { type: "json" });
export const saveUser = (u) => {
  u.email = userKey(u.email);
  return usersStore().setJSON(u.email, u);
};
export const deleteUser = (email) => usersStore().delete(userKey(email));

// ---- request authorization ----
// The header carries either the master password (Owner) or a signed user token.
export function principal(req) {
  const h = req.headers.get("x-admin-password") || "";
  const { adminPassword } = config();
  if (h && adminPassword && h === adminPassword) {
    return { owner: true, email: "owner", name: "Owner", role: "owner", modules: [...MODULES] };
  }
  const p = verifyToken(h);
  if (p && p.email) return { owner: p.role === "owner", email: p.email, name: p.name, role: p.role, modules: p.modules || [] };
  return null;
}
// Returns { ok, principal } or { error, status }.
export function authorize(req, module) {
  const { adminPassword } = config();
  if (!adminPassword || adminPassword === "change-me-admin-password") return { error: "Admin password not configured.", status: 500 };
  const pr = principal(req);
  if (!pr) return { error: "Unauthorized", status: 401 };
  if (!module || pr.owner || (pr.modules || []).includes(module)) return { ok: true, principal: pr };
  return { error: "Forbidden — your role can't access this module.", status: 403 };
}

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
