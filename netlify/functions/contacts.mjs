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
import { authorize, json } from "../lib/auth.mjs";

export default async (req) => {
  const auth = authorize(req, "contacts");
  if (!auth.ok) return json({ error: auth.error }, auth.status);

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
