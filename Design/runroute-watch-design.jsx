import { useState, useEffect, useRef } from "react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&family=Nunito+Sans:wght@300;400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --coral:    #FF6B8A;
    --mint:     #00E5C3;
    --lavender: #C4B5FD;
    --sun:      #FFD93D;
    --sky:      #7DD3FC;
    --peach:    #FFB347;
    --navy:     #080D1E;
    --navy2:    #0F1629;
    --navy3:    #151D35;
    --white:    #FFFFFF;
    --offwhite: #F0F4FF;
    --dim:      rgba(255,255,255,0.35);
    --dimmer:   rgba(255,255,255,0.15);
    --font-r: 'Nunito', sans-serif;
    --font-d: 'Fredoka One', cursive;
    --font-s: 'Nunito Sans', sans-serif;
  }

  body {
    background: var(--navy);
    font-family: var(--font-r);
    min-height: 100vh;
    overflow-x: hidden;
  }

  @keyframes float {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-8px); }
  }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%,100% { transform: scale(1); opacity: 1; }
    50%      { transform: scale(1.06); opacity: 0.85; }
  }
  @keyframes ping {
    0%   { transform: scale(1); opacity: 0.7; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes shimmer {
    0%   { background-position: -300% center; }
    100% { background-position: 300% center; }
  }
  @keyframes dash {
    from { stroke-dashoffset: 300; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes heartbeat {
    0%,100% { transform: scale(1); }
    14%     { transform: scale(1.2); }
    28%     { transform: scale(1); }
    42%     { transform: scale(1.15); }
    70%     { transform: scale(1); }
  }
  @keyframes runnerBounce {
    0%,100% { transform: translateY(0) rotate(-5deg); }
    50%      { transform: translateY(-4px) rotate(5deg); }
  }
  @keyframes waveAnim {
    0%   { transform: scaleX(1) translateX(0); }
    100% { transform: scaleX(1) translateX(-50%); }
  }
  @keyframes countUp {
    from { opacity:0; transform: scale(0.8); }
    to   { opacity:1; transform: scale(1); }
  }
  @keyframes dotPulse {
    0%,80%,100% { transform: scale(0.6); opacity:0.4; }
    40%          { transform: scale(1); opacity:1; }
  }
  @keyframes confetti {
    0%   { transform: translateY(0) rotate(0); opacity:1; }
    100% { transform: translateY(60px) rotate(360deg); opacity:0; }
  }
  @keyframes glow {
    0%,100% { box-shadow: 0 0 12px var(--coral); }
    50%      { box-shadow: 0 0 24px var(--coral), 0 0 48px var(--coral); }
  }
  @keyframes slideRight {
    from { transform: translateX(-100%); }
    to   { transform: translateX(0); }
  }
`;

/* ─── WATCH BEZEL ─── */
function Watch({ children, color = "#FF6B8A", size = 200, label, badge, animate }) {
  const br = size * 0.28;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10,
      animation: animate ? "fadeUp 0.6s ease both" : "none",
      animationDelay: animate || "0s",
    }}>
      {/* Outer bezel */}
      <div style={{
        width: size + 16, height: size + 20,
        background: `linear-gradient(145deg, #1E2540, #0A0F1E)`,
        borderRadius: (br + 8) * 1.2,
        padding: "10px 8px",
        boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1.5px rgba(255,255,255,0.07),
                    inset 0 1px 0 rgba(255,255,255,0.08)`,
        position: "relative",
      }}>
        {/* Side buttons */}
        <div style={{
          position:"absolute", right:-5, top:"30%",
          width:5, height:22, background:"#1A2035",
          borderRadius:"0 3px 3px 0",
          boxShadow:"inset -1px 0 0 rgba(255,255,255,0.05)",
        }}/>
        <div style={{
          position:"absolute", right:-5, top:"52%",
          width:5, height:14, background:"#1A2035",
          borderRadius:"0 3px 3px 0",
        }}/>

        {/* Screen */}
        <div style={{
          width: size, height: size,
          borderRadius: br,
          overflow: "hidden",
          position: "relative",
          background: "#080D1E",
        }}>
          {children}
          {/* Screen glare */}
          <div style={{
            position:"absolute", top:0, left:0, right:0, height:"40%",
            background:"linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)",
            pointerEvents:"none", borderRadius: `${br}px ${br}px 0 0`,
          }}/>
        </div>
        {/* Digital crown top */}
        <div style={{
          position:"absolute", right: 8, top:-4,
          width: size * 0.12, height: 8,
          background:"linear-gradient(to right, #141929, #1E2540)",
          borderRadius:4, boxShadow:"0 2px 4px rgba(0,0,0,0.5)",
        }}/>
      </div>
      {/* Label */}
      {label && (
        <div style={{
          fontFamily:"var(--font-r)", fontSize:11, fontWeight:700,
          color:"rgba(255,255,255,0.35)", letterSpacing:"0.06em",
          textTransform:"uppercase", textAlign:"center",
        }}>{label}</div>
      )}
      {badge && (
        <div style={{
          background: `${color}22`, border:`1px solid ${color}55`,
          borderRadius:20, padding:"3px 10px",
          fontSize:10, fontWeight:700, color,
          fontFamily:"var(--font-r)", letterSpacing:"0.04em",
        }}>{badge}</div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────
   SCREEN 1: WATCHFACE (Idle / Home)
────────────────────────────────────────────────── */
function ScreenWatchface() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = time.getHours().toString().padStart(2,"0");
  const m = time.getMinutes().toString().padStart(2,"0");
  const weekDays = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div style={{
      width:"100%", height:"100%",
      background:"linear-gradient(160deg, #0D1428 0%, #080D1E 60%, #0F0A1E 100%)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      gap:2, position:"relative", overflow:"hidden",
    }}>
      {/* BG decoration */}
      <div style={{
        position:"absolute", bottom:-30, left:-30,
        width:120, height:120,
        borderRadius:"50%",
        background:"radial-gradient(circle, rgba(255,107,138,0.12), transparent 70%)",
      }}/>
      <div style={{
        position:"absolute", top:-20, right:-20,
        width:100, height:100,
        borderRadius:"50%",
        background:"radial-gradient(circle, rgba(0,229,195,0.1), transparent 70%)",
      }}/>

      {/* Date */}
      <div style={{
        fontSize:10, fontWeight:700, letterSpacing:"0.12em",
        color:"rgba(196,181,253,0.7)", fontFamily:"var(--font-s)",
        textTransform:"uppercase",
      }}>
        {weekDays[time.getDay()]} · {months[time.getMonth()]} {time.getDate()}
      </div>

      {/* Time */}
      <div style={{
        fontFamily:"var(--font-d)", fontSize:52, lineHeight:1,
        background:"linear-gradient(135deg, #FFFFFF, rgba(255,255,255,0.85))",
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        letterSpacing:"-0.02em",
      }}>
        {h}<span style={{ opacity:0.5, animation:"pulse 1s ease infinite" }}>:</span>{m}
      </div>

      {/* Running mascot */}
      <div style={{
        fontSize:22, marginTop:2,
        animation:"runnerBounce 0.7s ease infinite",
        filter:"drop-shadow(0 4px 8px rgba(255,107,138,0.4))",
      }}>🏃‍♀️</div>

      {/* Quick stats row */}
      <div style={{
        display:"flex", gap:10, marginTop:4,
      }}>
        {[
          { icon:"🔥", val:"342", unit:"kcal" },
          { icon:"👟", val:"4.2", unit:"km" },
        ].map(s => (
          <div key={s.val} style={{
            display:"flex", alignItems:"center", gap:3,
            background:"rgba(255,255,255,0.06)",
            borderRadius:20, padding:"3px 8px",
          }}>
            <span style={{ fontSize:9 }}>{s.icon}</span>
            <span style={{ fontFamily:"var(--font-d)", fontSize:11, color:"var(--white)" }}>{s.val}</span>
            <span style={{ fontSize:8, color:"var(--dim)" }}>{s.unit}</span>
          </div>
        ))}
      </div>

      {/* Bottom tap hint */}
      <div style={{
        position:"absolute", bottom:8,
        display:"flex", alignItems:"center", gap:3,
        opacity:0.4,
      }}>
        <div style={{ width:4, height:4, borderRadius:"50%", background:"var(--coral)",
          animation:"dotPulse 1.4s 0s ease infinite" }}/>
        <div style={{ width:4, height:4, borderRadius:"50%", background:"var(--coral)",
          animation:"dotPulse 1.4s 0.2s ease infinite" }}/>
        <div style={{ width:4, height:4, borderRadius:"50%", background:"var(--coral)",
          animation:"dotPulse 1.4s 0.4s ease infinite" }}/>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   SCREEN 2: ROUTE SETUP (거리 선택)
────────────────────────────────────────────────── */
function ScreenRouteSetup() {
  const [dist, setDist] = useState(5);
  const terrains = [
    { id:"riverside", e:"🏞️", c:"#7DD3FC" },
    { id:"park",      e:"🌳", c:"#86EFAC" },
    { id:"mountain",  e:"⛰️", c:"#FCA5A5" },
  ];
  const [sel, setSel] = useState("riverside");

  return (
    <div style={{
      width:"100%", height:"100%",
      background:"linear-gradient(150deg, #0C1425, #0A0F1E)",
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:"12px 10px 10px", gap:8,
    }}>
      <div style={{
        fontFamily:"var(--font-d)", fontSize:13, color:"var(--coral)",
        letterSpacing:"0.02em",
      }}>거리 설정</div>

      {/* Big distance display */}
      <div style={{
        display:"flex", alignItems:"baseline", gap:4,
        position:"relative",
      }}>
        <button onClick={() => setDist(Math.max(1,dist-1))} style={{
          width:22, height:22, borderRadius:"50%", border:"none",
          background:"rgba(255,107,138,0.15)", color:"var(--coral)",
          fontSize:16, cursor:"pointer", fontWeight:900,
          display:"flex", alignItems:"center", justifyContent:"center",
          lineHeight:1,
        }}>−</button>

        <div style={{ textAlign:"center", minWidth:64 }}>
          <div style={{
            fontFamily:"var(--font-d)", fontSize:44, lineHeight:1,
            background:"linear-gradient(135deg, var(--coral), var(--peach))",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            animation:"countUp 0.2s ease",
            key: dist,
          }}>{dist}</div>
          <div style={{ fontSize:9, color:"var(--dim)", fontWeight:700,
            letterSpacing:"0.1em", textTransform:"uppercase" }}>km</div>
        </div>

        <button onClick={() => setDist(Math.min(30,dist+1))} style={{
          width:22, height:22, borderRadius:"50%", border:"none",
          background:"rgba(255,107,138,0.15)", color:"var(--coral)",
          fontSize:16, cursor:"pointer", fontWeight:900,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>+</button>
      </div>

      {/* Progress dots for distance */}
      <div style={{ display:"flex", gap:3, alignItems:"center" }}>
        {[1,5,10,15,20,30].map(v => (
          <div key={v} style={{
            height: v <= dist ? 5 : 3,
            width:  v <= dist ? 14 : 8,
            borderRadius:3,
            background: v <= dist
              ? "linear-gradient(90deg, var(--coral), var(--peach))"
              : "rgba(255,255,255,0.1)",
            transition:"all 0.2s",
          }}/>
        ))}
      </div>

      {/* Terrain chips */}
      <div style={{ display:"flex", gap:5, justifyContent:"center" }}>
        {terrains.map(t => (
          <button key={t.id} onClick={() => setSel(t.id)} style={{
            width:42, height:42, borderRadius:14,
            border:`1.5px solid ${sel===t.id ? t.c : "rgba(255,255,255,0.08)"}`,
            background: sel===t.id ? `${t.c}18` : "rgba(255,255,255,0.04)",
            cursor:"pointer", fontSize:18,
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            gap:1, transition:"all 0.15s",
            boxShadow: sel===t.id ? `0 4px 14px ${t.c}40` : "none",
          }}>
            <span>{t.e}</span>
          </button>
        ))}
      </div>

      {/* Go button */}
      <button style={{
        width:"85%", height:30, borderRadius:15, border:"none",
        background:"linear-gradient(135deg, var(--coral), #FF8FA3)",
        color:"white", fontFamily:"var(--font-d)", fontSize:13,
        cursor:"pointer", letterSpacing:"0.04em",
        boxShadow:"0 6px 20px rgba(255,107,138,0.45)",
        display:"flex", alignItems:"center", justifyContent:"center", gap:5,
      }}>
        <span>🔍</span> 추천받기
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   SCREEN 3: ROUTE DETAIL
────────────────────────────────────────────────── */
function ScreenRouteDetail() {
  const circ = 2 * Math.PI * 28;
  const score = 92;

  return (
    <div style={{
      width:"100%", height:"100%",
      background:"linear-gradient(160deg, #0B1520, #08101E)",
      display:"flex", flexDirection:"column",
      padding:"10px", gap:6, overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:9, color:"rgba(125,211,252,0.7)", fontWeight:700,
            letterSpacing:"0.08em", textTransform:"uppercase" }}>추천 #1</div>
          <div style={{ fontFamily:"var(--font-d)", fontSize:14, color:"var(--white)",
            lineHeight:1.1 }}>한강 둔치 루프</div>
        </div>
        {/* Score ring */}
        <div style={{ position:"relative", width:44, height:44 }}>
          <svg width={44} height={44} style={{ transform:"rotate(-90deg)" }}>
            <circle cx={22} cy={22} r={19} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={3}/>
            <circle cx={22} cy={22} r={19} fill="none"
              stroke="url(#sg)" strokeWidth={3} strokeLinecap="round"
              strokeDasharray={2*Math.PI*19}
              strokeDashoffset={2*Math.PI*19*(1-score/100)}
              style={{ animation:"dash 1s ease forwards" }}/>
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FF6B8A"/>
                <stop offset="100%" stopColor="#FFB347"/>
              </linearGradient>
            </defs>
          </svg>
          <div style={{
            position:"absolute", inset:0, display:"flex",
            flexDirection:"column", alignItems:"center", justifyContent:"center",
          }}>
            <div style={{ fontFamily:"var(--font-d)", fontSize:12, color:"var(--coral)" }}>{score}</div>
          </div>
        </div>
      </div>

      {/* Mini map preview */}
      <div style={{
        height:60, borderRadius:12, overflow:"hidden", position:"relative",
        background:"#0A1428",
        border:"1px solid rgba(255,255,255,0.06)",
      }}>
        <svg width="100%" height="60" viewBox="0 0 180 60">
          {/* River */}
          <path d="M0,42 C30,38 60,44 90,40 S140,36 180,40"
            fill="none" stroke="rgba(125,211,252,0.2)" strokeWidth="14" strokeLinecap="round"/>
          {/* Grid */}
          {[1,2,3,4].map(i=>(
            <line key={i} x1={i*45} y1={0} x2={i*45} y2={60}
              stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
          ))}
          {/* Route path */}
          <path d="M90,30 C75,22 55,24 48,30 S45,42 55,46 70,48 88,46 110,42 118,36 112,26 98,26 88,28 90,30"
            fill="none" stroke="#7DD3FC" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray="200" strokeDashoffset="200"
            style={{ animation:"dash 1.2s 0.3s ease forwards" }}/>
          {/* Start dot */}
          <circle cx={90} cy={30} r={4} fill="#FF6B8A"/>
          <circle cx={90} cy={30} r={8} fill="none" stroke="#FF6B8A" strokeWidth="1.5" opacity="0.5"
            style={{ animation:"ping 1.5s ease infinite" }}/>
        </svg>
        <div style={{
          position:"absolute", bottom:5, right:8,
          display:"flex", alignItems:"center", gap:3,
        }}>
          <span style={{ fontSize:8, color:"rgba(125,211,252,0.6)" }}>🏞️ 강변</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:5 }}>
        {[
          { e:"📏", v:"5.2", u:"km", c:"var(--sky)" },
          { e:"⏱️", v:"31",  u:"min", c:"var(--mint)" },
          { e:"⬆️", v:"+12", u:"m",  c:"var(--lavender)" },
        ].map(s => (
          <div key={s.u} style={{
            background:"rgba(255,255,255,0.04)",
            borderRadius:10, padding:"6px 4px", textAlign:"center",
            border:"1px solid rgba(255,255,255,0.05)",
          }}>
            <div style={{ fontSize:12 }}>{s.e}</div>
            <div style={{ fontFamily:"var(--font-d)", fontSize:13, color:s.c }}>{s.v}</div>
            <div style={{ fontSize:8, color:"var(--dim)" }}>{s.u}</div>
          </div>
        ))}
      </div>

      {/* Start button */}
      <button style={{
        width:"100%", height:28, borderRadius:14, border:"none",
        background:"linear-gradient(135deg, #7DD3FC, #00E5C3)",
        color:"#080D1E", fontFamily:"var(--font-d)", fontSize:13,
        cursor:"pointer", letterSpacing:"0.04em",
        boxShadow:"0 5px 18px rgba(0,229,195,0.4)",
        display:"flex", alignItems:"center", justifyContent:"center", gap:4,
      }}>
        ▶ 시작하기
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   SCREEN 4: ACTIVE RUN (메인 러닝 화면)
────────────────────────────────────────────────── */
function ScreenActiveRun() {
  const [secs, setSecs] = useState(847);
  const [km, setKm] = useState(2.34);
  const totalKm = 5.2;

  useEffect(() => {
    const t = setInterval(() => {
      setSecs(s => s+1);
      setKm(k => Math.min(totalKm, k + 0.004));
    }, 80);
    return () => clearInterval(t);
  }, []);

  const min = Math.floor(secs/60), sec = secs%60;
  const paceRaw = secs/km;
  const pm = Math.floor(paceRaw/60), ps = Math.floor(paceRaw%60);
  const progress = km/totalKm;
  const circ = 2*Math.PI*72;
  const remaining = totalKm - km;

  return (
    <div style={{
      width:"100%", height:"100%",
      background:"linear-gradient(160deg, #0C1422, #080D18)",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:8, gap:0,
      position:"relative", overflow:"hidden",
    }}>
      {/* Animated bg wave */}
      <div style={{
        position:"absolute", bottom:-10, left:0, right:0,
        height:35, overflow:"hidden", opacity:0.3,
      }}>
        <svg viewBox="0 0 400 35" width="800" style={{ animation:"waveAnim 3s linear infinite" }}>
          <path d="M0,18 C30,8 60,28 90,18 S150,8 180,18 210,28 240,18 300,8 330,18 360,28 390,18 400,14 400,18 L400,35 L0,35Z"
            fill="rgba(255,107,138,0.3)"/>
        </svg>
      </div>

      {/* Central ring */}
      <div style={{ position:"relative", width:144, height:144 }}>
        <svg width={144} height={144} style={{ transform:"rotate(-90deg)", position:"absolute", inset:0 }}>
          {/* Track */}
          <circle cx={72} cy={72} r={66} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5}/>
          {/* Progress */}
          <circle cx={72} cy={72} r={66} fill="none"
            stroke="url(#rg)" strokeWidth={5} strokeLinecap="round"
            strokeDasharray={2*Math.PI*66}
            strokeDashoffset={2*Math.PI*66*(1-progress)}
            style={{ transition:"stroke-dashoffset 0.5s ease" }}/>
          <defs>
            <linearGradient id="rg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FF6B8A"/>
              <stop offset="60%" stopColor="#FFB347"/>
              <stop offset="100%" stopColor="#FFD93D"/>
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div style={{
          position:"absolute", inset:0, display:"flex",
          flexDirection:"column", alignItems:"center", justifyContent:"center",
          gap:0,
        }}>
          <div style={{ fontSize:9, color:"var(--dim)", fontWeight:700,
            letterSpacing:"0.08em", textTransform:"uppercase" }}>완료</div>
          <div style={{
            fontFamily:"var(--font-d)", fontSize:34, lineHeight:1,
            background:"linear-gradient(135deg, var(--coral), var(--peach))",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>{km.toFixed(2)}</div>
          <div style={{ fontSize:9, color:"var(--dim)", fontWeight:700 }}>/ {totalKm} km</div>

          {/* Tiny runner */}
          <div style={{ fontSize:14, marginTop:2, animation:"runnerBounce 0.5s ease infinite" }}>🏃‍♀️</div>
        </div>
      </div>

      {/* Time + Pace row */}
      <div style={{
        display:"flex", gap:0, width:"100%",
        borderTop:"1px solid rgba(255,255,255,0.05)",
        marginTop:6, paddingTop:6,
      }}>
        <div style={{ flex:1, textAlign:"center" }}>
          <div style={{ fontSize:8, color:"rgba(196,181,253,0.6)", fontWeight:700,
            letterSpacing:"0.06em", textTransform:"uppercase" }}>시간</div>
          <div style={{ fontFamily:"var(--font-d)", fontSize:18, color:"var(--lavender)",
            fontVariantNumeric:"tabular-nums" }}>
            {String(min).padStart(2,"0")}:{String(sec).padStart(2,"0")}
          </div>
        </div>
        <div style={{ width:1, background:"rgba(255,255,255,0.06)" }}/>
        <div style={{ flex:1, textAlign:"center" }}>
          <div style={{ fontSize:8, color:"rgba(0,229,195,0.6)", fontWeight:700,
            letterSpacing:"0.06em", textTransform:"uppercase" }}>페이스</div>
          <div style={{ fontFamily:"var(--font-d)", fontSize:18, color:"var(--mint)" }}>
            {pm}'{String(ps).padStart(2,"0")}"
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   SCREEN 5: HEART RATE FOCUS
────────────────────────────────────────────────── */
function ScreenHeartRate() {
  const [hr, setHr] = useState(152);
  const [history, setHistory] = useState([140,143,148,152,156,153,150,155,158,155,152]);

  useEffect(() => {
    const t = setInterval(() => {
      const next = Math.max(130, Math.min(175, hr + Math.floor(Math.random()*9)-4));
      setHr(next);
      setHistory(h => [...h.slice(1), next]);
    }, 700);
    return () => clearInterval(t);
  }, [hr]);

  const zone = hr < 130 ? { name:"워밍업", c:"#86EFAC" }
    : hr < 145 ? { name:"유산소", c:"#7DD3FC" }
    : hr < 160 ? { name:"유산소+", c:"#FFD93D" }
    : hr < 170 ? { name:"무산소", c:"#FFB347" }
    : { name:"최대", c:"#FF6B8A" };

  const max = 175, min = 120;
  const pts = history.map((v,i) => {
    const x = 10 + i * 14;
    const y = 48 - ((v-min)/(max-min)) * 36;
    return `${x},${y}`;
  }).join(" ");
  const area = `${10},48 ${pts.split(" ").join(" ")} ${10+14*10},48`;

  return (
    <div style={{
      width:"100%", height:"100%",
      background:`linear-gradient(160deg, #150A14, #0A0810)`,
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:"10px 10px 8px", gap:4,
    }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:5, width:"100%" }}>
        <span style={{ fontSize:14, animation:"heartbeat 1s ease infinite" }}>❤️</span>
        <div>
          <div style={{ fontFamily:"var(--font-d)", fontSize:12, color:"var(--coral)" }}>심박수</div>
          <div style={{ fontSize:8, color:zone.c, fontWeight:700 }}>● {zone.name} 구간</div>
        </div>
        <div style={{ marginLeft:"auto" }}>
          <div style={{
            fontFamily:"var(--font-d)", fontSize:36, lineHeight:1,
            color: zone.c,
            filter:`drop-shadow(0 0 8px ${zone.c}66)`,
          }}>{hr}</div>
          <div style={{ fontSize:8, color:"var(--dim)", textAlign:"right" }}>bpm</div>
        </div>
      </div>

      {/* Waveform chart */}
      <div style={{
        width:"100%", flex:1, borderRadius:10,
        background:"rgba(255,255,255,0.03)",
        border:"1px solid rgba(255,255,255,0.05)",
        overflow:"hidden", position:"relative",
      }}>
        <svg width="100%" height="56" viewBox="0 0 170 56" preserveAspectRatio="none">
          <defs>
            <linearGradient id="hrg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={zone.c} stopOpacity="0.4"/>
              <stop offset="100%" stopColor={zone.c} stopOpacity="0"/>
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[130,145,160].map(v => {
            const y = 48-((v-min)/(max-min))*36;
            return <line key={v} x1="0" y1={y} x2="170" y2={y}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>;
          })}
          <polygon points={area} fill="url(#hrg)"/>
          <polyline points={pts} fill="none" stroke={zone.c} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
          {/* Latest dot */}
          <circle cx={10+14*10} cy={48-((history[history.length-1]-min)/(max-min))*36}
            r="3.5" fill={zone.c}/>
        </svg>

        {/* Zone labels */}
        <div style={{
          position:"absolute", right:6, top:4,
          display:"flex", flexDirection:"column", gap:3, alignItems:"flex-end",
        }}>
          {["175","160","145","130"].map(v => (
            <div key={v} style={{ fontSize:7, color:"rgba(255,255,255,0.2)",
              fontFamily:"var(--font-r)" }}>{v}</div>
          ))}
        </div>
      </div>

      {/* Zone progress bar */}
      <div style={{ width:"100%", height:6, borderRadius:3,
        background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
        {[
          { pct:20, c:"#86EFAC" }, { pct:20, c:"#7DD3FC" },
          { pct:20, c:"#FFD93D" }, { pct:20, c:"#FFB347" }, { pct:20, c:"#FF6B8A" },
        ].map((z,i) => (
          <div key={i} style={{
            display:"inline-block", width:`${z.pct}%`, height:"100%",
            background:z.c, borderRight:"1px solid rgba(0,0,0,0.3)",
          }}/>
        ))}
        {/* Indicator */}
        <div style={{
          position:"absolute", bottom:2,
          left:`${((hr-120)/(175-120))*100}%`,
          transform:"translateX(-50%)",
          width:6, height:10, background:"white", borderRadius:3,
          marginTop:-8,
          boxShadow:"0 2px 6px rgba(0,0,0,0.5)",
        }}/>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   SCREEN 6: NAVIGATION (턴바이턴)
────────────────────────────────────────────────── */
function ScreenNavigation() {
  const [step, setStep] = useState(0);
  const steps = [
    { dir:"⬆️", inst:"200m 직진", sub:"잠원한강공원 방면", prog:0.42 },
    { dir:"↰",  inst:"좌회전", sub:"자전거도로 따라", prog:0.48 },
    { dir:"⬆️", inst:"강변 따라", sub:"반환점까지 850m", prog:0.52 },
  ];
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s+1)%3), 2500);
    return () => clearInterval(t);
  }, []);
  const cur = steps[step];

  return (
    <div style={{
      width:"100%", height:"100%",
      background:"linear-gradient(160deg, #0A1420, #080E1C)",
      display:"flex", flexDirection:"column", padding:"10px", gap:6,
    }}>
      {/* Direction card */}
      <div style={{
        flex:1, borderRadius:16,
        background:"rgba(125,211,252,0.07)",
        border:"1px solid rgba(125,211,252,0.14)",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", gap:4,
        position:"relative", overflow:"hidden",
      }}>
        {/* BG blob */}
        <div style={{
          position:"absolute", width:80, height:80,
          borderRadius:"50%",
          background:"radial-gradient(circle, rgba(125,211,252,0.12), transparent 70%)",
        }}/>

        <div style={{ fontSize:38, lineHeight:1, position:"relative",
          filter:"drop-shadow(0 4px 12px rgba(125,211,252,0.4))",
          transition:"all 0.3s", animation:"float 2s ease infinite",
        }}>{cur.dir}</div>

        <div style={{
          fontFamily:"var(--font-d)", fontSize:15, color:"var(--sky)",
          textAlign:"center", lineHeight:1.1, transition:"all 0.3s",
        }}>{cur.inst}</div>
        <div style={{ fontSize:9, color:"var(--dim)", textAlign:"center" }}>{cur.sub}</div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
          <span style={{ fontSize:9, color:"var(--dim)" }}>진행률</span>
          <span style={{ fontSize:9, color:"var(--sky)", fontFamily:"var(--font-d)" }}>
            {(cur.prog*100).toFixed(0)}%
          </span>
        </div>
        <div style={{ height:5, borderRadius:3, background:"rgba(255,255,255,0.07)" }}>
          <div style={{
            height:"100%", borderRadius:3,
            background:"linear-gradient(90deg, var(--sky), var(--mint))",
            width:`${cur.prog*100}%`, transition:"width 0.5s ease",
            boxShadow:"0 0 8px rgba(0,229,195,0.5)",
          }}/>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:8, color:"var(--dim)" }}>남은 거리</div>
          <div style={{ fontFamily:"var(--font-d)", fontSize:14, color:"var(--white)" }}>2.7km</div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:8, color:"var(--dim)" }}>예상 도착</div>
          <div style={{ fontFamily:"var(--font-d)", fontSize:14, color:"var(--mint)" }}>16분</div>
        </div>
        <button style={{
          background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)",
          borderRadius:10, padding:"4px 10px", cursor:"pointer",
          color:"#FCA5A5", fontSize:9, fontFamily:"var(--font-r)", fontWeight:700,
        }}>■ 중단</button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   SCREEN 7: STATS OVERVIEW
