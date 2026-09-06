import { useState } from 'react';
import { getSupabase } from '../lib/supabase';

// Magic-link sign-in gate for the dashboard. Supabase emails a one-time link;
// clicking it returns here with an authenticated session (detectSessionInUrl).
export function Login({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = getSupabase();
    if (!db || !email.trim()) return;
    setStatus('sending');
    const { error } = await db.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
    });
    if (error) {
      setStatus('error');
      setMessage(error.message);
    } else {
      setStatus('sent');
    }
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

        {status === 'sent' ? (
          <p style={{ marginTop: 18, lineHeight: 1.5 }}>
            Check <b>{email}</b> for a sign-in link. You can close this tab — open the link on this device to
            continue.
          </p>
        ) : (
          <form onSubmit={submit} style={{ marginTop: 18 }}>
            <label className="ins-label" htmlFor="login-email">
              Work email
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="ins-btn"
              style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 8, textTransform: 'none' }}
            />
            <button
              type="submit"
              className="ins-btn primary"
              disabled={status === 'sending'}
              style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}
            >
              {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            {status === 'error' && (
              <div style={{ marginTop: 10, color: 'var(--bad, #c0341d)', fontSize: 13 }}>{message}</div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
