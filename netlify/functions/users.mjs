import {
  config, MODULES, MODULE_LABEL, ROLE_PRESETS,
  hashPassword, verifyPassword, signToken,
  listUsers, getUser, saveUser, deleteUser, userKey,
  authorize, json,
} from "../lib/auth.mjs";

export default async (req) => {
  let body = {};
  try {
    body = await req.json();
  } catch {}
  const action = body.action;

  // ---- login (no auth required — this IS the auth) ----
  if (action === "login") {
    const { adminPassword } = config();
    const email = userKey(body.email);
    const pw = String(body.password || "");
    if (!email || email === "owner") {
      if (adminPassword && pw === adminPassword) {
        const token = signToken({ email: "owner", name: "Owner", role: "owner", modules: MODULES });
        return json({ ok: true, token, name: "Owner", role: "owner", modules: MODULES });
      }
      return json({ error: "Wrong password." }, 401);
    }
    const u = await getUser(email);
    if (!u || u.active === false || !verifyPassword(pw, u.password)) {
      return json({ error: "Wrong email or password." }, 401);
    }
    const token = signToken({ email: u.email, name: u.name, role: u.role, modules: u.modules });
    return json({ ok: true, token, name: u.name, role: u.role, modules: u.modules });
  }

  // ---- meta for the UI ----
  if (action === "meta") {
    return json({ modules: MODULES, moduleLabels: MODULE_LABEL, presets: ROLE_PRESETS });
  }

  // ---- user management (owner / settings module only) ----
  const auth = authorize(req, "settings");
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  if (action === "list") {
    const users = await listUsers();
    return json({
      users: users.map((u) => ({ email: u.email, name: u.name, role: u.role, modules: u.modules, active: u.active !== false, createdAt: u.createdAt })),
    });
  }
  if (action === "create") {
    const email = userKey(body.email);
    if (!email || !email.includes("@")) return json({ error: "A valid email is required." }, 400);
    if (!body.password || String(body.password).length < 6) return json({ error: "Password must be at least 6 characters." }, 400);
    if (await getUser(email)) return json({ error: "A user with that email already exists." }, 400);
    const role = body.role || "sales";
    const modules = Array.isArray(body.modules) && body.modules.length ? body.modules.filter((m) => MODULES.includes(m)) : ROLE_PRESETS[role] || [];
    await saveUser({
      email, name: String(body.name || "").slice(0, 80), role, modules,
      password: hashPassword(body.password), active: true, createdAt: new Date().toISOString(),
    });
    return json({ ok: true });
  }
  if (action === "update") {
    const u = await getUser(userKey(body.email));
    if (!u) return json({ error: "User not found." }, 404);
    const p = body.patch || {};
    if (p.name !== undefined) u.name = String(p.name).slice(0, 80);
    if (p.role !== undefined) u.role = p.role;
    if (Array.isArray(p.modules)) u.modules = p.modules.filter((m) => MODULES.includes(m));
    if (p.active !== undefined) u.active = !!p.active;
    if (p.password) {
      if (String(p.password).length < 6) return json({ error: "Password too short." }, 400);
      u.password = hashPassword(p.password);
    }
    await saveUser(u);
    return json({ ok: true });
  }
  if (action === "delete") {
    await deleteUser(userKey(body.email));
    return json({ ok: true });
  }
  return json({ error: "Unknown action" }, 400);
};
