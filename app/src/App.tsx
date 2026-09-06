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

// One build serves both surfaces; the hostname decides which. A `dashboard.` /
// `app.` host is always the dashboard; a `kiosk.` host is always the kiosk and
// refuses the dashboard route entirely, so a shared booth tablet can never reach
// the login. Any other host (Vercel previews, the apex) falls back to the hash
// route so `#/insights` keeps working for local dev and preview testing.
function surfaceForHost(host: string, hash: string): 'dashboard' | 'kiosk' {
  if (host.startsWith('dashboard.') || host.startsWith('app.')) return 'dashboard';
  if (host.startsWith('kiosk.')) return 'kiosk';
  return hash.startsWith('#/insights') || hash.startsWith('#/e/') ? 'dashboard' : 'kiosk';
}

function App() {
  const hash = useHash();
  if (surfaceForHost(window.location.hostname, hash) === 'dashboard') {
    return (
      <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#0b0d12' }} />}>
        <InsightsApp />
      </Suspense>
    );
  }
  return <Stage />;
}

export default App;
