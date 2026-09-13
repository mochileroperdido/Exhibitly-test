import { useEffect, useState } from 'react';
import { getSupabase } from '../../lib/supabase';

// Resolves the caller's org_id via org_members. Cached module-scoped so every
// page after the first hits memory. `null` = still resolving; a throw only
// happens if the account isn't linked to an org (which surfaces as a visible
// dashboard error on the first section that needs an org).
let cached: Promise<string> | null = null;

export function myOrgId(): Promise<string> {
  if (cached) return cached;
  cached = (async () => {
    const db = getSupabase();
    if (!db) throw new Error('not configured');
    const { data, error } = await db.from('org_members').select('org_id').limit(1).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Your account is not linked to an organization yet.');
    return data.org_id as string;
  })();
  return cached;
}

export function useMyOrgId(): { orgId: string | null; error: string | null } {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    myOrgId()
      .then((id) => { if (alive) setOrgId(id); })
      .catch((e: Error) => { if (alive) setError(e.message ?? 'org lookup failed'); });
    return () => { alive = false; };
  }, []);
  return { orgId, error };
}
