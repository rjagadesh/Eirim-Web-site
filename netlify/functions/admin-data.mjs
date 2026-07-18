import fs from "node:fs";
import path from "node:path";
import { getStore } from "@netlify/blobs";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });

function readCreds() {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "creds.json"), "utf8"));
  } catch {
    return {};
  }
}

async function dumpStore(name) {
  const store = getStore(name);
  const out = [];
  const { blobs } = await store.list();
  for (const b of blobs) {
    try {
      const v = await store.get(b.key, { type: "json" });
      if (v) out.push(v);
    } catch {
      /* skip unreadable blob */
    }
  }
  return out;
}

export default async (req) => {
  const creds = readCreds();
  const PW = process.env.ADMIN_PASSWORD || creds.ADMIN_PASSWORD || "";
  if (!PW || PW === "change-me-admin-password") {
    return json({ error: "Admin password not configured. Set ADMIN_PASSWORD." }, 500);
  }

  const given = req.headers.get("x-admin-password") || "";
  if (given !== PW) return json({ error: "Unauthorized" }, 401);

  try {
    const [transcripts, visitors] = await Promise.all([
      dumpStore("chat-transcripts"),
      dumpStore("visitors"),
    ]);
    transcripts.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    visitors.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
    return json({
      transcripts,
      visitors,
      counts: { transcripts: transcripts.length, visitors: visitors.length },
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
};
