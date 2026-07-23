import { useState, useEffect } from "react";

const API = "/.netlify/functions/campaigns";
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

const BADGE = {
  pending: ["Pending", "#8aa"],
  sent: ["Delivered", "#7FB3D5"],
  opened: ["Opened", "#F2C14E"],
  responded: ["Clicked", "#7FD1BE"],
  replied: ["Replied", "#3DDC97"],
  bounced: ["Bounced", "#e07a5f"],
  unsubscribed: ["Unsubscribed", "#C0392B"],
  failed: ["Failed", "#e07a5f"],
};

const WEEKDAYS = [
  ["Sun", 0], ["Mon", 1], ["Tue", 2], ["Wed", 3], ["Thu", 4], ["Fri", 5], ["Sat", 6],
];

export default function Campaigns({ pw, leads = [], visitors = [] }) {
  const [campaigns, setCampaigns] = useState([]);
  const [smtpReady, setSmtpReady] = useState(false);
  const [view, setView] = useState("list"); // "list" | "new" | campaignId
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const call = async (payload) => {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const d = await call({ action: "list" });
      setCampaigns(d.campaigns || []);
      setSmtpReady(!!d.smtpReady);
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

  const act = async (payload, note) => {
    setBusy(payload.action + (payload.id || ""));
    setErr("");
    setMsg("");
    try {
      const r = await call(payload);
      await load();
      if (note) setMsg(typeof note === "function" ? note(r) : note);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  };

  const syncInbox = () =>
    act({ action: "sync" }, (r) =>
      r.error
        ? `Inbox sync error: ${r.error}`
        : `Inbox synced — ${r.replies || 0} repl(y/ies), ${r.bounces || 0} bounce(s).`
    );

  const current = campaigns.find((c) => c.id === view);

  return (
    <div>
      <style>{CSS}</style>
      {!smtpReady && (
        <div className="cmp-warn">
          ⚠️ SMTP is not configured — emails run in <b>simulation mode</b> (logged, not sent). Add
          SMTP_HOST/USER/PASS to send for real.
        </div>
      )}
      {err && <div className="ad-err" style={{ marginBottom: 12 }}>{err}</div>}
      {msg && <div className="cmp-ok">{msg}</div>}

      {view === "list" && (
        <ListView
          campaigns={campaigns}
          loading={loading}
          busy={busy}
          onNew={() => setView("new")}
          onOpen={(id) => setView(id)}
          onSync={syncInbox}
        />
      )}
      {view === "new" && (
        <NewCampaign
          leads={leads}
          visitors={visitors}
          onCancel={() => setView("list")}
          onCreated={async (id) => {
            await load();
            setView(id);
          }}
          call={call}
        />
      )}
      {current && (
        <Detail
          c={current}
          busy={busy}
          onBack={() => setView("list")}
          act={act}
          onSync={syncInbox}
        />
      )}
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div className="cmp-stat">
      <b>{n}</b>
      <span>{label}</span>
    </div>
  );
}

function ListView({ campaigns, loading, busy, onNew, onOpen, onSync }) {
  return (
    <div>
      <div className="cmp-head">
        <h3>Campaigns</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="cmp-btn" disabled={busy === "sync"} onClick={onSync} title="Read the inbox for replies & bounces">
            {busy === "sync" ? "Syncing…" : "⟳ Sync replies/bounces"}
          </button>
          <button className="cmp-btn cmp-primary" onClick={onNew}>+ New campaign</button>
        </div>
      </div>
      {loading && !campaigns.length ? (
        <div className="ad-empty">Loading…</div>
      ) : !campaigns.length ? (
        <div className="ad-empty">No campaigns yet. Create one to start reaching your leads.</div>
      ) : (
        <div className="ad-card">
          <div className="ad-scroll">
            <table>
              <thead>
                <tr><th>Campaign</th><th>Status</th><th>Recipients</th><th>Delivered</th><th>Opened</th><th>Replied</th><th>Bounced</th><th>No response</th><th></th></tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.name}</b><div className="cmp-sub">{c.subject}</div></td>
                    <td><span className={"cmp-status cmp-" + c.status}>{c.status}</span></td>
                    <td>{c.stats.total}</td>
                    <td>{c.stats.delivered}</td>
                    <td>{c.stats.opened + c.stats.replied}</td>
                    <td className="cmp-green">{c.stats.replied}</td>
                    <td>{c.stats.bounced}</td>
                    <td>{c.stats.noResponse}</td>
                    <td><button className="cmp-btn" onClick={() => onOpen(c.id)}>Open →</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function NewCampaign({ leads, visitors, onCancel, onCreated, call }) {
  const [f, setF] = useState({ name: "", fromName: "MedXFlow Health", subject: "", body: "Hi {{firstName}},\n\n" });
  const [recipients, setRecipients] = useState("");
  const [followups, setFollowups] = useState([]);
  const [sendDays, setSendDays] = useState([1, 3, 5]);
  const [minGap, setMinGap] = useState(2);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const importEmails = (arr) => {
    const emails = [...new Set((arr || []).map((x) => x.email).filter(Boolean))];
    setRecipients((r) => (r ? r + "\n" : "") + emails.join("\n"));
  };

  const submit = async () => {
    if (!f.name || !f.subject || !f.body) { setErr("Name, subject and message are required."); return; }
    setSaving(true);
    setErr("");
    try {
      const r = await call({ action: "create", ...f, recipients, followups, sendDays, minGapDays: minGap });
      onCreated(r.id);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ad-card cmp-form">
      <div className="cmp-head">
        <h3>New campaign</h3>
        <button className="cmp-btn" onClick={onCancel}>← Back</button>
      </div>
      <label>Campaign name<input value={f.name} onChange={set("name")} placeholder="e.g. Founding practices — March" /></label>
      <div className="cmp-row">
        <label>From name<input value={f.fromName} onChange={set("fromName")} placeholder="MedXFlow Health" /></label>
        <label>Subject<input value={f.subject} onChange={set("subject")} placeholder="Cut missed calls at your practice" /></label>
      </div>
      <label>
        Message <span className="cmp-hint">— use {"{{firstName}}"}, {"{{name}}"}, {"{{email}}"}. Links are tracked automatically.</span>
        <textarea rows={7} value={f.body} onChange={set("body")} />
      </label>

      <div className="cmp-recip-head">
        <label style={{ flex: 1 }}>
          Recipients <span className="cmp-hint">— one per line, or "Name &lt;email&gt;"</span>
        </label>
        <div className="cmp-imports">
          <button className="cmp-btn" type="button" onClick={() => importEmails(leads)}>Import leads ({leads.length})</button>
          <button className="cmp-btn" type="button" onClick={() => importEmails(visitors)}>Import chat visitors ({visitors.length})</button>
        </div>
      </div>
      <textarea rows={5} value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="jane@clinic.ie&#10;Dr Murphy &lt;murphy@practice.ie&gt;" />

      <div className="cmp-fups">
        <h4 style={{ margin: "0 0 6px" }}>Schedule</h4>
        <p className="cmp-hint" style={{ margin: "0 0 10px" }}>Follow-ups send automatically on these days — and stop the moment someone replies.</p>
        <div className="cmp-days">
          {WEEKDAYS.map(([label, d]) => (
            <button type="button" key={d} className={"cmp-day" + (sendDays.includes(d) ? " on" : "")}
              onClick={() => setSendDays((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d].sort()))}>{label}</button>
          ))}
        </div>
        <label className="cmp-inline" style={{ marginTop: 12 }}>Minimum
          <input type="number" min="1" value={minGap} onChange={(e) => setMinGap(e.target.value)} /> days between emails
        </label>
      </div>

      <div className="cmp-fups">
        <div className="cmp-head" style={{ marginBottom: 8 }}>
          <h4>Follow-up emails (up to 6)</h4>
          {followups.length < 6 && (
            <button className="cmp-btn" type="button" onClick={() => setFollowups((s) => [...s, { subject: "", body: "" }])}>+ Add follow-up</button>
          )}
        </div>
        <p className="cmp-hint" style={{ margin: "0 0 12px" }}>A drip of {followups.length || "several"} emails, sent one at a time on the schedule above.</p>
        {followups.map((fu, i) => (
          <div className="cmp-fup" key={i}>
            <div className="cmp-fup-top">
              <span>Follow-up {i + 1}</span>
              <button className="cmp-x" type="button" onClick={() => setFollowups((s) => s.filter((_, j) => j !== i))}>✕</button>
            </div>
            <input placeholder="Follow-up subject" value={fu.subject} onChange={(e) => setFollowups((s) => s.map((x, j) => j === i ? { ...x, subject: e.target.value } : x))} />
            <textarea rows={3} placeholder="Follow-up message…" value={fu.body} onChange={(e) => setFollowups((s) => s.map((x, j) => j === i ? { ...x, body: e.target.value } : x))} />
          </div>
        ))}
      </div>

      {err && <div className="ad-err">{err}</div>}
      <div className="cmp-actions">
        <button className="cmp-btn cmp-primary" disabled={saving} onClick={submit}>{saving ? "Creating…" : "Create campaign"}</button>
        <button className="cmp-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function Detail({ c, busy, onBack, act, onSync }) {
  const s = c.stats;
  const dayNames = (c.sendDays || [1, 3, 5]).map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ");
  const addRecipients = async () => {
    const raw = window.prompt("Add recipients (one per line or comma-separated):");
    if (raw && raw.trim()) act({ action: "addRecipients", id: c.id, recipients: raw }, (r) => `Added ${r.added} recipient(s).`);
  };
  return (
    <div>
      <div className="cmp-head">
        <button className="cmp-btn" onClick={onBack}>← All campaigns</button>
        <span className={"cmp-status cmp-" + c.status}>{c.status}</span>
      </div>
      <h3 style={{ margin: "6px 0 2px" }}>{c.name}</h3>
      <div className="cmp-sub">{c.subject}</div>
      <div className="cmp-sched">📅 Sends on {dayNames} · min {c.minGapDays || 2} days apart · {(c.followups || []).length} follow-up(s) · stops on reply</div>

      <div className="cmp-stats">
        <Stat n={s.total} label="Recipients" />
        <Stat n={s.delivered} label="Delivered" />
        <Stat n={s.opened + s.replied} label="Opened" />
        <Stat n={s.replied} label="Replied" />
        <Stat n={s.noResponse} label="No response" />
        <Stat n={s.bounced} label="Bounced" />
        <Stat n={s.unsubscribed} label="Unsubscribed" />
      </div>

      <div className="cmp-actions">
        <button className="cmp-btn cmp-primary" disabled={!!busy || !s.pending} onClick={() => act({ action: "send", id: c.id }, (r) => `Sent ${r.sent}${r.simulated ? " (simulated)" : ""}. ${r.remaining} remaining.`)}>
          {busy === "send" + c.id ? "Sending…" : `Send first email${s.pending ? ` (${s.pending})` : ""}`}
        </button>
        <button className="cmp-btn" disabled={!!busy || !(c.followups || []).length} onClick={() => act({ action: "followup", id: c.id }, (r) => `Follow-ups sent: ${r.sent}${r.simulated ? " (simulated)" : ""}.`)}>
          {busy === "followup" + c.id ? "Sending…" : "Send due follow-ups now"}
        </button>
        <button className="cmp-btn" disabled={busy === "sync"} onClick={onSync}>{busy === "sync" ? "Syncing…" : "⟳ Sync replies/bounces"}</button>
        <button className="cmp-btn" onClick={addRecipients}>+ Add recipients</button>
        <button className="cmp-btn cmp-danger" onClick={() => { if (window.confirm("Delete this campaign?")) act({ action: "delete", id: c.id }); onBack(); }}>Delete</button>
      </div>

      <div className="ad-card" style={{ marginTop: 16 }}>
        <div className="ad-scroll">
          <table>
            <thead>
              <tr><th>Email</th><th>Name</th><th>Status</th><th>Sent</th><th>Opened</th><th>Follow-ups</th><th></th></tr>
            </thead>
            <tbody>
              {(c.recipients || []).map((r) => {
                const [label, color] = BADGE[r.status] || [r.status, "#8aa"];
                return (
                  <tr key={r.email}>
                    <td>{r.email}</td>
                    <td>{r.name || "—"}</td>
                    <td><span className="cmp-badge" style={{ color, borderColor: color }}>{label}</span></td>
                    <td className="ad-nowrap">{fmt(r.sentAt)}</td>
                    <td className="ad-nowrap">{fmt(r.openedAt)}</td>
                    <td>{r.followupsSent || 0}</td>
                    <td>{!["replied", "unsubscribed", "bounced"].includes(r.status) && (
                      <button className="cmp-btn cmp-sm" onClick={() => act({ action: "markReplied", id: c.id, email: r.email })}>Mark replied</button>
                    )}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.cmp-warn{background:rgba(242,193,78,.14); border:1px solid rgba(242,193,78,.4); color:#F2C14E; padding:10px 14px; border-radius:10px; font-size:13px; margin-bottom:14px}
.cmp-ok{background:rgba(61,220,151,.12); border:1px solid rgba(61,220,151,.35); color:#3DDC97; padding:9px 13px; border-radius:9px; font-size:13px; margin-bottom:12px}
.cmp-head{display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px}
.cmp-head h3,.cmp-head h4{margin:0}
.cmp-sub{font-size:13px; color:rgba(232,240,238,.55)}
.cmp-green{color:#3DDC97; font-weight:700}
.cmp-btn{background:rgba(255,255,255,.08); border:1px solid rgba(207,229,222,.24); color:#E8F0EE; border-radius:9px; padding:8px 14px; font-size:13.5px; font-weight:600; cursor:pointer; font-family:inherit}
.cmp-btn:hover:not(:disabled){background:rgba(255,255,255,.16)}
.cmp-btn:disabled{opacity:.4; cursor:default}
.cmp-primary{background:#1E6B5C; border-color:#1E6B5C; color:#fff}
.cmp-primary:hover:not(:disabled){background:#22796a}
.cmp-danger{border-color:rgba(192,57,43,.5); color:#e88}
.cmp-sm{padding:5px 10px; font-size:12px}
.cmp-status{font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; padding:3px 9px; border-radius:999px; background:rgba(255,255,255,.1)}
.cmp-active{background:rgba(61,220,151,.18); color:#3DDC97} .cmp-draft{background:rgba(255,255,255,.12); color:#bcd}
.cmp-badge{font-size:11.5px; font-weight:700; padding:2px 9px; border:1px solid; border-radius:999px}
.cmp-stats{display:flex; flex-wrap:wrap; gap:12px; margin:16px 0}
.cmp-stat{background:#16302B; border:1px solid rgba(207,229,222,.14); border-radius:12px; padding:12px 20px; min-width:96px}
.cmp-stat b{display:block; font-size:24px; color:#fff; font-weight:800; line-height:1}
.cmp-stat span{font-size:12px; color:rgba(232,240,238,.6)}
.cmp-actions{display:flex; flex-wrap:wrap; gap:10px; margin-top:8px}
.cmp-form label{display:block; font-size:13px; font-weight:600; color:#E8F0EE; margin-bottom:14px}
.cmp-form input, .cmp-form textarea{width:100%; margin-top:6px; padding:10px 12px; border:1px solid rgba(207,229,222,.2); border-radius:9px; background:#0F1B19; color:#fff; font-size:14px; font-family:inherit; outline:none; resize:vertical}
.cmp-form input:focus, .cmp-form textarea:focus{border-color:#3DDC97}
.cmp-row{display:grid; grid-template-columns:1fr 2fr; gap:14px}
.cmp-hint{font-weight:400; color:rgba(232,240,238,.45); font-size:12px}
.cmp-recip-head{display:flex; align-items:flex-end; gap:12px}
.cmp-imports{display:flex; gap:8px; margin-bottom:14px}
.cmp-fups{margin-top:8px; border-top:1px solid rgba(207,229,222,.12); padding-top:16px}
.cmp-fup{background:#16302B; border:1px solid rgba(207,229,222,.14); border-radius:10px; padding:12px; margin-bottom:10px}
.cmp-fup-top{display:flex; align-items:center; gap:12px; margin-bottom:8px; font-weight:700; font-size:13px}
.cmp-inline{display:inline-flex!important; align-items:center; gap:6px; margin:0!important; font-weight:600}
.cmp-inline input{width:60px!important; margin:0!important; padding:5px 8px!important}
.cmp-x{margin-left:auto; background:none; border:none; color:#e88; cursor:pointer; font-size:14px}
.cmp-sched{font-size:12.5px; color:rgba(232,240,238,.6); margin-top:6px}
.cmp-days{display:flex; gap:6px; flex-wrap:wrap}
.cmp-day{background:#0F1B19; border:1px solid rgba(207,229,222,.2); color:rgba(232,240,238,.6); border-radius:8px; padding:7px 12px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit}
.cmp-day.on{background:#1E6B5C; border-color:#1E6B5C; color:#fff}
@media(max-width:640px){.cmp-row{grid-template-columns:1fr}}
`;
