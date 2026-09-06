import { LocalSink } from './sink';
import { ApiSink } from './apiSink';
import { generateSeed } from './seed';
import type { AnalyticsSink } from './sink';
import type { AnalyticsEvent, EventType } from './types';

export * from './types';
export { aggregate, filterEvents, showDays, computeDeltas } from './aggregate';
export { PRODUCTS } from './seed';

// Sink is chosen by environment. Live mode turns on when `VITE_KIOSK_KEY` is set
// (the kiosk posts events to the ingestion API, same-origin `/api` by default, or
// `VITE_API_URL` if given). With no kiosk key — the default, and the Vercel
// preview — the kiosk stays local-only and demo-seeded, identical to the merged
// demo. Nothing above this line changes between modes.
const kioskKey = import.meta.env.VITE_KIOSK_KEY as string | undefined;
const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

let sink: AnalyticsSink;
if (kioskKey) {
  sink = new ApiSink(apiUrl, kioskKey);
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
export function endSession() {
  if (!sessionId) return;
  closeHotspot();
  emit('session_end', sessionId, curProduct, { durationMs: Date.now() - sessionStart });
  sessionId = null;
}