────────────────────────────────────────────────── */
function ScreenStats() {
  const stats = [
    { day:"월", km:0, done:false },
    { day:"화", km:5.2, done:true },
    { day:"수", km:3.8, done:true },
    { day:"목", km:0, done:false },
    { day:"금", km:6.1, done:true },
    { day:"토", km:2.4, done:true },
    { day:"일", km:0, active:true },
  ];
  const maxKm = 7;

  return (
    <div style={{
      width:"100%", height:"100%",
      background:"linear-gradient(150deg, #0D1220, #090D18)",
      display:"flex", flexDirection:"column", padding:"10px", gap:5,
    }}>
      {/* Header with weekly total */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:9, color:"var(--dim)", fontWeight:700,
            letterSpacing:"0.06em", textTransform:"uppercase" }}>이번 주</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:3 }}>
            <span style={{
              fontFamily:"var(--font-d)", fontSize:28,
              background:"linear-gradient(135deg, var(--mint), var(--sky))",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>17.5</span>
            <span style={{ fontSize:10, color:"var(--dim)" }}>km</span>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:9, color:"rgba(255,211,61,0.7)", fontWeight:700 }}>🔥 4일 연속</div>
          <div style={{ fontSize:8, color:"var(--dim)", marginTop:2 }}>목표 20km</div>
          <div style={{
            height:4, width:60, borderRadius:2,
            background:"rgba(255,255,255,0.07)", marginTop:4,
            overflow:"hidden",
          }}>
            <div style={{
              height:"100%", width:"87.5%", borderRadius:2,
              background:"linear-gradient(90deg, var(--sun), var(--peach))",
            }}/>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{
        flex:1, display:"flex", alignItems:"flex-end", gap:4, padding:"0 2px",
      }}>
        {stats.map(s => (
          <div key={s.day} style={{
            flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", gap:3,
          }}>
            <div style={{
              width:"100%", borderRadius:"4px 4px 0 0",
              height: s.km > 0 ? `${(s.km/maxKm)*52}px` : 3,
              background: s.active
                ? "linear-gradient(180deg, rgba(255,107,138,0.3), rgba(255,107,138,0.1))"
                : s.done
                  ? "linear-gradient(180deg, var(--mint), rgba(0,229,195,0.4))"
                  : "rgba(255,255,255,0.06)",
              border: s.active ? "1px dashed rgba(255,107,138,0.4)" : "none",
              position:"relative", overflow: s.active ? "hidden" : "visible",
              transition:"height 0.5s ease",
            }}>
              {s.km > 0 && !s.active && (
                <div style={{
                  position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)",
                  fontSize:7, color:"var(--mint)", fontFamily:"var(--font-d)",
                  whiteSpace:"nowrap",
                }}>{s.km}</div>
              )}
              {s.active && (
                <div style={{
                  position:"absolute", inset:0,
                  background:"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,107,138,0.1) 3px, rgba(255,107,138,0.1) 4px)",
                }}/>
              )}
            </div>
            <div style={{ fontSize:8, color: s.active ? "var(--coral)" : "var(--dim)",
              fontWeight: s.active ? 800 : 600 }}>{s.day}</div>
          </div>
        ))}
      </div>

      {/* Today hint */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"center", gap:5,
        background:"rgba(255,107,138,0.08)",
        border:"1px solid rgba(255,107,138,0.15)",
        borderRadius:10, padding:"5px 10px",
      }}>
        <span style={{ fontSize:10 }}>🎯</span>
        <span style={{ fontSize:9, color:"rgba(255,107,138,0.8)", fontWeight:700 }}>
          오늘 2.5km 더 뛰면 목표 달성!
        </span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   SCREEN 8: CELEBRATION (완료)
