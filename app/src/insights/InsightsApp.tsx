import { useCallback, useEffect, useMemo, useState } from 'react';
import './insights.css';
import type { Session } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import {
  allEvents,
  aggregate,
  filterEvents,
  showDays,
  computeDeltas,
  PRODUCTS,
  type AnalyticsEvent,
} from '../analytics';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase';
import { loadInsights, type LeadRow } from './dataSource';
import {
  listShows,
  listKiosks,
  createShow,
  addTablet,
  setKioskActive,
  kioskLink,
  type Show,
  type Kiosk,
} from './shows';
import { downloadLeadsCsv } from './leadsExport';
import { Login } from './Login';
import { CommandDashboard } from './CommandDashboard';
import { ReportView } from './ReportView';

function fmtDay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function Qr({ text }: { text: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let ok = true;
    QRCode.toDataURL(text, { margin: 1, width: 160 }).then((d) => ok && setSrc(d)).catch(() => {});
    return () => {
      ok = false;
    };
  }, [text]);
  return src ? <img src={src} width={128} height={128} alt="Kiosk QR code" style={{ borderRadius: 8 }} /> : null;
}

export function InsightsApp() {
  const live = isSupabaseConfigured;

  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = useState<'dark' | 'light'>(prefersDark ? 'dark' : 'light');

  // Auth (live only). `undefined` = still resolving.
  const [session, setSession] = useState<Session | null | undefined>(live ? undefined : null);
  useEffect(() => {
    if (!live) return;
    const db = getSupabase();
    if (!db) return;
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [live]);

  // Shows + tablets (live).
  const [shows, setShows] = useState<Show[] | null>(live ? null : []);
  const [showId, setShowId] = useState('');
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [kioskId, setKioskId] = useState(''); // '' = all tablets

  // Data.
  const [events, setEvents] = useState<AnalyticsEvent[]>(() => (live ? [] : allEvents()));
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loadErr, setLoadErr] = useState('');

  // UI.
  const [productId, setProductId] = useState('');
  const [day, setDay] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [newShowOpen, setNewShowOpen] = useState(false);
  const [tabletsOpen, setTabletsOpen] = useState(false);

  const refreshShows = useCallback(
    async (selectId?: string) => {
      try {
        const list = await listShows();
        setShows(list);
        setShowId((cur) => selectId ?? (cur && list.some((s) => s.id === cur) ? cur : list[0]?.id ?? ''));
      } catch (e) {
        setLoadErr((e as Error)?.message ?? 'Failed to load shows');
      }
    },
    [],
  );

  const refreshKiosks = useCallback(async (sid: string) => {
    if (!sid) return setKiosks([]);
    try {
      setKiosks(await listKiosks(sid));
    } catch {
      setKiosks([]);
    }
  }, []);

  useEffect(() => {
    if (live && session) void refreshShows();
  }, [live, session, refreshShows]);

  useEffect(() => {
    if (live && showId) {
      setKioskId('');
      void refreshKiosks(showId);
    }
  }, [live, showId, refreshKiosks]);

  useEffect(() => {
    if (!live || !showId) return;
    let cancelled = false;
    loadInsights(showId, kioskId || undefined)
      .then((d) => {
        if (cancelled) return;
        setEvents(d.events);
        setLeads(d.leads);
        setLoadErr('');
      })
      .catch((e) => !cancelled && setLoadErr(e?.message ?? 'Failed to load data'));
    return () => {
      cancelled = true;
    };
  }, [live, showId, kioskId]);

  const days = useMemo(() => showDays(events), [events]);
  const productIds = Object.keys(PRODUCTS);

  const { agg, deltas, period } = useMemo(() => {
    const filtered = filterEvents(events, { productId: productId || undefined, day: day || undefined });
    const current = aggregate(filtered);
    let d;
    if (day) {
      const idx = days.indexOf(day);
      if (idx > 0) {
        const prev = aggregate(filterEvents(events, { productId: productId || undefined, day: days[idx - 1] }));
        d = computeDeltas(current, prev, `vs ${fmtDay(days[idx - 1])}`);
      }
    }
    return { agg: current, deltas: d, period: day ? fmtDay(day) : 'Full show' };
  }, [events, productId, day, days]);

  const productLabel = productId ? PRODUCTS[productId] : 'All products';
  const activeShow = shows?.find((s) => s.id === showId);
  const showName = live ? activeShow?.name ?? 'Your show' : 'BuildTech Expo 2026';
  const scopeLabel = kioskId ? kiosks.find((k) => k.id === kioskId)?.label ?? 'Tablet' : 'All tablets';

  const exportLeads = useCallback(() => {
    if (live) downloadLeadsCsv(leads, `${showName.replace(/\s+/g, '-').toLowerCase()}-leads.csv`);
  }, [live, leads, showName]);

  const openKiosk = () => {
    const k = kiosks.find((x) => x.id === kioskId && x.token) ?? kiosks.find((x) => x.token);
    if (k?.token) window.open(kioskLink(k.token), '_blank', 'noopener');
  };
  const signOut = () => getSupabase()?.auth.signOut();

  // Auth gates.
  if (live && session === undefined) return <div className="ins" data-theme={theme} style={{ minHeight: '100vh' }} />;
  if (live && session === null) return <Login theme={theme} />;

  // First-run: authed but no shows yet.
  const noShows = live && shows !== null && shows.length === 0;

  return (
    <div className="ins" data-theme={theme}>
      <div className="ins-wrap">
        <div className="ins-top">
          <div className="ins-brand">
            <div className="ins-mk">L</div>
            <div>
              <h1>Lathe Insights</h1>
              <div className="meta">{showName.toUpperCase()} · {scopeLabel.toUpperCase()} · {productLabel.toUpperCase()}</div>
            </div>
          </div>

          <div className="ins-controls">
            {live && shows && shows.length > 0 && (
              <>
                <select className="ins-btn" value={showId} onChange={(e) => setShowId(e.target.value)} aria-label="Show" style={{ textTransform: 'none' }}>
                  {shows.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select className="ins-btn" value={kioskId} onChange={(e) => setKioskId(e.target.value)} aria-label="Tablet filter" style={{ textTransform: 'none' }}>
                  <option value="">All tablets</option>
                  {kiosks.map((k) => <option key={k.id} value={k.id}>{k.label}{k.active ? '' : ' (off)'}</option>)}
                </select>
                <button className="ins-btn" onClick={() => setTabletsOpen(true)}>Tablets &amp; links</button>
                <button className="ins-btn" onClick={openKiosk}>Open kiosk ↗</button>
              </>
            )}

            <select className="ins-btn" value={productId} onChange={(e) => setProductId(e.target.value)} aria-label="Product filter" style={{ textTransform: 'none' }}>
              <option value="">All products</option>
              {productIds.map((id) => <option key={id} value={id}>{PRODUCTS[id]}</option>)}
            </select>

            {days.length >= 2 && (
              <div className="ins-seg" role="group" aria-label="Date range">
                <button aria-pressed={day === ''} onClick={() => setDay('')}>Full show</button>
                {days.map((d) => <button key={d} aria-pressed={day === d} onClick={() => setDay(d)}>{fmtDay(d)}</button>)}
              </div>
            )}

            <button className="ins-iconbtn" aria-label="Toggle theme" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" strokeLinecap="round" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinejoin="round" /></svg>
              )}
            </button>

            <button className="ins-btn primary" onClick={() => setReportOpen(true)}>Generate report</button>
            {live ? (
              <button className="ins-btn" onClick={signOut}>Sign out</button>
            ) : (
              <a className="ins-btn" href="#" onClick={(e) => { e.preventDefault(); location.hash = ''; }}>Back to display</a>
            )}
          </div>
        </div>

        {loadErr && <div className="ins-panel" style={{ marginBottom: 14, color: 'var(--bad, #c0341d)' }}>{loadErr}</div>}

        {noShows ? (
          <div className="ins-panel" style={{ textAlign: 'center', padding: 48 }}>
            <div className="ins-num big" style={{ fontSize: 40 }}>👋</div>
            <h2 style={{ marginTop: 8 }}>Create your first show</h2>
            <p className="cap" style={{ maxWidth: '46ch', margin: '8px auto 18px' }}>
              A show is an event. Creating one gives you a tablet link to open on the booth kiosk — everything it
              captures shows up here.
            </p>
            <button className="ins-btn primary" onClick={() => setNewShowOpen(true)}>New show</button>
          </div>
        ) : (
          <CommandDashboard agg={agg} deltas={deltas} onExportLeads={live ? exportLeads : undefined} />
        )}
      </div>

      {reportOpen && <ReportView agg={agg} showName={showName} period={`${productLabel} · ${period}`} onClose={() => setReportOpen(false)} />}

      {newShowOpen && (
        <NewShowModal
          onClose={() => setNewShowOpen(false)}
          onCreated={async (show) => {
            setNewShowOpen(false);
            await refreshShows(show.id);
            setTabletsOpen(true); // reveal the new tablet's link right away
          }}
        />
      )}

      {tabletsOpen && showId && (
        <TabletsDrawer
          showName={showName}
          kiosks={kiosks}
          onClose={() => setTabletsOpen(false)}
          onNewShow={() => { setTabletsOpen(false); setNewShowOpen(true); }}
          onAdd={async (label) => { await addTablet(showId, label); await refreshKiosks(showId); }}
          onToggle={async (id, active) => { await setKioskActive(id, active); await refreshKiosks(showId); }}
        />
      )}

      <div className="ins-tip" id="ins-tip" />
    </div>
  );
}

