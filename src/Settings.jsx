import { useState, useEffect } from "react";

const API = "/.netlify/functions/users";

export default function Settings({ pw, session }) {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ modules: [], moduleLabels: {}, presets: {} });
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "sales", modules: [] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const api = async (payload) => {
    const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify(payload) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
    return d;
  };
  const load = async () => {
    try {
      const d = await api({ action: "list" });
      setUsers(d.users || []);
    } catch (e) {
      setErr(e.message);
    }
  };
  useEffect(() => {
    api({ action: "meta" }).then((d) => {
      setMeta(d);
      setForm((f) => ({ ...f, modules: d.presets?.sales || [] }));
    }).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRole = (role) => setForm((f) => ({ ...f, role, modules: meta.presets?.[role] || f.modules }));
  const toggleMod = (m) => setForm((f) => ({ ...f, modules: f.modules.includes(m) ? f.modules.filter((x) => x !== m) : [...f.modules, m] }));

  const create = async () => {
    setErr(""); setMsg("");
    if (!form.email.includes("@")) return setErr("Valid email required.");
    if (form.password.length < 6) return setErr("Password must be at least 6 characters.");
    setBusy(true);
    try {
      await api({ action: "create", ...form });
      setMsg(`User ${form.email} created ✓`);
      setForm({ name: "", email: "", password: "", role: "sales", modules: meta.presets?.sales || [] });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const patch = async (email, p) => {
    try { await api({ action: "update", email, patch: p }); await load(); } catch (e) { setErr(e.message); }
  };
  const resetPw = async (email) => {
    const np = window.prompt(`New password for ${email} (min 6 chars):`);
    if (np) patch(email, { password: np }).then(() => setMsg("Password reset ✓"));
  };
  const del = async (email) => {
    if (window.confirm(`Delete user ${email}?`)) { try { await api({ action: "delete", email }); await load(); } catch (e) { setErr(e.message); } }
  };

  const roles = Object.keys(meta.presets || {});

  return (
    <div>
      <style>{CSS}</style>
      <div className="cmp-head"><h3>Settings — Users &amp; roles</h3></div>
      {err && <div className="ad-err" style={{ marginBottom: 12 }}>{err}</div>}
      {msg && <div className="cmp-ok">{msg}</div>}

      <div className="se-note">🔑 The <b>Owner</b> signs in with the master password (no email) and always has full access. Users below sign in with their email + password.</div>

      {/* Create user */}
      <div className="ad-card cmp-form" style={{ marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 12px" }}>Add user</h4>
        <div className="cmp-row" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
          <label>Name<input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></label>
          <label>Email<input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="user@eirim.ie" /></label>
          <label>Password<input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="min 6 chars" /></label>
          <label>Role<select value={form.role} onChange={(e) => setRole(e.target.value)}>{roles.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
        </div>
        <div className="se-mods">
          <span className="cmp-hint">Modules this user can access:</span>
          <div className="se-mod-grid">
            {meta.modules.map((m) => (
              <label key={m} className={"se-mod" + (form.modules.includes(m) ? " on" : "")}>
                <input type="checkbox" checked={form.modules.includes(m)} onChange={() => toggleMod(m)} />
                {meta.moduleLabels[m] || m}
              </label>
            ))}
          </div>
        </div>
        <div className="cmp-actions"><button className="cmp-btn cmp-primary" onClick={create} disabled={busy}>{busy ? "Creating…" : "+ Create user"}</button></div>
      </div>

      {/* Users list */}
      <div className="ad-card">
        {!users.length ? <div className="ad-empty">No users yet — add one above.</div> : (
          <div className="ad-scroll">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Modules</th><th>Active</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.email}>
                    <td><b>{u.name || "—"}</b></td>
                    <td>{u.email}</td>
                    <td>
                      <select className="se-role" value={u.role} onChange={(e) => patch(u.email, { role: e.target.value, modules: meta.presets?.[e.target.value] })}>
                        {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="ad-trunc" title={(u.modules || []).join(", ")}>{(u.modules || []).length} module{(u.modules || []).length === 1 ? "" : "s"}</td>
                    <td><button className={"se-toggle" + (u.active ? " on" : "")} onClick={() => patch(u.email, { active: !u.active })}>{u.active ? "Active" : "Disabled"}</button></td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="cmp-btn cmp-sm" onClick={() => resetPw(u.email)}>Reset PW</button>{" "}
                      <button className="cmp-btn cmp-sm cmp-danger" onClick={() => del(u.email)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Roles reference */}
      <h4 className="ct-h4" style={{ marginTop: 20 }}>Role presets</h4>
      <div className="se-roles">
        {roles.map((r) => (
          <div key={r} className="se-rolecard">
            <b>{r}</b>
            <div>{(meta.presets[r] || []).map((m) => <span key={m} className="se-chip">{meta.moduleLabels[m] || m}</span>)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CSS = `
.se-note{background:#16302B; border:1px solid rgba(207,229,222,.14); border-radius:10px; padding:11px 14px; font-size:13px; color:rgba(232,240,238,.8); margin-bottom:14px}
.se-mods{margin:6px 0 12px}
.se-mod-grid{display:flex; flex-wrap:wrap; gap:8px; margin-top:8px}
.se-mod{display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:rgba(232,240,238,.6); background:#0F1B19; border:1px solid rgba(207,229,222,.16); padding:7px 12px; border-radius:8px; cursor:pointer}
.se-mod.on{background:#1E6B5C; border-color:#1E6B5C; color:#fff}
.se-role{padding:5px 8px; border:1px solid rgba(207,229,222,.2); border-radius:7px; background:#16302B; color:#fff; font-size:12.5px; font-family:inherit; text-transform:capitalize}
.se-toggle{border:1px solid rgba(207,229,222,.24); background:rgba(255,255,255,.06); color:rgba(232,240,238,.7); border-radius:999px; padding:4px 12px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit}
.se-toggle.on{background:rgba(61,220,151,.16); border-color:rgba(61,220,151,.4); color:#3DDC97}
.se-roles{display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px}
.se-rolecard{background:#16302B; border:1px solid rgba(207,229,222,.12); border-radius:10px; padding:12px 14px}
.se-rolecard b{text-transform:capitalize; display:block; margin-bottom:8px}
.se-chip{display:inline-block; font-size:11px; background:rgba(207,229,222,.1); color:rgba(232,240,238,.75); padding:2px 8px; border-radius:999px; margin:0 4px 4px 0}
`;
