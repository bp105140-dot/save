import { useState, useEffect, useCallback, useRef } from "react";

const CATEGORIES = [
  {
    id: "hunger", emoji: "🍎", label: "Fome", color: "#FF6B35", bg: "#FFF0EB",
    items: [
      { emoji: "🍎", label: "Comer" }, { emoji: "🥛", label: "Leite" },
      { emoji: "💧", label: "Água" }, { emoji: "🍌", label: "Fruta" },
      { emoji: "🍞", label: "Pão" }, { emoji: "🍫", label: "Doce" },
    ],
  },
  {
    id: "pain", emoji: "🤒", label: "Dói", color: "#E63946", bg: "#FFF0F1",
    items: [
      { emoji: "🤕", label: "Cabeça" }, { emoji: "🫀", label: "Barriga" },
      { emoji: "🦷", label: "Dente" }, { emoji: "👂", label: "Ouvido" },
      { emoji: "🤧", label: "Nariz" }, { emoji: "😣", label: "Muito" },
    ],
  },
  {
    id: "sleep", emoji: "😴", label: "Sono", color: "#7B68EE", bg: "#F0EEFF",
    items: [
      { emoji: "😴", label: "Dormir" }, { emoji: "🛏️", label: "Cama" },
      { emoji: "🧸", label: "Ursinho" }, { emoji: "💡", label: "Luz" },
      { emoji: "🌙", label: "Noite" }, { emoji: "😪", label: "Cansado" },
    ],
  },
  {
    id: "bathroom", emoji: "🚿", label: "Banheiro", color: "#2196F3", bg: "#E8F4FF",
    items: [
      { emoji: "🚽", label: "Xixi" }, { emoji: "💩", label: "Cocô" },
      { emoji: "🛁", label: "Banho" }, { emoji: "🧼", label: "Lavar mão" },
      { emoji: "🪥", label: "Escovar" }, { emoji: "🚿", label: "Chuveiro" },
    ],
  },
  {
    id: "play", emoji: "🎮", label: "Brincar", color: "#FF9800", bg: "#FFF8E8",
    items: [
      { emoji: "📱", label: "Celular" }, { emoji: "📺", label: "TV" },
      { emoji: "🎨", label: "Desenhar" }, { emoji: "⚽", label: "Bola" },
      { emoji: "🧩", label: "Puzzle" }, { emoji: "📚", label: "Livro" },
    ],
  },
  {
    id: "feelings", emoji: "😊", label: "Sentir", color: "#4CAF50", bg: "#EDFAEE",
    items: [
      { emoji: "😊", label: "Feliz" }, { emoji: "😢", label: "Triste" },
      { emoji: "😠", label: "Bravo" }, { emoji: "😨", label: "Medo" },
      { emoji: "🥰", label: "Abraço" }, { emoji: "🤩", label: "Amei!" },
    ],
  },
];

const ALERT_MESSAGES = ["Preciso de ajuda! 🆘", "Venha aqui! 📣", "Estou aqui! 🙋"];
const ALERT_SPEECH   = ["Preciso de ajuda!", "Venha aqui!", "Estou aqui!"];

function speak(text, rate = 0.9, pitch = 1.1) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "pt-BR";
  utter.rate = rate;
  utter.pitch = pitch;
  utter.volume = 1;
  // tenta pegar voz em português
  const voices = window.speechSynthesis.getVoices();
  const ptVoice = voices.find(v => v.lang.startsWith("pt"));
  if (ptVoice) utter.voice = ptVoice;
  window.speechSynthesis.speak(utter);
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [
      { freq: 880, t: 0, dur: 0.18 }, { freq: 660, t: 0.22, dur: 0.18 },
      { freq: 880, t: 0.44, dur: 0.18 }, { freq: 660, t: 0.66, dur: 0.18 },
      { freq: 1100, t: 0.9, dur: 0.4 },
    ];
    notes.forEach(({ freq, t, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
      gain.gain.setValueAtTime(0.55, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + dur + 0.05);
    });
    setTimeout(() => { try { ctx.close(); } catch(_) {} }, 2000);
  } catch(e) { console.warn("Audio error", e); }
}

