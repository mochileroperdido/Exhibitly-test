// GET /api/whoami — read-only "who am I bound to?" check for the kiosk.
// Resolves the tablet from its X-Kiosk-Key header and joins the show name +
// tablet label so the booth device can display "Connected to <Event> · <Tablet>"
// (or a clear error) the moment it opens its tablet link. No writes.
import { adminClient, jsonResponse, resolveKiosk } from './_kiosk';

export const config = { runtime: 'edge', regions: ['fra1'] };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  const db = adminClient();
  const resolved = await resolveKiosk(db, req.headers.get('x-kiosk-key'));
  if (!resolved.ok) return jsonResponse(resolved.status, { error: resolved.error });
  const { kiosk } = resolved;

  const { data, error } = await db
    .from('kiosks')
    .select('label, shows(name)')
    .eq('id', kiosk.id)
    .maybeSingle();
  if (error || !data) return jsonResponse(500, { error: 'db_error' });

  // supabase-js types the joined 1:1 relation as an array on some versions;
  // normalize either shape into a single object.
  const shows = data.shows as unknown;
  const showRow = Array.isArray(shows) ? shows[0] : shows;
  const eventName = (showRow as { name?: string } | null)?.name ?? '';

  return jsonResponse(200, {
    ok: true,
    tablet: data.label ?? '',
    event: eventName,
  });
}
