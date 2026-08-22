import type { AnalyticsEvent, Aggregates, Deltas, LeadRecord } from './types';
import { PRODUCTS } from './seed';

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

  // Videos
  const vidMap = new Map<string, { plays: number; comp: number; compCount: number }>();
  for (const e of plays) {
    const title = str(e.payload, 'title');
    const cur = vidMap.get(title) ?? { plays: 0, comp: 0, compCount: 0 };
    cur.plays += 1;
    if (typeof e.payload?.completion === 'number') { cur.comp += e.payload.completion as number; cur.compCount += 1; }
    vidMap.set(title, cur);
  }
  const videos = [...vidMap.entries()]
    .map(([title, v]) => ({ title, plays: v.plays, completionPct: v.compCount ? Math.round((v.comp / v.compCount) * 100) : 0 }))
    .sort((a, b) => b.plays - a.plays);

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

  // Per-product breakdown
  const byProductMap = new Map<string, { sessions: number; engaged: Set<string>; leads: number }>();
  for (const e of starts) {
    const cur = byProductMap.get(e.productId) ?? { sessions: 0, engaged: new Set(), leads: 0 };
    cur.sessions += 1;
    byProductMap.set(e.productId, cur);
  }
  for (const e of hotspots) byProductMap.get(e.productId)?.engaged.add(e.sessionId);
  for (const e of leadEvents) { const c = byProductMap.get(e.productId); if (c) c.leads += 1; }
  const byProduct = [...byProductMap.entries()].map(([productId, v]) => ({
    productId,
    label: PRODUCTS[productId] ?? productId,
    sessions: v.sessions,
    engagementPct: v.sessions ? Math.round((v.engaged.size / v.sessions) * 100) : 0,
    leads: v.leads,
  })).sort((a, b) => b.sessions - a.sessions);

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
