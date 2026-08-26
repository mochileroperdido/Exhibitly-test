// POST /api/events — reference only (see api/README.md). Not built by the app/
// Vercel project. Receives a batch of anonymous events from the kiosk's ApiSink.
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// Mirrors src/analytics/types.ts (anonymous — no PII in events).
const EventSchema = z.object({
  id: z.string().max(64),
  type: z.enum(['session_start', 'product_view', 'hotspot_open', 'video_play', 'session_end']),
  ts: z.number().int().nonnegative(),
  sessionId: z.string().max(64),
  productId: z.string().max(64),
  payload: z.record(z.unknown()).optional(),
});
const BatchSchema = z.object({ events: z.array(EventSchema).min(1).max(200) });

export const config = { regions: ['fra1'] };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const kiosk = await resolveKiosk(req.headers.get('x-kiosk-key'));
  if (!kiosk) return json(401, { error: 'unauthorized' });
  if (await rateLimited(kiosk.id)) return json(429, { error: 'rate_limited' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const parsed = BatchSchema.safeParse(body);
  if (!parsed.success) return json(422, { error: 'invalid', issues: parsed.error.issues });

  // Map client session ids → server sessions, then bulk-insert events. The real
  // build upserts a `sessions` row per client sessionId and dedupes on event id.
  const rows = parsed.data.events.map((e) => ({
    org_id: kiosk.org_id,
    type: e.type,
    payload: e.payload ?? {},
    ts: new Date(e.ts).toISOString(),
    // session_id / product_id resolved to server uuids in the full implementation
  }));
  const { error } = await supabase.from('events').insert(rows);
  if (error) return json(500, { error: 'write_failed' });

  return json(202, { ok: true, accepted: rows.length });
}

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function resolveKiosk(key: string | null): Promise<{ id: string; org_id: string; show_id: string } | null> {
  if (!key) return null;
  const hash = await sha256(key);
  const { data } = await supabase
    .from('kiosks')
    .select('id, org_id, show_id')
    .eq('key_hash', hash)
    .eq('active', true)
    .maybeSingle();
  return data ?? null;
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function rateLimited(_kioskId: string): Promise<boolean> {
  return false;
}
