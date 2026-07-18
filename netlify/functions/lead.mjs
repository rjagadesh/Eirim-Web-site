import { getStore } from "@netlify/blobs";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

// Captures a demo request / lead from the on-page form or the CTA modal.
export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  if (!name || !isEmail(email)) {
    return json({ error: "Name and a valid email are required." }, 400);
  }

  const geo = context?.geo || {};
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const record = {
    id,
    at: new Date().toISOString(),
    name,
    email,
    clinic: String(body.clinic || "").trim() || null,
    phone: String(body.phone || "").trim() || null,
    preferredTime: String(body.preferredTime || "").trim() || null,
    message: String(body.message || "").trim() || null,
    source: body.source || "cta",
    page: body.page || null,
    visitorId: body.visitorId || null,
    ip:
      context?.ip ||
      req.headers.get("x-nf-client-connection-ip") ||
      req.headers.get("x-forwarded-for") ||
      null,
    geo: {
      country: geo?.country?.name || null,
      region: geo?.subdivision?.name || null,
      city: geo?.city || null,
    },
  };

  try {
    const store = getStore("leads");
    await store.setJSON(id, record);
  } catch (err) {
    console.error("lead store error:", err.message);
    return json({ error: "Could not save. Please email hello@eirimhealth.com." }, 500);
  }

  return json({ ok: true });
};
