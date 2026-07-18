import { getStore } from "@netlify/blobs";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });

// Minimal, dependency-free user-agent parsing.
function parseUA(ua = "") {
  let os = "Unknown";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  let type = "Desktop";
  if (/iPad|Tablet/i.test(ua)) type = "Tablet";
  else if (/Mobi|Android|iPhone|iPod/i.test(ua)) type = "Mobile";

  return { os, browser, type };
}

const domainOf = (url) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // sendBeacon may deliver as text; parse defensively.
  let body = {};
  try {
    body = await req.json();
  } catch {
    try {
      body = JSON.parse(await req.text());
    } catch {
      body = {};
    }
  }

  const ua = req.headers.get("user-agent") || "";
  const geo = context?.geo || {};
  const ip =
    context?.ip ||
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-forwarded-for") ||
    null;

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const store = getStore("pageviews");
    await store.setJSON(id, {
      id,
      at: new Date().toISOString(),
      visitorId: body.visitorId || null,
      newVisitor: !!body.newVisitor,
      path: body.path || null,
      referrer: body.referrer || null,
      referrerDomain: domainOf(body.referrer),
      utm: body.utm || {},
      adClickId: body.adClickId || null,
      ip,
      geo: {
        country: geo?.country?.name || geo?.country?.code || null,
        countryCode: geo?.country?.code || null,
        region: geo?.subdivision?.name || null,
        city: geo?.city || null,
        tz: geo?.timezone || body.tz || null,
      },
      device: parseUA(ua),
      ua,
      language: body.language || null,
      screen: body.screen || null,
      viewport: body.viewport || null,
    });
  } catch (err) {
    console.error("track error:", err.message);
  }

  return json({ ok: true });
};
