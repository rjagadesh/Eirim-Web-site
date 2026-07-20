import { useState, useEffect } from "react";
import { contactsApi, STAGES, STAGE_LABEL } from "./Contacts.jsx";

const usd = (n) => "$" + Math.round(n).toLocaleString();
const DEMO_STAGES = ["demo_scheduled", "demo_completed", "proposal", "won"];

export default function Pipeline({ pw, onOpen }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [over, setOver] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const d = await contactsApi(pw, { action: "list" });
      setContacts(d.contacts || []);
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

  const move = async (email, stage) => {
    const prev = contacts;
    setContacts((cs) => cs.map((c) => (c.email === email ? { ...c, stage } : c)));
    try {
      await contactsApi(pw, { action: "update", email, patch: { stage } });
    } catch (e) {
      setErr(e.message);
      setContacts(prev);
    }
  };
  const convert = async (email) => {
    setMsg("");
    try {
      const r = await contactsApi(pw, { action: "convertToIncome", email });
      setMsg(r.ok ? `Added ${usd(r.amount)} to Financials as income ✓` : "Already converted to income.");
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const total = contacts.length;
  const demos = contacts.filter((c) => c.demoRequest || DEMO_STAGES.includes(c.stage)).length;
  const wonList = contacts.filter((c) => c.stage === "won");
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "—");
  const totalValue = contacts.reduce((s, c) => s + (c.dealValue || 0), 0);
  const wonValue = wonList.reduce((s, c) => s + (c.dealValue || 0), 0);

  return (
    <div className="pl">
      <style>{CSS}</style>
      <div className="cmp-head">
        <h3>Pipeline</h3>
        <button className="cmp-btn" onClick={load} disabled={loading}>{loading ? "…" : "⟳ Refresh"}</button>
      </div>
      {err && <div className="ad-err" style={{ marginBottom: 12 }}>{err}</div>}
      {msg && <div className="cmp-ok">{msg}</div>}

      <div className="pl-metrics">
        <Metric label="Total deals" v={total} />
        <Metric label="Pipeline value" v={usd(totalValue)} />
        <Metric label="Won value" v={usd(wonValue)} tone="in" />
        <Metric label="Lead → Demo" v={pct(demos, total)} />
        <Metric label="Demo → Won" v={pct(wonList.length, demos)} />
      </div>

      <div className="pl-board">
        {STAGES.map((stage) => {
          const items = contacts.filter((c) => c.stage === stage);
          const val = items.reduce((s, c) => s + (c.dealValue || 0), 0);
          return (
            <div
              key={stage}
              className={"pl-col" + (over === stage ? " over" : "")}
              onDragOver={(e) => { e.preventDefault(); setOver(stage); }}
              onDragLeave={() => setOver((o) => (o === stage ? null : o))}
              onDrop={(e) => { e.preventDefault(); const email = e.dataTransfer.getData("text"); setOver(null); if (email) move(email, stage); }}
            >
              <div className="pl-col-hd">
                <span className={"ct-stage st-" + stage}>{STAGE_LABEL[stage]}</span>
                <span className="pl-col-meta">{items.length}{val ? ` · ${usd(val)}` : ""}</span>
              </div>
              <div className="pl-cards">
                {items.map((c) => (
                  <div
                    key={c.email}
                    className="pl-card"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text", c.email)}
                    onClick={() => onOpen(c.email)}
                  >
                    <div className="pl-card-name">{c.name || c.email}</div>
                    <div className="pl-card-clinic">{c.clinic || c.email}</div>
                    <div className="pl-card-foot">
                      <span className={"ct-src ct-" + (c.sources[0] || "chat")}>{c.sources[0] || "—"}</span>
                      {c.dealValue ? <span className="pl-val">{usd(c.dealValue)}</span> : null}
                    </div>
                    {c.lastActivityAt && <div className="pl-card-date">{new Date(c.lastActivityAt).toLocaleDateString()}</div>}
                    {stage === "won" && (
                      <button className="pl-conv" onClick={(e) => { e.stopPropagation(); convert(c.email); }}>→ Add to income</button>
                    )}
                  </div>
                ))}
                {!items.length && <div className="pl-empty">Drop here</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, v, tone }) {
  return (
    <div className="pl-metric">
      <b className={tone === "in" ? "fin-in" : ""}>{v}</b>
      <span>{label}</span>
    </div>
  );
}

const CSS = `
.pl-metrics{display:flex; flex-wrap:wrap; gap:12px; margin:4px 0 18px}
.pl-metric{background:#16302B; border:1px solid rgba(207,229,222,.14); border-radius:12px; padding:12px 20px; min-width:120px}
.pl-metric b{display:block; font-size:22px; font-weight:800; line-height:1.1}
.pl-metric span{font-size:12px; color:rgba(232,240,238,.6)}
.fin-in{color:#3DDC97}
.pl-board{display:flex; gap:12px; overflow-x:auto; padding-bottom:12px; align-items:flex-start}
.pl-col{flex:0 0 232px; background:#12211e; border:1px solid rgba(207,229,222,.1); border-radius:14px; padding:10px; min-height:120px; transition:background .15s, border-color .15s}
.pl-col.over{background:#16302B; border-color:#3DDC97}
.pl-col-hd{display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; gap:6px}
.pl-col-meta{font-size:11.5px; color:rgba(232,240,238,.5); white-space:nowrap}
.pl-cards{display:flex; flex-direction:column; gap:8px; min-height:40px}
.pl-card{background:#1b332e; border:1px solid rgba(207,229,222,.14); border-radius:10px; padding:11px 12px; cursor:pointer; transition:transform .1s, box-shadow .1s}
.pl-card:hover{transform:translateY(-1px); box-shadow:0 8px 20px rgba(0,0,0,.3)}
.pl-card:active{cursor:grabbing}
.pl-card-name{font-weight:700; font-size:14px; color:#fff}
.pl-card-clinic{font-size:12.5px; color:rgba(232,240,238,.65); margin:2px 0 8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.pl-card-foot{display:flex; align-items:center; justify-content:space-between; gap:6px}
.pl-val{font-size:12.5px; font-weight:700; color:#3DDC97}
.pl-card-date{font-size:11px; color:rgba(232,240,238,.4); margin-top:6px}
.pl-conv{margin-top:8px; width:100%; background:rgba(61,220,151,.14); border:1px solid rgba(61,220,151,.4); color:#3DDC97; border-radius:7px; padding:5px; font-size:11.5px; font-weight:700; cursor:pointer; font-family:inherit}
.pl-conv:hover{background:rgba(61,220,151,.24)}
.pl-empty{font-size:11.5px; color:rgba(232,240,238,.28); text-align:center; padding:14px 0; border:1px dashed rgba(207,229,222,.14); border-radius:8px}
.ct-src{display:inline-block; font-size:10.5px; font-weight:700; text-transform:uppercase; padding:2px 7px; border-radius:999px}
.ct-demo{background:rgba(242,193,78,.16); color:#F2C14E} .ct-chat{background:rgba(127,209,190,.16); color:#7FD1BE} .ct-campaign{background:rgba(123,179,213,.16); color:#7FB3D5}
.ct-stage{font-size:11px; font-weight:700; padding:3px 8px; border-radius:999px; background:rgba(255,255,255,.08)}
.st-won{background:rgba(61,220,151,.2); color:#3DDC97} .st-lost{background:rgba(224,122,95,.18); color:#E07A5F}
.st-demo_scheduled,.st-demo_completed{background:rgba(242,193,78,.16); color:#F2C14E} .st-proposal{background:rgba(123,179,213,.16); color:#7FB3D5}
`;