export default function ComunicarApp() {
  const [screen, setScreen] = useState("home");
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [alertMsgIdx, setAlertMsgIdx] = useState(0);
  const alertIntervalRef = useRef(null);
  const soundIntervalRef = useRef(null);

  const stopAlert = useCallback(() => {
    clearInterval(alertIntervalRef.current);
    clearInterval(soundIntervalRef.current);
    window.speechSynthesis && window.speechSynthesis.cancel();
    speak("Olá! Estou aqui!", 0.9, 1.2);
    setScreen("home");
  }, []);

  const triggerAlert = useCallback(() => {
    setScreen("alert");
    setAlertMsgIdx(0);
    if (navigator.vibrate) navigator.vibrate([300,100,300,100,600,200,300,100,500]);
    playAlertSound();
    speak("Preciso de ajuda!", 0.85, 1.0);
    let msgI = 0;
    alertIntervalRef.current = setInterval(() => {
      msgI = (msgI + 1) % ALERT_SPEECH.length;
      setAlertMsgIdx(msgI);
      speak(ALERT_SPEECH[msgI], 0.85, 1.0);
    }, 2800);
    soundIntervalRef.current = setInterval(() => {
      if (navigator.vibrate) navigator.vibrate([200,80,200,80,400]);
      playAlertSound();
    }, 3200);
  }, []);

  useEffect(() => () => {
    clearInterval(alertIntervalRef.current);
    clearInterval(soundIntervalRef.current);
  }, []);

  const handleItemClick = useCallback((item) => {
    if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
    speak(item.label, 0.9, 1.2);
    setSelectedItem(item);
    setTimeout(() => setSelectedItem(null), 2200);
  }, []);

  const handleCategoryClick = useCallback((catId, catLabel) => {
    speak(catLabel, 0.9, 1.1);
    setActiveCategory(catId);
    setScreen("category");
  }, []);

  const cat = activeCategory ? CATEGORIES.find(c => c.id === activeCategory) : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #FFFBF5 0%, #FFF0FA 100%)",
      fontFamily: "'Nunito', cursive, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      userSelect: "none", overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .btn { transition: transform 0.12s ease; cursor: pointer; -webkit-tap-highlight-color: transparent; border: none; }
        .btn:active { transform: scale(0.88) !important; }
        @keyframes bounceIn {
          0%   { transform: translateX(-50%) scale(0.4); opacity: 0; }
          65%  { transform: translateX(-50%) scale(1.12); opacity: 1; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes alertFlash {
          0%, 100% { background: #FF1744; }
          50%      { background: #B71C1C; }
        }
        @keyframes bigBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          40%      { transform: translateY(-20px) scale(1.18); }
          70%      { transform: translateY(-8px) scale(1.07); }
        }
        @keyframes ringPulse {
          0%   { box-shadow: 0 0 0 0 rgba(255,23,68,0.8); }
          70%  { box-shadow: 0 0 0 32px rgba(255,23,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,23,68,0); }
        }
        @keyframes wavePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.06); opacity: 0.85; }
        }
        .toast     { animation: bounceIn 0.4s cubic-bezier(.36,.07,.19,.97) forwards; }
        .fade-up   { animation: fadeUp 0.35s ease both; }
        .alert-bg  { animation: alertFlash 0.85s ease infinite; }
        .big-bounce{ animation: bigBounce 0.9s ease infinite; }
        .ring-pulse{ animation: ringPulse 1.2s ease infinite; }
        .wave-pulse{ animation: wavePulse 1.1s ease infinite; }
      `}</style>

      {/* ══ ALERT SCREEN ══ */}
      {screen === "alert" && (
        <div className="alert-bg" style={{
          position: "fixed", inset: 0, zIndex: 200,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 28,
        }}>
          <div className="big-bounce" style={{ fontSize: 100, lineHeight: 1 }}>🆘</div>

          <div className="wave-pulse" style={{
            background: "rgba(255,255,255,0.2)", borderRadius: 28,
            padding: "20px 36px", textAlign: "center",
          }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: "#fff", lineHeight: 1.3 }}>
              {ALERT_MESSAGES[alertMsgIdx]}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, fontSize: 38 }}>
            <span>📣</span><span>📣</span><span>📣</span>
          </div>

          <button onClick={stopAlert} className="btn ring-pulse" style={{
            marginTop: 8, background: "#fff", color: "#C62828",
            borderRadius: 50, padding: "20px 52px",
            fontSize: 22, fontWeight: 900, fontFamily: "inherit",
            boxShadow: "0 6px 28px rgba(0,0,0,0.3)",
          }}>
            ✅ Já estou aqui!
          </button>
        </div>
      )}

      {/* ══ HEADER ══ */}
      {screen !== "alert" && (
        <div style={{
          width: "100%", maxWidth: 480, padding: "18px 18px 0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {screen === "category" ? (
            <button onClick={() => { setScreen("home"); setActiveCategory(null); }} className="btn"
              style={{
                background: "#fff", borderRadius: 50, width: 52, height: 52, fontSize: 22,
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>⬅️</button>
          ) : <div style={{ width: 52 }} />}

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24 }}>{screen === "category" && cat ? cat.emoji : "💬"}</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#999", letterSpacing: 1 }}>
              {screen === "category" && cat ? cat.label.toUpperCase() : "COMUNICAR"}
            </div>
          </div>

          <button onClick={triggerAlert} className="btn ring-pulse" style={{
            background: "linear-gradient(135deg,#FF1744,#FF5252)", borderRadius: 50,
            width: 56, height: 56, fontSize: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(255,23,68,0.5)",
          }}>🆘</button>
        </div>
      )}

      {/* ══ TOAST ══ */}
      {selectedItem && (
        <div key={selectedItem.label + Date.now()} className="toast" style={{
          position: "fixed", bottom: 88, left: "50%",
          background: "#1a1a2e", color: "#fff", borderRadius: 28,
          padding: "14px 28px", fontSize: 22, fontWeight: 900, zIndex: 50,
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)", whiteSpace: "nowrap",
        }}>
          <span style={{ fontSize: 34 }}>{selectedItem.emoji}</span>
          {selectedItem.label}
        </div>
      )}

      {/* ══ HOME ══ */}
      {screen === "home" && (
        <div style={{
          width: "100%", maxWidth: 480, padding: "16px 14px 100px",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
        }}>
          {CATEGORIES.map((c, i) => (
            <button key={c.id} onClick={() => handleCategoryClick(c.id, c.label)}
              className="btn fade-up" style={{
                background: c.bg, border: `3px solid ${c.color}33`, borderRadius: 24,
                padding: "22px 10px", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 8,
                boxShadow: `0 4px 18px ${c.color}22`,
                animationDelay: `${i * 0.07}s`, animationFillMode: "both",
              }}>
              <span style={{ fontSize: 54, lineHeight: 1 }}>{c.emoji}</span>
              <span style={{ fontSize: 17, fontWeight: 900, color: c.color }}>{c.label}</span>
            </button>
          ))}
          <button onClick={triggerAlert} className="btn fade-up" style={{
            gridColumn: "1/-1",
            background: "linear-gradient(135deg,#FF1744 0%,#FF5252 100%)",
            borderRadius: 24, padding: "22px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
            boxShadow: "0 6px 24px rgba(255,23,68,0.45)",
            animationDelay: "0.42s", animationFillMode: "both",
          }}>
            <span style={{ fontSize: 42 }}>🆘</span>
            <span style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>CHAMAR AJUDA!</span>
          </button>
        </div>
      )}

      {/* ══ CATEGORY ══ */}
      {screen === "category" && cat && (
        <div style={{
          width: "100%", maxWidth: 480, padding: "16px 14px 100px",
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
        }}>
          {cat.items.map((item, i) => (
            <button key={item.label} onClick={() => handleItemClick(item)}
              className="btn fade-up" style={{
                background: "#fff", border: `3px solid ${cat.color}30`, borderRadius: 20,
                padding: "18px 8px", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 8,
                boxShadow: `0 3px 14px ${cat.color}18`,
                animationDelay: `${i * 0.07}s`, animationFillMode: "both",
              }}>
              <span style={{ fontSize: 46, lineHeight: 1 }}>{item.emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: cat.color, textAlign: "center", lineHeight: 1.2 }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* RODAPÉ */}
      {screen !== "alert" && (
        <div style={{
          position: "fixed", bottom: 0, width: "100%", maxWidth: 480,
          textAlign: "center", padding: "12px 16px",
          background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)",
          fontSize: 12, color: "#bbb", fontWeight: 700, letterSpacing: 0.5,
        }}>
          Toque em qualquer cartão para comunicar 💛
        </div>
      )}
    </div>
  );
}
