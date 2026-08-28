import { lazy, Suspense, useEffect, useState } from 'react';
import { Stage } from './components/Stage';

// The dashboard (and its Supabase client) is lazy-loaded so it stays out of the
// kiosk's initial bundle — the booth PWA ships lean. Auth gating lives inside
// InsightsApp: in live mode it requires a Supabase magic-link session.
const InsightsApp = lazy(() => import('./insights/InsightsApp').then((m) => ({ default: m.InsightsApp })));

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
  if (hash.startsWith('#/insights')) {
    return (
      <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#0b0d12' }} />}>
        <InsightsApp />
      </Suspense>
    );
  }
  return <Stage />;
}

export default App;