function NewShowModal({ onClose, onCreated }: { onClose: () => void; onCreated: (show: Show) => void }) {
  const [name, setName] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { show } = await createShow({ name: name.trim(), startsOn, endsOn });
      onCreated(show);
    } catch (e2) {
      setErr((e2 as Error)?.message ?? 'Could not create show');
      setBusy(false);
    }
  };

  return (
    <div className="ins-scrim" onClick={onClose}>
      <form className="ins-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 style={{ marginTop: 0 }}>New show</h2>
        <label className="ins-label" htmlFor="ns-name">Show name</label>
        <input id="ns-name" className="ins-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="BuildTech Expo 2026" autoFocus />
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="ins-label" htmlFor="ns-start">Starts (optional)</label>
            <input id="ns-start" type="date" className="ins-field" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="ins-label" htmlFor="ns-end">Ends (optional)</label>
            <input id="ns-end" type="date" className="ins-field" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
        </div>
        {err && <div style={{ color: 'var(--bad, #c0341d)', fontSize: 13, marginTop: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button type="button" className="ins-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="ins-btn primary" disabled={busy}>{busy ? 'Creating…' : 'Create show'}</button>
        </div>
      </form>
    </div>
  );
}

function TabletsDrawer({
  showName,
  kiosks,
  onClose,
  onAdd,
  onToggle,
  onNewShow,
}: {
  showName: string;
  kiosks: Kiosk[];
  onClose: () => void;
  onAdd: (label: string) => Promise<void>;
  onToggle: (id: string, active: boolean) => Promise<void>;
  onNewShow: () => void;
}) {
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');

  const copy = (token: string) => {
    navigator.clipboard?.writeText(kioskLink(token)).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(''), 1500);
    });
  };

  return (
    <div className="ins-scrim" onClick={onClose}>
      <div className="ins-drawer" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Tablets · {showName}</h2>
          <button className="ins-btn" onClick={onClose}>Close</button>
        </div>
        <p className="cap" style={{ marginTop: 6 }}>Open a tablet's link (or scan its QR) on the booth device to bind it to this show.</p>

        {kiosks.map((k) => (
          <div key={k.id} className="ins-tablet">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <b>{k.label}{k.active ? '' : ' · revoked'}</b>
              <button className="ins-btn" onClick={() => onToggle(k.id, !k.active)}>{k.active ? 'Revoke' : 'Re-enable'}</button>
            </div>
            {k.token && k.active && (
              <div className="ins-tabletbody">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ins-linkrow">
                    <input readOnly className="ins-field" value={kioskLink(k.token)} onFocus={(e) => e.target.select()} />
                    <button className="ins-btn" onClick={() => copy(k.token!)}>{copied === k.token ? 'Copied' : 'Copy'}</button>
                  </div>
                </div>
                <Qr text={kioskLink(k.token)} />
              </div>
            )}
          </div>
        ))}

        <div className="ins-linkrow" style={{ marginTop: 16 }}>
          <input className="ins-field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add tablet (e.g. Tablet 2)" />
          <button
            className="ins-btn primary"
            disabled={busy || !label.trim()}
            onClick={async () => { setBusy(true); await onAdd(label.trim()); setLabel(''); setBusy(false); }}
          >
            {busy ? 'Adding…' : 'Add tablet'}
          </button>
        </div>

        <div style={{ marginTop: 18, borderTop: '1px solid var(--edge-2)', paddingTop: 14 }}>
          <button className="ins-btn" onClick={onNewShow}>+ New show</button>
        </div>
      </div>
    </div>
  );
}
