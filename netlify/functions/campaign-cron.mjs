import { config as getCfg, listCampaigns, sendFollowups, syncInbox } from "../lib/campaigns-core.mjs";

// Netlify Scheduled Function — runs daily on the deployed site. First it reads
// the inbox (replies stop the drip; bounces are marked not-delivered), then it
// sends any due follow-ups on the campaign's send-days (e.g. Mon/Wed/Fri).
export const config = { schedule: "@daily" };

export default async () => {
  const cfg = getCfg();
  let synced = { replies: 0, bounces: 0 };
  try {
    synced = await syncInbox(cfg);
  } catch (err) {
    console.error("cron sync", err.message);
  }

  const campaigns = await listCampaigns();
  let total = 0;
  for (const c of campaigns) {
    if (c.status !== "active") continue;
    try {
      const r = await sendFollowups(c, cfg, { respectDays: true });
      total += r.sent || 0;
    } catch (err) {
      console.error("cron campaign", c.id, err.message);
    }
  }
  return new Response(
    `Replies: ${synced.replies || 0}, bounces: ${synced.bounces || 0}, follow-ups sent: ${total}`
  );
};
