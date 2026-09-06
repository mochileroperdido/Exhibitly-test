import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser Supabase client for the DASHBOARD only (magic-link auth + RLS-scoped
// reads). Uses the publishable/anon key, which is safe to ship — every table is
// protected by Row Level Security. Returns null when Supabase isn't configured,
// which is how the app stays a fully local demo (the Vercel preview with no env).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}
