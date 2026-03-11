import { useState, useEffect, useCallback, useRef } from "react";

const CATEGORIES = [
  {
    id: "hunger", emoji: "🍎", label: "Fome", color: "#FF6B35", bg: "#FFF0EB",
    items: [
      { emoji: "🍎", label: "Comer" },   { emoji: "🥛", label: "Leite" },
      { emoji: "💧", label: "Água" },    { emoji: "🍌", label: "Fruta" },
      { emoji: "🍞", label: "Pão" },     { emoji: "🍫", label: "Doce" },
    ],
  },
  {
    id: "pain", emoji: "🤒", label: "Dói", color: "#E63946", bg: "#FFF0F1",
    items: [
      { emoji: "🤕", label: "Cabeça" },  { emoji: "🫀", label: "Barriga" },
      { emoji: "🦷", label: "Dente" },   { emoji: "👂", label: "Ouvido" },
      { emoji: "🤧", label: "Nariz" },   { emoji: "😣", label: "Muito" },
    ],
  },
  {
    id: "sleep", emoji: "😴", label: "Sono", color: "#7B68EE", bg: "#F0EEFF",
    items: [
      { emoji: "😴", label: "Dormir" },  { emoji: "🛏️", label: "Cama" },
      { emoji: "🧸", label: "Ursinho" }, { emoji: "💡", label: "Luz" },
      { emoji: "🌙", label: "Noite" },   { emoji: "😪", label: "Cansado" },
    ],
  },
  {
    id: "bathroom", emoji: "🚿", label: "Banheiro", color: "#2196F3", bg: "#E8F4FF",
    items: [
      { emoji: "🚽", label: "Xixi" },    { emoji: "💩", label: "Cocô" },
      { emoji: "🛁", label: "Banho" },   { emoji: "🧼", label: "Lavar mão" },
      { emoji: "🪥", label: "Escovar" }, { emoji: "🚿", label: "Chuveiro" },
    ],
  },
  {
    id: "play", emoji: "🎮", label: "Brincar", color: "#FF9800", bg: "#FFF8E8",
    items: [
      { emoji: "📱", label: "Celular" }, { emoji: "📺", label: "TV" },
      { emoji: "🎨", label: "Desenhar" },{ emoji: "⚽", label: "Bola" },
      { emoji: "🧩", label: "Puzzle" },  { emoji: "📚", label: "Livro" },
    ],
  },
  {
    id: "feelings", emoji: "😊", label: "Sentir", color: "#4CAF50", bg: "#EDFAEE",
    items: [
      { emoji: "😊", label: "Feliz" },   { emoji: "😢", label: "Triste" },
      { emoji: "😠", label: "Bravo" },   { emoji: "😨", label: "Medo" },
      { emoji: "🥰", label: "Abraço" },  { emoji: "🤩", label: "Amei!" },
    ],
  },
];

const ALERT_MESSAGES = ["Preciso de ajuda! 🆘", "Venha aqui! 📣", "Estou aqui! 🙋"];
const ALERT_SPEECH   = ["Preciso de ajuda!", "Venha aqui!", "Estou aqui!"];

// ─── TTS ───────────────────────────────────────────────────────────────────────
const audioCache = new Map();

// Chama /api/speak (Vercel serverless) — chave segura no servidor
async function speakElevenLabs(text) {
  try {
    if (audioCache.has(text)) {
      const cached = audioCache.get(text).cloneNode();
      cached.volume = 1;
      await cached.play();
      return true;
    }
    const res = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return false;
    const blob  = await res.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    audioCache.set(text, audio);
    audio.volume = 1;
    await audio.play();
    return true;
  } catch { return false; }
}

