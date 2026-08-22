import { useState } from 'react';
import type { Aggregates, Deltas } from '../analytics';
import { TrafficBars } from './charts';
import { showTip, hideTip } from './tip';

const HOUR_MARKERS: Record<string, string> = { '2p': 'Product talk', '4p': 'Prize draw' };
const INTEREST_COLORS = ['var(--blue)', 'var(--accent)', 'var(--aqua)'];

function fmtTime(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function CommandDashboard({ agg, deltas }: { agg: Aggregates; deltas?: Deltas }) {
  const [mode, setMode] = useState<'hour' | 'day'>('hour');
  const k = agg.kpis;
  const traffic = mode === 'hour' ? agg.traffic.hour : agg.traffic.day;
  const peak = traffic.reduce((a, b) => (b.value > a.value ? b : a), { label: '—', value: 0 });
  const totalTraffic = traffic.reduce((a, b) => a + b.value, 0);
  const engagedCount = Math.round((k.engagementPct / 100) * k.sessions);
  const maxDwell = Math.max(1, ...agg.attention.map((a) => a.dwellMs));
  const maxInterest = Math.max(1, ...agg.interest.map((i) => i.count));
  const leadDelta = deltas?.leads;

  return (
    <>
      <section className="ins-grid-top">
        <div className="ins-panel ins-hero">
          <div>
            <div className="ins-label">Engagement rate</div>
            <div className="ins-num big"><span>{k.engagementPct}</span>%</div>
            <div className="cap"><b>{engagedCount}</b> of <b>{k.sessions}</b> visitors opened a feature</div>
            <div className="ins-trackbar"><i style={{ width: `${k.engagementPct}%` }} /></div>
            <div className="foot">
              <span className="ins-label">Sessions {k.sessions}</span>
              <span className="ins-label" style={{ color: 'var(--good)' }}>Conversion {k.conversionPct}%</span>
            </div>
          </div>
          <div className="ins-kpis">
            <div className="ins-kpi"><div className="ins-label">Avg. time</div><div className="v ins-num">{fmtTime(k.avgTimeMs)}</div><div className="k">per session</div></div>
            <div className="ins-kpi">
              <div className="ins-label">Leads</div><div className="v ins-num">{k.leads}</div>
              <div className="k">{leadDelta != null && deltas?.label ? <span className="ins-delta">{leadDelta >= 0 ? '+' : ''}{leadDelta} {deltas.label}</span> : 'captured'}</div>
            </div>
          </div>
        </div>

        <div className="ins-panel">
          <div className="ins-phead">
            <div><h2>Traffic</h2><div className="sub">When the booth drew visitors</div></div>
            <div className="ins-seg">
              <button aria-pressed={mode === 'hour'} onClick={() => setMode('hour')}>By hour</button>
              <button aria-pressed={mode === 'day'} onClick={() => setMode('day')}>By day</button>
            </div>
          </div>
          <TrafficBars data={traffic} markers={mode === 'hour' ? HOUR_MARKERS : {}} />
          <div className="ins-callouts">
            <div className="co">{mode === 'day' ? 'Busiest day' : 'Peak hour'}<b>{peak.label} · {peak.value}</b></div>
            <div className="co">Total sessions<b>{totalTraffic}</b></div>
            {mode === 'hour' && peak.label === '4p' && (
              <div className="co">Prize draw 4pm<b style={{ color: 'var(--accent)' }}>peak +{peak.value}</b></div>
            )}
          </div>
        </div>
      </section>

      <section className="ins-grid-mid">
        <div className="ins-panel">
          <div className="ins-phead"><div><h2>Features by attention</h2><div className="sub">Avg. seconds on the feature card · not just taps</div></div></div>
          {agg.attention.map((a) => (
            <div className="ins-arow" key={a.title}>
              <span className="nm">{a.title}</span>
              <span><span className="dw">{(a.dwellMs / 1000).toFixed(1)}s</span> <span className="tk">· {a.taps} taps</span></span>
              <span className="bar"><i style={{ width: `${(a.dwellMs / maxDwell) * 100}%` }} /></span>
            </div>
          ))}
        </div>

        <div className="ins-panel">
          <div className="ins-phead"><div><h2>Interest of leads</h2><div className="sub">{k.leads} leads</div></div></div>
          <div className="ins-ibar">
            {agg.interest.map((s, i) => (
              <div key={s.name}>
                <div className="top"><span className="nm">{s.name}</span><span className="vv">{s.count} · {Math.round((s.count / Math.max(1, k.leads)) * 100)}%</span></div>
                <div className="t"><i style={{ width: `${(s.count / maxInterest) * 100}%`, background: INTEREST_COLORS[i % 3] }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="ins-panel">
          <div className="ins-phead"><div><h2>How-to videos</h2><div className="sub">Plays · completion</div></div></div>
          {agg.videos.map((v) => (
            <div className="ins-vid" key={v.title}>
              <div className="r1"><span className="nm">{v.title}</span><span className="pl ins-num">{v.plays}</span></div>
              <div className="t"><i style={{ width: `${v.completionPct}%` }} /></div>
              <div className="cp">{v.completionPct}% average completion</div>
            </div>
          ))}
        </div>
      </section>

      {agg.byProduct.length > 1 && (
        <section className="ins-panel" style={{ marginBottom: 14 }}>
          <div className="ins-phead"><div><h2>By product</h2><div className="sub">How engagement splits across the models on show</div></div></div>
          <div className="ins-prod">
            {agg.byProduct.map((p) => (
              <div className="ins-prodcard" key={p.productId}>
                <div className="pn">{p.label}</div>
                <div className="pr">
                  <div><div className="n ins-num">{p.sessions}</div><div className="l">Sessions</div></div>
                  <div><div className="n ins-num">{p.engagementPct}%</div><div className="l">Engaged</div></div>
                  <div><div className="n ins-num">{p.leads}</div><div className="l">Leads</div></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="ins-panel">
        <div className="ins-phead"><div><h2>Captured leads</h2><div className="sub">{agg.leads.length} total · newest first · with what each explored</div></div></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ins-table">
            <thead><tr><th>Visitor</th><th>Interest</th><th>Explored</th><th>Captured</th></tr></thead>
            <tbody>
              {agg.leads.slice(0, 12).map((l, i) => (
                <tr key={i}>
                  <td className="ins-who"><b>{l.name}</b><small>{l.email}</small></td>
                  <td><span className="ins-pill">{l.interest}</span></td>
                  <td className="ins-exp" onPointerMove={(e) => showTip(e, l.explored.join(' · ') || '—')} onPointerLeave={hideTip}>
                    {l.explored.slice(0, 3).join(' · ') || '—'}{l.explored.length > 3 ? ' …' : ''}
                  </td>
                  <td className="ins-tm">{new Date(l.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
