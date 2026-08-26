// POST /api/leads — reference only (see api/README.md). Not built by the app/
// Vercel project. Deps (@supabase/supabase-js, zod) are resolved in the backend PR.
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Server-only. NEVER exposed to the browser bundle.
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const LeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  interest: z.string().max(60).optional(),
  explored: z.array(z.string().max(120)).max(50).default([]),
  sessionId: z.string().uuid().optional(),
  consentGiven: z.literal(true), // hard gate: no lead without explicit consent
  consentText: z.string().min(1).max(500),
  consentVersion: z.string().min(1).max(20),
});

export const config = { regions: ['fra1'] }; // keep processing in the EU

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  // Resolve the kiosk from its scoped, hashed ingest key.
  const kiosk = await resolveKiosk(req.headers.get('x-kiosk-key'));
  if (!kiosk) return json(401, { error: 'unauthorized' });
  if (await rateLimited(kiosk.id)) return json(429, { error: 'rate_limited' });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) return json(422, { error: 'invalid', issues: parsed.error.issues });
  const lead = parsed.data;

  const { error } = await supabase.from('leads').insert({
    org_id: kiosk.org_id,
    show_id: kiosk.show_id,
    session_id: lead.sessionId ?? null,
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

// --- helpers (sketch) ---
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

// Placeholder — back with Upstash/Vercel KV or a Postgres counter in the real build.
async function rateLimited(_kioskId: string): Promise<boolean> {
  return false;
}