function speakFallback(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "pt-BR"; utter.rate = 0.88; utter.pitch = 1.05; utter.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const best = voices
    .filter(v => v.lang.startsWith("pt"))
    .sort((a, b) => {
      const score = v => (!v.localService ? 2 : 0) + (v.lang === "pt-BR" ? 1 : 0);
      return score(b) - score(a);
    })[0];
  if (best) utter.voice = best;
  window.speechSynthesis.speak(utter);
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [
      { freq: 880, t: 0,    dur: 0.18 }, { freq: 660, t: 0.22, dur: 0.18 },
      { freq: 880, t: 0.44, dur: 0.18 }, { freq: 660, t: 0.66, dur: 0.18 },
      { freq: 1100,t: 0.9,  dur: 0.4  },
    ].forEach(({ freq, t, dur }) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
      gain.gain.setValueAtTime(0.55, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + dur + 0.05);
    });
    setTimeout(() => { try { ctx.close(); } catch(_) {} }, 2500);
  } catch(e) { console.warn(e); }
}

// ─── APP ───────────────────────────────────────────────────────────────────────
export default function ComunicarApp() {
  const [screen, setScreen]                 = useState("home");
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedItem, setSelectedItem]     = useState(null);
  const [alertMsgIdx, setAlertMsgIdx]       = useState(0);
  const alertIntervalRef = useRef(null);
  const soundIntervalRef = useRef(null);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", () => window.speechSynthesis.getVoices());
  }, []);

  const speak = useCallback(async (text) => {
    const ok = await speakElevenLabs(text);
    if (!ok) speakFallback(text);
  }, []);

  const stopAlert = useCallback(() => {
    clearInterval(alertIntervalRef.current);
    clearInterval(soundIntervalRef.current);
    window.speechSynthesis?.cancel();
    speak("Olá! Estou aqui!");
    setScreen("home");
  }, [speak]);

  const triggerAlert = useCallback(() => {
    setScreen("alert"); setAlertMsgIdx(0);
    if (navigator.vibrate) navigator.vibrate([300,100,300,100,600,200,300,100,500]);
    playAlertSound();
    speak("Preciso de ajuda!");
    let msgI = 0;
    alertIntervalRef.current = setInterval(() => {
      msgI = (msgI + 1) % ALERT_SPEECH.length;
      setAlertMsgIdx(msgI);
      speak(ALERT_SPEECH[msgI]);
    }, 3000);
    soundIntervalRef.current = setInterval(() => {
      if (navigator.vibrate) navigator.vibrate([200,80,200,80,400]);
      playAlertSound();
    }, 3500);
  }, [speak]);

  useEffect(() => () => {
    clearInterval(alertIntervalRef.current);
    clearInterval(soundIntervalRef.current);
  }, []);

  const handleItemClick = useCallback((item) => {
    if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
    speak(item.label);
    setSelectedItem(item);
    setTimeout(() => setSelectedItem(null), 2200);
  }, [speak]);

  const handleCategoryClick = useCallback((catId, catLabel) => {
    speak(catLabel);
    setActiveCategory(catId);
    setScreen("category");
  }, [speak]);

  const cat = activeCategory ? CATEGORIES.find(c => c.id === activeCategory) : null;

  return (
    <div style={{
      height: "100dvh",
      maxHeight: "100dvh",
      overflow: "hidden",
      background: "linear-gradient(160deg, #FFFBF5 0%, #FFF0FA 100%)",
      fontFamily: "'Nunito', cursive, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      userSelect: "none",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .btn { transition: transform 0.12s ease, filter 0.12s ease; cursor: pointer; -webkit-tap-highlight-color: transparent; border: none; }
        .btn:active { transform: scale(0.86) !important; filter: brightness(0.92); }
        @keyframes bounceIn {
          0%   { transform: translateX(-50%) scale(0.4); opacity: 0; }
          65%  { transform: translateX(-50%) scale(1.12); opacity: 1; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes alertFlash { 0%,100%{background:#FF1744} 50%{background:#B71C1C} }
        @keyframes bigBounce  { 0%,100%{transform:translateY(0) scale(1)} 40%{transform:translateY(-20px) scale(1.18)} 70%{transform:translateY(-8px) scale(1.07)} }
        @keyframes ringPulse  { 0%{box-shadow:0 0 0 0 rgba(255,23,68,.8)} 70%{box-shadow:0 0 0 32px rgba(255,23,68,0)} 100%{box-shadow:0 0 0 0 rgba(255,23,68,0)} }
        @keyframes wavePulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        .toast      { animation: bounceIn 0.4s cubic-bezier(.36,.07,.19,.97) forwards; }
        .fade-up    { animation: fadeUp 0.35s ease both; }
        .alert-bg   { animation: alertFlash 0.85s ease infinite; }
        .big-bounce { animation: bigBounce 0.9s ease infinite; }
        .ring-pulse { animation: ringPulse 1.2s ease infinite; }
        .wave-pulse { animation: wavePulse 1.1s ease infinite; }
      `}</style>

      {/* ALERTA */}
      {screen === "alert" && (
        <div className="alert-bg" style={{
          position:"fixed",inset:0,zIndex:200,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:28,
        }}>
          <div className="big-bounce" style={{fontSize:100,lineHeight:1}}>🆘</div>
          <div className="wave-pulse" style={{background:"rgba(255,255,255,0.2)",borderRadius:28,padding:"20px 36px",textAlign:"center"}}>
            <div style={{fontSize:34,fontWeight:900,color:"#fff",lineHeight:1.3}}>{ALERT_MESSAGES[alertMsgIdx]}</div>
          </div>
          <div style={{display:"flex",gap:12,fontSize:38}}>
            <span>📣</span><span>📣</span><span>📣</span>
          </div>
          <button onClick={stopAlert} className="btn ring-pulse" style={{
            marginTop:8,background:"#fff",color:"#C62828",borderRadius:50,
            padding:"20px 52px",fontSize:22,fontWeight:900,fontFamily:"inherit",
            boxShadow:"0 6px 28px rgba(0,0,0,0.3)",
          }}>✅ Já estou aqui!</button>
        </div>
      )}

      {/* HEADER */}
      {screen !== "alert" && (
        <div style={{width:"100%",maxWidth:480,padding:"10px 14px 0",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          {screen === "category"
            ? <button onClick={() => { setScreen("home"); setActiveCategory(null); }} className="btn"
                style={{background:"#fff",borderRadius:50,width:52,height:52,fontSize:22,
                  boxShadow:"0 2px 10px rgba(0,0,0,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>⬅️</button>
            : <div style={{width:52}} />
          }
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:24}}>{screen==="category"&&cat ? cat.emoji : "💬"}</div>
            <div style={{fontSize:13,fontWeight:900,color:"#999",letterSpacing:1}}>
              {screen==="category"&&cat ? cat.label.toUpperCase() : "COMUNICAR"}
            </div>
          </div>
          <button onClick={triggerAlert} className="btn ring-pulse" style={{
            background:"linear-gradient(135deg,#FF1744,#FF5252)",borderRadius:50,
            width:56,height:56,fontSize:26,display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:"0 4px 16px rgba(255,23,68,0.5)",
          }}>🆘</button>
        </div>
      )}

      {/* TOAST */}
      {selectedItem && (
        <div key={selectedItem.label+Date.now()} className="toast" style={{
          position:"fixed",bottom:88,left:"50%",
          background:"#1a1a2e",color:"#fff",borderRadius:28,
          padding:"14px 28px",fontSize:22,fontWeight:900,zIndex:50,
          display:"flex",alignItems:"center",gap:12,
          boxShadow:"0 10px 30px rgba(0,0,0,0.35)",whiteSpace:"nowrap",
        }}>
          <span style={{fontSize:34}}>{selectedItem.emoji}</span>
          {selectedItem.label}
        </div>
      )}

      {/* HOME */}
      {screen === "home" && (
        <div style={{
          width:"100%", maxWidth:480,
          flex:1, minHeight:0,
          padding:"10px 12px 12px",
          display:"flex", flexDirection:"column", gap:"1.2vh",
          overflow:"hidden",
        }}>

          {/* SIM / NÃO */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1vh",flex:"1.6",minHeight:0}}>
            <button
              onClick={() => { if(navigator.vibrate)navigator.vibrate([80,30,80]); speak("Sim!"); }}
              className="btn fade-up"
              style={{
                background:"linear-gradient(135deg,#22c55e,#16a34a)",
                borderRadius:28, padding:"4px",
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.6vh",
                boxShadow:"0 6px 24px rgba(34,197,94,0.45)",
                animationDelay:"0s",animationFillMode:"both",
                height:"100%",
              }}>
              <span style={{fontSize:"clamp(36px,8vw,58px)",lineHeight:1}}>👍</span>
              <span style={{fontSize:"clamp(20px,5vw,28px)",fontWeight:900,color:"#fff",letterSpacing:1}}>SIM</span>
            </button>
            <button
              onClick={() => { if(navigator.vibrate)navigator.vibrate([80,30,80]); speak("Não!"); }}
              className="btn fade-up"
              style={{
                background:"linear-gradient(135deg,#ef4444,#dc2626)",
                borderRadius:28, padding:"4px",
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.6vh",
                boxShadow:"0 6px 24px rgba(239,68,68,0.45)",
                animationDelay:"0.07s",animationFillMode:"both",
                height:"100%",
              }}>
              <span style={{fontSize:"clamp(36px,8vw,58px)",lineHeight:1}}>👎</span>
              <span style={{fontSize:"clamp(20px,5vw,28px)",fontWeight:900,color:"#fff",letterSpacing:1}}>NÃO</span>
            </button>
          </div>

          {/* Divisor */}
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <div style={{flex:1,height:2,background:"#eee",borderRadius:2}} />
            <span style={{fontSize:11,fontWeight:900,color:"#ccc",letterSpacing:1}}>O QUE VOCÊ PRECISA?</span>
            <div style={{flex:1,height:2,background:"#eee",borderRadius:2}} />
          </div>

          {/* Categorias */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1vh",flex:"3",minHeight:0}}>
            {CATEGORIES.map((c, i) => (
              <button key={c.id} onClick={() => handleCategoryClick(c.id, c.label)}
                className="btn fade-up" style={{
                  background:c.bg,border:`3px solid ${c.color}33`,borderRadius:20,
                  padding:"4px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.5vh",
                  boxShadow:`0 4px 18px ${c.color}22`,
                  animationDelay:`${(i+2)*0.07}s`,animationFillMode:"both",
                  height:"100%",
                }}>
                <span style={{fontSize:"clamp(28px,6vw,44px)",lineHeight:1}}>{c.emoji}</span>
                <span style={{fontSize:"clamp(13px,3.5vw,17px)",fontWeight:900,color:c.color}}>{c.label}</span>
              </button>
            ))}
          </div>

          {/* Chamar ajuda */}
          <button onClick={triggerAlert} className="btn fade-up" style={{
            background:"linear-gradient(135deg,#FF1744 0%,#FF5252 100%)",
            borderRadius:24,padding:"clamp(10px,2vh,18px) 16px",
            display:"flex",alignItems:"center",justifyContent:"center",gap:12,
            boxShadow:"0 6px 24px rgba(255,23,68,0.45)",
            flexShrink:0,
            animationDelay:"0.7s",animationFillMode:"both",
          }}>
            <span style={{fontSize:"clamp(28px,6vw,40px)"}}>🆘</span>
            <span style={{fontSize:"clamp(18px,4.5vw,26px)",fontWeight:900,color:"#fff"}}>CHAMAR AJUDA!</span>
          </button>
        </div>
      )}

      {/* CATEGORIA */}
      {screen === "category" && cat && (
        <div style={{width:"100%",maxWidth:480,padding:"16px 14px 100px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {cat.items.map((item, i) => (
            <button key={item.label} onClick={() => handleItemClick(item)}
              className="btn fade-up" style={{
                background:"#fff",border:`3px solid ${cat.color}30`,borderRadius:20,
                padding:"18px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,
                boxShadow:`0 3px 14px ${cat.color}18`,
                animationDelay:`${i*0.07}s`,animationFillMode:"both",
              }}>
              <span style={{fontSize:46,lineHeight:1}}>{item.emoji}</span>
              <span style={{fontSize:14,fontWeight:900,color:cat.color,textAlign:"center",lineHeight:1.2}}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      )}


    </div>
  );
}