────────────────────────────────────────────────── */
function ScreenComplete() {
  const confettis = Array.from({length:12}, (_,i) => ({
    left: `${10+i*7}%`,
    color: ["#FF6B8A","#00E5C3","#FFD93D","#C4B5FD","#7DD3FC","#FFB347"][i%6],
    delay: `${i*0.08}s`,
    size: 4+Math.random()*4,
  }));

  return (
    <div style={{
      width:"100%", height:"100%",
      background:"linear-gradient(160deg, #0C1522, #080D1A)",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"10px", gap:4,
      position:"relative", overflow:"hidden",
    }}>
      {/* Confetti */}
      {confettis.map((c,i) => (
        <div key={i} style={{
          position:"absolute", top:-5, left:c.left,
          width:c.size, height:c.size,
          background:c.color, borderRadius:c.size>6?1:"50%",
          animation:`confetti 1.5s ${c.delay} ease-out infinite`,
        }}/>
      ))}

      {/* Celebration emoji */}
      <div style={{ fontSize:36, animation:"float 1.5s ease infinite",
        filter:"drop-shadow(0 4px 12px rgba(255,211,61,0.5))" }}>🎉</div>

      {/* Title */}
      <div style={{ textAlign:"center" }}>
        <div style={{
          fontFamily:"var(--font-d)", fontSize:18,
          background:"linear-gradient(135deg, var(--sun), var(--coral))",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          lineHeight:1,
        }}>러닝 완료!</div>
        <div style={{ fontSize:8, color:"var(--dim)", marginTop:2 }}>한강 둔치 루프 완주 🏅</div>
      </div>

      {/* Result grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5, width:"100%" }}>
        {[
          { e:"📏", v:"5.21", u:"km",  c:"var(--coral)" },
          { e:"⏱️", v:"29:45", u:"",  c:"var(--lavender)" },
          { e:"👟", v:"5'42\"", u:"/km", c:"var(--mint)" },
          { e:"❤️", v:"154",  u:"bpm", c:"#FCA5A5" },
        ].map(s => (
          <div key={s.v} style={{
            background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:10, padding:"6px 8px",
            display:"flex", alignItems:"center", gap:5,
          }}>
            <span style={{ fontSize:12 }}>{s.e}</span>
            <div>
              <span style={{ fontFamily:"var(--font-d)", fontSize:13, color:s.c }}>{s.v}</span>
              {s.u && <span style={{ fontSize:7, color:"var(--dim)", marginLeft:2 }}>{s.u}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button style={{
        width:"85%", height:26, borderRadius:13, border:"none",
        background:"linear-gradient(135deg, var(--sun), var(--peach))",
        color:"#1A0A00", fontFamily:"var(--font-d)", fontSize:11,
        cursor:"pointer", letterSpacing:"0.04em",
        boxShadow:"0 5px 16px rgba(255,211,61,0.4)",
      }}>공유하기 ✨</button>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   SCREEN 9: AI LOADING (AI 분석 중)
────────────────────────────────────────────────── */
function ScreenAILoading() {
  const [step, setStep] = useState(0);
  const [dots, setDots] = useState(0);
  const steps = ["NLP 파싱","루트 생성","AI 스코어링","완료! 🎉"];

  useEffect(() => {
    const t = setInterval(() => {
      setStep(s => (s+1) % steps.length);
    }, 900);
    const d = setInterval(() => setDots(p => (p+1)%4), 300);
    return () => { clearInterval(t); clearInterval(d); };
  }, []);

  return (
    <div style={{
      width:"100%", height:"100%",
      background:"linear-gradient(160deg, #0A0F1E, #080D1A)",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"12px", gap:10,
      position:"relative", overflow:"hidden",
    }}>
      {/* Spinning rings */}
      <div style={{ position:"relative", width:70, height:70 }}>
        {[62,50,38].map((r,i) => (
          <svg key={i} width={70} height={70} style={{
            position:"absolute", inset:0,
            transform:`rotate(${i*60}deg)`,
            animation:`spin ${1.2+i*0.4}s linear infinite ${i%2?"reverse":""}`,
          }}>
            <circle cx={35} cy={35} r={r/2} fill="none"
              stroke={["var(--coral)","var(--mint)","var(--lavender)"][i]}
              strokeWidth="1.5" strokeDasharray={`${r*0.6} ${r*0.3}`}
              opacity={1-i*0.2}/>
          </svg>
        ))}
        {/* Center AI icon */}
        <div style={{
          position:"absolute", inset:0, display:"flex",
          alignItems:"center", justifyContent:"center",
          fontSize:22,
          filter:"drop-shadow(0 0 8px rgba(255,107,138,0.6))",
        }}>🤖</div>
      </div>

      <div style={{ textAlign:"center" }}>
        <div style={{
          fontFamily:"var(--font-d)", fontSize:13, color:"var(--white)",
          marginBottom:4,
        }}>AI 분석 중{".".repeat(dots)}</div>
        <div style={{
          fontSize:10, color:"var(--coral)", fontWeight:700,
          transition:"all 0.3s",
        }}>{steps[step]}</div>
      </div>

      {/* Step progress */}
      <div style={{ display:"flex", gap:4 }}>
        {steps.slice(0,-1).map((_,i) => (
          <div key={i} style={{
            width: i <= step ? 20 : 6, height:4, borderRadius:2,
            background: i < step ? "var(--mint)" : i===step ? "var(--coral)" : "rgba(255,255,255,0.1)",
            transition:"all 0.3s",
            boxShadow: i===step ? "0 0 8px var(--coral)" : "none",
          }}/>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────
   PAGE LAYOUT
────────────────────────────────────────────────── */
const SCREENS = [
  { key:"watchface",  label:"워치페이스",  badge:"홈",         C:ScreenWatchface,   color:"#FF6B8A" },
  { key:"setup",      label:"거리 설정",   badge:"설정",       C:ScreenRouteSetup,  color:"#FFB347" },
  { key:"detail",     label:"루트 상세",   badge:"루트",       C:ScreenRouteDetail, color:"#7DD3FC" },
  { key:"activerun",  label:"러닝 중",     badge:"라이브",     C:ScreenActiveRun,   color:"#00E5C3" },
  { key:"heartrate",  label:"심박수",      badge:"바이오",     C:ScreenHeartRate,   color:"#FCA5A5" },
  { key:"navigation", label:"내비게이션",  badge:"방향",       C:ScreenNavigation,  color:"#C4B5FD" },
  { key:"stats",      label:"주간 통계",   badge:"기록",       C:ScreenStats,       color:"#FFD93D" },
  { key:"complete",   label:"완주 축하",   badge:"완료",       C:ScreenComplete,    color:"#86EFAC" },
  { key:"ailoading",  label:"AI 분석",     badge:"AI",         C:ScreenAILoading,   color:"#FF6B8A" },
];

export default function App() {
  const [activeIdx, setActiveIdx] = useState(null);

  return (
    <>
      <style>{css}</style>

      <div style={{ minHeight:"100vh", padding:"0 0 60px" }}>

        {/* ── HERO HEADER ── */}
        <div style={{
          textAlign:"center", padding:"44px 20px 20px",
          background:"linear-gradient(to bottom, #0D1428, transparent)",
          position:"relative", overflow:"hidden",
        }}>
          {/* BG blobs */}
          <div style={{
            position:"absolute", top:-60, left:"20%", width:200, height:200,
            borderRadius:"50%",
            background:"radial-gradient(circle, rgba(255,107,138,0.1), transparent 70%)",
            pointerEvents:"none",
          }}/>
          <div style={{
            position:"absolute", top:-40, right:"15%", width:160, height:160,
            borderRadius:"50%",
            background:"radial-gradient(circle, rgba(0,229,195,0.08), transparent 70%)",
            pointerEvents:"none",
          }}/>

          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            background:"rgba(255,107,138,0.1)", border:"1px solid rgba(255,107,138,0.2)",
            borderRadius:20, padding:"4px 14px", marginBottom:14,
          }}>
            <span style={{ fontSize:12 }}>✨</span>
            <span style={{ fontSize:11, color:"var(--coral)", fontWeight:700,
              letterSpacing:"0.06em", textTransform:"uppercase" }}>
              Smartwatch UI Design
            </span>
          </div>

          <h1 style={{
            fontFamily:"var(--font-d)", fontSize:"clamp(32px,6vw,56px)",
            lineHeight:1, marginBottom:8,
            background:"linear-gradient(135deg, #FFFFFF 20%, rgba(255,107,138,0.9) 60%, rgba(0,229,195,0.8) 100%)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>
            RunRoute AI
          </h1>

          <p style={{
            fontSize:"clamp(12px,2vw,15px)", color:"rgba(255,255,255,0.35)",
            fontWeight:400, maxWidth:420, margin:"0 auto 6px",
            fontFamily:"var(--font-s)",
          }}>
            나이키 × 스트라바에서 영감받은 귀여운 스마트워치 UI
          </p>
          <p style={{
            fontSize:11, color:"rgba(255,107,138,0.5)", fontWeight:600,
            letterSpacing:"0.05em",
          }}>9 SCREENS · LIVE INTERACTIVE · KAWAII SPORTS</p>
        </div>

        {/* ── WATCH GRID ── */}
        <div style={{
          display:"flex", flexWrap:"wrap", justifyContent:"center",
          gap:"clamp(20px,4vw,36px)", padding:"20px clamp(16px,4vw,40px)",
        }}>
          {SCREENS.map((s, i) => {
            const Screen = s.C;
            const isActive = activeIdx === i;
            return (
              <div key={s.key} onClick={() => setActiveIdx(isActive ? null : i)}
                style={{
                  cursor:"pointer",
                  transform: isActive ? "scale(1.06)" : "scale(1)",
                  transition:"transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                  animation:`fadeUp 0.5s ${i*0.06}s ease both`,
                }}>
                <Watch
                  color={s.color}
                  size={176}
                  label={s.label}
                  badge={s.badge}
                >
                  <Screen/>
                </Watch>
                {isActive && (
                  <div style={{
                    marginTop:6, textAlign:"center",
                    fontSize:9, color:s.color, fontWeight:700,
                    letterSpacing:"0.04em", animation:"fadeUp 0.2s ease",
                  }}>탭하여 닫기</div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── DESIGN SYSTEM PREVIEW ── */}
        <div style={{
          maxWidth:760, margin:"20px auto 0",
          padding:"0 clamp(16px,4vw,40px)",
        }}>
          <div style={{
            background:"rgba(255,255,255,0.02)",
            border:"1px solid rgba(255,255,255,0.06)",
            borderRadius:20, padding:"24px 28px",
            animation:"fadeUp 0.6s 0.5s ease both",
          }}>
            <div style={{
              fontFamily:"var(--font-d)", fontSize:16, marginBottom:18,
              color:"rgba(255,255,255,0.5)", letterSpacing:"0.02em",
            }}>Design System</div>

            <div style={{ display:"flex", flexWrap:"wrap", gap:24 }}>
              {/* Colors */}
              <div>
                <div style={{ fontSize:10, color:"var(--dim)", fontWeight:700,
                  letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>
                  Color Palette
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {[
                    { name:"Coral",    hex:"#FF6B8A" },
                    { name:"Mint",     hex:"#00E5C3" },
                    { name:"Lavender", hex:"#C4B5FD" },
                    { name:"Sun",      hex:"#FFD93D" },
                    { name:"Sky",      hex:"#7DD3FC" },
                    { name:"Peach",    hex:"#FFB347" },
                  ].map(c => (
                    <div key={c.hex} style={{ textAlign:"center" }}>
                      <div style={{
                        width:32, height:32, borderRadius:10,
                        background:c.hex,
                        boxShadow:`0 4px 14px ${c.hex}55`,
                        marginBottom:4,
                      }}/>
                      <div style={{ fontSize:8, color:"var(--dim)" }}>{c.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Typography */}
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ fontSize:10, color:"var(--dim)", fontWeight:700,
                  letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>
                  Typography
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <div>
                    <span style={{ fontFamily:"var(--font-d)", fontSize:22,
                      background:"linear-gradient(135deg, var(--coral), var(--peach))",
                      WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                    }}>Fredoka One</span>
                    <span style={{ fontSize:9, color:"var(--dim)", marginLeft:8 }}>Display / Numbers</span>
                  </div>
                  <div>
                    <span style={{ fontFamily:"var(--font-r)", fontSize:14, fontWeight:700,
                      color:"rgba(255,255,255,0.8)" }}>Nunito Bold</span>
                    <span style={{ fontSize:9, color:"var(--dim)", marginLeft:8 }}>UI / Labels</span>
                  </div>
                  <div>
                    <span style={{ fontFamily:"var(--font-s)", fontSize:13, fontWeight:300,
                      color:"rgba(255,255,255,0.5)" }}>Nunito Sans Light</span>
                    <span style={{ fontSize:9, color:"var(--dim)", marginLeft:8 }}>Body / Sub</span>
                  </div>
                </div>
              </div>

              {/* Motion tags */}
              <div>
                <div style={{ fontSize:10, color:"var(--dim)", fontWeight:700,
                  letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>
                  Motion
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {["Float","Heartbeat","Runner Bounce","Confetti",
                    "Wave","Ring Progress","Shimmer"].map(m => (
                    <div key={m} style={{
                      background:"rgba(255,255,255,0.04)",
                      border:"1px solid rgba(255,255,255,0.07)",
                      borderRadius:20, padding:"3px 10px",
                      fontSize:9, color:"rgba(196,181,253,0.7)", fontWeight:600,
                    }}>{m}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FLOW DIAGRAM ── */}
        <div style={{
          maxWidth:760, margin:"16px auto 0",
          padding:"0 clamp(16px,4vw,40px)",
          animation:"fadeUp 0.6s 0.7s ease both",
        }}>
          <div style={{
            background:"rgba(255,255,255,0.02)",
            border:"1px solid rgba(255,255,255,0.06)",
            borderRadius:20, padding:"20px 28px",
          }}>
            <div style={{
              fontFamily:"var(--font-d)", fontSize:16, marginBottom:16,
              color:"rgba(255,255,255,0.5)",
            }}>User Flow</div>
            <div style={{ display:"flex", alignItems:"center", gap:0,
              overflowX:"auto", flexWrap:"wrap", rowGap:8 }}>
              {[
                { e:"⌚", l:"워치페이스", c:"#FF6B8A" },
                { e:"🎚️", l:"거리설정",  c:"#FFB347" },
                { e:"🤖", l:"AI분석",    c:"#FF6B8A" },
                { e:"🗺️", l:"루트선택",  c:"#7DD3FC" },
                { e:"▶️", l:"러닝시작",  c:"#00E5C3" },
                { e:"↰",  l:"내비게이션",c:"#C4B5FD" },
                { e:"🎉", l:"완주",      c:"#86EFAC" },
              ].map((s, i, arr) => (
                <div key={s.l} style={{ display:"flex", alignItems:"center" }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{
                      width:36, height:36, borderRadius:12,
                      background:`${s.c}18`,
                      border:`1px solid ${s.c}44`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:16, marginBottom:3,
                    }}>{s.e}</div>
                    <div style={{ fontSize:8, color:"var(--dim)", fontWeight:600,
                      whiteSpace:"nowrap" }}>{s.l}</div>
                  </div>
                  {i < arr.length-1 && (
                    <div style={{
                      width:16, height:1.5, background:"rgba(255,255,255,0.1)",
                      margin:"0 3px 10px",
                      borderRadius:1,
                    }}/>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
