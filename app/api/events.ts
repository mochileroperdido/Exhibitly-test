// POST /api/events — anonymous analytics ingestion (Edge, EU region).
//
// Receives a batch from the kiosk's ApiSink, authenticates the kiosk by its
// hashed key, and inserts rows via the Supabase service_role key (server-only).
// No PII is accepted here — leads go to /api/leads.
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const config = { runtime: 'edge', regions: ['fra1'] };

const EventSchema = z.object({
  id: z.string().max(64),
  type: z.enum(['session_start', 'product_view', 'hotspot_open', 'video_play', 'session_end']),
  ts: z.number().int().nonnegative(),
  sessionId: z.string().max(64),
  productId: z.string().max(64).optional().default(''),
  payload: z.record(z.string(), z.unknown()).optional(),
});
const BatchSchema = z.object({ events: z.array(EventSchema).min(1).max(200) });

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function resolveKiosk(db: ReturnType<typeof admin>, key: string | null) {
  if (!key) return null;
  const { data } = await db
    .from('kiosks')
    .select('id, org_id, show_id')
    .eq('key_hash', await sha256(key))
    .eq('active', true)
    .maybeSingle();
  return data as { id: string; org_id: string; show_id: string } | null;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const db = admin();
  const kiosk = await resolveKiosk(db, req.headers.get('x-kiosk-key'));
  if (!kiosk) return json(401, { error: 'unauthorized' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const parsed = BatchSchema.safeParse(body);
  if (!parsed.success) return json(422, { error: 'invalid', issues: parsed.error.issues });

  const rows = parsed.data.events.map((e) => ({
    org_id: kiosk.org_id,
    show_id: kiosk.show_id,
    kiosk_id: kiosk.id,
    client_session_id: e.sessionId,
    product_key: e.productId || null,
    type: e.type,
    payload: e.payload ?? {},
    ts: new Date(e.ts).toISOString(),
  }));
  const { error } = await db.from('events').insert(rows);
  if (error) return json(500, { error: 'write_failed' });

  return json(202, { ok: true, accepted: rows.length });
}
