import { getSupabase } from '../../lib/supabase';
import { myOrgId } from './orgContext';

// CRUD helpers used by Products / Media / Forms / Brand and by the Event
// editor's product/form pickers. All calls flow through the authenticated
// Supabase client so RLS scopes them to the caller's org.

export interface Product {
  id: string;
  slug: string | null;
  label: string;
  subtitle: string | null;
  tagline: string | null;
  overview: string | null;
  specs: { label: string; value: string }[];
  model_url: string | null;
  model_bytes: number | null;
  triangle_count: number | null;
  sort_order: number;
}

export interface Hotspot {
  id: string;
  product_id: string;
  slug: string;
  title: string;
  description: string;
  position: string;
  normal: string;
  sort_order: number;
}

export interface MediaAsset {
  id: string;
  product_id: string;
  type: 'video' | 'image';
  src: string;
  title: string;
  sort_order: number;
}

export interface FormDefinition {
  id: string;
  name: string;
  is_default: boolean;
  fields: FormField[];
}

export interface FormField {
  id: string;
  form_id: string;
  kind: 'short_text' | 'email' | 'single_select';
  label: string;
  required: boolean;
  options: string[];
  sort_order: number;
}

// ── Products ───────────────────────────────────────────────────────────────
export async function listProducts(): Promise<Product[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data, error } = await db
    .from('products')
    .select('id,slug,label,subtitle,tagline,overview,specs,model_url,model_bytes,triangle_count,sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as Product),
    specs: Array.isArray(row.specs) ? (row.specs as { label: string; value: string }[]) : [],
  })) as Product[];
}

export async function getProduct(id: string): Promise<Product | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db
    .from('products')
    .select('id,slug,label,subtitle,tagline,overview,specs,model_url,model_bytes,triangle_count,sort_order')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  return { ...(data as unknown as Product), specs: Array.isArray(data.specs) ? (data.specs as { label: string; value: string }[]) : [] };
}

export async function createProduct(fields: {
  label: string;
  subtitle?: string;
  tagline?: string;
  overview?: string;
  specs?: { label: string; value: string }[];
  model_url?: string | null;
  model_bytes?: number | null;
  triangle_count?: number | null;
}): Promise<Product> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  const org_id = await myOrgId();
  // Stable slug used as events.product_key so analytics survive a rename.
  const slug = `p_${crypto.randomUUID().slice(0, 8)}`;
  const { data, error } = await db
    .from('products')
    .insert({
      org_id,
      slug,
      label: fields.label,
      subtitle: fields.subtitle ?? null,
      tagline: fields.tagline ?? null,
      overview: fields.overview ?? null,
      specs: fields.specs ?? [],
      model_url: fields.model_url ?? null,
      model_bytes: fields.model_bytes ?? null,
      triangle_count: fields.triangle_count ?? null,
    })
    .select('id,slug,label,subtitle,tagline,overview,specs,model_url,model_bytes,triangle_count,sort_order')
    .single();
  if (error) throw error;
  return { ...(data as unknown as Product), specs: Array.isArray(data.specs) ? (data.specs as { label: string; value: string }[]) : [] };
}

export async function updateProduct(id: string, patch: Partial<Omit<Product, 'id'>>): Promise<void> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  const { error } = await db.from('products').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  const { error } = await db.from('products').delete().eq('id', id);
  if (error) throw error;
}

// ── Hotspots ───────────────────────────────────────────────────────────────
export async function listHotspots(productId: string): Promise<Hotspot[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data, error } = await db
    .from('hotspots')
    .select('id,product_id,slug,title,description,position,normal,sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Hotspot[];
}

export async function upsertHotspots(productId: string, rows: Omit<Hotspot, 'id' | 'product_id'>[]): Promise<void> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  // Simple replace-all: delete existing then insert. Small N (typically 3–6)
  // per product makes this a clean tradeoff versus diffing.
  const { error: delErr } = await db.from('hotspots').delete().eq('product_id', productId);
  if (delErr) throw delErr;
  if (rows.length === 0) return;
  const { error } = await db.from('hotspots').insert(
    rows.map((r, i) => ({ ...r, product_id: productId, sort_order: r.sort_order ?? i })),
  );
  if (error) throw error;
}

// ── Media ──────────────────────────────────────────────────────────────────
export async function listMedia(productId?: string): Promise<MediaAsset[]> {
  const db = getSupabase();
  if (!db) return [];
  let q = db.from('media').select('id,product_id,type,src,title,sort_order').order('sort_order', { ascending: true });
  if (productId) q = q.eq('product_id', productId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MediaAsset[];
}

export async function createMedia(row: Omit<MediaAsset, 'id'>): Promise<MediaAsset> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  const { data, error } = await db.from('media').insert(row).select('id,product_id,type,src,title,sort_order').single();
  if (error) throw error;
  return data as MediaAsset;
}

export async function deleteMedia(id: string): Promise<void> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  const { error } = await db.from('media').delete().eq('id', id);
  if (error) throw error;
}

// ── Forms ──────────────────────────────────────────────────────────────────
export async function listForms(): Promise<FormDefinition[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data: forms, error } = await db
    .from('forms')
    .select('id,name,is_default')
    .order('created_at', { ascending: true });
  if (error) throw error;
  const ids = (forms ?? []).map((f) => f.id as string);
  if (ids.length === 0) return [];
  const { data: fields, error: fErr } = await db
    .from('form_fields')
    .select('id,form_id,kind,label,required,options,sort_order')
    .in('form_id', ids)
    .order('sort_order', { ascending: true });
  if (fErr) throw fErr;
  const byForm = new Map<string, FormField[]>();
  (fields ?? []).forEach((f) => {
    const arr = byForm.get(f.form_id as string) ?? [];
    arr.push({
      ...(f as unknown as FormField),
      options: Array.isArray(f.options) ? (f.options as string[]) : [],
    });
    byForm.set(f.form_id as string, arr);
  });
  return (forms ?? []).map((f) => ({
    id: f.id as string,
    name: f.name as string,
    is_default: !!f.is_default,
    fields: byForm.get(f.id as string) ?? [],
  }));
}

