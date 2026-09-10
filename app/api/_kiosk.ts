// Shared helpers for the Edge ingestion functions (leads, events, whoami).
// The critical rule here: a *config/connection* error must be reported as 500,
// only a genuine "no matching kiosk row" is 401. Earlier versions swallowed the
// Supabase `error` and treated every failure as 401, hiding env-var problems.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function adminClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface KioskRow {
  id: string;
  org_id: string;
  show_id: string;
}

export type ResolveResult =
  | { ok: true; kiosk: KioskRow }
  | { ok: false; status: 401 | 500; error: string };

/**
 * Resolve the tablet identity from its scoped ingest key.
 *  - null key                  -> 401 unauthorized
 *  - Supabase error            -> 500 db_error (surfaces server env / RLS misconfig)
 *  - clean read, no row match  -> 401 unauthorized (bad or revoked token)
 *  - clean read, row found     -> ok
 */
export async function resolveKiosk(db: SupabaseClient, key: string | null): Promise<ResolveResult> {
  if (!key) return { ok: false, status: 401, error: 'unauthorized' };
  const { data, error } = await db
    .from('kiosks')
    .select('id, org_id, show_id')
    .eq('key_hash', await sha256Hex(key))
    .eq('active', true)
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: 'db_error' };
  if (!data) return { ok: false, status: 401, error: 'unauthorized' };
  return { ok: true, kiosk: data as KioskRow };
}
