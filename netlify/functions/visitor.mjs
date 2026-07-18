import { getStore } from "@netlify/blobs";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });

// Logs a visitor when they submit name + email at the chat gate.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { sessionId, name, email, page, referrer } = body || {};
  if (!sessionId) return json({ error: "Missing sessionId" }, 400);

  try {
    const store = getStore("visitors");
    await store.setJSON(sessionId, {
      sessionId,
      name: name || null,
      email: email || null,
      page: page || null,
      referrer: referrer || null,
      userAgent: req.headers.get("user-agent") || null,
      ip:
        req.headers.get("x-nf-client-connection-ip") ||
        req.headers.get("x-forwarded-for") ||
        null,
      at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("visitor log error:", err.message);
    return json({ ok: false });
  }

  return json({ ok: true });
};
