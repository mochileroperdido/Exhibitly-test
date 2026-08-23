import { useMemo, useState } from 'react';
import './insights.css';
import { allEvents, aggregate, filterEvents, showDays, computeDeltas, PRODUCTS } from '../analytics';
import { CommandDashboard } from './CommandDashboard';
import { ReportView } from './ReportView';

const SHOW_NAME = 'BuildTech Expo 2026';

function fmtDay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function InsightsApp() {
  const events = useMemo(() => allEvents(), []);
  const days = useMemo(() => showDays(events), [events]);
  const productIds = Object.keys(PRODUCTS);

  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = useState<'dark' | 'light'>(prefersDark ? 'dark' : 'light');
  const [productId, setProductId] = useState('');
  const [day, setDay] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

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

  return (
    <div className="ins" data-theme={theme}>
      <div className="ins-wrap">
        <div className="ins-top">
          <div className="ins-brand">
            <div className="ins-mk">E</div>
            <div>
              <h1>Exhibly Insights</h1>
              <div className="meta">{SHOW_NAME.toUpperCase()} · BOOTH 214 · {productLabel.toUpperCase()}</div>
            </div>
          </div>

          <div className="ins-controls">
            <select
              className="ins-btn"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              aria-label="Product filter"
              style={{ textTransform: 'none' }}
            >
              <option value="">All products</option>
              {productIds.map((id) => <option key={id} value={id}>{PRODUCTS[id]}</option>)}
            </select>

            <div className="ins-seg" role="group" aria-label="Date range">
              <button aria-pressed={day === ''} onClick={() => setDay('')}>Full show</button>
              {days.map((d) => <button key={d} aria-pressed={day === d} onClick={() => setDay(d)}>{fmtDay(d)}</button>)}
            </div>

            <button className="ins-iconbtn" aria-label="Toggle theme" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" strokeLinecap="round" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinejoin="round" /></svg>
              )}
            </button>

            <button className="ins-btn primary" onClick={() => setReportOpen(true)}>Generate report</button>
            <a className="ins-btn" href="#" onClick={(e) => { e.preventDefault(); location.hash = ''; }}>Back to display</a>
          </div>
        </div>

        <CommandDashboard agg={agg} deltas={deltas} />
      </div>

      {reportOpen && <ReportView agg={agg} showName={SHOW_NAME} period={`${productLabel} · ${period}`} onClose={() => setReportOpen(false)} />}
      <div className="ins-tip" id="ins-tip" />
    </div>
  );
}
