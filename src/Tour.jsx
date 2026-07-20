import { useState, useRef, useEffect } from "react";
import { useI18n } from "./i18n.jsx";

// Narrated, auto-scrolling guided tour. Started via window event
// "eirim:start-tour" (the nav "Tour" item dispatches it).
//
// English plays the pre-recorded voiceover (public/speech.wav) and syncs the
// scroll + captions to it. Other languages (or a missing file) fall back to
// the browser's built-in SpeechSynthesis.

const AUDIO_SRC = "/speech.wav";
const AUDIO_LANG = "en"; // language the recorded voiceover is in
const AUDIO_FALLBACK_DURATION = 76.5;

const STEPS = [
  { id: "top", key: "tour.intro", block: "start" },
  { id: "problem", key: "tour.problem" },
  { id: "voice", key: "tour.voice" },
  { id: "checkin", key: "tour.checkin" },
  { id: "integrations", key: "tour.integrations" },
  { id: "roi", key: "tour.roi" },
  { id: "pricing", key: "tour.pricing" },
  { id: "about", key: "tour.about" },
  { id: "faq", key: "tour.faq" },
  { id: "cta", key: "tour.cta" },
];

const LANG_TAG = { en: "en-IE", es: "es-ES", ga: "ga-IE" };

export default function Tour() {
  const { t, lang } = useI18n();
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState(0);
  const [caption, setCaption] = useState("");

  const running = useRef(false);
  const pausedRef = useRef(false);
  const stepRef = useRef(0);
  const timers = useRef([]);
  const audio = useRef(null);
  const offsets = useRef([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const goToStep = (i) => {
    if (i < 0 || i >= STEPS.length) return;
    stepRef.current = i;
    setStep(i);
    setCaption(t(STEPS[i].key));
    const el = document.getElementById(STEPS[i].id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: STEPS[i].block || "center" });
  };

  const stop = () => {
    running.current = false;
    clearTimers();
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    if (audio.current) {
      try {
        audio.current.pause();
      } catch {}
      audio.current = null;
    }
    setActive(false);
    setPaused(false);
  };

  /* ---------- recorded-audio engine ---------- */
  const computeOffsets = (duration) => {
    const words = STEPS.map((s) => Math.max(1, t(s.key).split(/\s+/).length));
    const total = words.reduce((a, b) => a + b, 0);
    const offs = [];
    let acc = 0;
    for (let i = 0; i < STEPS.length; i++) {
      offs.push(acc);
      acc += (words[i] / total) * duration;
    }
    offsets.current = offs;
  };

  const startAudio = () => {
    const a = new Audio(AUDIO_SRC);
    audio.current = a;
    a.addEventListener("loadedmetadata", () => {
      const d = a.duration && isFinite(a.duration) ? a.duration : AUDIO_FALLBACK_DURATION;
      computeOffsets(d);
    });
    a.addEventListener("timeupdate", () => {
      if (!running.current || !offsets.current.length) return;
      let i = 0;
      for (let k = 0; k < offsets.current.length; k++) {
        if (a.currentTime >= offsets.current[k]) i = k;
      }
      if (i !== stepRef.current) goToStep(i);
    });
    a.addEventListener("ended", () => {
      timers.current.push(setTimeout(stop, 900));
    });
    a.addEventListener("error", () => {
      // File missing/undecodable → fall back to speech synthesis.
      audio.current = null;
      runTTS(0);
    });
    // Seed step 0 immediately; offsets fill in on metadata.
    computeOffsets(AUDIO_FALLBACK_DURATION);
    goToStep(0);
    const p = a.play();
    if (p && p.catch) p.catch(() => runTTS(0));
  };

  /* ---------- browser text-to-speech fallback ---------- */
  const speak = (text, onDone) => {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
      timers.current.push(setTimeout(onDone, Math.max(3200, text.split(/\s+/).length * 360)));
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const tag = LANG_TAG[lang] || "en-US";
    u.lang = tag;
    const voices = synth.getVoices() || [];
    const v = voices.find((x) => x.lang === tag) || voices.find((x) => x.lang?.slice(0, 2) === tag.slice(0, 2));
    if (v) u.voice = v;
    let done = false;
    const fin = () => {
      if (done) return;
      done = true;
      onDone();
    };
    u.onend = fin;
    u.onerror = fin;
    synth.speak(u);
    timers.current.push(setTimeout(fin, Math.max(7000, text.split(/\s+/).length * 480) + 3000));
  };

  const runTTS = (i) => {
    if (!running.current) return;
    if (i >= STEPS.length) {
      timers.current.push(setTimeout(stop, 1600));
      return;
    }
    goToStep(i);
    timers.current.push(
      setTimeout(() => {
        if (!running.current || pausedRef.current) return;
        speak(t(STEPS[i].key), () => {
          if (running.current && !pausedRef.current) runTTS(i + 1);
        });
      }, i === 0 ? 900 : 1100)
    );
  };

  /* ---------- controls ---------- */
  const start = () => {
    if (running.current) return;
    running.current = true;
    pausedRef.current = false;
    setPaused(false);
    setActive(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      window.speechSynthesis?.getVoices();
    } catch {}
    if (lang === AUDIO_LANG) startAudio();
    else timers.current.push(setTimeout(() => runTTS(0), 500));
  };

  const togglePause = () => {
    if (!pausedRef.current) {
      pausedRef.current = true;
      setPaused(true);
      if (audio.current) audio.current.pause();
      else {
        clearTimers();
        try {
          window.speechSynthesis?.pause();
        } catch {}
      }
    } else {
      pausedRef.current = false;
      setPaused(false);
      if (audio.current) audio.current.play().catch(() => {});
      else {
        const synth = window.speechSynthesis;
        try {
          synth?.resume();
        } catch {}
        if (!synth || !synth.speaking) runTTS(stepRef.current + 1);
      }
    }
  };

  const next = () => {
    if (!running.current) return;
    if (audio.current && offsets.current.length) {
      const ni = Math.min(stepRef.current + 1, STEPS.length - 1);
      audio.current.currentTime = offsets.current[ni] + 0.05;
      goToStep(ni);
      return;
    }
    clearTimers();
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    pausedRef.current = false;
    setPaused(false);
    runTTS(stepRef.current + 1);
  };

  useEffect(() => {
    const onStart = () => start();
    window.addEventListener("eirim:start-tour", onStart);
    const onKey = (e) => {
      if (!running.current) return;
      if (e.key === "Escape") stop();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("eirim:start-tour", onStart);
      window.removeEventListener("keydown", onKey);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  if (!active) return null;

  return (
    <>
      <style>{CSS}</style>
      <div className="tour-vignette" aria-hidden="true" />
      <div className="tour-bar" role="dialog" aria-label="Guided tour">
        <div className="tour-progress">
          {STEPS.map((_, i) => (
            <span key={i} className={"tour-dot" + (i <= step ? " on" : "")} />
          ))}
        </div>
        <div className="tour-caption">
          <span className="tour-eq" aria-hidden="true">
            <i /><i /><i />
          </span>
          <p key={step}>{caption}</p>
        </div>
        <div className="tour-controls">
          <button onClick={togglePause} aria-label={paused ? "Play" : "Pause"} title={paused ? "Play" : "Pause"}>
            {paused ? "▶" : "❚❚"}
          </button>
          <button onClick={next} aria-label="Next" title="Next section">⏭</button>
          <button className="tour-exit" onClick={stop}>
            {t("tour.exit")} ✕
          </button>
        </div>
      </div>
    </>
  );
}

const CSS = `
.tour-vignette{position:fixed; inset:0; z-index:9990; pointer-events:none;
  box-shadow:inset 0 0 200px 60px rgba(11,34,31,.55); animation:tvfade .5s ease}
@keyframes tvfade{from{opacity:0}to{opacity:1}}

.tour-bar{position:fixed; left:50%; bottom:26px; transform:translateX(-50%); z-index:9992;
  width:min(760px, calc(100vw - 32px)); background:rgba(11,34,31,.92); color:#fff;
  border:1px solid rgba(207,229,222,.18); border-radius:18px; padding:16px 20px 14px;
  box-shadow:0 30px 80px rgba(0,0,0,.5); backdrop-filter:blur(10px);
  font-family:'Figtree',system-ui,sans-serif; animation:tbup .35s cubic-bezier(.2,.8,.2,1)}
@keyframes tbup{from{opacity:0; transform:translate(-50%,16px)}to{opacity:1; transform:translate(-50%,0)}}

.tour-progress{display:flex; gap:5px; margin-bottom:12px}
.tour-dot{flex:1; height:3px; border-radius:999px; background:rgba(255,255,255,.2); transition:background .3s}
.tour-dot.on{background:#3DDC97}

.tour-caption{display:flex; align-items:flex-start; gap:12px; min-height:48px}
.tour-caption p{margin:0; font-size:16.5px; line-height:1.5; animation:tcin .4s ease}
@keyframes tcin{from{opacity:0; transform:translateY(5px)}to{opacity:1; transform:none}}

.tour-eq{display:inline-flex; align-items:flex-end; gap:2px; height:18px; margin-top:5px; flex:none}
.tour-eq i{width:3px; height:100%; background:#3DDC97; border-radius:2px; animation:teq 1s ease-in-out infinite}
.tour-eq i:nth-child(2){animation-delay:.2s} .tour-eq i:nth-child(3){animation-delay:.4s}
@keyframes teq{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}

.tour-controls{display:flex; align-items:center; gap:8px; margin-top:12px; justify-content:flex-end}
.tour-controls button{background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.2); color:#fff;
  border-radius:999px; width:38px; height:38px; font-size:14px; cursor:pointer; display:grid; place-items:center; transition:background .15s}
.tour-controls button:hover{background:rgba(255,255,255,.22)}
.tour-exit{width:auto!important; padding:0 16px; font-weight:600; font-size:13.5px; gap:6px}
@media(prefers-reduced-motion:reduce){.tour-eq i{animation:none}}
`;
