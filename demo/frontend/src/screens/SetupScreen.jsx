import { useState, useEffect } from 'react';

const terrains = [
  { id: 'park', emoji: '🌳', label: '공원', color: '#86EFAC' },
  { id: 'riverside', emoji: '🏞️', label: '강변', color: '#7DD3FC' },
  { id: 'urban', emoji: '🏙️', label: '도심', color: '#C4B5FD' },
  { id: 'mountain', emoji: '⛰️', label: '산', color: '#FCA5A5' },
  { id: 'beach', emoji: '🏖️', label: '해변', color: '#FFD93D' },
];

const difficulties = [
  { id: 'easy', label: '쉬움', emoji: '😊' },
  { id: 'moderate', label: '보통', emoji: '💪' },
  { id: 'hard', label: '힘듦', emoji: '🔥' },
];

export default function SetupScreen({ onRecommend }) {
  const [distance, setDistance] = useState(5);
  const [selectedTerrain, setSelectedTerrain] = useState('park');
  const [difficulty, setDifficulty] = useState('easy');
  const [gpsStatus, setGpsStatus] = useState('waiting'); // waiting, acquiring, ready, error
  const [coords, setCoords] = useState(null);
  const [cityName, setCityName] = useState('');

  useEffect(() => {
    setGpsStatus('acquiring');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setGpsStatus('ready');
        // Reverse geocode
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ko`)
          .then(r => r.json())
          .then(data => {
            const addr = data.address || {};
            setCityName(addr.city || addr.town || addr.county || addr.state || '현재 위치');
          })
          .catch(() => setCityName('현재 위치'));
      },
      (err) => {
        console.error('GPS error:', err);
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleSubmit = () => {
    if (!coords) {
      alert('GPS 위치를 확인 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    onRecommend({
      lat: coords.lat,
      lng: coords.lng,
      distance_km: distance,
      terrains: [selectedTerrain],
      difficulty,
    });
  };

  return (
    <div className="screen" style={{ background: 'linear-gradient(160deg, #0D1428, #080D1E)' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '40px 20px 10px' }}>
        <div style={{ fontSize: 40, animation: 'runnerBounce 0.7s ease infinite', marginBottom: 8 }}>🏃‍♀️</div>
        <h1 style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: 32,
          background: 'linear-gradient(135deg, #FFFFFF 20%, var(--coral) 60%, var(--mint))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 4,
        }}>RunRoute AI</h1>
        <p style={{ fontSize: 13, color: 'var(--dim)' }}>AI 러닝 루트 추천</p>
      </div>

      {/* GPS Status */}
      <div className="fade-up" style={{ padding: '8px 20px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 14px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: gpsStatus === 'ready' ? 'var(--mint)' : gpsStatus === 'error' ? '#EF4444' : 'var(--sun)',
            boxShadow: gpsStatus === 'ready' ? '0 0 8px var(--mint)' : 'none',
            animation: gpsStatus === 'acquiring' ? 'pulse 1s infinite' : 'none',
          }} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
            {gpsStatus === 'ready' ? `📍 ${cityName}` :
             gpsStatus === 'acquiring' ? '위치 확인 중...' :
             gpsStatus === 'error' ? 'GPS 오류 - 위치 권한을 확인해주세요' : '대기 중...'}
          </span>
        </div>
      </div>

      {/* Distance Selector */}
      <div className="fade-up-1" style={{ padding: '16px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--coral)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          거리 설정
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <button onClick={() => setDistance(Math.max(1, distance - 1))} style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none',
            background: 'rgba(255,107,138,0.15)', color: 'var(--coral)',
            fontSize: 24, cursor: 'pointer', fontWeight: 900,
          }}>−</button>
          <div style={{ minWidth: 100, textAlign: 'center' }}>
            <div style={{
              fontFamily: "'Fredoka One', cursive", fontSize: 64, lineHeight: 1,
              background: 'linear-gradient(135deg, var(--coral), var(--peach))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{distance}</div>
            <div style={{ fontSize: 14, color: 'var(--dim)', fontWeight: 700, letterSpacing: '0.1em' }}>KM</div>
          </div>
          <button onClick={() => setDistance(Math.min(30, distance + 1))} style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none',
            background: 'rgba(255,107,138,0.15)', color: 'var(--coral)',
            fontSize: 24, cursor: 'pointer', fontWeight: 900,
          }}>+</button>
        </div>
        {/* Distance dots */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 12 }}>
          {[1, 3, 5, 10, 15, 20, 25, 30].map(v => (
            <div key={v} onClick={() => setDistance(v)} style={{
              height: v <= distance ? 6 : 4,
              width: v <= distance ? 18 : 10,
              borderRadius: 3, cursor: 'pointer',
              background: v <= distance
                ? 'linear-gradient(90deg, var(--coral), var(--peach))'
                : 'rgba(255,255,255,0.1)',
              transition: 'all 0.2s',
            }} />
          ))}
        </div>
      </div>

      {/* Terrain Selector */}
      <div className="fade-up-2" style={{ padding: '8px 20px' }}>
        <div style={{ fontSize: 12, color: 'var(--sky)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
          지형 선택
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {terrains.map(t => (
            <button key={t.id}
              onClick={() => setSelectedTerrain(t.id)}
              style={{
                width: 64, height: 72, borderRadius: 18,
                border: `1.5px solid ${selectedTerrain === t.id ? t.color : 'rgba(255,255,255,0.08)'}`,
                background: selectedTerrain === t.id ? `${t.color}18` : 'rgba(255,255,255,0.04)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 4,
                transition: 'all 0.15s',
                boxShadow: selectedTerrain === t.id ? `0 4px 14px ${t.color}40` : 'none',
              }}>
              <span style={{ fontSize: 24 }}>{t.emoji}</span>
              <span style={{ fontSize: 10, color: selectedTerrain === t.id ? t.color : 'var(--dim)', fontWeight: 700 }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="fade-up-2" style={{ padding: '12px 20px' }}>
        <div style={{ fontSize: 12, color: 'var(--lavender)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
          난이도
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {difficulties.map(d => (
            <button key={d.id}
              onClick={() => setDifficulty(d.id)}
              className={`chip ${difficulty === d.id ? 'active' : ''}`}
              style={{ flex: 1, maxWidth: 110 }}>
              <span>{d.emoji}</span> {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Submit Button */}
      <div className="fade-up-3" style={{ padding: '16px 20px 32px' }}>
        <button className="btn-primary" onClick={handleSubmit}
          disabled={gpsStatus !== 'ready'}
          style={{ opacity: gpsStatus === 'ready' ? 1 : 0.5 }}>
          <span>🔍</span> AI 루트 추천받기
        </button>
      </div>
    </div>
  );
}
