// POST /api/leads — lead capture (PII + consent). Edge, EU region.
//
// Authenticates the kiosk by its hashed key and inserts one lead via the
// Supabase service_role key (server-only). Consent is a hard gate: no lead is
// stored unless consentGiven === true.
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const config = { runtime: 'edge', regions: ['fra1'] };

const LeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  interest: z.string().max(60).optional(),
  explored: z.array(z.string().max(120)).max(50).default([]),
  sessionId: z.string().max(64).optional(),
  productKey: z.string().max(64).optional(),
  consentGiven: z.literal(true), // hard gate
  consentText: z.string().min(1).max(500),
  consentVersion: z.string().min(1).max(20),
});

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
  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) return json(422, { error: 'invalid', issues: parsed.error.issues });
  const lead = parsed.data;

  const { error } = await db.from('leads').insert({
    org_id: kiosk.org_id,
    show_id: kiosk.show_id,
    kiosk_id: kiosk.id,
    client_session_id: lead.sessionId ?? null,
    product_key: lead.productKey ?? null,
    name: lead.name,
    email: lead.email,
    interest: lead.interest ?? null,
    explored: lead.explored,
    consent_given: lead.consentGiven,
    consent_text: lead.consentText,
    consent_version: lead.consentVersion,
  });
  if (error) return json(500, { error: 'write_failed' });

  return json(201, { ok: true });
}
