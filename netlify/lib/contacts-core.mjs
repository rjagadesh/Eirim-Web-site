import { getStore } from "@netlify/blobs";
import { loadCampaign, saveCampaign, listCampaigns } from "./campaigns-core.mjs";

// Pipeline stages (shared with the Pipeline board and demo-request status).
export const STAGES = ["new", "contacted", "demo_scheduled", "demo_completed", "proposal", "won", "lost"];
export const STAGE_LABEL = {
  new: "New Lead",
  contacted: "Contacted",
  demo_scheduled: "Demo Scheduled",
  demo_completed: "Demo Completed",
  proposal: "Proposal Sent",
  won: "Won",
  lost: "Lost",
};

export const normEmail = (e) => String(e || "").trim().toLowerCase();
const store = () => getStore("contacts"); // persisted CRM overlay, key = email
const maxIso = (...xs) => xs.filter(Boolean).sort().slice(-1)[0] || null;

async function dump(name) {
  const s = getStore(name);
  const { blobs } = await s.list();
  const out = [];
  for (const b of blobs) {
    try {
      const v = await s.get(b.key, { type: "json" });
      if (v) out.push(v);
    } catch {}
  }
  return out;
}

// Persisted CRM overlay (stage, dealValue, followUpDate, notes) keyed by email.
export async function loadCrm(email) {
  try {
    return (await store().get(normEmail(email), { type: "json" })) || null;
  } catch {
    return null;
  }
}
export async function saveCrm(rec) {
  rec.email = normEmail(rec.email);
  rec.updatedAt = new Date().toISOString();
  if (!rec.createdAt) rec.createdAt = rec.updatedAt;
  await store().setJSON(rec.email, rec);
  return rec;
}
async function loadAllCrm() {
  const list = await dump("contacts");
  return new Map(list.map((r) => [normEmail(r.email), r]));
}

// Build the unified contact list by merging leads (demo requests), visitors
// (chat leads) and campaign recipients — matched by email — with the CRM overlay.
export async function buildContacts({ includePageless = false } = {}) {
  const [leads, visitors, transcripts, campaigns, crmMap] = await Promise.all([
    dump("leads"),
    dump("visitors"),
    dump("chat-transcripts"),
    listCampaigns(),
    loadAllCrm(),
  ]);

  const map = new Map();
  const ensure = (email) => {
    const key = normEmail(email);
    if (!key || !key.includes("@")) return null;
    if (!map.has(key)) {
      map.set(key, {
        email: key, name: "", clinic: "", phone: "", visitorId: null,
        sources: new Set(), firstSeenAt: null, lastActivityAt: null,
        demoRequest: null, chatSessions: 0,
        campaign: { sent: 0, opened: 0, replied: 0, bounced: 0 },
      });
    }
    return map.get(key);
  };
  const touch = (c, at) => {
    if (!at) return;
    c.firstSeenAt = c.firstSeenAt ? [c.firstSeenAt, at].sort()[0] : at;
    c.lastActivityAt = maxIso(c.lastActivityAt, at);
  };

  for (const l of leads) {
    const c = ensure(l.email);
    if (!c) continue;
    c.sources.add("demo");
    c.name = c.name || l.name || "";
    c.clinic = c.clinic || l.clinic || "";
    c.phone = c.phone || l.phone || "";
    c.visitorId = c.visitorId || l.visitorId || null;
    c.demoRequest = l;
    touch(c, l.at);
  }
  for (const v of visitors) {
    const c = ensure(v.email);
    if (!c) continue;
    c.sources.add("chat");
    c.name = c.name || v.name || "";
    c.visitorId = c.visitorId || v.sessionId || null;
    touch(c, v.at);
  }
  for (const t of transcripts) {
    const c = ensure(t.email);
    if (!c) continue;
    c.sources.add("chat");
    c.name = c.name || t.name || "";
    c.chatSessions++;
    touch(c, t.updatedAt);
  }
  for (const camp of campaigns) {
    for (const r of camp.recipients || []) {
      const c = ensure(r.email);
      if (!c) continue;
      c.sources.add("campaign");
      c.name = c.name || r.name || "";
      if (r.sentAt) c.campaign.sent++;
      if (r.openedAt) c.campaign.opened++;
      if (r.status === "replied") c.campaign.replied++;
      if (r.status === "bounced") c.campaign.bounced++;
      touch(c, maxIso(r.sentAt, r.openedAt, r.repliedAt, r.bouncedAt));
    }
  }

  return [...map.values()]
    .map((c) => {
      const crm = crmMap.get(c.email) || {};
      return {
        ...c,
        sources: [...c.sources],
        stage: crm.stage || "new",
        dealValue: crm.dealValue || 0,
        followUpDate: crm.followUpDate || null,
        notes: crm.notes || "",
        status: crm.status || null,
      };
    })
    .sort((a, b) => String(b.lastActivityAt || "").localeCompare(String(a.lastActivityAt || "")));
}

// Full history for one contact (adds pageviews + transcript bodies + campaign events).
export async function contactDetail(email) {
  const key = normEmail(email);
  const list = await buildContacts();
  const base = list.find((c) => c.email === key) || { email: key, sources: [], stage: "new", dealValue: 0 };

  const [transcripts, pageviews, campaigns, crm] = await Promise.all([
    dump("chat-transcripts"),
    dump("pageviews"),
    listCampaigns(),
    loadCrm(key),
  ]);

  const chats = transcripts.filter((t) => normEmail(t.email) === key);
  const views = pageviews
    .filter((p) => base.visitorId && p.visitorId === base.visitorId)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const campaignEvents = [];
  for (const camp of campaigns) {
    const r = (camp.recipients || []).find((x) => normEmail(x.email) === key);
    if (r) campaignEvents.push({ campaignId: camp.id, campaignName: camp.name, subject: camp.subject, ...r });
  }

  return { ...base, ...(crm || {}), chats, pageviews: views, campaignEvents, demoRequest: base.demoRequest || null };
}

// One-click: add a contact to a campaign's recipient list (if not already there).
export async function promoteToCampaign(email, campaignId, name = "", clinic = "") {
  const campaign = await loadCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found");
  const key = normEmail(email);
  campaign.recipients = campaign.recipients || [];
  if (campaign.recipients.some((r) => normEmail(r.email) === key)) {
    return { added: false, reason: "already in campaign" };
  }
  campaign.recipients.push({ email: key, name: name || "", status: "pending", followupsSent: 0 });
  await saveCampaign(campaign);
  return { added: true };
}
