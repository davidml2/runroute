import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findClosestPointIndex(lat, lng, coords) {
  let minDist = Infinity, idx = 0;
  for (let i = 0; i < coords.length; i++) {
    const d = haversine(lat, lng, coords[i][1], coords[i][0]);
    if (d < minDist) { minDist = d; idx = i; }
  }
  return { index: idx, distance: minDist };
}

function getDirection(fromLat, fromLng, toLat, toLng) {
  const dLng = (toLng - fromLng) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(toLat * Math.PI / 180);
  const x = Math.cos(fromLat * Math.PI / 180) * Math.sin(toLat * Math.PI / 180) -
    Math.sin(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) * Math.cos(dLng);
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;

  if (bearing < 45 || bearing >= 315) return { icon: '⬆️', text: '직진' };
  if (bearing < 135) return { icon: '➡️', text: '우회전' };
  if (bearing < 225) return { icon: '⬇️', text: '유턴' };
  return { icon: '⬅️', text: '좌회전' };
}

export default function NavigationScreen({ route, session, location, onComplete }) {
  const [seconds, setSeconds] = useState(0);
  const [currentPos, setCurrentPos] = useState(null);
  const [distance, setDistance] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [navInstruction, setNavInstruction] = useState({ icon: '⬆️', text: '출발 준비', sub: 'GPS 연결 중...' });
  const [isPaused, setIsPaused] = useState(false);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const userMarker = useRef(null);
  const prevPos = useRef(null);
  const distRef = useRef(0);
  const watchId = useRef(null);

  const totalKm = route.distance_km;
  const routeCoords = route.geometry?.coordinates || [];

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const startLat = location?.lat || 37.5665;
    const startLng = location?.lng || 126.978;

    const map = L.map(mapRef.current, {
      center: [startLat, startLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Draw route
    if (routeCoords.length > 0) {
      const coords = routeCoords.map(c => [c[1], c[0]]);
      L.polyline(coords, { color: '#7DD3FC', weight: 5, opacity: 0.7 }).addTo(map);
    }

    // Start marker
    L.circleMarker([startLat, startLng], {
      radius: 6, fillColor: '#00E5C3', fillOpacity: 1, color: '#00E5C3', weight: 2,
    }).addTo(map);

    // User position marker
    const marker = L.circleMarker([startLat, startLng], {
      radius: 10, fillColor: '#FF6B8A', fillOpacity: 1, color: '#FFFFFF', weight: 3,
    }).addTo(map);
    userMarker.current = marker;

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Timer
  useEffect(() => {
    if (isPaused) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isPaused]);

  // GPS tracking
  useEffect(() => {
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentPos({ lat: latitude, lng: longitude });

        // Update marker
        if (userMarker.current) {
          userMarker.current.setLatLng([latitude, longitude]);
        }
        if (mapInstance.current) {
          mapInstance.current.panTo([latitude, longitude], { animate: true, duration: 0.5 });
        }

        // Calculate distance
        if (prevPos.current && !isPaused) {
          const d = haversine(prevPos.current.lat, prevPos.current.lng, latitude, longitude);
          if (d > 2 && d < 100) { // filter noise
            distRef.current += d;
            setDistance(distRef.current);
          }
        }
        prevPos.current = { lat: latitude, lng: longitude };

        // Progress & navigation
        if (routeCoords.length > 0) {
          const { index, distance: offDist } = findClosestPointIndex(latitude, longitude, routeCoords);
          const prog = index / (routeCoords.length - 1);
          setProgress(prog);
          setIsOffRoute(offDist > 50);

          // Next instruction
          const lookAhead = Math.min(index + Math.floor(routeCoords.length * 0.05), routeCoords.length - 1);
          if (lookAhead > index) {
            const dir = getDirection(
              routeCoords[index][1], routeCoords[index][0],
              routeCoords[lookAhead][1], routeCoords[lookAhead][0]
            );
            const distToNext = haversine(latitude, longitude, routeCoords[lookAhead][1], routeCoords[lookAhead][0]);
            setNavInstruction({
              icon: dir.icon,
              text: dir.text,
              sub: `${Math.round(distToNext)}m 후`,
            });
          }
        }
      },
      (err) => console.error('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [isPaused]);

  const km = distance / 1000;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  const pace = km > 0.01 ? seconds / km : 0;
  const paceMin = Math.floor(pace / 60);
  const paceSec = Math.floor(pace % 60);
  const remaining = Math.max(0, totalKm - km);
  const progressPct = Math.min(1, km / totalKm);
  const circ = 2 * Math.PI * 70;

  const handleFinish = () => {
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    onComplete({
      distance_km: parseFloat(km.toFixed(2)),
      duration_sec: seconds,
      avg_pace: `${paceMin}'${String(paceSec).padStart(2, '0')}"`,
      avg_hr: Math.floor(140 + Math.random() * 20),
    });
  };

  return (
    <div className="screen" style={{ background: 'linear-gradient(160deg, #0C1422, #080D18)', position: 'relative' }}>
      {/* Map (top half) */}
      <div ref={mapRef} style={{ height: '35%', minHeight: 180 }} />

      {/* Off-route warning */}
      {isOffRoute && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(239,68,68,0.9)', borderRadius: 20, padding: '6px 16px',
          display: 'flex', alignItems: 'center', gap: 6, zIndex: 1000,
        }}>
          <span>⚠️</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>루트 이탈</span>
        </div>
      )}

      {/* Navigation instruction */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 20px',
        background: 'rgba(125,211,252,0.07)',
        borderBottom: '1px solid rgba(125,211,252,0.1)',
      }}>
        <div style={{
          fontSize: 36, animation: 'float 2s ease infinite',
          filter: 'drop-shadow(0 4px 12px rgba(125,211,252,0.4))',
        }}>{navInstruction.icon}</div>
        <div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 20, color: 'var(--sky)' }}>
            {navInstruction.text}
          </div>
          <div style={{ fontSize: 12, color: 'var(--dim)' }}>{navInstruction.sub}</div>
        </div>
      </div>

      {/* Central ring + stats */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 20px' }}>
        {/* Progress ring */}
        <div style={{ position: 'relative', width: 150, height: 150 }}>
          <svg width={150} height={150} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
            <circle cx={75} cy={75} r={70} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5} />
            <circle cx={75} cy={75} r={70} fill="none"
              stroke="url(#runGrad)" strokeWidth={5} strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progressPct)}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
            <defs>
              <linearGradient id="runGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FF6B8A" />
                <stop offset="60%" stopColor="#FFB347" />
                <stop offset="100%" stopColor="#FFD93D" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'var(--dim)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>완료</div>
            <div style={{
              fontFamily: "'Fredoka One', cursive", fontSize: 36, lineHeight: 1,
              background: 'linear-gradient(135deg, var(--coral), var(--peach))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{km.toFixed(2)}</div>
            <div style={{ fontSize: 10, color: 'var(--dim)', fontWeight: 700 }}>/ {totalKm} km</div>
            <div style={{ fontSize: 18, marginTop: 2, animation: 'runnerBounce 0.5s ease infinite' }}>🏃‍♀️</div>
          </div>
        </div>

        {/* Time + Pace */}
        <div style={{
          display: 'flex', width: '100%', borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingTop: 12,
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(196,181,253,0.6)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>시간</div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 26, color: 'var(--lavender)', fontVariantNumeric: 'tabular-nums' }}>
              {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
            </div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(0,229,195,0.6)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>페이스</div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 26, color: 'var(--mint)' }}>
              {km > 0.01 ? `${paceMin}'${String(paceSec).padStart(2, '0')}"` : "--'--\""}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--dim)' }}>진행률</span>
            <span style={{ fontSize: 10, color: 'var(--sky)', fontFamily: "'Fredoka One', cursive" }}>
              {Math.round(progressPct * 100)}%
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: 'linear-gradient(90deg, var(--sky), var(--mint))',
              width: `${progressPct * 100}%`, transition: 'width 0.5s ease',
              boxShadow: '0 0 8px rgba(0,229,195,0.5)',
            }} />
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div style={{ display: 'flex', gap: 12, padding: '12px 20px 32px' }}>
        <button className="btn-secondary" style={{ flex: 1 }}
          onClick={() => setIsPaused(!isPaused)}>
          {isPaused ? '▶ 재개' : '⏸ 일시정지'}
        </button>
        <button className="btn-danger" style={{ flex: 1 }} onClick={handleFinish}>
          ■ 러닝 종료
        </button>
      </div>
    </div>
  );
}
