// GET /api/whoami — read-only "who am I bound to?" check for the kiosk.
// Resolves the tablet from its X-Kiosk-Key header and joins the show name +
// tablet label. On failure, returns safe diagnostic info so we can tell WHY the
// server can't reach the DB without leaking secrets:
//   - urlHost:   the SUPABASE_URL host (public info, already in every browser)
//   - keyFormat: 'legacy-jwt' | 'sb-secret' | 'sb-publishable' | 'unknown' | 'missing'
//                (never any part of the key value itself)
//   - detail:    the raw Supabase/network error message (e.g. "Invalid API key",
//                "fetch failed")
import { adminClient, jsonResponse, resolveKiosk } from './_kiosk';

export const config = { runtime: 'edge', regions: ['fra1'] };

function envDiagnostic() {
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

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  const db = adminClient();
  const resolved = await resolveKiosk(db, req.headers.get('x-kiosk-key'));
  if (!resolved.ok) {
    const body: Record<string, unknown> = { error: resolved.error };
    if (resolved.status === 500) {
      body.detail = resolved.detail ?? 'unknown';
      body.env = envDiagnostic();
    }
    return jsonResponse(resolved.status, body);
  }
  const { kiosk } = resolved;

  const { data, error } = await db
    .from('kiosks')
    .select('label, shows(name)')
    .eq('id', kiosk.id)
    .maybeSingle();
  if (error || !data) return jsonResponse(500, { error: 'db_error', detail: error?.message, env: envDiagnostic() });

  const shows = data.shows as unknown;
  const showRow = Array.isArray(shows) ? shows[0] : shows;
  const eventName = (showRow as { name?: string } | null)?.name ?? '';

  return jsonResponse(200, {
    ok: true,
    tablet: data.label ?? '',
    event: eventName,
  });
}
