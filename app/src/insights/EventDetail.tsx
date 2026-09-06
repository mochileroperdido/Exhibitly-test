import { useEffect, useState } from 'react';
import { PRODUCTS, type AnalyticsEvent } from '../analytics';
import { loadInsights, type LeadRow } from './dataSource';
import { getShow, listKiosks, kioskLink, type Kiosk } from './shows';
import { useInsights, fmtDay } from './useInsights';
import { downloadLeadsCsv } from './leadsExport';
import { CommandDashboard } from './CommandDashboard';
import { ReportView } from './ReportView';
import { TabletsTab } from './TabletsTab';

type Tab = 'insights' | 'tablets';

export function EventDetail({ showId, onBack }: { showId: string; onBack: () => void }) {
  const [name, setName] = useState('');
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [kioskId, setKioskId] = useState(''); // '' = all tablets
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [tab, setTab] = useState<Tab>('insights');
  const [productId, setProductId] = useState('');
  const [day, setDay] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    getShow(showId).then((s) => s && setName(s.name)).catch(() => {});
    listKiosks(showId).then(setKiosks).catch(() => {});
  }, [showId]);

  useEffect(() => {
    let cancelled = false;
    loadInsights(showId, kioskId || undefined)
      .then((d) => { if (!cancelled) { setEvents(d.events); setLeads(d.leads); setErr(''); } })
      .catch((e) => !cancelled && setErr(e?.message ?? 'Failed to load data'));
    return () => { cancelled = true; };
  }, [showId, kioskId]);

  const { days, agg, deltas, period } = useInsights(events, productId, day);
  const productIds = Object.keys(PRODUCTS);
  const productLabel = productId ? PRODUCTS[productId] : 'All products';

  const exportLeads = () => downloadLeadsCsv(leads, `${(name || 'event').replace(/\s+/g, '-').toLowerCase()}-leads.csv`);
  const openKiosk = () => {
    const k = kiosks.find((x) => x.id === kioskId && x.token && x.active) ?? kiosks.find((x) => x.token && x.active);
    if (k?.token) window.open(kioskLink(k.token), '_blank', 'noopener');
  };

  return (
    <div className="ins-page">
      <div className="ins-detailhead">
        <nav className="ins-crumb">
          <button onClick={onBack}>Events</button>
          <span className="ins-crumb-sep">/</span>
          <span className="ins-crumb-cur">{name || '…'}</span>
        </nav>
        <button className="ins-btn" onClick={openKiosk} disabled={!kiosks.some((k) => k.token && k.active)}>Open kiosk ↗</button>
      </div>

      <div className="ins-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'insights'} className={tab === 'insights' ? 'active' : ''} onClick={() => setTab('insights')}>Insights</button>
        <button role="tab" aria-selected={tab === 'tablets'} className={tab === 'tablets' ? 'active' : ''} onClick={() => setTab('tablets')}>Tablets</button>
      </div>

      {err && <div className="ins-panel" style={{ color: 'var(--bad, #c0341d)', marginBottom: 12 }}>{err}</div>}

      {tab === 'tablets' ? (
        <TabletsTab showId={showId} eventName={name} />
      ) : (
        <>
          <div className="ins-filterbar">
            <div className="ins-filters">
              <span className="ins-label">Filters</span>
              <select className="ins-select" value={kioskId} onChange={(e) => setKioskId(e.target.value)} aria-label="Tablet">
                <option value="">All tablets</option>
                {kiosks.map((k) => <option key={k.id} value={k.id}>{k.label}{k.active ? '' : ' (off)'}</option>)}
              </select>
              <select className="ins-select" value={productId} onChange={(e) => setProductId(e.target.value)} aria-label="Product">
                <option value="">All products</option>
                {productIds.map((id) => <option key={id} value={id}>{PRODUCTS[id]}</option>)}
              </select>
              {days.length >= 2 && (
                <div className="ins-seg" role="group" aria-label="Date range">
                  <button aria-pressed={day === ''} onClick={() => setDay('')}>Full event</button>
                  {days.map((d) => <button key={d} aria-pressed={day === d} onClick={() => setDay(d)}>{fmtDay(d)}</button>)}
                </div>
              )}
            </div>
            <div className="ins-actions">
              <button className="ins-btn primary" onClick={() => setReportOpen(true)}>Generate report</button>
            </div>
          </div>

          <CommandDashboard agg={agg} deltas={deltas} onExportLeads={exportLeads} />
        </>
      )}

      {reportOpen && <ReportView agg={agg} showName={name} period={`${productLabel} · ${period}`} onClose={() => setReportOpen(false)} />}
      <div className="ins-tip" id="ins-tip" />
    </div>
  );
}
