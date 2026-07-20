import {
  config,
  store,
  listCampaigns,
  loadCampaign,
  saveCampaign,
  stats,
  sendInitial,
  sendFollowups,
  syncInbox,
} from "../lib/campaigns-core.mjs";
import { authorize } from "../lib/auth.mjs";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Parse a textarea of recipients: "Name <email>" or "email", separated by
// commas / semicolons / newlines. Returns deduped recipient objects.
function parseRecipients(raw) {
  const seen = new Set();
  const out = [];
  String(raw || "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((tok) => {
      let name = "",
        email = tok;
      const m = tok.match(/^(.*)<([^>]+)>$/);
      if (m) {
        name = m[1].trim().replace(/^["']|["']$/g, "");
        email = m[2].trim();
      }
      email = email.toLowerCase();
      if (!EMAIL_RE.test(email) || seen.has(email)) return;
      seen.add(email);
      out.push({ email, name, status: "pending", followupsSent: 0 });
    });
  return out;
}

const rid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default async (req) => {
  const cfg = config();
  const auth = authorize(req, "campaigns");
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  let body = {};
  try {
    body = await req.json();
  } catch {}
  const action = body.action;

  try {
    if (action === "list") {
      const campaigns = await listCampaigns();
      return json({
        smtpReady: cfg.smtpReady,
        campaigns: campaigns.map((c) => ({ ...c, stats: stats(c) })),
      });
    }

    if (action === "sync") {
      const r = await syncInbox(cfg);
      return json({ ok: true, ...r });
    }

    if (action === "create") {
      const recipients = parseRecipients(body.recipients);
      if (!body.name || !body.subject || !body.body) {
        return json({ error: "Name, subject and message are required." }, 400);
      }
      const campaign = {
        id: rid(),
        name: String(body.name).slice(0, 120),
        fromName: body.fromName || "",
        subject: String(body.subject).slice(0, 200),
        body: String(body.body),
        sendDays:
          Array.isArray(body.sendDays) && body.sendDays.length
            ? body.sendDays.map(Number).filter((n) => n >= 0 && n <= 6)
            : [1, 3, 5],
        minGapDays: Math.max(1, parseInt(body.minGapDays, 10) || 2),
        followups: (body.followups || [])
          .filter((f) => f && f.subject && f.body)
          .slice(0, 6)
          .map((f) => ({ subject: String(f.subject).slice(0, 200), body: String(f.body) })),
        recipients,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      await saveCampaign(campaign);
      return json({ ok: true, id: campaign.id, added: recipients.length });
    }

    const id = body.id;
    const campaign = id ? await loadCampaign(id) : null;
    if (id && !campaign) return json({ error: "Campaign not found" }, 404);

    if (action === "send") {
      const r = await sendInitial(campaign, cfg);
      return json({ ok: true, ...r, campaign: { ...campaign, stats: stats(campaign) } });
    }
    if (action === "followup") {
      // Manual trigger overrides the weekday restriction.
      const r = await sendFollowups(campaign, cfg, { respectDays: false });
      return json({ ok: true, ...r, campaign: { ...campaign, stats: stats(campaign) } });
    }
    if (action === "addRecipients") {
      const existing = new Set((campaign.recipients || []).map((r) => r.email));
      const added = parseRecipients(body.recipients).filter((r) => !existing.has(r.email));
      campaign.recipients = [...(campaign.recipients || []), ...added];
      await saveCampaign(campaign);
      return json({ ok: true, added: added.length });
    }
    if (action === "markReplied") {
      const r = (campaign.recipients || []).find((x) => x.email === String(body.email).toLowerCase());
      if (r) {
        r.status = "replied";
        r.repliedAt = new Date().toISOString();
        r.respondedAt = r.respondedAt || r.repliedAt;
        await saveCampaign(campaign);
      }
      return json({ ok: true });
    }
    if (action === "delete") {
      await store().delete(id);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
};
