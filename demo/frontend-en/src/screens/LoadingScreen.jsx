import { useState, useEffect } from 'react';

const steps = ['NLP Parsing', 'Generating Routes', 'AI Scoring', 'Selecting Best Route'];

export default function LoadingScreen() {
  const [step, setStep] = useState(0);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const t1 = setInterval(() => setStep(s => (s + 1) % steps.length), 1200);
    const t2 = setInterval(() => setDots(d => (d + 1) % 4), 350);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  return (
    <div className="screen" style={{
      background: 'linear-gradient(160deg, #0A0F1E, #080D1A)',
      alignItems: 'center', justifyContent: 'center', gap: 24,
    }}>
      {/* Spinning rings */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        {[100, 80, 60].map((r, i) => (
          <svg key={i} width={120} height={120} style={{
            position: 'absolute', inset: 0,
            transform: `rotate(${i * 60}deg)`,
            animation: `spin ${1.2 + i * 0.4}s linear infinite ${i % 2 ? 'reverse' : ''}`,
          }}>
            <circle cx={60} cy={60} r={r / 2} fill="none"
              stroke={['var(--coral)', 'var(--mint)', 'var(--lavender)'][i]}
              strokeWidth="2" strokeDasharray={`${r * 0.6} ${r * 0.3}`}
              opacity={1 - i * 0.2} />
          </svg>
        ))}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 40, filter: 'drop-shadow(0 0 12px rgba(255,107,138,0.6))',
        }}>🤖</div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: 22, color: 'var(--white)',
          marginBottom: 8,
        }}>AI Analyzing{'.'.repeat(dots)}</div>
        <div style={{
          fontSize: 15, color: 'var(--coral)', fontWeight: 700,
          transition: 'all 0.3s',
        }}>{steps[step]}</div>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 6 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: i <= step ? 28 : 8, height: 5, borderRadius: 3,
            background: i < step ? 'var(--mint)' : i === step ? 'var(--coral)' : 'rgba(255,255,255,0.1)',
            transition: 'all 0.3s',
            boxShadow: i === step ? '0 0 10px var(--coral)' : 'none',
          }} />
        ))}
      </div>
    </div>
  );
}
