// GET /api/shows/:id/content — reference only (see api/README.md). Not built by
// the app/ Vercel project. Public, read-only: the kiosk fetches its show's
// products/hotspots/media (built from DB rows) and PWA-caches them for offline.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const config = { regions: ['fra1'] };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return json(405, { error: 'method_not_allowed' });

  const showId = new URL(req.url).searchParams.get('show');
  if (!showId) return json(400, { error: 'missing_show' });

  const { data: products, error } = await supabase
    .from('products')
    .select('id,label,subtitle,tagline,overview,specs,model_url,sort_order, media(*), hotspots(*)')
    .eq('show_id', showId)
    .order('sort_order');
  if (error) return json(500, { error: 'read_failed' });

  // Shape into the CatalogEntry[] the kiosk already renders (data/types.ts),
  // so swapping data/catalog.ts for this response is a drop-in.
  const catalog = (products ?? []).map((p) => ({
    id: p.id,
    label: p.label,
    subtitle: p.subtitle,
    tagline: p.tagline,
    overview: p.overview,
    specs: p.specs,
    modelUrl: p.model_url,
    media: (p.media ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({ id: m.id, type: m.type, src: m.src, title: m.title })),
    hotspots: (p.hotspots ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((h) => ({
        id: h.slug,
        title: h.title,
        description: h.description,
        position: h.position,
        normal: h.normal,
      })),
  }));

  return new Response(JSON.stringify({ catalog }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Short edge cache; kiosk also PWA-caches for offline resilience.
      'Cache-Control': 'public, max-age=60, s-maxage=300',
    },
  });
}

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
