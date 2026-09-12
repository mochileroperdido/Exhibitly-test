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

/**
 * Safe diagnostic for 500s from the ingestion endpoints — reports the
 * SUPABASE_URL host (public info, already in every browser) and the
 * SERVICE_ROLE_KEY *format* (never any part of the value). Kept next to
 * `adminClient()` so every handler that talks to Supabase has one obvious
 * import for both.
 */
export function envDiagnostic(): { urlHost: string; keyFormat: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let urlHost = 'missing';
  if (url) {
    try {
      urlHost = new URL(url).host + new URL(url).pathname.replace(/\/$/, '');
    } catch {
      urlHost = `invalid: ${url.slice(0, 40)}`;
    }
  }
  let keyFormat: string;
  if (!key) keyFormat = 'missing';
  else if (key.startsWith('eyJ')) keyFormat = 'legacy-jwt';
  else if (key.startsWith('sb_secret_')) keyFormat = 'sb-secret';
  else if (key.startsWith('sb_publishable_')) keyFormat = 'sb-publishable (WRONG — this is the browser key!)';
  else keyFormat = 'unknown';
  return { urlHost, keyFormat };
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
  | { ok: false; status: 401 | 500; error: string; detail?: string };

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
  if (error) return { ok: false, status: 500, error: 'db_error', detail: error.message };
  if (!data) return { ok: false, status: 401, error: 'unauthorized' };
  return { ok: true, kiosk: data as KioskRow };
}
