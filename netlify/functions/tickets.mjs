import { getStore } from "@netlify/blobs";
import { authorize, json } from "../lib/auth.mjs";

const store = () => getStore("tickets");
const rid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const PRIORITIES = ["low", "normal", "high", "urgent"];
const STATUSES = ["open", "in_progress", "waiting", "resolved", "closed"];

export default async (req) => {
  const auth = authorize(req, "tickets");
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const agent = auth.principal.name || auth.principal.email;

  let body = {};
  try {
    body = await req.json();
  } catch {}
  const s = store();
  const action = body.action;

  try {
    if (action === "list") {
      const { blobs } = await s.list();
      const tickets = [];
      for (const b of blobs) {
        try {
          const t = await s.get(b.key, { type: "json" });
          if (t) tickets.push(t);
        } catch {}
      }
      tickets.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      return json({ tickets, agent });
    }

    if (action === "create") {
      if (!body.subject) return json({ error: "Subject is required." }, 400);
      const now = new Date().toISOString();
      const t = {
        id: rid(),
        subject: String(body.subject).slice(0, 200),
        requesterName: String(body.requesterName || "").slice(0, 120),
        requesterEmail: String(body.requesterEmail || "").trim().toLowerCase(),
        clinic: String(body.clinic || "").slice(0, 120),
        priority: PRIORITIES.includes(body.priority) ? body.priority : "normal",
        status: "open",
        assignedTo: body.assignedTo || "",
        contactEmail: String(body.contactEmail || body.requesterEmail || "").trim().toLowerCase() || null,
        messages: body.message ? [{ author: agent, body: String(body.message).slice(0, 4000), at: now }] : [],
        createdAt: now,
        updatedAt: now,
      };
      await s.setJSON(t.id, t);
      return json({ ok: true, id: t.id });
    }

    const id = body.id;
    const t = id ? await s.get(id, { type: "json" }) : null;
    if (id && !t) return json({ error: "Ticket not found." }, 404);

    if (action === "update") {
      const p = body.patch || {};
      if (p.status && STATUSES.includes(p.status)) t.status = p.status;
      if (p.priority && PRIORITIES.includes(p.priority)) t.priority = p.priority;
      if (p.assignedTo !== undefined) t.assignedTo = String(p.assignedTo).slice(0, 120);
      t.updatedAt = new Date().toISOString();
      await s.setJSON(id, t);
      return json({ ok: true });
    }
    if (action === "reply") {
      if (!body.body) return json({ error: "Message is required." }, 400);
      t.messages = t.messages || [];
      t.messages.push({ author: agent, body: String(body.body).slice(0, 4000), at: new Date().toISOString(), internal: !!body.internal });
      if (t.status === "resolved" || t.status === "closed") t.status = "in_progress";
      t.updatedAt = new Date().toISOString();
      await s.setJSON(id, t);
      return json({ ok: true });
    }
    if (action === "delete") {
      await s.delete(id);
      return json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
};
