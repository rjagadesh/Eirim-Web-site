import fs from "node:fs";
import path from "node:path";
import {
  buildContacts,
  contactDetail,
  promoteToCampaign,
  convertWonToIncome,
  loadCrm,
  saveCrm,
  normEmail,
  STAGES,
} from "../lib/contacts-core.mjs";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

function adminPassword() {
  let c = {};
  try {
    c = JSON.parse(fs.readFileSync(path.join(process.cwd(), "creds.json"), "utf8"));
  } catch {}
  return process.env.ADMIN_PASSWORD || c.ADMIN_PASSWORD || "";
}

export default async (req) => {
  const PW = adminPassword();
  if (!PW || PW === "change-me-admin-password") return json({ error: "Admin password not configured." }, 500);
  if ((req.headers.get("x-admin-password") || "") !== PW) return json({ error: "Unauthorized" }, 401);

  let body = {};
  try {
    body = await req.json();
  } catch {}
  const action = body.action;

  try {
    if (action === "list") {
      return json({ contacts: await buildContacts() });
    }
    if (action === "detail") {
      return json({ contact: await contactDetail(body.email) });
    }
    if (action === "update") {
      const email = normEmail(body.email);
      if (!email) return json({ error: "email required" }, 400);
      const crm = (await loadCrm(email)) || { email };
      const patch = body.patch || {};
      if (patch.stage !== undefined && STAGES.includes(patch.stage)) crm.stage = patch.stage;
      if (patch.dealValue !== undefined) crm.dealValue = Math.max(0, parseFloat(patch.dealValue) || 0);
      if (patch.followUpDate !== undefined) crm.followUpDate = patch.followUpDate || null;
      if (patch.notes !== undefined) crm.notes = String(patch.notes).slice(0, 2000);
      if (patch.status !== undefined) crm.status = patch.status || null;
      await saveCrm(crm);
      return json({ ok: true, crm });
    }
    if (action === "promote") {
      const r = await promoteToCampaign(body.email, body.campaignId, body.name, body.clinic);
      return json({ ok: true, ...r });
    }
    if (action === "convertToIncome") {
      const r = await convertWonToIncome(body.email);
      return json(r);
    }
    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
};
