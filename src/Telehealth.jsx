import { useState, useRef, useEffect } from "react";
import { LanguageProvider, useI18n } from "./i18n.jsx";
import { Nav, Footer, BookDemo, Eyebrow, Reveal, CSS } from "./EirimFrontDesk.jsx";

const openDemo = () => window.dispatchEvent(new Event("eirim:book-demo"));

function TelehealthPage() {
  const { t } = useI18n();
  const [muted, setMuted] = useState(true);
  const vidRef = useRef(null);
  useEffect(() => {
    if (vidRef.current) vidRef.current.muted = muted;
  }, [muted]);
  return (
    <div className="eirim">
      <style>{CSS}</style>
      <Nav />

      {/* ---------- Hero ---------- */}
      <header className="hero th-hero" id="top">
        <div className="hero-glow" aria-hidden="true" />
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <a href="/" className="th-back">{t("telehealth.back")}</a>
            <Eyebrow light>{t("telehealth.hero_eyebrow")}</Eyebrow>
            <h1>{t("telehealth.hero_h1a")}<br /><em>{t("telehealth.hero_h1b")}</em></h1>
            <p className="lead">{t("telehealth.hero_lead")}</p>
            <div className="btn-row">
              <a className="btn btn-gorse" href="#cta" onClick={(e) => { e.preventDefault(); openDemo(); }}>{t("telehealth.hero_cta1")}</a>
              <a className="btn btn-ghost" href="/#pricing">{t("telehealth.hero_cta2")}</a>
            </div>
            <div className="hero-note">{t("telehealth.hero_note")}</div>
          </div>
          <div className="hero-art">
            <button
              className="hero-sound"
              aria-label={muted ? t("hero.playSound") : t("hero.mute")}
              aria-pressed={!muted}
              data-tip={muted ? t("hero.playSound") : t("hero.mute")}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <video
              ref={vidRef}
              src="/telehealth.mp4"
              autoPlay
              muted
              loop
              playsInline
              aria-label="MedXFlow Telehealth video consultation between a clinician and a patient"
            />
          </div>
        </div>
      </header>

      {/* ---------- Intro ---------- */}
      <section className="sec">
        <div className="wrap th-intro">
          <Reveal>
            <Eyebrow>{t("telehealth.intro_eyebrow")}</Eyebrow>
            <h2>{t("telehealth.intro_h2a")}<br />{t("telehealth.intro_h2b")}</h2>
            <p className="body">{t("telehealth.intro_body")}</p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="sec sec-tint">
        <div className="wrap">
          <Reveal>
            <Eyebrow>{t("telehealth.feat_eyebrow")}</Eyebrow>
            <h2>{t("telehealth.feat_h2")}</h2>
          </Reveal>
          <div className="prob-grid th-feats">
            {[1, 2, 3, 4, 5, 6].map((n, i) => (
              <Reveal key={n} delay={i * 90}>
                <div className="card">
                  <div className="card-ic">{["🔗", "🗓", "🚪", "📝", "💳", "🔒"][i]}</div>
                  <h3>{t(`telehealth.f${n}_h`)}</h3>
                  <p>{t(`telehealth.f${n}_d`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="sec">
        <div className="wrap">
          <Reveal>
            <Eyebrow>{t("telehealth.how_eyebrow")}</Eyebrow>
            <h2>{t("telehealth.how_h2")}</h2>
          </Reveal>
          <div className="th-steps">
            {[1, 2, 3, 4].map((n, i) => (
              <Reveal key={n} delay={i * 90}>
                <div className="th-step">
                  <div className="th-step-n">{n}</div>
                  <h3>{t(`telehealth.step${n}_h`)}</h3>
                  <p>{t(`telehealth.step${n}_d`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="sec sec-dark" id="cta">
        <div className="wrap cta-in th-cta">
          <Reveal>
            <h2 className="h-light">{t("telehealth.cta_h2")}</h2>
            <p className="lead-light">{t("telehealth.cta_lead")}</p>
            <div className="btn-row btn-row-c">
              <a className="btn btn-gorse btn-big" href="#cta" onClick={(e) => { e.preventDefault(); openDemo(); }}>{t("telehealth.hero_cta1")}</a>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
      <BookDemo />

      <style>{TH_CSS}</style>
    </div>
  );
}

export default function Telehealth() {
  return (
    <LanguageProvider>
      <TelehealthPage />
    </LanguageProvider>
  );
}

const TH_CSS = `
.th-hero{min-height:auto; padding:130px 0 80px}
.th-back{display:inline-block; margin-bottom:18px; color:rgba(255,255,255,.72); font-size:14px; font-weight:600}
.th-back:hover{color:#fff}
.th-intro{max-width:760px}
.th-feats{grid-template-columns:repeat(3,1fr)}
@media(max-width:880px){.th-feats{grid-template-columns:1fr}}

.th-steps{display:grid; grid-template-columns:repeat(4,1fr); gap:24px; margin-top:44px; counter-reset:th}
.th-step{background:#fff; border:1px solid var(--line); border-radius:20px; padding:26px; height:100%}
.th-step-n{width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,var(--spruce),#2A8A76); color:#fff; display:grid; place-items:center; font-weight:800; font-size:18px; margin-bottom:14px}
.th-step h3{font-size:17.5px; margin-bottom:7px}
.th-step p{font-size:14.5px; color:rgba(15,46,42,.74); line-height:1.55}
@media(max-width:880px){.th-steps{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.th-steps{grid-template-columns:1fr}}

.th-cta{text-align:center; max-width:680px}
`;
