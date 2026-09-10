// POST /api/events — anonymous analytics ingestion. Edge, EU region.
//
// Uses the shared _kiosk helper so that server/env errors return 500 (not 401).
import { z } from 'zod';
import { adminClient, jsonResponse, resolveKiosk } from './_kiosk';

export const config = { runtime: 'edge', regions: ['fra1'] };

const EventSchema = z.object({
  id: z.string().max(64),
  type: z.enum(['session_start', 'product_view', 'hotspot_open', 'video_play', 'video_complete', 'session_end']),
  ts: z.number().int().nonnegative(),
  sessionId: z.string().max(64),
  productId: z.string().max(64).optional().default(''),
  payload: z.record(z.string(), z.unknown()).optional(),
});
const BatchSchema = z.object({ events: z.array(EventSchema).min(1).max(200) });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });

  const db = adminClient();
  const resolved = await resolveKiosk(db, req.headers.get('x-kiosk-key'));
  if (!resolved.ok) return jsonResponse(resolved.status, { error: resolved.error });
  const { kiosk } = resolved;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }
  const parsed = BatchSchema.safeParse(body);
  if (!parsed.success) return jsonResponse(422, { error: 'invalid', issues: parsed.error.issues });

  const rows = parsed.data.events.map((e) => ({
    org_id: kiosk.org_id,
    show_id: kiosk.show_id,
    kiosk_id: kiosk.id,
    client_id: e.id,
    client_session_id: e.sessionId,
    product_key: e.productId || null,
    type: e.type,
    payload: e.payload ?? {},
    ts: new Date(e.ts).toISOString(),
  }));
  // Idempotent write: a client retry after a lost 2xx would otherwise
  // duplicate rows. The (kiosk_id, client_id) unique index — see migration
  // 0005 — lets us swallow re-posts safely.
  const { error } = await db
    .from('events')
    .upsert(rows, { onConflict: 'kiosk_id,client_id', ignoreDuplicates: true });
  if (error) return jsonResponse(500, { error: 'write_failed' });

  return jsonResponse(202, { ok: true, accepted: rows.length });
}
