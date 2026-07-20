import fs from "node:fs";
import path from "node:path";
import { getStore } from "@netlify/blobs";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

function adminPassword() {
  let c = {};
  try {
    c = JSON.parse(fs.readFileSync(path.join(process.cwd(), "creds.json"), "utf8"));
  } catch {}
  return process.env.ADMIN_PASSWORD || c.ADMIN_PASSWORD || "";
}

const store = () => getStore("finance");
const rid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Entry: { id, date:"YYYY-MM-DD", type:"income"|"expense", category, amount, description, party }
export default async (req) => {
  const PW = adminPassword();
  if (!PW || PW === "change-me-admin-password") return json({ error: "Admin password not configured." }, 500);
  if ((req.headers.get("x-admin-password") || "") !== PW) return json({ error: "Unauthorized" }, 401);

  let body = {};
  try {
    body = await req.json();
  } catch {}
  const action = body.action;
  const s = store();

  try {
    if (action === "list") {
      const { blobs } = await s.list();
      const entries = [];
      for (const b of blobs) {
        try {
          const e = await s.get(b.key, { type: "json" });
          if (e) entries.push(e);
        } catch {}
      }
      entries.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      return json({ entries });
    }

    if (action === "add") {
      const amount = Math.round(parseFloat(body.amount) * 100) / 100;
      const type = body.type === "income" ? "income" : "expense";
      const date = /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().slice(0, 10);
      if (!amount || amount <= 0) return json({ error: "Amount must be greater than 0." }, 400);
      const entry = {
        id: rid(),
        date,
        type,
        category: String(body.category || "Uncategorised").slice(0, 60),
        amount,
        description: String(body.description || "").slice(0, 300),
        party: String(body.party || "").slice(0, 120),
        createdAt: new Date().toISOString(),
      };
      await s.setJSON(entry.id, entry);
      return json({ ok: true, id: entry.id });
    }

    if (action === "delete") {
      if (body.id) await s.delete(body.id);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
};
