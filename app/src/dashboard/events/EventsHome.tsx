import { useCallback, useEffect, useState } from 'react';
import { listShows, eventStats, createShow, type Show } from './shows';

// The "projects" screen: every event as a card, plus New event. Entering a card
// opens its detail view.
export function EventsHome({ onOpen }: { onOpen: (id: string) => void }) {
  const [shows, setShows] = useState<Show[] | null>(null);
  const [stats, setStats] = useState<Record<string, { leads: number; sessions: number }>>({});
  const [newOpen, setNewOpen] = useState(false);
  const [err, setErr] = useState('');

  const refresh = useCallback(async () => {
    try {
      const list = await listShows();
      setShows(list);
      const entries = await Promise.all(list.map(async (s) => [s.id, await eventStats(s.id)] as const));
      setStats(Object.fromEntries(entries));
    } catch (e) {
      setErr((e as Error)?.message ?? 'Failed to load events');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="ins-page">
      <div className="ins-pagehead">
        <div>
          <h1 className="ins-h1">Events</h1>
          <p className="ins-sub">Each event has its own tablets and insights.</p>
        </div>
        <button className="ins-btn primary" onClick={() => setNewOpen(true)}>New event</button>
      </div>

      {err && <div className="ins-panel" style={{ color: 'var(--bad, #c0341d)' }}>{err}</div>}

      {shows === null ? (
        <div className="ins-sub">Loading…</div>
      ) : shows.length === 0 ? (
        <div className="ins-empty">
          <div className="ins-empty-icon">◇</div>
          <h2 className="ins-h2">Create your first event</h2>
          <p className="ins-sub" style={{ maxWidth: '42ch', margin: '6px auto 16px' }}>
            An event gives you a tablet link to open on the booth kiosk — everything it captures shows up here.
          </p>
          <button className="ins-btn primary" onClick={() => setNewOpen(true)}>New event</button>
        </div>
      ) : (
        <div className="ins-cards">
          {shows.map((s) => {
            const st = stats[s.id];
            return (
              <button key={s.id} className="ins-card" onClick={() => onOpen(s.id)}>
                <div className="ins-card-top">
                  <span className="ins-card-name">{s.name}</span>
                  <span className="ins-card-open">Open →</span>
                </div>
                <div className="ins-card-dates">{fmtRange(s.starts_on, s.ends_on)}</div>
                <div className="ins-card-stats">
                  <div><span className="ins-num">{st ? st.leads : '—'}</span><span className="ins-card-stat-l">Leads</span></div>
                  <div><span className="ins-num">{st ? st.sessions : '—'}</span><span className="ins-card-stat-l">Sessions</span></div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {newOpen && (
        <NewEventModal
          onClose={() => setNewOpen(false)}
          onCreated={(id) => { setNewOpen(false); onOpen(id); }}
        />
      )}
    </div>
  );
}

function fmtRange(a: string | null, b: string | null): string {
  if (!a && !b) return 'No dates set';
  const f = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (a && b) return `${f(a)} – ${f(b)}`;
  return f((a || b)!);
}

function NewEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: (showId: string) => void }) {
  const [name, setName] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const { show } = await createShow({ name: name.trim(), startsOn, endsOn });
      onCreated(show.id);
    } catch (e2) {
      setErr((e2 as Error)?.message ?? 'Could not create event');
      setBusy(false);
    }
  };

  return (
    <div className="ins-scrim" onClick={onClose}>
      <form className="ins-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="ins-h2" style={{ marginTop: 0 }}>New event</h2>
        <label className="ins-label" htmlFor="ne-name">Event name</label>
        <input id="ne-name" className="ins-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="BuildTech Expo 2026" autoFocus />
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="ins-label" htmlFor="ne-start">Starts (optional)</label>
            <input id="ne-start" type="date" className="ins-field" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="ins-label" htmlFor="ne-end">Ends (optional)</label>
            <input id="ne-end" type="date" className="ins-field" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
        </div>
        {err && <div style={{ color: 'var(--bad, #c0341d)', fontSize: 13, marginTop: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button type="button" className="ins-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="ins-btn primary" disabled={busy}>{busy ? 'Creating…' : 'Create event'}</button>
        </div>
      </form>
    </div>
  );
}
