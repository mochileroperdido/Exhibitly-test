import { useMemo } from 'react';
import { aggregate, filterEvents, showDays, computeDeltas, type AnalyticsEvent, type Aggregates, type Deltas } from '../analytics';

export function fmtDay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Shared client-side aggregation: turns a loaded event slice + the product/day
 * filters into the shapes CommandDashboard/ReportView consume. Used by both the
 * live event view and the demo view. */
export function useInsights(events: AnalyticsEvent[], productId: string, day: string): {
  days: string[];
  agg: Aggregates;
  deltas?: Deltas;
  period: string;
} {
  const days = useMemo(() => showDays(events), [events]);
  return useMemo(() => {
    const current = aggregate(filterEvents(events, { productId: productId || undefined, day: day || undefined }));
    let deltas: Deltas | undefined;
    if (day) {
      const idx = days.indexOf(day);
      if (idx > 0) {
        const prev = aggregate(filterEvents(events, { productId: productId || undefined, day: days[idx - 1] }));
        deltas = computeDeltas(current, prev, `vs ${fmtDay(days[idx - 1])}`);
      }
    }
    return { days, agg: current, deltas, period: day ? fmtDay(day) : 'Full show' };
  }, [events, productId, day, days]);
}
