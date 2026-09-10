// POST /api/leads — lead capture (PII + consent). Edge, EU region.
//
// Uses the shared _kiosk helper so that server/env errors return 500 (not 401),
// making config problems immediately diagnosable.
import { z } from 'zod';
import { adminClient, jsonResponse, resolveKiosk } from './_kiosk';

export const config = { runtime: 'edge', regions: ['fra1'] };

const LeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  interest: z.string().max(60).optional(),
  explored: z.array(z.string().max(120)).max(50).default([]),
  sessionId: z.string().max(64).optional(),
  productKey: z.string().max(64).optional(),
  consentGiven: z.literal(true), // hard gate
  consentText: z.string().min(1).max(500),
  consentVersion: z.string().min(1).max(20),
});

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });

  const db = adminClient();
  const resolved = await resolveKiosk(db, req.headers.get('x-kiosk-key'));
  if (!resolved.ok) return jsonResponse(resolved.status, { error: resolved.error });
  const { kiosk } = resolved;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }
  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) return jsonResponse(422, { error: 'invalid', issues: parsed.error.issues });
  const lead = parsed.data;

  const { error } = await db.from('leads').insert({
    org_id: kiosk.org_id,
    show_id: kiosk.show_id,
    kiosk_id: kiosk.id,
    client_session_id: lead.sessionId ?? null,
    product_key: lead.productKey ?? null,
    name: lead.name,
    email: lead.email,
    interest: lead.interest ?? null,
    explored: lead.explored,
    consent_given: lead.consentGiven,
    consent_text: lead.consentText,
    consent_version: lead.consentVersion,
  });
  if (error) return jsonResponse(500, { error: 'write_failed' });

  return jsonResponse(201, { ok: true });
}
