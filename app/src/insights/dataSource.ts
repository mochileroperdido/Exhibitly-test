import type { AnalyticsEvent } from '../analytics';
import { getSupabase } from '../lib/supabase';

// Authenticated dashboard data layer. Reads the signed-in user's rows from
// Supabase (RLS scopes them to their org, combining every kiosk at the show),
// and adapts them into the exact shapes the existing aggregation + charts
// already consume — so `aggregate()`, CommandDashboard and ReportView render
// unchanged. Leads (PII) live only in the `leads` table; here they're turned
// into in-memory `lead_capture` events so the dashboard's leads count, interest
// split, and conversion rate compute the same way they do for the demo.

export interface LeadRow {
  id: string;
  name: string;
  email: string;
  interest: string | null;
  explored: string[];
  product_key: string | null;
  client_session_id: string | null;
  captured_at: string;
}

export interface InsightsData {
  events: AnalyticsEvent[];
  leads: LeadRow[];
  showName: string;
}

interface EventRow {
  id: string;
  type: AnalyticsEvent['type'];
  ts: string;
  client_session_id: string;
  product_key: string | null;
  payload: Record<string, unknown> | null;
}

export async function loadInsights(): Promise<InsightsData> {
  const db = getSupabase();
  if (!db) return { events: [], leads: [], showName: '' };

  const [{ data: eventRows, error: eErr }, { data: leadRows, error: lErr }, { data: showRows }] =
    await Promise.all([
      db.from('events').select('id,type,ts,client_session_id,product_key,payload').order('ts'),
      db
        .from('leads')
        .select('id,name,email,interest,explored,product_key,client_session_id,captured_at')
        .order('captured_at', { ascending: false }),
      db.from('shows').select('name').limit(1),
    ]);
  if (eErr) throw eErr;
  if (lErr) throw lErr;

  const leads = (leadRows ?? []) as LeadRow[];
  const showName = (showRows?.[0]?.name as string | undefined) ?? 'Your show';

  const events: AnalyticsEvent[] = (eventRows ?? []).map((r: EventRow) => ({
    id: r.id,
    type: r.type,
    ts: Date.parse(r.ts),
    sessionId: r.client_session_id,
    productId: r.product_key ?? '',
    payload: r.payload ?? undefined,
  }));

  // Reconstruct lead_capture events from the leads table (dashboard-only, authed).
  for (const l of leads) {
    events.push({
      id: `lead-${l.id}`,
      type: 'lead_capture',
      ts: Date.parse(l.captured_at),
      sessionId: l.client_session_id ?? '',
      productId: l.product_key ?? '',
      payload: {
        name: l.name,
        email: l.email,
        interest: l.interest ?? '',
        explored: Array.isArray(l.explored) ? l.explored : [],
      },
    });
  }

  return { events, leads, showName };
}
