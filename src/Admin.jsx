import { useState, useEffect } from "react";
import Campaigns from "./Campaigns.jsx";
import Finance from "./Finance.jsx";
import { Contacts, ContactDetail } from "./Contacts.jsx";
import Pipeline from "./Pipeline.jsx";
import Tickets from "./Tickets.jsx";
import Settings from "./Settings.jsx";

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

// Count occurrences and return [ [label, count], ... ] sorted desc.
const tally = (arr, keyFn) => {
  const m = new Map();
  arr.forEach((x) => {
    const k = keyFn(x);
    if (k) m.set(k, (m.get(k) || 0) + 1);
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

const SKEY = "eirim_admin_session";
const TAB_ORDER = ["contacts", "pipeline", "campaigns", "financials", "leads", "traffic", "chat", "tickets", "settings"];
const readSession = () => { try { return JSON.parse(sessionStorage.getItem(SKEY) || "null"); } catch { return null; } };
const firstTab = (sess) => TAB_ORDER.find((m) => sess?.role === "owner" || (sess?.modules || []).includes(m)) || "contacts";

export default function Admin() {
  const saved = readSession();
  const [pw, setPw] = useState(saved?.token || ""); // token sent as x-admin-password
  const [session, setSession] = useState(saved || null);
  const [email, setEmail] = useState("");
  const [pwInput, setPwInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(saved ? firstTab(saved) : "contacts");
  const [chatSub, setChatSub] = useState("transcripts");
  const [contactEmail, setContactEmail] = useState(null);
  const openContact = (email) => email && setContactEmail(email);
  const [openSession, setOpenSession] = useState(null);

  const can = (m) => session?.role === "owner" || (session?.modules || []).includes(m);

  const load = async (token) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(DATA_ENDPOINT, { headers: { "x-admin-password": token } });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) { logout(); throw new Error("Session expired — please sign in again."); }
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setData(body);
      setAuthed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/.netlify/functions/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password: pwInput }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Sign-in failed.");
      const sess = { token: d.token, name: d.name, role: d.role, modules: d.modules };
      sessionStorage.setItem(SKEY, JSON.stringify(sess));
      setSession(sess);
      setPw(d.token);
      setTab(firstTab(sess));
      await load(d.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Admin · MedXFlow";
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => document.head.removeChild(m);
  }, []);

  useEffect(() => {
    if (saved?.token) load(saved.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = () => {
    sessionStorage.removeItem(SKEY);
    setAuthed(false); setData(null); setPw(""); setSession(null);
  };

  if (!authed) {
    return (
      <div className="ad-wrap ad-center">
        <style>{CSS}</style>
        <form className="ad-login" onSubmit={signIn}>
          <h1>MedXFlow Admin</h1>
          <p>Sign in with your account, or leave email blank and use the owner password.</p>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (blank = owner)" autoComplete="username" />
          <input type="password" value={pwInput} onChange={(e) => setPwInput(e.target.value)} placeholder="Password" autoComplete="current-password" autoFocus />
          <button type="submit" disabled={loading || !pwInput}>{loading ? "Checking…" : "Sign in"}</button>
          {error && <div className="ad-err">{error}</div>}
        </form>
      </div>
    );
  }

  const { transcripts = [], visitors = [], pageviews = [], leads = [], counts = {} } = data || {};
  const uniqueVisitors = new Set(pageviews.map((p) => p.visitorId).filter(Boolean)).size;
  const topPages = tally(pageviews, (p) => p.path);
  const topCountries = tally(pageviews, (p) => p.geo?.country);
  const topReferrers = tally(pageviews, (p) => p.referrerDomain || (p.referrer ? "other" : "direct"));
  const topCampaigns = tally(pageviews, (p) => p.utm?.campaign || p.utm?.source);

  return (
    <div className="ad-wrap ad-shell">
      <style>{CSS}</style>
      <aside className="ad-side">
        <div className="ad-side-brand">MedXFlow <b>Admin</b></div>
        <nav className="ad-nav">
          {can("contacts") && <button className={tab === "contacts" ? "on" : ""} onClick={() => setTab("contacts")}>👤 Contacts</button>}
          {can("pipeline") && <button className={tab === "pipeline" ? "on" : ""} onClick={() => setTab("pipeline")}>🗂 Pipeline</button>}
          {can("campaigns") && <button className={tab === "campaigns" ? "on" : ""} onClick={() => setTab("campaigns")}>📣 Campaigns</button>}
          {can("financials") && <button className={tab === "financials" ? "on" : ""} onClick={() => setTab("financials")}>💶 Financials</button>}
          {can("leads") && <button className={tab === "leads" ? "on" : ""} onClick={() => setTab("leads")}>📥 Demo requests</button>}
          {can("tickets") && <button className={tab === "tickets" ? "on" : ""} onClick={() => setTab("tickets")}>🎫 Tickets</button>}
          {can("traffic") && <button className={tab === "traffic" ? "on" : ""} onClick={() => setTab("traffic")}>📊 Traffic</button>}
          {can("chat") && <button className={tab === "chat" ? "on" : ""} onClick={() => setTab("chat")}>💬 Chatbot</button>}
          {can("settings") && <button className={tab === "settings" ? "on" : ""} onClick={() => setTab("settings")}>⚙️ Settings</button>}
        </nav>
        <div className="ad-side-foot">
          <div className="ad-user">{session?.name || "Owner"}<span>{session?.role || "owner"}</span></div>
          <button className="ad-ghost" onClick={() => load(pw)} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
          <button className="ad-ghost" onClick={logout}>Log out</button>
        </div>
      </aside>

      <main className="ad-main">
        {!["campaigns", "financials", "contacts", "pipeline", "tickets", "settings"].includes(tab) && (
          <div className="ad-stats">
            <div className="ad-stat ad-stat-hot"><b>{counts.leads ?? leads.length}</b><span>Demo requests</span></div>
            <div className="ad-stat"><b>{counts.pageviews ?? pageviews.length}</b><span>Pageviews</span></div>
            <div className="ad-stat"><b>{uniqueVisitors}</b><span>Unique visitors</span></div>
            <div className="ad-stat"><b>{counts.visitors ?? visitors.length}</b><span>Chat leads</span></div>
            <div className="ad-stat"><b>{counts.transcripts ?? transcripts.length}</b><span>Chat sessions</span></div>
          </div>
        )}

      {error && <div className="ad-err">{error}</div>}

      {tab === "contacts" && <Contacts pw={pw} onOpen={openContact} />}

      {tab === "pipeline" && <Pipeline pw={pw} onOpen={openContact} />}

      {tab === "tickets" && can("tickets") && <Tickets pw={pw} />}

      {tab === "settings" && can("settings") && <Settings pw={pw} session={session} />}

      {tab === "campaigns" && <Campaigns pw={pw} leads={leads} visitors={visitors} />}

      {tab === "financials" && <Finance pw={pw} />}

      {tab === "leads" && (
        <div className="ad-card">
          {leads.length === 0 ? (
            <div className="ad-empty">No demo requests yet.</div>
          ) : (
            <div className="ad-scroll">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Clinic</th>
                    <th>Phone</th>
                    <th>Best time</th>
                    <th>Message</th>
                    <th>Source</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="ct-row" onClick={() => openContact(l.email)}>
                      <td className="ad-nowrap">{fmt(l.at)}</td>
                      <td>{l.name || "—"}</td>
                      <td>
                        <a className="ad-mail" href={`mailto:${l.email}`}>{l.email || "—"}</a>
                      </td>
                      <td>{l.clinic || "—"}</td>
                      <td className="ad-nowrap">
                        {l.phone ? <a className="ad-mail" href={`tel:${l.phone}`}>{l.phone}</a> : "—"}
                      </td>
                      <td>{l.preferredTime || "—"}</td>
                      <td className="ad-trunc" title={l.message || ""}>{l.message || "—"}</td>
                      <td className="ad-trunc">{l.source || "—"}</td>
                      <td>{[l.geo?.city, l.geo?.country].filter(Boolean).join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "traffic" && (
        <>
          <div className="ad-insights">
            <InsightCard title="Top pages" rows={topPages} />
            <InsightCard title="Top countries" rows={topCountries} empty="No geo yet (shows on live site)" />
            <InsightCard title="Top referrers" rows={topReferrers} />
            <InsightCard title="Top campaigns" rows={topCampaigns} empty="No UTM campaigns yet" />
          </div>
          <div className="ad-card">
            {pageviews.length === 0 ? (
              <div className="ad-empty">No traffic logged yet.</div>
            ) : (
              <div className="ad-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Location</th>
                      <th>IP</th>
                      <th>Device</th>
                      <th>Page</th>
                      <th>Source</th>
                      <th>Visitor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageviews.map((p) => (
                      <tr key={p.id}>
                        <td className="ad-nowrap">{fmt(p.at)}</td>
                        <td>{[p.geo?.city, p.geo?.country].filter(Boolean).join(", ") || "—"}</td>
                        <td className="ad-nowrap">{p.ip || "—"}</td>
                        <td className="ad-nowrap">
                          {[p.device?.browser, p.device?.os].filter(Boolean).join(" / ") || "—"}
                          {p.device?.type && <span className="ad-badge">{p.device.type}</span>}
                        </td>
                        <td>{p.path}</td>
                        <td className="ad-trunc">
                          {p.utm?.campaign || p.utm?.source || p.referrerDomain || "direct"}
                        </td>
                        <td className="ad-trunc" title={p.visitorId || ""}>
                          {p.newVisitor ? "🆕 " : ""}
                          {(p.visitorId || "").slice(0, 8)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "chat" && (
        <nav className="ad-tabs ad-subtabs">
          <button className={chatSub === "transcripts" ? "on" : ""} onClick={() => setChatSub("transcripts")}>Transcripts ({transcripts.length})</button>
          <button className={chatSub === "leads" ? "on" : ""} onClick={() => setChatSub("leads")}>Chat leads ({visitors.length})</button>
        </nav>
      )}

      {tab === "chat" && chatSub === "leads" && (
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
                    <tr key={v.sessionId} className={v.email ? "ct-row" : ""} onClick={() => v.email && openContact(v.email)}>
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

      {tab === "chat" && chatSub === "transcripts" && (
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
      </main>
      {contactEmail && (
        <ContactDetail pw={pw} email={contactEmail} onClose={() => setContactEmail(null)} onChanged={() => load(pw)} />
      )}
    </div>
  );
}

function InsightCard({ title, rows, empty = "No data yet" }) {
  const top = rows.slice(0, 6);
  const max = top[0]?.[1] || 1;
  return (
    <div className="ad-insight">
      <h3>{title}</h3>
      {top.length === 0 ? (
        <div className="ad-insight-empty">{empty}</div>
      ) : (
        top.map(([label, n]) => (
          <div key={label} className="ad-bar-row">
            <span className="ad-bar-label" title={label}>
              {label}
            </span>
            <span className="ad-bar-track">
              <span className="ad-bar-fill" style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="ad-bar-n">{n}</span>
          </div>
        ))
      )}
    </div>
  );
}

const CSS = `
.ad-wrap{min-height:100vh; background:#0F1B19; color:#E8F0EE; font-family:'Figtree',system-ui,sans-serif; padding:26px clamp(16px,4vw,48px)}
/* sidebar shell */
.ad-shell{padding:0; display:flex; align-items:stretch}
.ad-side{width:232px; flex:none; background:#0b1513; border-right:1px solid rgba(207,229,222,.1); padding:22px 14px; display:flex; flex-direction:column; gap:6px; position:sticky; top:0; height:100vh}
.ad-side-brand{font-size:18px; font-weight:600; padding:4px 10px 16px}
.ad-nav{display:flex; flex-direction:column; gap:3px; flex:1}
.ad-nav button{text-align:left; background:none; border:none; color:rgba(232,240,238,.7); padding:10px 12px; border-radius:9px; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap}
.ad-nav button:hover{background:rgba(255,255,255,.06); color:#fff}
.ad-nav button.on{background:#1E6B5C; color:#fff}
.ad-side-foot{display:flex; flex-direction:column; gap:8px; margin-top:auto; padding-top:14px; border-top:1px solid rgba(207,229,222,.1)}
.ad-user{font-size:13px; font-weight:700; color:#E8F0EE; padding:0 4px 4px} .ad-user span{display:block; font-size:11px; font-weight:600; color:#3DDC97; text-transform:capitalize}
.ad-main{flex:1; min-width:0; padding:26px clamp(16px,3vw,40px); overflow-x:hidden}
.ct-row{cursor:pointer}
.ct-row:hover{background:rgba(207,229,222,.06)}
@media(max-width:760px){
  .ad-shell{flex-direction:column}
  .ad-side{width:auto; height:auto; position:static; border-right:none; border-bottom:1px solid rgba(207,229,222,.1)}
  .ad-nav{flex-direction:row; flex-wrap:wrap}
  .ad-side-foot{flex-direction:row; border-top:none; padding-top:0; margin-top:8px}
}
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
.ad-stat-hot{background:linear-gradient(135deg,#1E6B5C,#154D42); border-color:rgba(61,220,151,.4)}
.ad-stat-hot b{color:#F2C14E}
.ad-mail{color:#7FD1BE; text-decoration:none}
.ad-mail:hover{text-decoration:underline}

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

.ad-insights{display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; margin-bottom:18px}
.ad-insight{background:#16302B; border:1px solid rgba(207,229,222,.14); border-radius:12px; padding:16px 18px}
.ad-insight h3{margin:0 0 12px; font-size:13px; text-transform:uppercase; letter-spacing:.06em; color:rgba(232,240,238,.6); font-weight:700}
.ad-insight-empty{font-size:12.5px; color:rgba(232,240,238,.4)}
.ad-bar-row{display:flex; align-items:center; gap:10px; margin-bottom:8px; font-size:13px}
.ad-bar-label{flex:0 0 34%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#E8F0EE}
.ad-bar-track{flex:1; height:8px; background:rgba(207,229,222,.1); border-radius:999px; overflow:hidden}
.ad-bar-fill{display:block; height:100%; background:linear-gradient(90deg,#1E6B5C,#3DDC97); border-radius:999px}
.ad-bar-n{flex:none; color:rgba(232,240,238,.7); font-variant-numeric:tabular-nums; min-width:26px; text-align:right}
.ad-badge{display:inline-block; margin-left:8px; font-size:10.5px; padding:1px 7px; border-radius:999px; background:rgba(61,220,151,.15); color:#3DDC97; vertical-align:middle}
`;
