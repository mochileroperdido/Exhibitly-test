import { useEffect, useState } from 'react';
import { Stage } from './components/Stage';
import { InsightsApp } from './insights/InsightsApp';

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

function App() {
  const hash = useHash();
  // Demo shortcut: #/insights opens the dashboard. In production the dashboard
  // is a separate team URL, not reachable from the booth kiosk.
  if (hash.startsWith('#/insights')) return <InsightsApp />;
  return <Stage />;
}

export default App;