export async function saveForm(input: {
  id?: string;
  name: string;
  is_default: boolean;
  fields: Omit<FormField, 'id' | 'form_id'>[];
}): Promise<string> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  const org_id = await myOrgId();

  // Only one default per org: clear other defaults if we're setting this one.
  if (input.is_default) {
    await db.from('forms').update({ is_default: false }).eq('org_id', org_id).neq('id', input.id ?? '00000000-0000-0000-0000-000000000000');
  }

  let formId = input.id;
  if (formId) {
    const { error } = await db.from('forms').update({ name: input.name, is_default: input.is_default, updated_at: new Date().toISOString() }).eq('id', formId);
    if (error) throw error;
  } else {
    const { data, error } = await db.from('forms').insert({ org_id, name: input.name, is_default: input.is_default }).select('id').single();
    if (error) throw error;
    formId = data.id as string;
  }

  await db.from('form_fields').delete().eq('form_id', formId);
  if (input.fields.length > 0) {
    const { error } = await db.from('form_fields').insert(
      input.fields.map((f, i) => ({
        form_id: formId,
        kind: f.kind,
        label: f.label,
        required: f.required,
        options: f.options ?? [],
        sort_order: f.sort_order ?? i,
      })),
    );
    if (error) throw error;
  }
  return formId!;
}

export async function deleteForm(id: string): Promise<void> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  const { error } = await db.from('forms').delete().eq('id', id);
  if (error) throw error;
}

// ── Brand ──────────────────────────────────────────────────────────────────
export interface OrgBrand {
  accentHex: string | null;
  logoUrl: string | null;
}

export async function getBrand(): Promise<OrgBrand> {
  const db = getSupabase();
  if (!db) return { accentHex: null, logoUrl: null };
  const orgId = await myOrgId();
  const { data } = await db.from('orgs').select('brand_accent_hex,brand_logo_url').eq('id', orgId).maybeSingle();
  return {
    accentHex: (data?.brand_accent_hex as string | null) ?? null,
    logoUrl: (data?.brand_logo_url as string | null) ?? null,
  };
}

export async function saveBrand(patch: { accentHex?: string | null; logoUrl?: string | null }): Promise<void> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  const orgId = await myOrgId();
  const update: Record<string, unknown> = {};
  if (patch.accentHex !== undefined) update.brand_accent_hex = patch.accentHex;
  if (patch.logoUrl !== undefined) update.brand_logo_url = patch.logoUrl;
  const { error } = await db.from('orgs').update(update).eq('id', orgId);
  if (error) throw error;
}

// ── Product usage stats (for the list view) ────────────────────────────────
export interface ProductStats {
  hotspots: number;
  media: number;
  events: number;
}

/** One entry per productId. Products not in the map have zero of everything.
 *  Uses one query per resource — no aggregate SQL because we run through
 *  PostgREST which doesn't expose GROUP BY nicely; three small reads over the
 *  handful of products a customer has is fine. */
export async function listProductStats(): Promise<Map<string, ProductStats>> {
  const db = getSupabase();
  if (!db) return new Map();
  const [hs, md, sp] = await Promise.all([
    db.from('hotspots').select('product_id'),
    db.from('media').select('product_id'),
    db.from('show_products').select('product_id'),
  ]);
  const bump = (map: Map<string, ProductStats>, id: string, key: keyof ProductStats) => {
    const cur = map.get(id) ?? { hotspots: 0, media: 0, events: 0 };
    cur[key] += 1;
    map.set(id, cur);
  };
  const out = new Map<string, ProductStats>();
  (hs.data ?? []).forEach((r) => bump(out, r.product_id as string, 'hotspots'));
  (md.data ?? []).forEach((r) => bump(out, r.product_id as string, 'media'));
  (sp.data ?? []).forEach((r) => bump(out, r.product_id as string, 'events'));
  return out;
}

// ── show_products ──────────────────────────────────────────────────────────
export const MAX_PRODUCTS_PER_SHOW = 5;
export const RECOMMENDED_PRODUCTS_PER_SHOW = 3;

export async function listShowProducts(showId: string): Promise<string[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data, error } = await db
    .from('show_products')
    .select('product_id, sort_order')
    .eq('show_id', showId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => r.product_id as string);
}

export async function setShowProducts(showId: string, productIds: string[]): Promise<void> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  if (productIds.length > MAX_PRODUCTS_PER_SHOW) throw new Error(`Max ${MAX_PRODUCTS_PER_SHOW} products per event.`);
  const { error: delErr } = await db.from('show_products').delete().eq('show_id', showId);
  if (delErr) throw delErr;
  if (productIds.length === 0) return;
  const { error } = await db.from('show_products').insert(
    productIds.map((product_id, i) => ({ show_id: showId, product_id, sort_order: i })),
  );
  if (error) throw error;
}

// ── shows.form_id ─────────────────────────────────────────────────────────
export async function setShowForm(showId: string, formId: string | null): Promise<void> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  const { error } = await db.from('shows').update({ form_id: formId }).eq('id', showId);
  if (error) throw error;
}
