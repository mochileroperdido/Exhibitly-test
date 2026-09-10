import type { AnalyticsEvent } from './types';
import type { AnalyticsSink } from './sink';

/**
 * Live ingestion sink — DORMANT until `VITE_API_URL` is set (see index.ts).
 * The demo build never constructs this, so the Vercel preview keeps behaving
 * exactly like the local-only demo. It lands here now so the wiring is
 * reviewable and the swap to a real backend is a config change, not a rewrite.
 *
 * Offline-first contract (matches LocalSink's documented behaviour):
 *  - every event is buffered to localStorage first, so a flaky venue network
 *    never drops data;
 *  - `flush()` POSTs the pending batch to `${apiUrl}/events`; on success the
 *    delivered events are dropped from the queue, on failure they stay queued
 *    for the next flush (interval / session end / `pagehide` / reconnect);
 *  - the kiosk key is a scoped, ingest-only credential — never a DB key.
 */
const QUEUE_KEY = 'lathe-analytics-queue';

export class ApiSink implements AnalyticsSink {
  flushIntervalMs = 30_000;
  flushMaxBatch = 50;
  private inFlight = false;
  private apiUrl: string;
  private kioskKey: string;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(apiUrl: string, kioskKey: string) {
    this.apiUrl = apiUrl;
    this.kioskKey = kioskKey;
    // Recurring drain so a session doesn't have to end (or fill 50 events)
    // before anything shows on the dashboard. Global lifecycle listeners
    // (pagehide / visibilitychange / online) are wired in analytics/index.ts.
    if (typeof globalThis.setInterval === 'function') {
      this.intervalId = setInterval(() => {
        void this.flush();
      }, this.flushIntervalMs);
    }
  }

  dispose() {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private read(): AnalyticsEvent[] {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
    } catch {
      return [];
    }
  }

  private write(events: AnalyticsEvent[]) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(events));
    } catch {
      /* storage full / unavailable — drop silently rather than throw on the kiosk */
    }
  }

  track(event: AnalyticsEvent) {
    const events = this.read();
    events.push(event);
    this.write(events);
    if (events.length >= this.flushMaxBatch) void this.flush();
  }

  // The dashboard reads server-side in production; on the kiosk this returns the
  // local queue only (whatever hasn't been delivered yet).
  all(): AnalyticsEvent[] {
    return this.read();
  }

  async flush() {
    if (this.inFlight) return;
    const batch = this.read();
    if (batch.length === 0) return;
    this.inFlight = true;
    try {
      const res = await fetch(`${this.apiUrl}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Kiosk-Key': this.kioskKey },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      });
      if (!res.ok) throw new Error(`ingest ${res.status}`);
      // Drop only what we sent; events tracked during the request stay queued.
      const remaining = this.read().slice(batch.length);
      this.write(remaining);
    } catch {
      /* stays queued for the next flush — offline-safe */
    } finally {
      this.inFlight = false;
    }
  }

  clear() {
    this.write([]);
  }
}
