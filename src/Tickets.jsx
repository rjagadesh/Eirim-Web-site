import { useState, useEffect } from "react";

const API = "/.netlify/functions/tickets";
const STATUS = ["open", "in_progress", "waiting", "resolved", "closed"];
const PRIORITY = ["low", "normal", "high", "urgent"];
const SLABEL = { open: "Open", in_progress: "In progress", waiting: "Waiting", resolved: "Resolved", closed: "Closed" };
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

export default function Tickets({ pw }) {
  const [tickets, setTickets] = useState([]);
  const [agent, setAgent] = useState("");
  const [view, setView] = useState("list");
  const [filter, setFilter] = useState("all");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const api = async (payload) => {
    const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify(payload) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
    return d;
  };
  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const d = await api({ action: "list" });
      setTickets(d.tickets || []);
      setAgent(d.agent || "");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (payload) => {
    try {
      await api(payload);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const current = tickets.find((t) => t.id === view);
  const shown = tickets.filter((t) => filter === "all" || (filter === "open" ? t.status !== "closed" && t.status !== "resolved" : t.status === filter));
  const openCount = tickets.filter((t) => t.status !== "closed" && t.status !== "resolved").length;

  return (
    <div>
      <style>{CSS}</style>
      {err && <div className="ad-err" style={{ marginBottom: 12 }}>{err}</div>}

      {view === "list" && (
        <>
          <div className="cmp-head">
            <h3>Support tickets <span className="tk-open">{openCount} open</span></h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="cmp-btn" onClick={load} disabled={loading}>{loading ? "…" : "⟳"}</button>
              <button className="cmp-btn cmp-primary" onClick={() => setView("new")}>+ New ticket</button>
            </div>
          </div>
          <div className="fin-filter" style={{ marginBottom: 12 }}>
            {["all", "open", "in_progress", "waiting", "resolved", "closed"].map((k) => (
              <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{k === "all" ? "All" : SLABEL[k] || k}</button>
            ))}
          </div>
          <div className="ad-card">
            {!shown.length ? <div className="ad-empty">No tickets.</div> : (
              <div className="ad-scroll">
                <table>
                  <thead><tr><th>Subject</th><th>Requester</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Updated</th></tr></thead>
                  <tbody>
                    {shown.map((t) => (
                      <tr key={t.id} className="ct-row" onClick={() => setView(t.id)}>
                        <td><b>{t.subject}</b></td>
                        <td>{t.requesterName || t.requesterEmail || "—"}{t.clinic ? <div className="cmp-sub">{t.clinic}</div> : null}</td>
                        <td><span className={"tk-pri pr-" + t.priority}>{t.priority}</span></td>
                        <td><span className={"tk-st ts-" + t.status}>{SLABEL[t.status]}</span></td>
                        <td>{t.assignedTo || "—"}</td>
                        <td className="ad-nowrap">{fmt(t.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {view === "new" && <NewTicket api={api} onDone={async () => { await load(); setView("list"); }} onCancel={() => setView("list")} />}

      {current && (
        <Detail t={current} agent={agent} act={act} onBack={() => setView("list")} />
      )}
    </div>
  );
}

function NewTicket({ api, onDone, onCancel }) {
  const [f, setF] = useState({ subject: "", requesterName: "", requesterEmail: "", clinic: "", priority: "normal", message: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (!f.subject) return setErr("Subject required.");
    setBusy(true); setErr("");
    try { await api({ action: "create", ...f }); onDone(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="ad-card cmp-form">
      <div className="cmp-head"><h3>New ticket</h3><button className="cmp-btn" onClick={onCancel}>← Back</button></div>
      <label>Subject<input value={f.subject} onChange={set("subject")} placeholder="e.g. Kiosk won't connect to Wi-Fi" /></label>
      <div className="cmp-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <label>Requester name<input value={f.requesterName} onChange={set("requesterName")} /></label>
        <label>Requester email<input value={f.requesterEmail} onChange={set("requesterEmail")} placeholder="links to contact" /></label>
        <label>Priority<select value={f.priority} onChange={set("priority")}>{PRIORITY.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
      </div>
      <label>Clinic<input value={f.clinic} onChange={set("clinic")} /></label>
      <label>Description<textarea rows={4} value={f.message} onChange={set("message")} placeholder="What's the issue?" /></label>
      {err && <div className="ad-err">{err}</div>}
      <div className="cmp-actions"><button className="cmp-btn cmp-primary" onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create ticket"}</button></div>
    </div>
  );
}

function Detail({ t, agent, act, onBack }) {
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const send = async () => { if (!reply.trim()) return; await act({ action: "reply", id: t.id, body: reply, internal }); setReply(""); };
  return (
    <div>
      <div className="cmp-head">
        <button className="cmp-btn" onClick={onBack}>← All tickets</button>
        <button className="cmp-btn cmp-danger" onClick={() => { if (confirm("Delete ticket?")) { act({ action: "delete", id: t.id }); onBack(); } }}>Delete</button>
      </div>
      <h3 style={{ margin: "6px 0 2px" }}>{t.subject}</h3>
      <div className="cmp-sub">{t.requesterName} {t.requesterEmail ? `· ${t.requesterEmail}` : ""} {t.clinic ? `· ${t.clinic}` : ""}</div>

      <div className="tk-controls">
        <label>Status
          <select value={t.status} onChange={(e) => act({ action: "update", id: t.id, patch: { status: e.target.value } })}>
            {STATUS.map((s) => <option key={s} value={s}>{SLABEL[s]}</option>)}
          </select>
        </label>
        <label>Priority
          <select value={t.priority} onChange={(e) => act({ action: "update", id: t.id, patch: { priority: e.target.value } })}>
            {PRIORITY.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label>Assigned to
          <input defaultValue={t.assignedTo || ""} onBlur={(e) => act({ action: "update", id: t.id, patch: { assignedTo: e.target.value } })} placeholder="unassigned" />
        </label>
        <button className="cmp-btn" onClick={() => act({ action: "update", id: t.id, patch: { assignedTo: agent } })}>Assign to me</button>
      </div>

      <div className="tk-thread">
        {(t.messages || []).map((m, i) => (
          <div key={i} className={"tk-msg" + (m.internal ? " tk-int" : "")}>
            <div className="tk-msg-hd"><b>{m.author}</b> {m.internal && <span className="tk-tag">internal</span>}<span className="ct-meta"> · {fmt(m.at)}</span></div>
            <div className="tk-msg-body">{m.body}</div>
          </div>
        ))}
        {!(t.messages || []).length && <div className="ad-empty">No messages yet.</div>}
      </div>

      <div className="tk-reply">
        <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Add a reply or note…" />
        <div className="tk-reply-foot">
          <label className="tk-chk"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note</label>
          <button className="cmp-btn cmp-primary" onClick={send} disabled={!reply.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.tk-open{font-size:12px; font-weight:600; color:#3DDC97; margin-left:8px}
.tk-pri{font-size:11px; font-weight:700; text-transform:uppercase; padding:2px 8px; border-radius:999px}
.pr-low{background:rgba(255,255,255,.08); color:#9db8b0} .pr-normal{background:rgba(127,209,190,.14); color:#7FD1BE} .pr-high{background:rgba(242,193,78,.16); color:#F2C14E} .pr-urgent{background:rgba(224,90,78,.18); color:#E05A4E}
.tk-st{font-size:11px; font-weight:700; padding:2px 9px; border-radius:999px}
.ts-open{background:rgba(123,179,213,.16); color:#7FB3D5} .ts-in_progress{background:rgba(242,193,78,.16); color:#F2C14E} .ts-waiting{background:rgba(255,255,255,.1); color:#bcd} .ts-resolved,.ts-closed{background:rgba(61,220,151,.16); color:#3DDC97}
.tk-controls{display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end; margin:16px 0}
.tk-controls label{display:flex; flex-direction:column; gap:5px; font-size:12px; font-weight:600; color:rgba(232,240,238,.7)}
.tk-controls select, .tk-controls input{padding:8px 10px; border:1px solid rgba(207,229,222,.2); border-radius:8px; background:#16302B; color:#fff; font-size:13.5px; font-family:inherit; outline:none}
.tk-thread{display:flex; flex-direction:column; gap:10px; margin:8px 0 16px}
.tk-msg{background:#16302B; border:1px solid rgba(207,229,222,.1); border-radius:10px; padding:12px 14px}
.tk-msg.tk-int{background:rgba(242,193,78,.06); border-color:rgba(242,193,78,.25)}
.tk-msg-hd{font-size:12.5px; margin-bottom:5px}
.tk-tag{font-size:10px; font-weight:700; text-transform:uppercase; background:rgba(242,193,78,.2); color:#F2C14E; padding:1px 6px; border-radius:5px; margin-left:6px}
.tk-msg-body{font-size:14px; line-height:1.5; white-space:pre-wrap; color:rgba(232,240,238,.9)}
.tk-reply textarea{width:100%; padding:11px 13px; border:1px solid rgba(207,229,222,.2); border-radius:10px; background:#0F1B19; color:#fff; font-size:14px; font-family:inherit; outline:none; resize:vertical}
.tk-reply-foot{display:flex; align-items:center; justify-content:space-between; margin-top:8px}
.tk-chk{font-size:13px; color:rgba(232,240,238,.7); display:flex; align-items:center; gap:6px}
`;
