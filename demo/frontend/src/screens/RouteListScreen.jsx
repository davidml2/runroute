import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function RouteListScreen({ routes, location, onSelect, onBack }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: [location.lat, location.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Start marker
    L.circleMarker([location.lat, location.lng], {
      radius: 8, fillColor: '#FF6B8A', fillOpacity: 1, color: '#FF6B8A', weight: 2, opacity: 0.5,
    }).addTo(map);

    // Draw first route
    if (routes.length > 0 && routes[0].geometry) {
      const coords = routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      L.polyline(coords, { color: '#7DD3FC', weight: 4, opacity: 0.8 }).addTo(map);
      if (coords.length > 0) {
        map.fitBounds(L.latLngBounds(coords).pad(0.15));
      }
    }

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, [location, routes]);

  // Show route on map when tapped
  const showRouteOnMap = (route, color) => {
    if (!mapInstance.current || !route.geometry) return;
    // Clear existing layers except tile
    mapInstance.current.eachLayer(layer => {
      if (layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
        mapInstance.current.removeLayer(layer);
      }
    });
    // Redraw start
    L.circleMarker([location.lat, location.lng], {
      radius: 8, fillColor: '#FF6B8A', fillOpacity: 1, color: '#FF6B8A', weight: 2, opacity: 0.5,
    }).addTo(mapInstance.current);

    const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
    L.polyline(coords, { color, weight: 4, opacity: 0.8 }).addTo(mapInstance.current);
    if (coords.length > 0) {
      mapInstance.current.fitBounds(L.latLngBounds(coords).pad(0.15));
    }
  };

  const routeColors = ['#7DD3FC', '#00E5C3', '#C4B5FD'];

  return (
    <div className="screen" style={{ background: 'linear-gradient(160deg, #0B1520, #080D1E)' }}>
      {/* Header */}
      <div className="header">
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: 'var(--dim)', fontSize: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700,
        }}>
          ← 뒤로
        </button>
        <span className="header-title">추천 루트</span>
        <div style={{ width: 60 }} />
      </div>

      {/* Map */}
      <div className="fade-up" style={{ padding: '0 16px', marginBottom: 12 }}>
        <div className="map-container" ref={mapRef} style={{ height: 200 }} />
      </div>

      {/* Route List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 20px' }}>
        {routes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--dim)' }}>
            추천 루트가 없습니다. 다시 시도해주세요.
          </div>
        ) : (
          routes.map((route, i) => (
            <div key={route.id}
              className="card fade-up"
              style={{
                marginBottom: 12,
                cursor: 'pointer',
                animationDelay: `${i * 0.1}s`,
                transition: 'transform 0.15s',
              }}
              onClick={() => showRouteOnMap(route, routeColors[i])}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: `${routeColors[i]}AA`, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    추천 #{i + 1}
                  </div>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 18, color: 'var(--white)', lineHeight: 1.2 }}>
                    {route.name}
                  </div>
                </div>
                {/* Score ring */}
                <div style={{ position: 'relative', width: 50, height: 50 }}>
                  <svg width={50} height={50} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={25} cy={25} r={21} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={3} />
                    <circle cx={25} cy={25} r={21} fill="none"
                      stroke={routeColors[i]} strokeWidth={3} strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 21}
                      strokeDashoffset={2 * Math.PI * 21 * (1 - route.total_score / 100)}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Fredoka One', cursive", fontSize: 14, color: routeColors[i],
                  }}>{route.total_score}</div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { emoji: '📏', value: `${route.distance_km}`, unit: 'km', color: 'var(--sky)' },
                  { emoji: '⏱️', value: `${route.duration_min}`, unit: 'min', color: 'var(--mint)' },
                  { emoji: '⬆️', value: `+${route.elevation_gain}`, unit: 'm', color: 'var(--lavender)' },
                ].map(s => (
                  <div key={s.unit} style={{
                    background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '8px 4px', textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ fontSize: 14 }}>{s.emoji}</div>
                    <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 16, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: 'var(--dim)' }}>{s.unit}</div>
                  </div>
                ))}
              </div>

              {/* Start button */}
              <button className="btn-start" style={{ height: 44, fontSize: 15 }}
                onClick={(e) => { e.stopPropagation(); onSelect(route); }}>
                ▶ 시작하기
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
