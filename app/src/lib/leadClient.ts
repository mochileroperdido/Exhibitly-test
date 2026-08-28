// Kiosk-side lead delivery. Leads are valuable + low-volume, so each one is
// buffered to localStorage first and POSTed to /api/leads, surviving booth-wifi
// dropouts: the queue flushes on submit, on reconnect, and on page hide. Uses a
// plain fetch with the scoped kiosk key — no Supabase client on the kiosk.
//
// Live only when VITE_KIOSK_KEY is set; otherwise this is a no-op and leads live
// only in the local store (demo/preview behaviour is unchanged).

const KIOSK_KEY = import.meta.env.VITE_KIOSK_KEY as string | undefined;
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
const QUEUE_KEY = 'lathe-lead-queue';

export const liveLeadsEnabled = Boolean(KIOSK_KEY);

export interface LeadPayload {
  name: string;
  email: string;
  interest?: string;
  explored: string[];
  sessionId?: string;
  productKey?: string;
  consentGiven: true;
  consentText: string;
  consentVersion: string;
}

function read(): LeadPayload[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as LeadPayload[]) : [];
  } catch {
    return [];
  }
}

function write(items: LeadPayload[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable — drop silently rather than throw on the kiosk */
  }
}

let inFlight = false;

/** Deliver everything queued. Keeps items on network/5xx/auth errors; drops only
 * on unrecoverable client errors (malformed payload). */
export async function flushLeads(): Promise<void> {
  if (!KIOSK_KEY || inFlight) return;
  const queue = read();
  if (queue.length === 0) return;
  inFlight = true;
  const remaining: LeadPayload[] = [];
  try {
    for (const lead of queue) {
      try {
        const res = await fetch(`${API_BASE}/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Kiosk-Key': KIOSK_KEY },
          body: JSON.stringify(lead),
          keepalive: true,
        });
        // 400/422 = malformed and will never succeed → drop. Everything else
        // (network throw, 401, 5xx) → keep for the next flush.
        if (!res.ok && res.status !== 400 && res.status !== 422) remaining.push(lead);
      } catch {
        remaining.push(lead);
      }
    }
  } finally {
    write(remaining);
    inFlight = false;
  }
}

/** Queue a lead and try to deliver immediately. No-op off-network is safe — it
 * stays queued. In demo mode (no kiosk key) this does nothing. */
export function queueLead(lead: LeadPayload): void {
  if (!KIOSK_KEY) return;
  write([...read(), lead]);
  void flushLeads();
}

if (KIOSK_KEY && typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushLeads());
  window.addEventListener('pagehide', () => void flushLeads());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushLeads();
  });
  // Deliver anything left from a previous session.
  void flushLeads();
}
