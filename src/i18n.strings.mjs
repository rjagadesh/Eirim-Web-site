// ─────────────────────────────────────────────────────────────────────────
//  English source-of-truth strings for the MedXFlow marketing page.
//  This is the ONLY file you edit for copy. Translations (Spanish, Irish) are
//  AI-drafted from here into i18n.es.json / i18n.ga.json by `npm run translate`
//  — run that when copy changes, then commit the generated files. Translation
//  happens at build time, never on page load.
//
//  Do NOT put brand/product names, prices, emails or phone numbers here — they
//  stay the same across languages and live directly in the components.
// ─────────────────────────────────────────────────────────────────────────

export const en = {
  nav: {
    products: "Products",
    contact: "Contact us",
    pricing: "Pricing",
    faq: "FAQ",
    tour: "Tour",
    book: "Book a demo",
    p_kiosk: "AI Front Desk Kiosk",
    p_voice: "Voice AI",
    p_telehealth: "Telehealth",
    p_agents: "AI Agents",
    p_integrators: "System Integrators",
    p_custom: "Customized AI Agents",
  },

  hero: {
    s1_eyebrow: "Product · MedXFlow Check-in kiosk",
    s1_h1a: "Meet your new",
    s1_h1b: "AI front desk assistant",
    s1_lead:
      "A self check-in kiosk that greets your patients, takes the copay by card, verifies their details — and writes it all straight into your PMS: Socrates and HealthOne.",
    s1_cta1: "See the kiosk",
    s1_cta2: "Pricing",
    s1_note: "Integrated with your PMS · Hardware included · €250/month",
    s2_eyebrow: "Product · MedXFlow Voice",
    s2_h2a: "Every call answered.",
    s2_h2b: "All of them, at once.",
    s2_lead:
      "When the 8am rush hits, MedXFlow Voice picks up every line simultaneously — booking, rescheduling and confirming by SMS, straight into your appointment book. No engaged tone. No voicemail. Ever.",
    s2_cta1: "Hear it work",
    s2_cta2: "Pricing",
    s2_note: "Unlimited simultaneous calls · 24/7 · €250/month + €0.10/min",
    playSound: "Play sound",
    mute: "Mute",
  },

  stats: {
    s1: "of morning calls go unanswered in a busy practice",
    s2: "of receptionist time freed per week",
    s3: "visit fee collected at the kiosk, not chased later",
    s4: "calls answered — evenings, weekends, bank holidays",
  },

  problem: {
    eyebrow: "The 8am problem",
    h2a: "Your phone is the busiest",
    h2b: "member of staff you have",
    c1_h: "The morning storm",
    c1_p: "Twenty patients ring at 8:01. One receptionist, two hands. Engaged tones mean patients give up — or book with the practice down the road.",
    c2_h: "The desk queue",
    c2_p: "While the phone rings, a queue forms at reception. Someone's paying, someone's lost, someone just needs a form. Everyone waits.",
    c3_h: "Stale details",
    c3_p: "Mobile numbers change. Eircodes are missing. Every incorrect record is a failed SMS reminder — and another no-show.",
    caption: "For many patients, the engaged tone is the front door of the practice.",
  },

  voice: {
    eyebrow: "MedXFlow Voice · AI receptionist",
    h2a: "Answers like your best",
    h2b: "receptionist. Never engaged.",
    lead: "MedXFlow Voice answers every call on the first ring — in a warm, Irish-tuned voice — and books directly into your appointment book.",
    t1: "Books, moves and cancels appointments in Socrates & HealthOne",
    t2: "Handles repeat prescription requests into a queue for the GP",
    t3: "Recognises urgent symptoms and warm-transfers to staff instantly",
    t4: "Confirms every booking by SMS — fewer no-shows",
    t5: "English and Gaeilge · unlimited simultaneous calls",
  },

  checkin: {
    eyebrow: "MedXFlow Check-in · kiosk",
    h2a: "Walk in. Touch the screen.",
    h2b: "Take a seat.",
    f1_h: "Arrival to PMS",
    f1_d: "Patient taps in — their arrival status appears in Socrates/HealthOne instantly. No queue at the desk.",
    f2_h: "Copay collected on the spot",
    f2_d: "Card payment at check-in. The copay is settled before the patient sits down — not chased after.",
    f3_h: "Details refreshed",
    f3_d: "Mobile number and Eircode confirmed at every visit. Your SMS reminders actually arrive.",
    f4_h: "New patient forms",
    f4_d: "Registration and consent captured on screen — typed, legible, structured. No clipboards.",
    f5_h: "Fáilte · English & Gaeilge",
    f5_d: "A warm bilingual welcome, larger type for older patients, full accessibility mode.",
    f6_h: "Hardware included",
    f6_d: "Floor-standing unit in white or black, shipped pre-configured. Plug in, connect Wi-Fi, done.",
  },

  integrations: {
    eyebrow: "Integrations",
    h2a: "Built for the software",
    h2b: "you already run",
    body: "MedXFlow writes bookings, arrivals and payments directly into the practice management systems used by over 80% of Irish general practice — with a fallback mode that works even before formal integration.",
    caption: "Your appointment book, always current — no retyping, no sticky notes.",
  },

  roi: {
    eyebrow: "What the engaged tone costs",
    h2: "Run your own numbers",
    missed: "Missed calls per day",
    elsewhere: "% who book elsewhere",
    fee: "Average visit fee",
    revenueOut: "Revenue walking out the door",
    product: "MedXFlow Front Desk",
    recovered: "Recovered every month",
    footnote: "22 clinic days/month. Excludes receptionist hours freed and fewer no-shows from SMS confirmations.",
  },

  pricing: {
    eyebrow: "Pricing",
    h2: "Simple. Monthly. No lock-in.",
    tag: "Most practices choose this",
    voice_per: "/month + €0.10/min",
    voice_cta: "Start with Voice",
    voice_f1: "AI receptionist, 24/7",
    voice_f2: "Unlimited simultaneous calls",
    voice_f3: "Bookings into Socrates/HealthOne",
    voice_f4: "Repeat prescription queue",
    voice_f5: "Urgent-call warm transfer",
    voice_f6: "SMS confirmations",
    fd_per: "/month + call minutes",
    fd_cta: "Get Front Desk",
    fd_f1: "Everything in Voice + Check-in",
    fd_f2: "One dashboard for the practice",
    fd_f3: "Priority support",
    fd_f4: "Founding practices: pricing locked 24 months",
    fd_f5: "Free setup + 60-day trial",
    ci_per: "/month, hardware included",
    ci_cta: "Start with Check-in",
    ci_f1: "Floor-standing kiosk (white/black)",
    ci_f2: "Arrival status to your PMS",
    ci_f3: "Copay collected at check-in",
    ci_f4: "Details refresh + new patient forms",
    ci_f5: "English & Gaeilge",
  },

  about: {
    eyebrow: "About MedXFlow",
    h2a: "Built by people who've run",
    h2b: "the front desk.",
    body: "MedXFlow Health is an Irish company on a simple mission: give every practice a front desk that never misses a call. We pair deep healthcare-operations experience with modern voice AI — built for Socrates, HealthOne, and the realities of Irish clinics.",
    role1: "Co-founder & CEO",
    bio1: "Two decades in Irish healthcare operations — built and scaled reception teams across multi-site GP groups.",
    role2: "Co-founder & CTO",
    bio2: "Health-tech engineer who led voice-AI and PMS integration platforms used across hundreds of clinics.",
    role3: "Clinical Advisor",
    bio3: "Practising GP focused on patient access and front-desk workflow, keeping MedXFlow clinically grounded.",
  },

  faq: {
    eyebrow: "FAQ",
    h2: "Questions, answered.",
    q1: "Is patient data secure and GDPR-compliant?",
    a1: "Yes. MedXFlow is built for Irish healthcare: data is hosted in the EU, encrypted in transit and at rest, and processed under a GDPR data-processing agreement. We use least-privilege access and full audit logging, and never sell data or use patient information to train public models.",
    q2: "How long does setup take?",
    a2: "Most practices are live within a fortnight. We connect to your PMS (Socrates or HealthOne), configure your call flows and appointment types, and run a supervised pilot before MedXFlow answers live calls.",
    q3: "What are the contract terms?",
    a3: "Founding practices get a 60-day trial, free setup, and pricing locked for 24 months. After the trial it's a simple monthly plan — no long lock-in, cancel with 30 days' notice.",
    q4: "What happens when the AI can't handle a call?",
    a4: "MedXFlow knows its limits. Anything clinical, urgent, or out of scope is warm-transferred to your team or flagged for callback, with a full transcript. It augments your reception — it never overrides clinical judgement.",
    q5: "Does it work with our phone system and PMS?",
    a5: "Yes. MedXFlow sits alongside your existing phone number and writes bookings, arrivals, and payments straight into Socrates and HealthOne. No rip-and-replace.",
    q6: "Which languages does it support?",
    a6: "English and Gaeilge today, with a warm, Irish-tuned voice and accessibility options (larger type, slower pace) for older patients.",
  },

  cta: {
    h2a: "Be one of the twenty",
    h2b: "founding practices",
    lead: "Free setup, a 60-day trial, and pricing locked for 24 months. We'll have MedXFlow Voice answering your calls within a fortnight.",
    formTitle: "Request your demo",
  },

  lead: {
    name: "Name",
    email: "Work email",
    clinic: "Clinic / practice",
    phone: "Phone",
    bestTime: "Best time to call",
    message: "Anything specific?",
    messagePlaceholder: "What would you like MedXFlow to help with?",
    submit: "Request my demo",
    sending: "Sending…",
    fine: "No spam. We'll only use this to arrange your demo.",
    doneTitle: "Thanks",
    doneMsg: "We've got your request — the MedXFlow team will be in touch within one business day to arrange your demo.",
    invalid: "Please enter your name and a valid email.",
  },

  bookdemo: {
    eyebrow: "Book a demo",
    title: "See MedXFlow on your own calls",
    sub: "A free 15-minute walkthrough. Tell us where to reach you and we'll set it up.",
  },

  footer: {
    location: "Dublin, Ireland",
    legal: "GDPR compliant · Data hosted in the EU · © 2026 MedXFlow Health",
  },

  // Telehealth product page (/telehealth)
  telehealth: {
    hero_eyebrow: "Product · MedXFlow Telehealth",
    hero_h1a: "See patients anywhere,",
    hero_h1b: "in one tap.",
    hero_lead: "MedXFlow Telehealth turns any appointment into a secure video consultation — no apps, no downloads. The patient taps a link, joins in their browser, and every note writes straight back into Socrates and HealthOne.",
    hero_cta1: "Book a demo",
    hero_cta2: "See pricing",
    hero_note: "No downloads · EU-hosted · Integrated with your PMS",

    intro_eyebrow: "Why MedXFlow Telehealth",
    intro_h2a: "Video visits that feel like",
    intro_h2b: "part of the practice.",
    intro_body: "Telehealth shouldn't mean a second system your team has to babysit. MedXFlow books, sends, and documents video consultations inside the workflow you already run — so a virtual visit is just another slot in the day.",

    feat_eyebrow: "What's included",
    feat_h2: "Everything a virtual visit needs",
    f1_h: "One-tap join",
    f1_d: "The patient gets an SMS link and joins in their browser — no app, no account, no PIN. Works on any phone.",
    f2_h: "Books into your PMS",
    f2_d: "Video slots sit in the same diary as in-person visits, written straight into Socrates and HealthOne.",
    f3_h: "Smart waiting room",
    f3_d: "Patients wait in a branded virtual lobby; your team sees who's ready and admits them when it suits.",
    f4_h: "Notes & scripts",
    f4_d: "Consultation notes and prescriptions flow back to the record and out via Healthmail — nothing re-typed.",
    f5_h: "Copay up front",
    f5_d: "Collect the consultation fee by card before the call connects, just like the check-in kiosk.",
    f6_h: "Private by design",
    f6_d: "End-to-end encrypted, EU-hosted and GDPR-compliant. No recordings are stored unless you ask for them.",

    how_eyebrow: "How it works",
    how_h2: "From booking to follow-up",
    step1_h: "Book",
    step1_d: "Reception or MedXFlow Voice books a video slot — the patient picks a time like any appointment.",
    step2_h: "Tap to join",
    step2_d: "An SMS link arrives. The patient taps it and lands in the waiting room, in their browser.",
    step3_h: "Consult",
    step3_d: "The clinician admits them and consults — sharing screens, images or documents as needed.",
    step4_h: "Follow-up",
    step4_d: "Notes, scripts and next steps write back automatically. The patient gets an SMS summary.",

    cta_h2: "Add telehealth to your practice",
    cta_lead: "See how virtual visits slot into your day — book a free 15-minute demo with the MedXFlow team.",
    back: "← All products",
  },

  // Spoken narration for the guided tour (read aloud by the browser).
  tour: {
    exit: "Exit tour",
    replay: "Replay",
    intro: "Welcome to MedXFlow. Here's a quick tour of how it gives your practice a front desk that never misses a call.",
    problem: "It starts with the phone. When twenty patients call at eight in the morning, one receptionist can't answer them all — and every engaged tone is a patient who books elsewhere.",
    voice: "MedXFlow Voice answers every call at once, day or night, in a warm Irish voice — booking, rescheduling and confirming by text, straight into Socrates or HealthOne.",
    checkin: "At the door, the MedXFlow Check-in kiosk greets patients, takes the copay, refreshes their details, and marks them arrived — with no queue at the desk.",
    integrations: "Everything writes directly into the practice software you already run — Socrates, HealthOne and more — with no rip and replace.",
    roi: "Try your own numbers. Every missed call has a cost, and MedXFlow recovers most of it every single month.",
    pricing: "Pricing is simple and monthly, with no lock-in — start with Voice, Check-in, or the full Front Desk.",
    about: "MedXFlow is built by an Irish team who have run the front desk themselves.",
    faq: "Common questions — data security, setup time, and how the AI hands over to your staff — are all answered here.",
    cta: "Ready to see it on your own calls? Book a free fifteen-minute demo, and we'll have MedXFlow answering within a fortnight.",
  },
};

// Flatten { a: { b: "x" } } -> { "a.b": "x" }
export function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

export const flatEn = flatten(en);
