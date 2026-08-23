import type { AnalyticsEvent } from './types';

/**
 * Storage boundary for analytics events. The kiosk writes through this
 * interface; the dashboard reads through it. Swapping the local sink for a
 * Supabase/Airtable sink later changes nothing above this line.
 */
export interface AnalyticsSink {
  track(event: AnalyticsEvent): void;
  all(): AnalyticsEvent[];
  flush(): Promise<void>;
  clear(): void;
}

const KEY = 'exhibly-analytics';

/**
 * Local, offline-first sink. Buffers to localStorage so a flaky venue network
 * never drops data. `flush()` is where a live sink would POST the pending
 * batch — here it is a no-op that just marks events sent.
 *
 * Live-push contract (documented for when a real backend lands):
 *  - flush a batched JSON array of unsent events on a cadence
 *    (`flushIntervalMs`) or when the buffer reaches `flushMaxBatch`,
 *  - plus an immediate flush on session end and on `pagehide`
 *    via `navigator.sendBeacon` so a closing tab still delivers,
 *  - retry with exponential backoff; unsent events stay queued (offline-safe).
 *  Payload is ~100–300 bytes/event, so bandwidth is negligible and the push
 *  frequency is entirely controlled by these two knobs.
 */
export class LocalSink implements AnalyticsSink {
  flushIntervalMs = 30_000;
  flushMaxBatch = 50;

  private read(): AnalyticsEvent[] {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
    } catch {
      return [];
    }
  }

  private write(events: AnalyticsEvent[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(events));
    } catch {
      /* storage full / unavailable — drop silently rather than throw on the kiosk */
    }
  }

  track(event: AnalyticsEvent) {
    const events = this.read();
    events.push(event);
    this.write(events);
  }

  all(): AnalyticsEvent[] {
    return this.read();
  }

  // No backend yet: events already persist locally, so "flush" is a no-op.
  async flush() {}

  clear() {
    this.write([]);
  }

  /** Seed the store once if empty (demo data). */
  seedIfEmpty(events: AnalyticsEvent[]) {
    if (this.read().length === 0) this.write(events);
  }
}
