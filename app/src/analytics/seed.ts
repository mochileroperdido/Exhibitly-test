import type { AnalyticsEvent } from './types';

// Deterministic demo data: a realistic anonymous event stream across three
// products and two show days. Generated (not hand-listed) so the aggregates,
// product filter, and day-over-day deltas are all genuinely computed.

export const PRODUCTS: Record<string, string> = {
  'drill-new': 'Cordless Drill',
  'impact-driver': 'Impact Driver',
  'angle-grinder': 'Angle Grinder',
};

interface Feat { title: string; tapProb: number; dwell: number }
const FEATURES: Record<string, Feat[]> = {
  'drill-new': [
    { title: 'Keyless Chuck', tapProb: 0.85, dwell: 14 },
    { title: '24-Position Clutch', tapProb: 0.68, dwell: 19 },
    { title: 'Variable-Speed Trigger', tapProb: 0.58, dwell: 11 },
    { title: 'LED Work Light', tapProb: 0.42, dwell: 6 },
    { title: 'Compact Li-Ion Battery', tapProb: 0.40, dwell: 16 },
  ],
  'impact-driver': [
    { title: 'Hex Quick-Release', tapProb: 0.72, dwell: 12 },
    { title: 'Brushless Motor', tapProb: 0.6, dwell: 17 },
    { title: '3-Speed Selector', tapProb: 0.5, dwell: 10 },
    { title: 'Belt Hook', tapProb: 0.3, dwell: 5 },
  ],
  'angle-grinder': [
    { title: 'Tool-Free Guard', tapProb: 0.7, dwell: 13 },
    { title: 'Spindle Lock', tapProb: 0.55, dwell: 9 },
    { title: 'Anti-Vibration Handle', tapProb: 0.5, dwell: 15 },
    { title: 'Restart Protection', tapProb: 0.45, dwell: 12 },
  ],
};
const VIDEOS: Record<string, { title: string; base: number }[]> = {
  'drill-new': [
    { title: 'Right-angle drilling in tight spaces', base: 0.61 },
    { title: 'Installing a drill bit', base: 0.72 },
  ],
  'impact-driver': [{ title: 'Driving long screws without stripping', base: 0.66 }],
  'angle-grinder': [
    { title: 'Cutting rebar safely', base: 0.58 },
    { title: 'Changing the disc', base: 0.7 },
  ],
};

// Sessions per product per day — the drill is the hero exhibit.
const SESSIONS: Record<string, [number, number]> = {
  'drill-new': [78, 96],
  'impact-driver': [42, 50],
  'angle-grinder': [30, 34],
};
const DAYS = ['2026-04-14', '2026-04-15'];
const HOUR_WEIGHTS = [3, 5, 8, 10, 9, 7, 10, 12, 8, 5]; // 9a..6p, peak 4p
const NAMES = [
  ['Marta Okoye', 'brightbuild.co'], ['Dan Reyes', 'fitoutpro.com'], ['Lena Fuchs', 'holzwerk.de'],
  ['Sam Whitfield', 'contractline.co.uk'], ['Priya Nair', 'urbanfitworks.in'], ['Tomás Vidal', 'maderamx.com'],
  ['Aisha Bello', 'naijabuild.ng'], ['Karl Jensen', 'nordfab.dk'], ['Elena Rossi', 'ferramenta.it'],
  ['Mike Tran', 'coastbuilders.com'], ['Sofia Duarte', 'obraviva.pt'], ['Raj Patel', 'toolhub.in'],
  ['Anna Kowalski', 'budex.pl'], ['Chris Bauer', 'werkstatt.de'],
];
const INTERESTS: [string, number][] = [['Pricing', 0.47], ['Demo unit', 0.36], ['Partnership', 0.17]];

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickHour = (r: number) => {
  const total = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);
  let x = r * total;
  for (let i = 0; i < HOUR_WEIGHTS.length; i++) { x -= HOUR_WEIGHTS[i]; if (x <= 0) return 9 + i; }
  return 18;
};
const pickInterest = (r: number) => {
  let x = r; for (const [name, p] of INTERESTS) { x -= p; if (x <= 0) return name; } return 'Pricing';
};

export function generateSeed(): AnalyticsEvent[] {
  const rand = mulberry32(20260414);
  const events: AnalyticsEvent[] = [];
  let n = 0;
  const push = (type: AnalyticsEvent['type'], ts: number, sessionId: string, productId: string, payload?: Record<string, unknown>) =>
    events.push({ id: `s${n++}`, type, ts, sessionId, productId, payload });

  for (const productId of Object.keys(PRODUCTS)) {
    const feats = FEATURES[productId];
    const vids = VIDEOS[productId];
    DAYS.forEach((day, di) => {
      const count = SESSIONS[productId][di];
      for (let i = 0; i < count; i++) {
        const hour = pickHour(rand());
        const start = new Date(`${day}T00:00:00`).getTime() + hour * 3600e3 + Math.floor(rand() * 3600e3);
        const sid = `${productId}-${di}-${i}`;
        push('session_start', start, sid, productId);
        push('product_view', start + 200, sid, productId);

        const engaged = rand() < 0.78;
        const explored: string[] = [];
        let t = start + 1500;
        if (engaged) {
          for (const f of feats) {
            if (rand() < f.tapProb) {
              const dwellMs = Math.round((f.dwell * (0.7 + rand() * 0.6)) * 1000);
              t += 800 + Math.floor(rand() * 1500);
              push('hotspot_open', t, sid, productId, { title: f.title, dwellMs });
              explored.push(f.title);
              t += dwellMs;
            }
          }
          vids.forEach((v, vi) => {
            if (rand() < (vi === 0 ? 0.4 : 0.24)) {
              const completion = Math.max(0.2, Math.min(1, v.base + (rand() - 0.5) * 0.3));
              t += 1200;
              push('video_play', t, sid, productId, { title: v.title, completion });
              explored.push(v.title);
              t += Math.round(completion * 30000);
            }
          });
        }
        const durationMs = Math.max(15000, t - start + Math.floor(rand() * 20000));
        push('session_end', start + durationMs, sid, productId, { durationMs });

        if (engaged && rand() < 0.25) {
          const [name, domain] = NAMES[Math.floor(rand() * NAMES.length)];
          const email = name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') + '@' + domain;
          push('lead_capture', start + durationMs - 2000, sid, productId, {
            name, email, interest: pickInterest(rand()), explored,
          });
        }
      }
    });
  }
  return events;
}
