import { loadCampaign, saveCampaign } from "../lib/campaigns-core.mjs";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

const gif = () =>
  new Response(PIXEL, {
    status: 200,
    headers: {
      "content-type": "image/gif",
      "cache-control": "no-store, no-cache, must-revalidate, private",
    },
  });

const html = (msg) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<div style="font-family:system-ui,sans-serif;max-width:460px;margin:14vh auto;padding:0 24px;text-align:center;color:#0F2E2A">
<h2 style="font-family:Georgia,serif">Eirim Health</h2><p style="font-size:16px;line-height:1.6">${msg}</p></div>`,
    { status: 200, headers: { "content-type": "text/html" } }
  );

export default async (req) => {
  const url = new URL(req.url);
  const t = url.searchParams.get("t"); // o = open, c = click, u = unsubscribe
  const cid = url.searchParams.get("c");
  const email = (url.searchParams.get("e") || "").toLowerCase();
  const target = url.searchParams.get("u");

  let campaign = null;
  try {
    campaign = cid ? await loadCampaign(cid) : null;
  } catch {}
  const recip = campaign && (campaign.recipients || []).find((r) => r.email === email);

  const save = async () => {
    try {
      if (campaign) await saveCampaign(campaign);
    } catch {}
  };

  if (t === "o") {
    if (recip && !recip.openedAt) {
      recip.openedAt = new Date().toISOString();
      if (recip.status === "sent") recip.status = "opened";
      await save();
    }
    return gif();
  }

  if (t === "c") {
    if (recip) {
      if (!recip.openedAt) recip.openedAt = new Date().toISOString();
      if (recip.status !== "unsubscribed") {
        recip.status = "responded";
        recip.respondedAt = recip.respondedAt || new Date().toISOString();
      }
      await save();
    }
    const dest = target && /^https?:\/\//i.test(target) ? target : "/";
    return new Response(null, { status: 302, headers: { location: dest } });
  }

  if (t === "u") {
    if (recip) {
      recip.status = "unsubscribed";
      recip.unsubscribedAt = new Date().toISOString();
      await save();
    }
    return html("You've been unsubscribed and won't receive further emails from this campaign.");
  }

  return new Response("ok", { status: 200 });
};
