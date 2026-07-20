import { useState, useEffect } from "react";

const API = "/.netlify/functions/contacts";
const CAMP_API = "/.netlify/functions/campaigns";
export const STAGES = ["new", "contacted", "demo_scheduled", "demo_completed", "proposal", "won", "lost"];
export const STAGE_LABEL = {
  new: "New Lead", contacted: "Contacted", demo_scheduled: "Demo Scheduled",
  demo_completed: "Demo Completed", proposal: "Proposal Sent", won: "Won", lost: "Lost",
};
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : "—");
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");

export async function contactsApi(pw, payload) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-password": pw },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function Contacts({ pw, onOpen }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const d = await contactsApi(pw, { action: "list" });
      setList(d.contacts || []);
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

  const ql = q.trim().toLowerCase();
  const shown = list.filter((c) => !ql || c.email.includes(ql) || (c.name || "").toLowerCase().includes(ql) || (c.clinic || "").toLowerCase().includes(ql));

  return (
    <div>
      <style>{CSS}</style>
      <div className="cmp-head">
        <h3>Contacts ({list.length})</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="ct-search" placeholder="Search name, email, clinic…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="cmp-btn" onClick={load} disabled={loading}>{loading ? "…" : "⟳"}</button>
        </div>
      </div>
      {err && <div className="ad-err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="ad-card">
        {!shown.length ? (
          <div className="ad-empty">{loading ? "Loading…" : "No contacts yet."}</div>
        ) : (
          <div className="ad-scroll">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Clinic</th><th>Sources</th><th>Stage</th><th>Campaign</th><th>Last activity</th></tr></thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.email} className="ct-row" onClick={() => onOpen(c.email)}>
                    <td><b>{c.name || "—"}</b></td>
                    <td>{c.email}</td>
                    <td>{c.clinic || "—"}</td>
                    <td>{c.sources.map((s) => <span key={s} className={"ct-src ct-" + s}>{s}</span>)}</td>
                    <td><span className={"ct-stage st-" + c.stage}>{STAGE_LABEL[c.stage]}</span></td>
                    <td className="ad-nowrap">{c.campaign.sent ? `${c.campaign.sent}✉ ${c.campaign.opened}👁 ${c.campaign.replied}↩` : "—"}</td>
                    <td className="ad-nowrap">{fmtDate(c.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function ContactDetail({ pw, email, onClose, onChanged }) {
  const [c, setC] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [openChat, setOpenChat] = useState(null);

  const load = async () => {
    try {
      const d = await contactsApi(pw, { action: "detail", email });
      setC(d.contact);
    } catch (e) {
      setErr(e.message);
    }
  };
  useEffect(() => {
    load();
    fetch(CAMP_API, { method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ action: "list" }) })
      .then((r) => r.json()).then((d) => setCampaigns(d.campaigns || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const save = async (patch) => {
    setMsg("");
    try {
      await contactsApi(pw, { action: "update", email, patch });
      await load();
      onChanged && onChanged();
      setMsg("Saved ✓");
    } catch (e) {
      setErr(e.message);
    }
  };
  const promote = async (campaignId) => {
    if (!campaignId) return;
    setMsg("");
    try {
      const r = await contactsApi(pw, { action: "promote", email, campaignId, name: c?.name, clinic: c?.clinic });
      setMsg(r.added ? "Added to campaign ✓" : "Already in that campaign");
      onChanged && onChanged();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="ct-overlay" onClick={onClose}>
      <style>{CSS}</style>
      <div className="ct-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ct-x" onClick={onClose}>×</button>
        {!c ? (
          <div className="ad-empty">{err || "Loading…"}</div>
        ) : (
          <>
            <div className="ct-hd">
              <div>
                <h2>{c.name || "Unknown"}</h2>
                <div className="ct-hd-sub">{c.email}{c.clinic ? ` · ${c.clinic}` : ""}{c.phone ? ` · ${c.phone}` : ""}</div>
                <div className="ct-hd-src">{(c.sources || []).map((s) => <span key={s} className={"ct-src ct-" + s}>{s}</span>)}</div>
              </div>
            </div>
            {err && <div className="ad-err">{err}</div>}
            {msg && <div className="cmp-ok">{msg}</div>}

            {/* CRM controls */}
            <div className="ct-crm">
              <label>Stage
                <select value={c.stage} onChange={(e) => save({ stage: e.target.value })}>
                  {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                </select>
              </label>
              <label>Deal value ($)
                <input type="number" min="0" defaultValue={c.dealValue || 0} onBlur={(e) => save({ dealValue: e.target.value })} />
              </label>
              <label>Follow-up date
                <input type="date" defaultValue={c.followUpDate || ""} onChange={(e) => save({ followUpDate: e.target.value })} />
              </label>
              <label className="ct-promote">Add to campaign
                <select defaultValue="" onChange={(e) => { promote(e.target.value); e.target.value = ""; }}>
                  <option value="">Choose campaign…</option>
                  {campaigns.map((cm) => <option key={cm.id} value={cm.id}>{cm.name}</option>)}
                </select>
              </label>
            </div>
            <label className="ct-notes">Notes
              <textarea rows={2} defaultValue={c.notes || ""} onBlur={(e) => save({ notes: e.target.value })} placeholder="Internal notes…" />
            </label>

            {/* History */}
            <h4 className="ct-h4">Demo request</h4>
            {c.demoRequest ? (
              <div className="ct-hist">
                <div className="ct-line"><b>{fmt(c.demoRequest.at)}</b> · {c.demoRequest.source || "form"}</div>
                {c.demoRequest.message && <div className="ct-msg">{c.demoRequest.message}</div>}
                <div className="ct-meta">{[c.demoRequest.preferredTime && `Best time: ${c.demoRequest.preferredTime}`, c.demoRequest.phone].filter(Boolean).join(" · ")}</div>
              </div>
            ) : <div className="ct-none">No demo request.</div>}

            <h4 className="ct-h4">Campaign emails</h4>
            {c.campaignEvents?.length ? c.campaignEvents.map((e, i) => (
              <div className="ct-hist" key={i}>
                <div className="ct-line"><b>{e.campaignName}</b> — <span className={"cmp-badge2 st-" + e.status}>{e.status}</span></div>
                <div className="ct-meta">{[e.sentAt && `sent ${fmt(e.sentAt)}`, e.openedAt && `opened ${fmt(e.openedAt)}`, e.repliedAt && `replied ${fmt(e.repliedAt)}`].filter(Boolean).join(" · ") || "—"}</div>
              </div>
            )) : <div className="ct-none">No campaign emails.</div>}

            <h4 className="ct-h4">Chat transcripts ({c.chats?.length || 0})</h4>
            {c.chats?.length ? c.chats.map((t, i) => (
              <div className="ct-hist" key={i}>
                <button className="ct-line ct-toggle" onClick={() => setOpenChat(openChat === i ? null : i)}>
                  {openChat === i ? "▾" : "▸"} {fmt(t.updatedAt)} · {(t.messages || []).length} msgs
                </button>
                {openChat === i && (
                  <div className="ct-convo">
                    {(t.messages || []).map((m, j) => <div key={j} className={"ct-cm ct-" + m.role}><span>{m.role}</span>{m.content}</div>)}
                  </div>
                )}
              </div>
            )) : <div className="ct-none">No chats.</div>}

            <h4 className="ct-h4">Pageviews ({c.pageviews?.length || 0})</h4>
            {c.pageviews?.length ? (
              <div className="ct-hist">
                {c.pageviews.slice(0, 12).map((p, i) => (
                  <div className="ct-line" key={i}><span className="ct-meta">{fmt(p.at)}</span> — {p.path}{p.geo?.country ? ` · ${p.geo.country}` : ""}</div>
                ))}
              </div>
            ) : <div className="ct-none">No linked pageviews.</div>}
          </>
        )}
      </div>
    </div>
  );
}

const CSS = `
.ct-search{padding:8px 12px; border:1px solid rgba(207,229,222,.2); border-radius:9px; background:#0F1B19; color:#fff; font-size:13.5px; font-family:inherit; outline:none; min-width:220px}
.ct-row{cursor:pointer}
.ct-row:hover{background:rgba(207,229,222,.05)}
.ct-src{display:inline-block; font-size:10.5px; font-weight:700; text-transform:uppercase; padding:2px 7px; border-radius:999px; margin-right:4px}
.ct-demo{background:rgba(242,193,78,.16); color:#F2C14E} .ct-chat{background:rgba(127,209,190,.16); color:#7FD1BE} .ct-campaign{background:rgba(123,179,213,.16); color:#7FB3D5}
.ct-stage{font-size:11.5px; font-weight:700; padding:3px 9px; border-radius:999px; background:rgba(255,255,255,.08)}
.st-won{background:rgba(61,220,151,.2); color:#3DDC97} .st-lost{background:rgba(224,122,95,.18); color:#E07A5F}
.st-demo_scheduled,.st-demo_completed{background:rgba(242,193,78,.16); color:#F2C14E}

.ct-overlay{position:fixed; inset:0; z-index:200; background:rgba(6,14,12,.72); backdrop-filter:blur(3px); display:flex; justify-content:flex-end; animation:ctf .2s ease}
@keyframes ctf{from{opacity:0}to{opacity:1}}
.ct-modal{position:relative; width:min(560px,100%); height:100%; background:#0F1B19; border-left:1px solid rgba(207,229,222,.14); padding:26px 26px 60px; overflow-y:auto; box-shadow:-30px 0 80px rgba(0,0,0,.5); animation:cts .25s cubic-bezier(.2,.8,.2,1)}
@keyframes cts{from{transform:translateX(30px);opacity:.6}to{transform:none;opacity:1}}
.ct-x{position:absolute; top:14px; right:16px; background:none; border:none; color:rgba(232,240,238,.6); font-size:26px; cursor:pointer}
.ct-hd h2{margin:0 0 3px; font-size:22px}
.ct-hd-sub{font-size:13px; color:rgba(232,240,238,.6)}
.ct-hd-src{margin-top:8px}
.ct-crm{display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:18px 0 12px}
.ct-crm label, .ct-notes{display:flex; flex-direction:column; gap:5px; font-size:12px; font-weight:600; color:rgba(232,240,238,.7)}
.ct-crm select, .ct-crm input, .ct-notes textarea{padding:8px 10px; border:1px solid rgba(207,229,222,.2); border-radius:8px; background:#16302B; color:#fff; font-size:13.5px; font-family:inherit; outline:none}
.ct-promote{grid-column:1 / -1}
.ct-notes{margin-bottom:8px}
.ct-h4{margin:18px 0 8px; font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:rgba(232,240,238,.5)}
.ct-hist{background:#16302B; border:1px solid rgba(207,229,222,.1); border-radius:10px; padding:11px 13px; margin-bottom:8px; font-size:13px}
.ct-line{font-size:13px; color:#E8F0EE; margin-bottom:2px}
.ct-toggle{background:none;border:none;color:#E8F0EE;cursor:pointer;font-family:inherit;font-size:13px;padding:0;text-align:left;width:100%}
.ct-meta{font-size:12px; color:rgba(232,240,238,.5)}
.ct-msg{font-size:13px; color:rgba(232,240,238,.85); margin:4px 0; font-style:italic}
.ct-none{font-size:13px; color:rgba(232,240,238,.4); padding:2px 0 6px}
.ct-convo{margin-top:8px; display:flex; flex-direction:column; gap:6px}
.ct-cm{font-size:12.5px; line-height:1.45; color:rgba(232,240,238,.9)} .ct-cm span{display:inline-block; font-size:10px; text-transform:uppercase; font-weight:700; margin-right:6px; opacity:.6}
.ct-user span{color:#7FD1BE} .ct-assistant span{color:#F2C14E}
.cmp-badge2{font-size:11px; font-weight:700; padding:1px 7px; border-radius:999px; background:rgba(255,255,255,.1)}
`;
