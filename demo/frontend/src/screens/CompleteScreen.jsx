const confettis = Array.from({ length: 16 }, (_, i) => ({
  left: `${5 + i * 6}%`,
  color: ['#FF6B8A', '#00E5C3', '#FFD93D', '#C4B5FD', '#7DD3FC', '#FFB347'][i % 6],
  delay: `${i * 0.08}s`,
  size: 5 + Math.random() * 6,
}));

export default function CompleteScreen({ result, route, onReset }) {
  const durationMin = Math.floor(result.duration_sec / 60);
  const durationSec = result.duration_sec % 60;

  return (
    <div className="screen" style={{
      background: 'linear-gradient(160deg, #0C1522, #080D1A)',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', gap: 16, position: 'relative', overflow: 'hidden',
    }}>
      {/* Confetti */}
      {confettis.map((c, i) => (
        <div key={i} style={{
          position: 'absolute', top: -10, left: c.left,
          width: c.size, height: c.size,
          background: c.color, borderRadius: c.size > 7 ? 2 : '50%',
          animation: `confetti 2s ${c.delay} ease-out infinite`,
        }} />
      ))}

      {/* Celebration */}
      <div style={{ fontSize: 56, animation: 'float 1.5s ease infinite', filter: 'drop-shadow(0 4px 16px rgba(255,211,61,0.5))' }}>
        🎉
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: 32,
          background: 'linear-gradient(135deg, var(--sun), var(--coral))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1, marginBottom: 6,
        }}>러닝 완료!</div>
        <div style={{ fontSize: 14, color: 'var(--dim)' }}>
          {route?.name || '루트'} 완주 🏅
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 340 }}>
        {[
          { emoji: '📏', value: `${result.distance_km}`, unit: 'km', color: 'var(--coral)' },
          { emoji: '⏱️', value: `${durationMin}:${String(durationSec).padStart(2, '0')}`, unit: '', color: 'var(--lavender)' },
          { emoji: '👟', value: result.avg_pace, unit: '/km', color: 'var(--mint)' },
          { emoji: '❤️', value: `${result.avg_hr}`, unit: 'bpm', color: '#FCA5A5' },
        ].map(s => (
          <div key={s.value} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{s.emoji}</span>
            <div>
              <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 18, color: s.color }}>{s.value}</span>
              {s.unit && <span style={{ fontSize: 10, color: 'var(--dim)', marginLeft: 3 }}>{s.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <button style={{
          width: '100%', height: 52, borderRadius: 26, border: 'none',
          background: 'linear-gradient(135deg, var(--sun), var(--peach))',
          color: '#1A0A00', fontFamily: "'Fredoka One', cursive", fontSize: 16,
          cursor: 'pointer', boxShadow: '0 5px 20px rgba(255,211,61,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          공유하기 ✨
        </button>
        <button className="btn-secondary" style={{ width: '100%' }} onClick={onReset}>
          🏠 홈으로
        </button>
      </div>
    </div>
  );
}
