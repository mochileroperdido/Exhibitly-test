// GET /api/whoami — read-only "who am I bound to?" check for the kiosk.
// Resolves the tablet from its X-Kiosk-Key header and joins the show name +
// tablet label. On failure, returns safe diagnostic info so we can tell WHY the
// server can't reach the DB without leaking secrets:
//   - urlHost:   the SUPABASE_URL host (public info, already in every browser)
//   - keyFormat: 'legacy-jwt' | 'sb-secret' | 'sb-publishable' | 'unknown' | 'missing'
//                (never any part of the key value itself)
//   - detail:    the raw Supabase/network error message (e.g. "Invalid API key",
//                "fetch failed")
import { adminClient, envDiagnostic, jsonResponse, resolveKiosk } from './_kiosk';

export const config = { runtime: 'edge', regions: ['fra1'] };

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
