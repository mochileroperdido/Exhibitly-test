import { useCallback, useEffect, useState } from 'react';
import { listShows, eventStats, createShow, type Show } from './shows';
import {
  listProducts,
  listForms,
  setShowProducts,
  setShowForm,
  MAX_PRODUCTS_PER_SHOW,
  RECOMMENDED_PRODUCTS_PER_SHOW,
  type Product,
  type FormDefinition,
} from '../shared/content';
import { loadWithSchemaGuard } from '../shared/schemaGuard';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>(''); // '' = org default (null in DB)
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    loadWithSchemaGuard('events-modal:products', () => listProducts(), [] as Product[])
      .then(setProducts).catch(() => { /* products optional */ });
    loadWithSchemaGuard('events-modal:forms', () => listForms(), [] as FormDefinition[])
      .then(setForms).catch(() => { /* forms optional */ });
  }, []);

  function toggleProduct(id: string) {
    setSelectedProducts((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_PRODUCTS_PER_SHOW) return prev; // hard cap
      return [...prev, id];
    });
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const { show } = await createShow({ name: name.trim(), startsOn, endsOn });
      if (selectedProducts.length > 0) {
        await setShowProducts(show.id, selectedProducts);
      }
      if (selectedFormId) {
        await setShowForm(show.id, selectedFormId);
      }
      onCreated(show.id);
    } catch (e2) {
      setErr((e2 as Error)?.message ?? 'Could not create event');
      setBusy(false);
    }
  };

  return (
    <div className="ins-scrim" onClick={onClose}>
      <form className="ins-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ maxWidth: 620 }}>
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

        <div style={{ marginTop: 16 }}>
          <div className="ins-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Products on this event</span>
            <span className="ins-num-small" style={{ color: selectedProducts.length > RECOMMENDED_PRODUCTS_PER_SHOW ? 'var(--accent)' : 'var(--muted)' }}>
              {selectedProducts.length}/{MAX_PRODUCTS_PER_SHOW}
            </span>
          </div>
          {products.length === 0 ? (
            <p className="ins-sub" style={{ marginTop: 6 }}>No products yet — <a href="#/products/new">add one first</a>, or leave this empty and add products later.</p>
          ) : (
            <div className="ins-picker">
              {products.map((p) => {
                const on = selectedProducts.includes(p.id);
                const disabled = !on && selectedProducts.length >= MAX_PRODUCTS_PER_SHOW;
                return (
                  <button
                    type="button"
                    key={p.id}
                    className={'ins-picker-chip' + (on ? ' is-on' : '')}
                    disabled={disabled}
                    onClick={() => toggleProduct(p.id)}
                    aria-pressed={on}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}
          {selectedProducts.length > RECOMMENDED_PRODUCTS_PER_SHOW && (
            <p className="ins-sub" style={{ marginTop: 6, color: 'var(--accent)' }}>
              More than {RECOMMENDED_PRODUCTS_PER_SHOW} products on one kiosk can overwhelm visitors — pick your best {RECOMMENDED_PRODUCTS_PER_SHOW} if you can.
            </p>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <label className="ins-label" htmlFor="ne-form">Lead form</label>
          <select id="ne-form" className="ins-field" value={selectedFormId} onChange={(e) => setSelectedFormId(e.target.value)}>
            <option value="">Default (name · email · area of interest)</option>
            {forms.map((f) => <option key={f.id} value={f.id}>{f.name}{f.is_default ? ' — default' : ''}</option>)}
          </select>
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
