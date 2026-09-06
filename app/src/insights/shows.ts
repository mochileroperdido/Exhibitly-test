import { getSupabase } from '../lib/supabase';

// Dashboard-side management of shows and their tablets (kiosks). All writes go
// through supabase-js as the authenticated user; RLS scopes them to the user's
// org (see 0003_dashboard.sql). Per-tablet tokens are generated here: the
// plaintext token is stored (so the link is always recoverable) alongside its
// sha256, which is what the ingestion API matches on.

export interface Show {
  id: string;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
}

export interface Kiosk {
  id: string;
  label: string;
  token: string | null;
  active: boolean;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `k_${b64}`;
}

/** Base origin for kiosk links: an explicit env, else the current host with the
 * dashboard/app subdomain swapped for `kiosk.`, else the current origin. */
export function kioskBaseUrl(): string {
  const env = import.meta.env.VITE_KIOSK_BASE_URL as string | undefined;
  if (env) return env.replace(/\/$/, '');
  const { protocol, host } = window.location;
  const swapped = host.replace(/^(dashboard|app)\./, 'kiosk.');
  return `${protocol}//${swapped}`;
}

export function kioskLink(token: string): string {
  return `${kioskBaseUrl()}/?k=${encodeURIComponent(token)}`;
}

async function myOrgId(): Promise<string> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  const { data, error } = await db.from('org_members').select('org_id').limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Your account is not linked to an organization yet.');
  return data.org_id as string;
}

export async function listShows(): Promise<Show[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data, error } = await db
    .from('shows')
    .select('id,name,starts_on,ends_on')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Show[];
}

export async function getShow(id: string): Promise<Show | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db.from('shows').select('id,name,starts_on,ends_on').eq('id', id).maybeSingle();
  return (data as Show) ?? null;
}

/** Headline counts for an event card: total leads + sessions. */
export async function eventStats(showId: string): Promise<{ leads: number; sessions: number }> {
  const db = getSupabase();
  if (!db) return { leads: 0, sessions: 0 };
  const [{ count: leads }, { count: sessions }] = await Promise.all([
    db.from('leads').select('*', { count: 'exact', head: true }).eq('show_id', showId),
    db.from('events').select('*', { count: 'exact', head: true }).eq('show_id', showId).eq('type', 'session_start'),
  ]);
  return { leads: leads ?? 0, sessions: sessions ?? 0 };
}

export async function listKiosks(showId: string): Promise<Kiosk[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data, error } = await db
    .from('kiosks')
    .select('id,label,token,active')
    .eq('show_id', showId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Kiosk[];
}

export async function createKiosk(showId: string, orgId: string, label: string): Promise<Kiosk> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  const token = randomToken();
  const { data, error } = await db
    .from('kiosks')
    .insert({ org_id: orgId, show_id: showId, label, token, key_hash: await sha256Hex(token), active: true })
    .select('id,label,token,active')
    .single();
  if (error) throw error;
  return data as Kiosk;
}

export async function createShow(input: {
  name: string;
  startsOn?: string;
  endsOn?: string;
  privacyUrl?: string;
}): Promise<{ show: Show; kiosk: Kiosk }> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  const orgId = await myOrgId();
  const { data, error } = await db
    .from('shows')
    .insert({
      org_id: orgId,
      name: input.name,
      starts_on: input.startsOn || null,
      ends_on: input.endsOn || null,
      privacy_url: input.privacyUrl || null,
    })
    .select('id,name,starts_on,ends_on')
    .single();
  if (error) throw error;
  const show = data as Show;
  const kiosk = await createKiosk(show.id, orgId, 'Tablet 1');
  return { show, kiosk };
}

export async function addTablet(showId: string, label: string): Promise<Kiosk> {
  return createKiosk(showId, await myOrgId(), label);
}

export async function setKioskActive(id: string, active: boolean): Promise<void> {
  const db = getSupabase();
  if (!db) throw new Error('not configured');
  const { error } = await db.from('kiosks').update({ active }).eq('id', id);
  if (error) throw error;
}
