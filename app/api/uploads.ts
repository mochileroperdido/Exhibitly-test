// POST /api/uploads — issue a signed upload URL for the 'assets' Storage bucket.
//
// Auth: the caller's Supabase JWT (dashboard user), forwarded as
// Authorization: Bearer <access_token>. We verify the user's org membership
// and enforce path/kind/size/mime constraints server-side before signing.
//
// Object path: {org_id}/{kind}/{filename} where kind ∈ (models, media, brand).
// The Storage RLS policy in migration 0009 gates access on that first segment,
// so a signed URL to your own org's path only helps someone in your org.
import { z } from 'zod';
import { adminClient, envDiagnostic, jsonResponse } from './_kiosk';

export const config = { runtime: 'edge', regions: ['fra1'] };

const KindSchema = z.enum(['models', 'media', 'brand']);

const Body = z.object({
  kind: KindSchema,
  filename: z.string().trim().min(1).max(200),
  mime: z.string().trim().min(1).max(120),
  bytes: z.number().int().min(1).max(100 * 1024 * 1024), // hard ceiling; kind-specific caps below
});

interface Rules {
  maxBytes: number;
  allowedMime: RegExp;
  extension: RegExp;
}

const RULES: Record<z.infer<typeof KindSchema>, Rules> = {
  models: { maxBytes: 40 * 1024 * 1024, allowedMime: /^(model\/gltf-binary|application\/octet-stream)$/, extension: /\.glb$/i },
  media:  { maxBytes: 50 * 1024 * 1024, allowedMime: /^(video\/mp4|image\/(jpeg|png|webp))$/,          extension: /\.(mp4|jpg|jpeg|png|webp)$/i },
  brand:  { maxBytes:  5 * 1024 * 1024, allowedMime: /^(image\/(svg\+xml|png|jpeg|webp))$/,             extension: /\.(svg|png|jpg|jpeg|webp)$/i },
};

// Images have a tighter cap even inside the 'media' kind — video gets 50MB,
// image 5MB. Applied after the kind rule.
function tighterMediaCap(mime: string): number | null {
  if (mime.startsWith('image/')) return 5 * 1024 * 1024;
  return null;
}

function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  return base.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 200);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' });

  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return jsonResponse(401, { error: 'unauthorized' });

  const db = adminClient();

  // Verify the JWT and get the user.
  const { data: userRes, error: userErr } = await db.auth.getUser(token);
  if (userErr || !userRes?.user) return jsonResponse(401, { error: 'unauthorized' });
  const userId = userRes.user.id;

  // Resolve the caller's org via org_members.
  const { data: memberRow, error: memberErr } = await db
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (memberErr) return jsonResponse(500, { error: 'db_error', detail: memberErr.message, env: envDiagnostic() });
  if (!memberRow) return jsonResponse(403, { error: 'no_org' });
  const orgId = memberRow.org_id as string;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: 'invalid_json' });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return jsonResponse(422, { error: 'invalid', issues: parsed.error.issues });
  const { kind, filename, mime, bytes } = parsed.data;

  const rules = RULES[kind];
  if (!rules.extension.test(filename)) return jsonResponse(422, { error: 'bad_extension', kind });
  if (!rules.allowedMime.test(mime)) return jsonResponse(422, { error: 'bad_mime', kind, mime });
  const tighter = kind === 'media' ? tighterMediaCap(mime) : null;
  const cap = tighter ?? rules.maxBytes;
  if (bytes > cap) return jsonResponse(422, { error: 'too_large', kind, cap });

  const safeName = sanitizeFilename(filename);
  const path = `${orgId}/${kind}/${Date.now()}_${safeName}`;

  const { data, error } = await db.storage.from('assets').createSignedUploadUrl(path);
  if (error || !data) return jsonResponse(500, { error: 'sign_failed', detail: error?.message, env: envDiagnostic() });

  return jsonResponse(200, { ok: true, path, uploadUrl: data.signedUrl, token: data.token });
}
