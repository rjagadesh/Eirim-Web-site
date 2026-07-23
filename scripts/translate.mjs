// Build-time translation drafting. Reads the English source strings and asks
// Claude to draft Spanish + Irish (Gaeilge), writing src/i18n.es.json and
// src/i18n.ga.json. Run this whenever the English copy changes, then commit
// the generated files:  npm run translate
//
// Key comes from ANTHROPIC_API_KEY env var, or creds.json (gitignored).
// NOTE: AI drafts — especially Gaeilge — should be reviewed by a fluent
// speaker before going live.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { flatEn } from "../src/i18n.strings.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function getCreds() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "creds.json"), "utf8"));
  } catch {
    return {};
  }
}

const creds = getCreds();
const KEY = process.env.ANTHROPIC_API_KEY || creds.ANTHROPIC_API_KEY || "";
const MODEL = process.env.TRANSLATE_MODEL || creds.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

if (!KEY || KEY.startsWith("sk-ant-REPLACE")) {
  console.error("✗ No ANTHROPIC_API_KEY (set env var or creds.json). Aborting.");
  process.exit(1);
}

const TARGETS = [
  { code: "es", name: "Spanish (Spain, es-ES)" },
  { code: "ga", name: "Irish / Gaeilge (Ireland, ga-IE)" },
];

const DO_NOT_TRANSLATE =
  "MedXFlow, MedXFlow Health, MedXFlow Voice, MedXFlow Front Desk, MedXFlow Check-in, Socrates, HealthOne, CompleteGP, Healthmail, Gaeilge, Fáilte, Eircode, SMS, PMS, GP, AI, GDPR, Wi-Fi";

async function translate(target) {
  const sys =
    `You are a professional localisation translator for a healthcare software product. ` +
    `Translate the VALUES of the given JSON object from English into ${target.name}. ` +
    `Return ONLY a valid JSON object with the exact same keys and translated values — no commentary, no code fences. ` +
    `Rules: keep it natural and marketing-appropriate; preserve the tone; ` +
    `keep these terms unchanged: ${DO_NOT_TRANSLATE}; ` +
    `keep numbers, prices (€250 etc.), symbols (· — % /), and placeholders intact; ` +
    `do not add or remove keys.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: sys,
      messages: [{ role: "user", content: JSON.stringify(flatEn, null, 0) }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  let text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  // Strip accidental code fences.
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const obj = JSON.parse(text);
  // Fill any missing keys from English so nothing renders blank.
  const out = {};
  for (const k of Object.keys(flatEn)) out[k] = obj[k] || flatEn[k];
  return out;
}

for (const target of TARGETS) {
  process.stdout.write(`→ Translating ${Object.keys(flatEn).length} strings to ${target.name} … `);
  try {
    const out = await translate(target);
    fs.writeFileSync(
      path.join(ROOT, "src", `i18n.${target.code}.json`),
      JSON.stringify(out, null, 2) + "\n"
    );
    console.log("done");
  } catch (err) {
    console.error("FAILED:", err.message);
    process.exitCode = 1;
  }
}
