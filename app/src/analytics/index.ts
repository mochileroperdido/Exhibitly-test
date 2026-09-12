import { LocalSink } from './sink';
import { ApiSink } from './apiSink';
import { generateSeed } from './seed';
import { getKioskKey } from '../lib/kioskKey';
import type { AnalyticsSink } from './sink';
import type { AnalyticsEvent, EventType } from './types';

export * from './types';
export { aggregate, filterEvents, showDays, computeDeltas } from './aggregate';
export { PRODUCTS } from './seed';

// Sink is chosen by environment. Live mode turns on when a kiosk key is present
// (from the tablet's link ?k=, a stored token, or the build-time VITE_KIOSK_KEY —
// see lib/kioskKey). The kiosk posts events to the ingestion API, same-origin
// `/api` by default, or `VITE_API_URL` if given. With no kiosk key — the default,
// and the Vercel preview — the kiosk stays local-only and demo-seeded, identical
// to the merged demo. Nothing above this line changes between modes.
const kioskKey = getKioskKey();
const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

let sink: AnalyticsSink;
if (kioskKey) {
  sink = new ApiSink(apiUrl, kioskKey);
  // Lifecycle-driven flushes so a session's events reach the dashboard even
  // if the tab is backgrounded, the tablet goes to sleep, or the network
  // was down until now. Each is a best-effort drain — the ApiSink also
  // interval-flushes and posts with keepalive:true for pagehide safety.
  if (typeof window !== 'undefined') {
    const flush = () => {
      void sink.flush();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }
} else {
  const local = new LocalSink();
  // Populate the demo dataset once; real kiosk sessions append to it.
  local.seedIfEmpty(generateSeed());
  sink = local;
}

let seq = 0;
function emit(type: EventType, sessionId: string, productId: string, payload?: Record<string, unknown>) {
  const ev: AnalyticsEvent = { id: `e${Date.now()}-${seq++}`, type, ts: Date.now(), sessionId, productId, payload };
  sink.track(ev);
}

export function allEvents(): AnalyticsEvent[] {
  return sink.all();
}
/** Current live session id (null between sessions) — links a lead to its session. */
export function currentSessionId(): string | null {
  return sessionId;
}
export function resetToSeed() {
  sink.clear();
  // Re-seeding is a demo affordance only meaningful for the local sink.
  if (sink instanceof LocalSink) sink.seedIfEmpty(generateSeed());
}

// ---- Live session tracking (called by the kiosk store) ----
let sessionId: string | null = null;
let sessionStart = 0;
let curProduct = '';
let openHot: { title: string; at: number } | null = null;

export function startSession(productId: string) {
  sessionId = `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  sessionStart = Date.now();
  curProduct = productId;
  emit('session_start', sessionId, productId);
  emit('product_view', sessionId, productId);
  // Flush shortly after wake-up so the first session shows up on the dashboard
  // within seconds instead of waiting for the interval flush or tab close.
  // (Regular interval / pagehide / reconnect flushes are unchanged.)
  setTimeout(() => {
    void sink.flush();
  }, 1500);
}
export function viewProduct(productId: string) {
  curProduct = productId;
  if (sessionId) emit('product_view', sessionId, productId);
}
export function openHotspot(title: string) {
  if (!sessionId) return;
  if (openHot) closeHotspot();
  openHot = { title, at: Date.now() };
}
export function closeHotspot() {
  if (!sessionId || !openHot) return;
  emit('hotspot_open', sessionId, curProduct, { title: openHot.title, dwellMs: Date.now() - openHot.at });
  openHot = null;
}
export function playVideo(title: string, completion?: number) {
  if (sessionId) emit('video_play', sessionId, curProduct, completion == null ? { title } : { title, completion });
}
export function videoComplete(title: string) {
  if (sessionId) emit('video_complete', sessionId, curProduct, { title, completion: 1 });
}
export function endSession() {
  if (!sessionId) return;
  closeHotspot();
  emit('session_end', sessionId, curProduct, { durationMs: Date.now() - sessionStart });
  sessionId = null;
  // Return-to-attract is the natural end of a visitor's engagement; drain the
  // queue now so the dashboard sees the completed session within seconds
  // rather than waiting for the next interval flush.
  void sink.flush();
}
