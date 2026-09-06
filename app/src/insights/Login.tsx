import { useState } from 'react';
import { getSupabase } from '../lib/supabase';

// Email + password sign-in for the dashboard. Accounts are created in Supabase
// (invite-only); there's no public sign-up here. Password login sends no email,
// so it isn't subject to the magic-link rate limit.
export function Login({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'signing' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = getSupabase();
    if (!db || !email.trim() || !password) return;
    setStatus('signing');
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setStatus('error');
      setMessage(error.message);
    }
    // On success, onAuthStateChange in InsightsApp swaps in the dashboard.
  };

  return (
    <div className="ins" data-theme={theme} style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div className="ins-panel" style={{ width: 'min(400px, 92vw)', padding: 28 }}>
        <div className="ins-brand" style={{ marginBottom: 6 }}>
          <div className="ins-mk">L</div>
          <div>
            <h1 style={{ margin: 0 }}>Lathe Insights</h1>
            <div className="meta">SIGN IN TO VIEW YOUR SHOW</div>
          </div>
        </div>

        <form onSubmit={submit} style={{ marginTop: 18 }}>
          <label className="ins-label" htmlFor="login-email">Work email</label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="ins-btn"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 8, textTransform: 'none' }}
          />

          <label className="ins-label" htmlFor="login-password" style={{ display: 'block', marginTop: 14 }}>Password</label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="ins-btn"
            style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 8, textTransform: 'none' }}
          />

          <button
            type="submit"
            className="ins-btn primary"
            disabled={status === 'signing'}
            style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
          >
            {status === 'signing' ? 'Signing in…' : 'Sign in'}
          </button>
          {status === 'error' && (
            <div style={{ marginTop: 10, color: 'var(--bad, #c0341d)', fontSize: 13 }}>{message}</div>
          )}
        </form>
      </div>
    </div>
  );
}
