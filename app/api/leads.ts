// POST /api/leads — lead capture (PII + consent). Edge, EU region.
//
// Uses the shared _kiosk helper so that server/env errors return 500 (not 401),
// making config problems immediately diagnosable.
import { z } from 'zod';
import { adminClient, envDiagnostic, jsonResponse, resolveKiosk } from './_kiosk';

export const config = { runtime: 'edge', regions: ['fra1'] };

const LeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  interest: z.string().max(60).optional(),
  explored: z.array(z.string().max(120)).max(50).default([]),
  alsoViewed: z.array(z.string().max(120)).max(20).default([]),
  sessionId: z.string().max(64).optional(),
  productKey: z.string().max(64).optional(),
  // Dynamic-form answers keyed by form_field.id. Bounded to keep a bad client
  // from writing arbitrary JSON; server-side validation against form_fields
  // happens below.
  answers: z.record(z.string().max(64), z.string().max(400)).optional(),
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

  // Validate dynamic answers against the show's form (or the org default). We
  // fail closed: any field id that doesn't belong to this show's form is
  // rejected so a client can't spray arbitrary keys into leads.answers.
  const answers = lead.answers ?? {};
  let validatedAnswers: Record<string, string> = {};
  if (Object.keys(answers).length > 0) {
    const { data: showRow } = await db
      .from('shows').select('form_id').eq('id', kiosk.show_id).maybeSingle();
    let formId = (showRow?.form_id as string | null) ?? null;
    if (!formId) {
      const { data: defRow } = await db
        .from('forms').select('id').eq('org_id', kiosk.org_id).eq('is_default', true).maybeSingle();
      formId = (defRow?.id as string | null) ?? null;
    }
    if (formId) {
      const { data: fields } = await db
        .from('form_fields').select('id, kind, required, options').eq('form_id', formId);
      const byId = new Map<string, { kind: string; required: boolean; options: unknown }>(
        (fields ?? []).map((f) => [f.id as string, { kind: f.kind as string, required: f.required as boolean, options: f.options }]),
      );
      const emailSchema = z.string().email();
      for (const [fid, val] of Object.entries(answers)) {
        const spec = byId.get(fid);
        if (!spec) continue; // drop unknown keys silently
        if (spec.kind === 'single_select') {
          const opts = Array.isArray(spec.options) ? spec.options as string[] : [];
          if (!opts.includes(val)) continue; // drop values outside the allowed set
        }
        if (spec.kind === 'email') {
          const parsed = emailSchema.safeParse(val.trim());
          if (!parsed.success) continue; // drop malformed emails
        }
        validatedAnswers[fid] = val;
      }
    }
  }

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
    also_viewed: lead.alsoViewed,
    answers: validatedAnswers,
    consent_given: lead.consentGiven,
    consent_text: lead.consentText,
    consent_version: lead.consentVersion,
  });
  if (error) return jsonResponse(500, { error: 'write_failed', detail: error.message, env: envDiagnostic() });

  return jsonResponse(201, { ok: true });
}
