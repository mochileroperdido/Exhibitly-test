import { LocalSink } from './sink';
import { generateSeed } from './seed';
import type { AnalyticsEvent, EventType } from './types';

export * from './types';
export { aggregate, filterEvents, showDays, computeDeltas } from './aggregate';
export { PRODUCTS } from './seed';

const sink = new LocalSink();
// Populate the demo dataset once; real kiosk sessions append to it.
sink.seedIfEmpty(generateSeed());

let seq = 0;
function emit(type: EventType, sessionId: string, productId: string, payload?: Record<string, unknown>) {
  const ev: AnalyticsEvent = { id: `e${Date.now()}-${seq++}`, type, ts: Date.now(), sessionId, productId, payload };
  sink.track(ev);
}

export function allEvents(): AnalyticsEvent[] {
  return sink.all();
}
export function resetToSeed() {
  sink.clear();
  sink.seedIfEmpty(generateSeed());
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
export function captureLead(fields: { name: string; email: string; interest: string; explored: string[] }) {
  if (sessionId) emit('lead_capture', sessionId, curProduct, fields);
}
export function endSession() {
  if (!sessionId) return;
  closeHotspot();
  emit('session_end', sessionId, curProduct, { durationMs: Date.now() - sessionStart });
  sessionId = null;
}
