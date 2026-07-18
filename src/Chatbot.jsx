import { useState, useRef, useEffect } from "react";
import creds from "../creds.json";
import brief from "../chatbot-brief.md?raw";

const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = creds.OPENAI_MODEL || "gpt-4o-mini";
const KEY_MISSING =
  !creds.OPENAI_API_KEY || creds.OPENAI_API_KEY.startsWith("sk-REPLACE");

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy, started]);

  const startChat = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || !isEmail(email)) return;
    setStarted(true);
    setMessages([
      {
        role: "assistant",
        content: `Hi ${name.trim().split(" ")[0]}! I'm Aoife, the Eirim Front Desk assistant. Ask me anything about how Eirim can answer your clinic's calls, book appointments, and check patients in.`,
      },
    ]);
  };

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);

    if (KEY_MISSING) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "⚠️ No OpenAI API key is configured yet. Add your key to creds.json (OPENAI_API_KEY) and restart the dev server to enable live chat.",
        },
      ]);
      setBusy(false);
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${creds.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.6,
          max_tokens: 500,
          messages: [
            {
              role: "system",
              content: `${brief}\n\nThe visitor's name is ${name.trim()} and their email is ${email.trim()}.`,
            },
            ...next.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
      const reply = data.choices?.[0]?.message?.content?.trim();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: reply || "Sorry, I didn't catch that — could you rephrase?" },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `I'm having trouble connecting right now (${err.message}). In the meantime, you can book a demo from the button in the header.`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>

      {!open && (
        <button className="cbt-launch" onClick={() => setOpen(true)} aria-label="Open chat">
          <span className="cbt-launch-dot" />
          Chat with us
        </button>
      )}

      {open && (
        <div className="cbt-panel" role="dialog" aria-label="Eirim chat">
          <div className="cbt-head">
            <div className="cbt-head-id">
              <span className="cbt-avatar">A</span>
              <div>
                <strong>Aoife</strong>
                <small>Eirim Front Desk assistant</small>
              </div>
            </div>
            <button className="cbt-x" onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </div>

          {!started ? (
            <form className="cbt-gate" onSubmit={startChat}>
              <p className="cbt-gate-lead">
                Hi there 👋 Before we start, could you tell us who you are?
              </p>
              <label>
                Your name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Murphy"
                  autoFocus
                />
                {touched && !name.trim() && <em>Please enter your name.</em>}
              </label>
              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@clinic.ie"
                />
                {touched && !isEmail(email) && <em>Please enter a valid email.</em>}
              </label>
              <button type="submit" className="cbt-start">
                Start chat →
              </button>
            </form>
          ) : (
            <>
              <div className="cbt-body" ref={scrollRef}>
                {messages.map((m, i) => (
                  <div key={i} className={"cbt-msg cbt-" + m.role}>
                    {m.content}
                  </div>
                ))}
                {busy && (
                  <div className="cbt-msg cbt-assistant cbt-typing">
                    <span></span><span></span><span></span>
                  </div>
                )}
              </div>
              <form className="cbt-input" onSubmit={send}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message…"
                  disabled={busy}
                />
                <button type="submit" disabled={busy || !input.trim()} aria-label="Send">
                  ↑
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}

const CSS = `
.cbt-launch{position:fixed; right:24px; bottom:24px; z-index:9999; display:flex; align-items:center; gap:9px;
  background:#1E6B5C; color:#fff; border:none; border-radius:999px; padding:14px 22px; font-size:15px; font-weight:600;
  font-family:'Figtree',system-ui,sans-serif; cursor:pointer; box-shadow:0 14px 40px rgba(15,46,42,.35); transition:transform .15s, box-shadow .15s}
.cbt-launch:hover{transform:translateY(-2px); box-shadow:0 18px 48px rgba(15,46,42,.42)}
.cbt-launch-dot{width:9px; height:9px; border-radius:50%; background:#3DDC97; box-shadow:0 0 10px #3DDC97}

.cbt-panel{position:fixed; right:24px; bottom:24px; z-index:9999; width:min(380px,calc(100vw - 32px)); height:min(560px,calc(100vh - 48px));
  background:#fff; border-radius:20px; box-shadow:0 30px 80px rgba(15,46,42,.32); display:flex; flex-direction:column; overflow:hidden;
  font-family:'Figtree',system-ui,sans-serif; animation:cbtin .22s ease}
@keyframes cbtin{from{opacity:0; transform:translateY(16px)}to{opacity:1; transform:none}}

.cbt-head{display:flex; align-items:center; justify-content:space-between; padding:14px 16px;
  background:linear-gradient(135deg,#154D42,#1E6B5C); color:#fff}
.cbt-head-id{display:flex; align-items:center; gap:11px}
.cbt-avatar{width:38px; height:38px; border-radius:50%; background:#F2C14E; color:#0F2E2A; display:grid; place-items:center; font-weight:800; font-size:17px}
.cbt-head-id strong{display:block; font-size:15px; line-height:1.2}
.cbt-head-id small{font-size:12px; opacity:.8}
.cbt-x{background:transparent; border:none; color:#fff; font-size:26px; line-height:1; cursor:pointer; opacity:.85}
.cbt-x:hover{opacity:1}

.cbt-gate{padding:22px 18px; display:flex; flex-direction:column; gap:16px; flex:1}
.cbt-gate-lead{font-size:15px; color:#0F2E2A; line-height:1.5; margin:0}
.cbt-gate label{display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:600; color:#0F2E2A}
.cbt-gate input{padding:11px 13px; border:1px solid rgba(15,46,42,.16); border-radius:10px; font-size:14px; font-family:inherit; outline:none}
.cbt-gate input:focus{border-color:#1E6B5C; box-shadow:0 0 0 3px rgba(30,107,92,.12)}
.cbt-gate em{color:#C0392B; font-size:12px; font-weight:500; font-style:normal}
.cbt-start{margin-top:auto; background:#1E6B5C; color:#fff; border:none; border-radius:999px; padding:13px; font-size:15px; font-weight:700; font-family:inherit; cursor:pointer}
.cbt-start:hover{background:#154D42}

.cbt-body{flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; background:#F3F7F5}
.cbt-msg{max-width:85%; padding:10px 14px; border-radius:14px; font-size:14px; line-height:1.5; white-space:pre-wrap; word-wrap:break-word}
.cbt-assistant{align-self:flex-start; background:#fff; color:#0F2E2A; border:1px solid rgba(15,46,42,.08); border-bottom-left-radius:4px}
.cbt-user{align-self:flex-end; background:#1E6B5C; color:#fff; border-bottom-right-radius:4px}
.cbt-typing{display:flex; gap:5px; align-items:center}
.cbt-typing span{width:7px; height:7px; border-radius:50%; background:#9db8b0; animation:cbtb 1s infinite}
.cbt-typing span:nth-child(2){animation-delay:.15s}
.cbt-typing span:nth-child(3){animation-delay:.3s}
@keyframes cbtb{0%,60%,100%{opacity:.3; transform:translateY(0)}30%{opacity:1; transform:translateY(-4px)}}

.cbt-input{display:flex; gap:8px; padding:12px; border-top:1px solid rgba(15,46,42,.08); background:#fff}
.cbt-input input{flex:1; padding:11px 14px; border:1px solid rgba(15,46,42,.16); border-radius:999px; font-size:14px; font-family:inherit; outline:none}
.cbt-input input:focus{border-color:#1E6B5C; box-shadow:0 0 0 3px rgba(30,107,92,.12)}
.cbt-input button{width:42px; height:42px; flex:none; border:none; border-radius:50%; background:#1E6B5C; color:#fff; font-size:19px; cursor:pointer}
.cbt-input button:disabled{opacity:.45; cursor:default}
`;
