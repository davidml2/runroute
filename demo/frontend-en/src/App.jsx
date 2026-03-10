import { useState } from 'react';
import SetupScreen from './screens/SetupScreen';
import LoadingScreen from './screens/LoadingScreen';
import RouteListScreen from './screens/RouteListScreen';
import NavigationScreen from './screens/NavigationScreen';
import CompleteScreen from './screens/CompleteScreen';
import './App.css';

function App() {
  const [screen, setScreen] = useState('setup');
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [session, setSession] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [location, setLocation] = useState(null);

  const API = '';

  const handleRecommend = async (params) => {
    setScreen('loading');
    try {
      const res = await fetch(`${API}/api/v1/routes/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      setRoutes(data.routes || []);
      setLocation({ lat: params.lat, lng: params.lng });
      setScreen('route_list');
    } catch (err) {
      console.error(err);
      alert('Route recommendation failed. Please check the server.');
      setScreen('setup');
    }
  };

  const handleSelectRoute = (route) => {
    setSelectedRoute(route);
    setSession({ id: `session_${Date.now()}`, started_at: new Date() });
    setScreen('navigation');
  };

  const handleComplete = (result) => {
    setRunResult(result);
    setScreen('complete');
  };

  const handleReset = () => {
    setRoutes([]);
    setSelectedRoute(null);
    setSession(null);
    setRunResult(null);
    setScreen('setup');
  };

  return (
    <div className="app">
      {screen === 'setup' && <SetupScreen onRecommend={handleRecommend} />}
      {screen === 'loading' && <LoadingScreen />}
      {screen === 'route_list' && (
        <RouteListScreen
          routes={routes}
          location={location}
          onSelect={handleSelectRoute}
          onBack={() => setScreen('setup')}
        />
      )}
      {screen === 'navigation' && (
        <NavigationScreen
          route={selectedRoute}
          session={session}
          location={location}
          onComplete={handleComplete}
        />
      )}
      {screen === 'complete' && (
        <CompleteScreen result={runResult} route={selectedRoute} onReset={handleReset} />
      )}
    </div>
  );
}

export default App;
