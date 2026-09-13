// GET /api/content — kiosk content bundle.
//
// Auth: same X-Kiosk-Key as /api/events and /api/leads. From the resolved
// kiosk we join → show → show_products → products → (media, hotspots), plus
// the show's form (or the org's default) and the org's brand. Storage-backed
// model/media/logo URLs are signed here so the kiosk never touches Storage.
//
// The response shape mirrors app/src/data/types.ts (CatalogEntry) so the kiosk
// can drop it straight into its store.
import { adminClient, envDiagnostic, jsonResponse, resolveKiosk } from './_kiosk';

export const config = { runtime: 'edge', regions: ['fra1'] };

// One hour is plenty for a booth session; kiosk refetches on wake so a new
// upload becomes visible next attract loop.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

interface ProductRow {
  id: string;
  slug: string | null;
  label: string;
  subtitle: string | null;
  tagline: string | null;
  overview: string | null;
  specs: unknown;
  model_url: string | null;
  model_bytes: number | null;
  triangle_count: number | null;
}

interface MediaRow {
  id: string;
  product_id: string;
  type: 'video' | 'image';
  src: string;
  title: string;
  sort_order: number;
}

interface HotspotRow {
  id: string;
  product_id: string;
  slug: string;
  title: string;
  description: string;
  position: string;
  normal: string;
  sort_order: number;
}

interface FormFieldRow {
  id: string;
  kind: 'short_text' | 'email' | 'single_select';
  label: string;
  required: boolean;
  options: unknown;
  sort_order: number;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return jsonResponse(405, { error: 'method_not_allowed' });

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

  // Products attached to this show, ordered by sort_order.
  const { data: linkRows, error: linkErr } = await db
    .from('show_products')
    .select('product_id, sort_order')
    .eq('show_id', kiosk.show_id)
    .order('sort_order', { ascending: true });
  if (linkErr) return jsonResponse(500, { error: 'db_error', detail: linkErr.message, env: envDiagnostic() });

  const productIds = (linkRows ?? []).map((r) => r.product_id as string);

  let products: ProductRow[] = [];
  let media: MediaRow[] = [];
  let hotspots: HotspotRow[] = [];

  if (productIds.length > 0) {
    const [prodRes, mediaRes, hotRes] = await Promise.all([
      db.from('products')
        .select('id, slug, label, subtitle, tagline, overview, specs, model_url, model_bytes, triangle_count')
        .in('id', productIds),
      db.from('media')
        .select('id, product_id, type, src, title, sort_order')
        .in('product_id', productIds)
        .order('sort_order', { ascending: true }),
      db.from('hotspots')
        .select('id, product_id, slug, title, description, position, normal, sort_order')
        .in('product_id', productIds)
        .order('sort_order', { ascending: true }),
    ]);
    if (prodRes.error) return jsonResponse(500, { error: 'db_error', detail: prodRes.error.message, env: envDiagnostic() });
    if (mediaRes.error) return jsonResponse(500, { error: 'db_error', detail: mediaRes.error.message, env: envDiagnostic() });
    if (hotRes.error) return jsonResponse(500, { error: 'db_error', detail: hotRes.error.message, env: envDiagnostic() });
    products = (prodRes.data ?? []) as ProductRow[];
    media = (mediaRes.data ?? []) as MediaRow[];
    hotspots = (hotRes.data ?? []) as HotspotRow[];
  }

  // Form: shows.form_id > org default > null.
  const { data: showRow, error: showErr } = await db
    .from('shows')
    .select('form_id')
    .eq('id', kiosk.show_id)
    .maybeSingle();
  if (showErr) return jsonResponse(500, { error: 'db_error', detail: showErr.message, env: envDiagnostic() });

  let formId: string | null = (showRow?.form_id as string | null) ?? null;
  if (!formId) {
    const { data: defRow } = await db
      .from('forms')
      .select('id')
      .eq('org_id', kiosk.org_id)
      .eq('is_default', true)
      .maybeSingle();
    formId = (defRow?.id as string | null) ?? null;
  }

  let form: { id: string; name: string; fields: FormFieldRow[] } | null = null;
  if (formId) {
    const [f, fields] = await Promise.all([
      db.from('forms').select('id, name').eq('id', formId).maybeSingle(),
      db.from('form_fields')
        .select('id, kind, label, required, options, sort_order')
        .eq('form_id', formId)
        .order('sort_order', { ascending: true }),
    ]);
    if (f.data) {
      form = {
        id: f.data.id as string,
        name: f.data.name as string,
        fields: (fields.data ?? []) as FormFieldRow[],
      };
    }
  }

  // Brand.
  const { data: orgRow } = await db
    .from('orgs')
    .select('brand_accent_hex, brand_logo_url')
    .eq('id', kiosk.org_id)
    .maybeSingle();

  // Sign every storage-backed URL. A value that is already a full URL (or a
  // /path/ served by the app) is passed through untouched — that's the escape
  // hatch for legacy static assets under app/public/.
  const sign = async (raw: string | null | undefined): Promise<string | null> => {
    if (!raw) return null;
    if (raw.startsWith('http') || raw.startsWith('/')) return raw;
    const { data, error } = await db.storage.from('assets').createSignedUrl(raw, SIGNED_URL_TTL_SECONDS);
    if (error || !data) return null;
    return data.signedUrl;
  };

  // Assemble the CatalogEntry array in show_products order.
  const mediaByProduct = new Map<string, MediaRow[]>();
  media.forEach((m) => {
    const arr = mediaByProduct.get(m.product_id) ?? [];
    arr.push(m);
    mediaByProduct.set(m.product_id, arr);
  });
  const hotByProduct = new Map<string, HotspotRow[]>();
  hotspots.forEach((h) => {
    const arr = hotByProduct.get(h.product_id) ?? [];
    arr.push(h);
    hotByProduct.set(h.product_id, arr);
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const catalog = await Promise.all(
    productIds
      .map((id) => productById.get(id))
      .filter((p): p is ProductRow => !!p)
      .map(async (p) => {
        const productMedia = await Promise.all(
          (mediaByProduct.get(p.id) ?? []).map(async (m) => ({
            id: m.id,
            type: m.type,
            src: (await sign(m.src)) ?? m.src,
            title: m.title,
          })),
        );
        return {
          id: p.slug ?? p.id,
          label: p.label,
          subtitle: p.subtitle ?? '',
          tagline: p.tagline ?? '',
          overview: p.overview ?? '',
          specs: Array.isArray(p.specs) ? p.specs : [],
          media: productMedia,
          modelUrl: (await sign(p.model_url)) ?? '',
          source: '',
          fileSizeMB: p.model_bytes ? Math.round((p.model_bytes / (1024 * 1024)) * 100) / 100 : 0,
          triangleCount: p.triangle_count ?? 0,
          hotspots: (hotByProduct.get(p.id) ?? []).map((h) => ({
            id: h.slug,
            title: h.title,
            description: h.description,
            position: h.position,
            normal: h.normal,
          })),
        };
      }),
  );

  const brand = {
    accentHex: (orgRow?.brand_accent_hex as string | null) ?? null,
    logoUrl: (await sign((orgRow?.brand_logo_url as string | null) ?? null)) ?? null,
  };

  return new Response(JSON.stringify({ ok: true, catalog, brand, form }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
