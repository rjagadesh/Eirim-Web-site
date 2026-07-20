import { useState, useEffect, useMemo } from "react";

const API = "/.netlify/functions/finance";
const eur = (n) => "$" + Math.round(n).toLocaleString();
const eur2 = (n) => "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortEur = (n) => (n >= 1000 ? "$" + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : "$" + Math.round(n));
const monthLabel = (m) => {
  const [y, mo] = m.split("-");
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+mo - 1] + " " + y.slice(2);
};

const EXP_CATS = ["Salaries", "Software", "Marketing", "Rent", "Hardware", "Travel", "Legal & professional", "Taxes", "Other"];
const INC_CATS = ["Subscription", "Setup fee", "Consulting", "Hardware", "Grant", "Other"];

export default function Finance({ pw }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all"); // all | income | expense
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "expense",
    category: "",
    amount: "",
    party: "",
    description: "",
  });
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

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
      setEntries(d.entries || []);
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

  const add = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return setErr("Enter an amount.");
    setBusy(true);
    setErr("");
    try {
      await call({ action: "add", ...form });
      setForm((s) => ({ ...s, amount: "", party: "", description: "", category: "" }));
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const del = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await call({ action: "delete", id });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  // ---- computed ----
  const M = useMemo(() => {
    const nowMonth = new Date().toISOString().slice(0, 7);
    const nowYear = nowMonth.slice(0, 4);
    let income = 0, expense = 0, mIncome = 0, mExpense = 0, yIncome = 0, yExpense = 0;
    const byMonth = {};
    const expCat = {}, incCat = {};
    for (const e of entries) {
      const m = (e.date || "").slice(0, 7);
      byMonth[m] = byMonth[m] || { income: 0, expense: 0 };
      byMonth[m][e.type] += e.amount;
      if (e.type === "income") {
        income += e.amount;
        incCat[e.category] = (incCat[e.category] || 0) + e.amount;
        if (m === nowMonth) mIncome += e.amount;
        if (m.startsWith(nowYear)) yIncome += e.amount;
      } else {
        expense += e.amount;
        expCat[e.category] = (expCat[e.category] || 0) + e.amount;
        if (m === nowMonth) mExpense += e.amount;
        if (m.startsWith(nowYear)) yExpense += e.amount;
      }
    }
    const months = Object.keys(byMonth).sort().slice(-12).map((m) => ({ month: m, ...byMonth[m] }));
    return {
      income, expense, net: income - expense,
      mNet: mIncome - mExpense, mIncome, mExpense,
      yNet: yIncome - yExpense,
      months,
      expCat: Object.entries(expCat).sort((a, b) => b[1] - a[1]),
      incCat: Object.entries(incCat).sort((a, b) => b[1] - a[1]),
    };
  }, [entries]);

  const shown = entries.filter((e) => filter === "all" || e.type === filter);

  return (
    <div className="fin">
      <style>{CSS}</style>
      <div className="cmp-head">
        <h3>Financials</h3>
        <button className="cmp-btn" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "⟳ Refresh"}</button>
      </div>
      {err && <div className="ad-err" style={{ marginBottom: 12 }}>{err}</div>}

      {/* Summary */}
      <div className="fin-cards">
        <Card label="Total income" value={eur(M.income)} tone="in" />
        <Card label="Total expenses" value={eur(M.expense)} tone="ex" />
        <Card label="Net profit" value={eur(M.net)} tone={M.net >= 0 ? "in" : "ex"} big />
        <Card label="This month net" value={eur(M.mNet)} tone={M.mNet >= 0 ? "in" : "ex"} />
        <Card label="This year net" value={eur(M.yNet)} tone={M.yNet >= 0 ? "in" : "ex"} />
      </div>

      {/* Month-on-month chart */}
      <div className="ad-card fin-block">
        <div className="fin-block-head">
          <h4>Income vs expenses — month on month</h4>
          <div className="fin-legend"><span className="fin-dot in" /> Income <span className="fin-dot ex" /> Expenses</div>
        </div>
        {M.months.length ? <MonthChart data={M.months} /> : <div className="ad-empty">No data yet — add entries below.</div>}
      </div>

      {/* Category breakdown */}
      <div className="fin-two">
        <CatBlock title="Expenses by category" rows={M.expCat} total={M.expense} color="#E07A5F" />
        <CatBlock title="Income by category" rows={M.incCat} total={M.income} color="#3DDC97" />
      </div>

      {/* Add entry */}
      <div className="ad-card fin-form">
        <h4>Add ledger entry</h4>
        <div className="fin-type">
          <button className={form.type === "income" ? "on in" : ""} onClick={() => setForm((s) => ({ ...s, type: "income" }))}>Income</button>
          <button className={form.type === "expense" ? "on ex" : ""} onClick={() => setForm((s) => ({ ...s, type: "expense" }))}>Expense</button>
        </div>
        <div className="fin-grid">
          <label>Date<input type="date" value={form.date} onChange={set("date")} /></label>
          <label>Amount ($)<input type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} placeholder="0.00" /></label>
          <label>Category
            <input list="fin-cats" value={form.category} onChange={set("category")} placeholder="e.g. Software" />
            <datalist id="fin-cats">{(form.type === "income" ? INC_CATS : EXP_CATS).map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label>{form.type === "income" ? "Client / source" : "Vendor / payee"}<input value={form.party} onChange={set("party")} placeholder="Name" /></label>
        </div>
        <label>Description<input value={form.description} onChange={set("description")} placeholder="Optional note" /></label>
        <button className="cmp-btn cmp-primary" onClick={add} disabled={busy}>{busy ? "Saving…" : "+ Add entry"}</button>
      </div>

      {/* Ledger */}
      <div className="fin-block-head" style={{ marginTop: 8 }}>
        <h4>Ledger ({shown.length})</h4>
        <div className="fin-filter">
          {["all", "income", "expense"].map((k) => (
            <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{k}</button>
          ))}
        </div>
      </div>
      <div className="ad-card">
        {!shown.length ? (
          <div className="ad-empty">No entries.</div>
        ) : (
          <div className="ad-scroll">
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Party</th><th>Description</th><th style={{ textAlign: "right" }}>Amount</th><th></th></tr></thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id}>
                    <td className="ad-nowrap">{e.date}</td>
                    <td><span className={"fin-tag " + e.type}>{e.type}</span></td>
                    <td>{e.category}</td>
                    <td>{e.party || "—"}</td>
                    <td className="ad-trunc">{e.description || "—"}</td>
                    <td style={{ textAlign: "right" }} className={e.type === "income" ? "fin-in" : "fin-ex"}>
                      {e.type === "income" ? "+" : "−"}{eur2(e.amount)}
                    </td>
                    <td><button className="cmp-btn cmp-sm cmp-danger" onClick={() => del(e.id)}>✕</button></td>
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

function Card({ label, value, tone, big }) {
  return (
    <div className={"fin-card" + (big ? " big" : "")}>
      <span>{label}</span>
      <b className={"fin-" + tone}>{value}</b>
    </div>
  );
}

function MonthChart({ data }) {
  const W = 760, H = 250, pad = { l: 52, r: 14, t: 14, b: 30 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const groupW = iw / data.length;
  const barW = Math.max(6, Math.min(20, groupW / 3));
  const y = (v) => pad.t + ih - (v / max) * ih;
  const ticks = 4;
  return (
    <div className="fin-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="fin-chart" preserveAspectRatio="xMidYMid meet">
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const v = (max * i) / ticks, yy = y(v);
          return (
            <g key={i}>
              <line x1={pad.l} y1={yy} x2={W - pad.r} y2={yy} stroke="rgba(207,229,222,.1)" />
              <text x={pad.l - 8} y={yy + 3} textAnchor="end" className="fin-axis">{shortEur(v)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const gx = pad.l + i * groupW + groupW / 2;
          return (
            <g key={d.month}>
              <rect x={gx - barW - 2} y={y(d.income)} width={barW} height={pad.t + ih - y(d.income)} rx="2" fill="#3DDC97" />
              <rect x={gx + 2} y={y(d.expense)} width={barW} height={pad.t + ih - y(d.expense)} rx="2" fill="#E07A5F" />
              <text x={gx} y={H - 9} textAnchor="middle" className="fin-axis">{monthLabel(d.month)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CatBlock({ title, rows, total, color }) {
  const top = rows.slice(0, 7);
  const max = top[0]?.[1] || 1;
  return (
    <div className="ad-card fin-block">
      <h4>{title}</h4>
      {!top.length ? (
        <div className="ad-empty" style={{ padding: 24 }}>No data.</div>
      ) : (
        top.map(([cat, val]) => (
          <div key={cat} className="fin-catrow">
            <span className="fin-catname" title={cat}>{cat}</span>
            <span className="fin-cattrack"><span className="fin-catfill" style={{ width: `${(val / max) * 100}%`, background: color }} /></span>
            <span className="fin-catval">{eur(val)}<em>{total ? Math.round((val / total) * 100) : 0}%</em></span>
          </div>
        ))
      )}
    </div>
  );
}

const CSS = `
.fin-cards{display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:16px}
.fin-card{background:#16302B; border:1px solid rgba(207,229,222,.14); border-radius:12px; padding:14px 18px; display:flex; flex-direction:column; gap:4px}
.fin-card.big{background:linear-gradient(135deg,#154D42,#1E6B5C)}
.fin-card span{font-size:12px; color:rgba(232,240,238,.6)}
.fin-card b{font-size:24px; font-weight:800; line-height:1.1}
.fin-in{color:#3DDC97} .fin-ex{color:#E07A5F}
.fin-block{padding:18px}
.fin-block-head{display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px}
.fin-block h4, .fin-block-head h4{margin:0; font-size:15px}
.fin-legend{font-size:12px; color:rgba(232,240,238,.6); display:flex; align-items:center; gap:6px}
.fin-dot{width:10px; height:10px; border-radius:3px; display:inline-block; margin-left:8px}
.fin-dot.in{background:#3DDC97} .fin-dot.ex{background:#E07A5F}
.fin-chart-wrap{overflow-x:auto}
.fin-chart{width:100%; min-width:520px; height:auto; display:block}
.fin-axis{fill:rgba(232,240,238,.5); font-size:11px; font-family:'Figtree',system-ui,sans-serif}
.fin-two{display:grid; grid-template-columns:1fr 1fr; gap:14px; margin:14px 0}
@media(max-width:820px){.fin-two{grid-template-columns:1fr}}
.fin-catrow{display:flex; align-items:center; gap:10px; margin-bottom:9px; font-size:13px}
.fin-catname{flex:0 0 34%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#E8F0EE}
.fin-cattrack{flex:1; height:9px; background:rgba(207,229,222,.1); border-radius:999px; overflow:hidden}
.fin-catfill{display:block; height:100%; border-radius:999px}
.fin-catval{flex:0 0 auto; color:rgba(232,240,238,.85); font-variant-numeric:tabular-nums; text-align:right; min-width:80px}
.fin-catval em{font-style:normal; color:rgba(232,240,238,.45); margin-left:6px; font-size:11px}
.fin-form{padding:18px; margin:14px 0}
.fin-form h4{margin:0 0 12px}
.fin-type{display:inline-flex; background:#0F1B19; border:1px solid rgba(207,229,222,.16); border-radius:10px; padding:3px; margin-bottom:14px}
.fin-type button{background:none; border:none; color:rgba(232,240,238,.6); padding:7px 18px; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; font-family:inherit}
.fin-type button.on.in{background:#1E6B5C; color:#fff} .fin-type button.on.ex{background:#8a4638; color:#fff}
.fin-grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px}
.fin-form label{display:block; font-size:12.5px; font-weight:600; color:#E8F0EE; margin-bottom:12px}
.fin-form input{width:100%; margin-top:5px; padding:9px 11px; border:1px solid rgba(207,229,222,.2); border-radius:8px; background:#0F1B19; color:#fff; font-size:14px; font-family:inherit; outline:none}
.fin-form input:focus{border-color:#3DDC97}
.fin-filter{display:flex; gap:4px}
.fin-filter button{background:none; border:1px solid rgba(207,229,222,.2); color:rgba(232,240,238,.6); padding:5px 12px; border-radius:8px; font-size:12.5px; font-weight:600; cursor:pointer; text-transform:capitalize; font-family:inherit}
.fin-filter button.on{background:#1E6B5C; border-color:#1E6B5C; color:#fff}
.fin-tag{font-size:11px; font-weight:700; text-transform:uppercase; padding:2px 8px; border-radius:999px}
.fin-tag.income{background:rgba(61,220,151,.15); color:#3DDC97} .fin-tag.expense{background:rgba(224,122,95,.15); color:#E07A5F}
`;
