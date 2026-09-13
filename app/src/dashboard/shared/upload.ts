import { getSupabase } from '../../lib/supabase';

// Client-side wrapper around POST /api/uploads: signs the upload, then PUTs
// the file to Storage. Returns the object path so callers can persist it (as
// products.model_url, media.src, or orgs.brand_logo_url).
//
// Rules (mirrored on the server; kept here for fast client feedback so the
// user doesn't wait on a network round-trip to learn a .fbx isn't allowed).
export type UploadKind = 'models' | 'media' | 'brand';

interface ClientRule {
  maxBytes: number;
  extension: RegExp;
  mimeAllowlist: RegExp;
  humanFormats: string;
  humanSize: string;
}

const RULES: Record<UploadKind, ClientRule> = {
  models: {
    maxBytes: 40 * 1024 * 1024,
    extension: /\.glb$/i,
    mimeAllowlist: /^(model\/gltf-binary|application\/octet-stream)?$/, // some browsers report ''
    humanFormats: '.glb',
    humanSize: '40 MB',
  },
  media: {
    maxBytes: 50 * 1024 * 1024,
    extension: /\.(mp4|jpg|jpeg|png|webp)$/i,
    mimeAllowlist: /^(video\/mp4|image\/(jpeg|png|webp))?$/,
    humanFormats: '.mp4, .jpg, .png, .webp',
    humanSize: '50 MB (5 MB for images)',
  },
  brand: {
    maxBytes: 5 * 1024 * 1024,
    extension: /\.(svg|png|jpg|jpeg|webp)$/i,
    mimeAllowlist: /^(image\/(svg\+xml|png|jpeg|webp))?$/,
    humanFormats: '.svg, .png, .jpg, .webp',
    humanSize: '5 MB',
  },
};

export function describeRules(kind: UploadKind): { formats: string; size: string } {
  const r = RULES[kind];
  return { formats: r.humanFormats, size: r.humanSize };
}

export interface UploadValidation {
  ok: boolean;
  reason?: string;
}

export function validateFile(kind: UploadKind, file: File): UploadValidation {
  const r = RULES[kind];
  if (!r.extension.test(file.name)) return { ok: false, reason: `Only ${r.humanFormats} allowed here.` };
  if (!r.mimeAllowlist.test(file.type ?? '')) return { ok: false, reason: `Unsupported file type: ${file.type || 'unknown'}.` };
  if (file.size > r.maxBytes) return { ok: false, reason: `File is too large — max ${r.humanSize}.` };
  // Image inside 'media' has a tighter cap.
  if (kind === 'media' && file.type.startsWith('image/') && file.size > 5 * 1024 * 1024) {
    return { ok: false, reason: 'Image is too large — max 5 MB.' };
  }
  return { ok: true };
}

/** Uploads `file` to the assets bucket under `{orgId}/{kind}/...` and returns
 *  the storage path (persist this, not a signed URL). */
export async function uploadAsset(kind: UploadKind, file: File): Promise<{ path: string }> {
  const check = validateFile(kind, file);
  if (!check.ok) throw new Error(check.reason);

  const db = getSupabase();
  if (!db) throw new Error('not configured');
  const { data: session } = await db.auth.getSession();
  const accessToken = session?.session?.access_token;
  if (!accessToken) throw new Error('sign in again');

  const signRes = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ kind, filename: file.name, mime: file.type || 'application/octet-stream', bytes: file.size }),
  });
  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({ error: 'sign_failed' }));
    throw new Error(err.error ?? 'sign_failed');
  }
  const { path, uploadUrl } = (await signRes.json()) as { path: string; uploadUrl: string };

  // supabase-js signs a full URL; PUT to it with the file body.
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
  if (!put.ok) throw new Error(`upload_failed: ${put.status}`);

  return { path };
}
