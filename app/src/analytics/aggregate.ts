import type { AnalyticsEvent, Aggregates, Deltas, LeadRecord } from './types';
import { PRODUCTS } from './seed';
import { catalog } from '../data/catalog';

const HOURS = ['9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p'];

function num(p: Record<string, unknown> | undefined, k: string): number {
  return typeof p?.[k] === 'number' ? (p[k] as number) : 0;
}
function str(p: Record<string, unknown> | undefined, k: string): string {
  return typeof p?.[k] === 'string' ? (p[k] as string) : '';
}

/** Pure aggregation over a pre-filtered event slice. */
export function aggregate(events: AnalyticsEvent[]): Aggregates {
  const starts = events.filter((e) => e.type === 'session_start');
  const ends = events.filter((e) => e.type === 'session_end');
  const hotspots = events.filter((e) => e.type === 'hotspot_open');
  const plays = events.filter((e) => e.type === 'video_play');
  const leadEvents = events.filter((e) => e.type === 'lead_capture');

  const sessions = starts.length;
  const engagedSessions = new Set(hotspots.map((e) => e.sessionId)).size;
  const avgTimeMs = ends.length ? ends.reduce((a, e) => a + num(e.payload, 'durationMs'), 0) / ends.length : 0;

  // Attention: avg dwell + taps per feature, sorted by attention (dwell).
  const featMap = new Map<string, { dwell: number; taps: number }>();
  for (const e of hotspots) {
    const title = str(e.payload, 'title');
    const cur = featMap.get(title) ?? { dwell: 0, taps: 0 };
    cur.dwell += num(e.payload, 'dwellMs');
    cur.taps += 1;
    featMap.set(title, cur);
  }
  const attention = [...featMap.entries()]
    .map(([title, v]) => ({ title, dwellMs: v.taps ? v.dwell / v.taps : 0, taps: v.taps }))
    .sort((a, b) => b.dwellMs - a.dwellMs);

  // Videos. Key by (productId, title) so two products with the same clip
  // title stay separate. Then enrich with the customer's catalog so every
  // uploaded video appears — zero-play rows land at the bottom with a
  // "no plays yet" state, so booth staff can tell a fresh clip isn't broken.
  const VKEY = (pid: string, title: string) => `${pid}${title}`;
  const vidMap = new Map<string, { productId: string; title: string; plays: number; comp: number; compCount: number }>();
  for (const e of plays) {
    const title = str(e.payload, 'title');
    if (!title) continue;
    const k = VKEY(e.productId, title);
    const cur = vidMap.get(k) ?? { productId: e.productId, title, plays: 0, comp: 0, compCount: 0 };
    cur.plays += 1;
    if (typeof e.payload?.completion === 'number') { cur.comp += e.payload.completion as number; cur.compCount += 1; }
    vidMap.set(k, cur);
  }
  // Seed zero-play entries for every video the customer has in the catalog
  // so newly-uploaded clips show up before the first play.
  for (const entry of catalog) {
    for (const m of entry.media) {
      const k = VKEY(entry.id, m.title);
      if (!vidMap.has(k)) vidMap.set(k, { productId: entry.id, title: m.title, plays: 0, comp: 0, compCount: 0 });
    }
  }
  const videos = [...vidMap.values()]
    .map((v) => ({
      productId: v.productId,
      productLabel: PRODUCTS[v.productId] ?? v.productId,
      title: v.title,
      plays: v.plays,
      completionPct: v.compCount ? Math.round((v.comp / v.compCount) * 100) : 0,
    }))
    .sort((a, b) =>
      b.plays - a.plays
      || a.productLabel.localeCompare(b.productLabel)
      || a.title.localeCompare(b.title),
    );

  // Interest + lead records
  const interestMap = new Map<string, number>();
  const leads: LeadRecord[] = leadEvents.map((e) => {
    const interest = str(e.payload, 'interest') || '—';
    interestMap.set(interest, (interestMap.get(interest) ?? 0) + 1);
    return {
      name: str(e.payload, 'name'),
      email: str(e.payload, 'email'),
      interest,
      explored: Array.isArray(e.payload?.explored) ? (e.payload!.explored as string[]) : [],
      ts: e.ts,
      productId: e.productId,
    };
  }).sort((a, b) => b.ts - a.ts);
  const interest = [...interestMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  // Traffic — by hour of day and by calendar day.
  const hour = HOURS.map((label) => ({ label, value: 0 }));
  const dayMap = new Map<string, number>();
  for (const e of starts) {
    const d = new Date(e.ts);
    const hi = d.getHours() - 9;
    if (hi >= 0 && hi < hour.length) hour[hi].value += 1;
    const dayKey = d.toISOString().slice(0, 10);
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + 1);
  }
  const day = [...dayMap.entries()].sort().map(([k, value]) => ({
    label: new Date(k + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value,
  }));

  // Per-product breakdown. Product Views = distinct sessions that reached
  // this product at least once (any event tagged to it). This scales to any
  // number of products and lets a single visitor count for every product
  // they touched, which is what a follow-up rep wants to see. Global
  // "Sessions" (kpis.sessions) is unchanged and still counts wakes.
  const reached = new Map<string, Set<string>>();
  const engagedByProduct = new Map<string, Set<string>>();
  const leadsByProduct = new Map<string, number>();
  for (const e of events) {
    if (!e.productId) continue;
    let r = reached.get(e.productId);
    if (!r) { r = new Set(); reached.set(e.productId, r); }
    r.add(e.sessionId);
    if (e.type === 'hotspot_open') {
      let g = engagedByProduct.get(e.productId);
      if (!g) { g = new Set(); engagedByProduct.set(e.productId, g); }
      g.add(e.sessionId);
    }
  }
  for (const e of leadEvents) leadsByProduct.set(e.productId, (leadsByProduct.get(e.productId) ?? 0) + 1);
  const byProduct = [...reached.entries()].map(([productId, sessSet]) => {
    const productViews = sessSet.size;
    const engaged = engagedByProduct.get(productId)?.size ?? 0;
    return {
      productId,
      label: PRODUCTS[productId] ?? productId,
      productViews,
      engagementPct: productViews ? Math.round((engaged / productViews) * 100) : 0,
      leads: leadsByProduct.get(productId) ?? 0,
    };
  }).sort((a, b) => b.productViews - a.productViews);

  return {
    kpis: {
      sessions,
      avgTimeMs,
      engagementPct: sessions ? Math.round((engagedSessions / sessions) * 100) : 0,
      conversionPct: sessions ? Math.round((leadEvents.length / sessions) * 100) : 0,
      leads: leadEvents.length,
      videos: plays.length,
    },
    attention,
    interest,
    videos,
    traffic: { hour, day },
    leads,
    byProduct,
  };
}

/** Distinct calendar days present in the data, ascending (YYYY-MM-DD). */
export function showDays(events: AnalyticsEvent[]): string[] {
  const set = new Set<string>();
  for (const e of events) if (e.type === 'session_start') set.add(new Date(e.ts).toISOString().slice(0, 10));
  return [...set].sort();
}

export function filterEvents(events: AnalyticsEvent[], opts: { day?: string; productId?: string }): AnalyticsEvent[] {
  return events.filter((e) => {
    if (opts.productId && e.productId !== opts.productId) return false;
    if (opts.day && new Date(e.ts).toISOString().slice(0, 10) !== opts.day) return false;
    return true;
  });
}

/** Delta of the current vs. the comparison slice — only meaningful when a prior period exists. */
export function computeDeltas(current: Aggregates, previous: Aggregates | null, label?: string): Deltas | undefined {
  if (!previous) return undefined;
  return { leads: current.kpis.leads - previous.kpis.leads, sessions: current.kpis.sessions - previous.kpis.sessions, label };
}
