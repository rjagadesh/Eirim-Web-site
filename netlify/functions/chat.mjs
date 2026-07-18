import fs from "node:fs";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { SYSTEM_PROMPT } from "../../chatbot-prompt.mjs";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// Local dev convenience: read the gitignored creds.json (not deployed to
// Netlify). In production the key/model come from environment variables.
function readCreds() {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "creds.json"), "utf8"));
  } catch {
    return {};
  }
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const creds = readCreds();
  const KEY = process.env.ANTHROPIC_API_KEY || creds.ANTHROPIC_API_KEY || "";
  const MODEL =
    process.env.ANTHROPIC_MODEL || creds.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

  if (!KEY || KEY.startsWith("sk-ant-REPLACE")) {
    return json(
      { error: "Anthropic API key not configured. Set ANTHROPIC_API_KEY." },
      500
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { sessionId, name, email, messages } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "No messages provided" }, 400);
  }

  // Anthropic requires the conversation to start with a user turn, so drop any
  // leading assistant messages (e.g. the UI greeting) before sending upstream.
  const convo = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .map((m) => ({ role: m.role, content: String(m.content) }));
  while (convo.length && convo[0].role !== "user") convo.shift();
  if (convo.length === 0) return json({ error: "No user message" }, 400);

  const system = `${SYSTEM_PROMPT}\n\nThe visitor's name is ${name || "unknown"} and their email is ${email || "unknown"}.`;

  // Call Claude Haiku
  let reply = "";
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 500, system, messages: convo }),
    });
    const data = await res.json();
    if (!res.ok) {
      return json({ error: data?.error?.message || `Anthropic HTTP ${res.status}` }, 502);
    }
    reply = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  } catch (err) {
    return json({ error: `Upstream error: ${err.message}` }, 502);
  }

  // Persist the full transaction to Netlify Blobs (best-effort; never blocks the reply)
  try {
    const store = getStore("chat-transcripts");
    const sid = sessionId || `s-${Date.now()}`;
    await store.setJSON(sid, {
      sessionId: sid,
      name: name || null,
      email: email || null,
      model: MODEL,
      updatedAt: new Date().toISOString(),
      messages: [...messages, { role: "assistant", content: reply }],
    });
  } catch (err) {
    console.error("Blob store error:", err.message);
  }

  return json({ reply });
};
