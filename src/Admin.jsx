import { useState, useEffect } from "react";

const DATA_ENDPOINT = "/.netlify/functions/admin-data";
const PW_KEY = "eirim_admin_pw";

const fmt = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export default function Admin() {
  const [pw, setPw] = useState(sessionStorage.getItem(PW_KEY) || "");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("visitors");
  const [openSession, setOpenSession] = useState(null);

  const load = async (password) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(DATA_ENDPOINT, { headers: { "x-admin-password": password } });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error("Wrong password.");
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setData(body);
      setAuthed(true);
      sessionStorage.setItem(PW_KEY, password);
    } catch (err) {
      setError(err.message);
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  };

  // Auto-login if a password is already stored this session
  useEffect(() => {
    if (pw) load(pw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    sessionStorage.removeItem(PW_KEY);
    setAuthed(false);
    setData(null);
    setPw("");
  };

  if (!authed) {
    return (
      <div className="ad-wrap ad-center">
        <style>{CSS}</style>
        <form
          className="ad-login"
          onSubmit={(e) => {
            e.preventDefault();
            load(pw);
          }}
        >
          <h1>Eirim Admin</h1>
          <p>Restricted area. Enter the admin password.</p>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Admin password"
            autoFocus
          />
          <button type="submit" disabled={loading || !pw}>
            {loading ? "Checking…" : "Sign in"}
          </button>
          {error && <div className="ad-err">{error}</div>}
        </form>
      </div>
    );
  }

  const { transcripts = [], visitors = [], counts = {} } = data || {};

  return (
    <div className="ad-wrap">
      <style>{CSS}</style>
      <header className="ad-top">
        <div>
          <h1>Eirim Admin</h1>
          <span className="ad-sub">Chat database &amp; visitor log</span>
        </div>
        <div className="ad-actions">
          <button className="ad-ghost" onClick={() => load(pw)} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button className="ad-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <div className="ad-stats">
        <div className="ad-stat">
          <b>{counts.visitors ?? visitors.length}</b>
          <span>Visitors</span>
        </div>
        <div className="ad-stat">
          <b>{counts.transcripts ?? transcripts.length}</b>
          <span>Chat sessions</span>
        </div>
      </div>

      <nav className="ad-tabs">
        <button className={tab === "visitors" ? "on" : ""} onClick={() => setTab("visitors")}>
          Visitors
        </button>
        <button className={tab === "chats" ? "on" : ""} onClick={() => setTab("chats")}>
          Chat transcripts
        </button>
      </nav>

      {error && <div className="ad-err">{error}</div>}

      {tab === "visitors" && (
        <div className="ad-card">
          {visitors.length === 0 ? (
            <div className="ad-empty">No visitors logged yet.</div>
          ) : (
            <div className="ad-scroll">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Page</th>
                    <th>Referrer</th>
                    <th>Device</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v) => (
                    <tr key={v.sessionId}>
                      <td className="ad-nowrap">{fmt(v.at)}</td>
                      <td>{v.name || "—"}</td>
                      <td>{v.email || "—"}</td>
                      <td>{v.page || "—"}</td>
                      <td className="ad-trunc">{v.referrer || "direct"}</td>
                      <td className="ad-trunc" title={v.userAgent || ""}>
                        {v.userAgent || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "chats" && (
        <div className="ad-card">
          {transcripts.length === 0 ? (
            <div className="ad-empty">No chat transcripts yet.</div>
          ) : (
            transcripts.map((t) => {
              const open = openSession === t.sessionId;
              return (
                <div key={t.sessionId} className="ad-session">
                  <button
                    className="ad-session-head"
                    onClick={() => setOpenSession(open ? null : t.sessionId)}
                  >
                    <span className="ad-caret">{open ? "▾" : "▸"}</span>
                    <b>{t.name || "Anonymous"}</b>
                    <span className="ad-email">{t.email || "—"}</span>
                    <span className="ad-meta">
                      {(t.messages?.length || 0)} msgs · {fmt(t.updatedAt)}
                    </span>
                  </button>
                  {open && (
                    <div className="ad-convo">
                      {(t.messages || []).map((m, i) => (
                        <div key={i} className={"ad-msg ad-" + m.role}>
                          <span className="ad-role">{m.role}</span>
                          <span className="ad-text">{m.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const CSS = `
.ad-wrap{min-height:100vh; background:#0F1B19; color:#E8F0EE; font-family:'Figtree',system-ui,sans-serif; padding:26px clamp(16px,4vw,48px)}
.ad-center{display:grid; place-items:center}
.ad-login{background:#16302B; border:1px solid rgba(207,229,222,.16); border-radius:16px; padding:34px 30px; width:min(360px,92vw); display:flex; flex-direction:column; gap:14px; box-shadow:0 30px 80px rgba(0,0,0,.5)}
.ad-login h1{font-size:22px; margin:0}
.ad-login p{margin:0; font-size:13.5px; color:rgba(232,240,238,.6)}
.ad-login input{padding:12px 14px; border-radius:10px; border:1px solid rgba(207,229,222,.2); background:#0F1B19; color:#fff; font-size:15px; outline:none}
.ad-login input:focus{border-color:#3DDC97}
.ad-login button, .ad-ghost{cursor:pointer; font-family:inherit}
.ad-login button{background:#1E6B5C; color:#fff; border:none; border-radius:10px; padding:12px; font-size:15px; font-weight:700}
.ad-login button:disabled{opacity:.5}
.ad-err{background:rgba(217,83,79,.15); border:1px solid rgba(217,83,79,.4); color:#ffb4ae; padding:9px 12px; border-radius:9px; font-size:13px}

.ad-top{display:flex; justify-content:space-between; align-items:flex-end; gap:16px; flex-wrap:wrap; margin-bottom:20px}
.ad-top h1{font-size:24px; margin:0}
.ad-sub{font-size:13px; color:rgba(232,240,238,.55)}
.ad-actions{display:flex; gap:10px}
.ad-ghost{background:transparent; border:1px solid rgba(207,229,222,.28); color:#E8F0EE; border-radius:9px; padding:9px 16px; font-size:13.5px; font-weight:600}
.ad-ghost:hover{background:rgba(207,229,222,.08)}

.ad-stats{display:flex; gap:16px; margin-bottom:20px; flex-wrap:wrap}
.ad-stat{background:#16302B; border:1px solid rgba(207,229,222,.14); border-radius:12px; padding:16px 24px; min-width:130px}
.ad-stat b{display:block; font-size:30px; color:#3DDC97; font-weight:800; line-height:1}
.ad-stat span{font-size:12.5px; color:rgba(232,240,238,.6)}

.ad-tabs{display:flex; gap:6px; margin-bottom:16px}
.ad-tabs button{background:transparent; border:none; color:rgba(232,240,238,.6); padding:9px 16px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit}
.ad-tabs button.on{background:#1E6B5C; color:#fff}

.ad-card{background:#16302B; border:1px solid rgba(207,229,222,.14); border-radius:14px; overflow:hidden}
.ad-empty{padding:40px; text-align:center; color:rgba(232,240,238,.5)}
.ad-scroll{overflow-x:auto}
table{width:100%; border-collapse:collapse; font-size:13.5px}
th, td{text-align:left; padding:12px 14px; border-bottom:1px solid rgba(207,229,222,.09); vertical-align:top}
th{font-size:11.5px; text-transform:uppercase; letter-spacing:.06em; color:rgba(232,240,238,.5); font-weight:700}
.ad-nowrap{white-space:nowrap}
.ad-trunc{max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}

.ad-session{border-bottom:1px solid rgba(207,229,222,.09)}
.ad-session-head{width:100%; display:flex; align-items:center; gap:12px; background:transparent; border:none; color:inherit; padding:14px 16px; cursor:pointer; font-family:inherit; font-size:14px; text-align:left}
.ad-session-head:hover{background:rgba(207,229,222,.05)}
.ad-caret{color:#3DDC97; width:12px}
.ad-email{color:rgba(232,240,238,.6); font-size:13px}
.ad-meta{margin-left:auto; color:rgba(232,240,238,.45); font-size:12px; white-space:nowrap}
.ad-convo{padding:8px 16px 18px 40px; display:flex; flex-direction:column; gap:8px}
.ad-msg{display:flex; gap:10px; font-size:13.5px; line-height:1.5}
.ad-role{flex:none; width:70px; font-size:11px; text-transform:uppercase; letter-spacing:.05em; padding-top:2px; font-weight:700}
.ad-user .ad-role{color:#7FD1BE}
.ad-assistant .ad-role{color:#F2C14E}
.ad-text{white-space:pre-wrap; color:rgba(232,240,238,.9)}
`;
