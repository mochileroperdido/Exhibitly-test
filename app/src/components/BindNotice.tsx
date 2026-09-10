import { useEffect, useState } from 'react';
import { getKioskKey, boundFromLink } from '../lib/kioskKey';

// Booth-facing "am I set up correctly?" banner. On live mode (a kiosk key is
// present), it calls /api/whoami once and shows either "Connected to
// <Event> · <Tablet>" or an explicit error. Without this, a wrong key / server
// misconfig / revoked tablet all fail silently — the booth captures nothing and
// no one knows why.
//
// Auto-dismiss on success (fresh binds linger a bit longer so booth staff read
// them); errors stay put until dismissed so they don't hide the problem.

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; event: string; tablet: string }
  | { kind: 'err'; message: string };

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

export function BindNotice() {
  const key = getKioskKey();
  const fresh = boundFromLink();
  const [state, setState] = useState<State>(key ? { kind: 'loading' } : { kind: 'idle' });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/whoami`, { headers: { 'X-Kiosk-Key': key } });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { event?: string; tablet?: string };
          setState({ kind: 'ok', event: data.event || 'this event', tablet: data.tablet || 'this tablet' });
        } else {
          const msg =
            res.status === 401
              ? 'This tablet link is invalid or was revoked.'
              : res.status === 500
                ? "Server can't reach the database — check Vercel env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
                : `Setup check failed (HTTP ${res.status}).`;
          setState({ kind: 'err', message: msg });
        }
      } catch (e) {
        if (!cancelled) setState({ kind: 'err', message: `Setup check failed: ${(e as Error).message}` });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Auto-dismiss success after a while; fresh binds get longer so staff read them.
  useEffect(() => {
    if (state.kind !== 'ok') return;
    const t = setTimeout(() => setDismissed(true), fresh ? 8000 : 3500);
    return () => clearTimeout(t);
  }, [state.kind, fresh]);

  if (state.kind === 'idle' || state.kind === 'loading' || dismissed) return null;

  const isErr = state.kind === 'err';
  return (
    <div
      role={isErr ? 'alert' : 'status'}
      onClick={() => isErr || setDismissed(true)}
      className={
        'fixed left-1/2 -translate-x-1/2 top-3 z-[60] max-w-[92vw] min-w-[260px] px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg backdrop-blur-md ' +
        (isErr ? 'bg-red-600/90 text-white' : 'bg-emerald-600/90 text-white cursor-pointer')
      }
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {state.kind === 'ok' ? (
        <span>
          Connected to <b>{state.event}</b> · <b>{state.tablet}</b>
        </span>
      ) : (
        <span>{state.message}</span>
      )}
      {isErr && (
        <button
          onClick={() => setDismissed(true)}
          className="ml-3 underline underline-offset-2 opacity-80"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
