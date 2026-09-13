import { catalog } from './data/catalog';
import type { CatalogEntry } from './data/types';
import { useKioskStore } from './store/kioskStore';
import { getKioskKey } from './lib/kioskKey';

// Bootstraps the kiosk from /api/content: replaces the hardcoded demo
// `catalog` array in place (so every existing `import { catalog } …`
// consumer sees the new products without a refactor), injects the org's
// brand accent, and stores the form definition for LeadCapture to use.
//
// Falls back silently to the compiled demo catalog if the API is
// unavailable (network blip, kiosk not paired, running local dev with no
// token) — a tablet on the show floor never boots to a blank screen.

interface ApiEntry {
  id: string;
  label: string;
  subtitle: string;
  tagline: string;
  overview: string;
  specs: { label: string; value: string }[];
  media: { id: string; type: 'video' | 'image'; src: string; title: string }[];
  modelUrl: string;
  source: string;
  fileSizeMB: number;
  triangleCount: number;
  hotspots: { id: string; title: string; description: string; position: string; normal: string }[];
}

export interface KioskFormField {
  id: string;
  kind: 'short_text' | 'email' | 'single_select';
  label: string;
  required: boolean;
  options: string[];
  sort_order: number;
}

export interface KioskForm {
  id: string;
  name: string;
  fields: KioskFormField[];
}

interface ApiResponse {
  ok: true;
  catalog: ApiEntry[];
  brand: { accentHex: string | null; logoUrl: string | null };
  form: { id: string; name: string; fields: KioskFormField[] } | null;
}

let runtimeForm: KioskForm | null = null;
let runtimeLogoUrl: string | null = null;

export function getRuntimeForm(): KioskForm | null {
  return runtimeForm;
}

export function getRuntimeLogoUrl(): string | null {
  return runtimeLogoUrl;
}

function hexToLuminance(hex: string): number {
  const c = hex.replace('#', '');
  if (c.length !== 6) return 0.5;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function darken(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return hex;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const d = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
  return `#${[d(r), d(g), d(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function applyBrand(accentHex: string): void {
  const onAccent = hexToLuminance(accentHex) < 0.5 ? '#ffffff' : '#111111';
  const existing = document.getElementById('lathe-brand-overrides');
  if (existing) existing.remove();
  const style = document.createElement('style');
  style.id = 'lathe-brand-overrides';
  style.textContent = `
:root {
  --accent: ${accentHex};
  --accent-hover: ${darken(accentHex, 0.08)};
  --accent-active: ${darken(accentHex, 0.16)};
  --on-accent: ${onAccent};
  --accent-text: ${onAccent};
}
[data-theme] {
  --accent: ${accentHex};
  --accent-hover: ${darken(accentHex, 0.08)};
  --accent-active: ${darken(accentHex, 0.16)};
  --on-accent: ${onAccent};
  --accent-text: ${onAccent};
}`;
  document.head.appendChild(style);
}

function hydrateCatalog(entries: ApiEntry[]): void {
  const mapped: CatalogEntry[] = entries.map((e) => ({
    id: e.id,
    label: e.label,
    subtitle: e.subtitle,
    tagline: e.tagline,
    overview: e.overview,
    specs: e.specs ?? [],
    media: (e.media ?? []).map((m) => ({ id: m.id, type: m.type, src: m.src, title: m.title })),
    modelUrl: e.modelUrl,
    source: e.source ?? '',
    fileSizeMB: e.fileSizeMB ?? 0,
    triangleCount: e.triangleCount ?? 0,
    hotspots: (e.hotspots ?? []).map((h) => ({
      id: h.id, title: h.title, description: h.description, position: h.position, normal: h.normal,
    })),
  }));
  catalog.length = 0;
  mapped.forEach((m) => catalog.push(m));
  const first = catalog[0]?.id;
  if (first) useKioskStore.setState({ activeEntryId: first });
}

/** Idempotent — safe to call multiple times if the bind screen re-mounts. */
export async function bootKiosk(): Promise<void> {
  const key = getKioskKey();
  if (!key) return; // no kiosk key → local demo mode, keep the compiled catalog
  try {
    const res = await fetch('/api/content', {
      headers: { 'X-Kiosk-Key': key },
      cache: 'no-store',
    });
    if (!res.ok) return;
    const data = (await res.json()) as ApiResponse;
    if (data.catalog?.length) hydrateCatalog(data.catalog);
    if (data.brand?.accentHex) applyBrand(data.brand.accentHex);
    runtimeLogoUrl = data.brand?.logoUrl ?? null;
    runtimeForm = data.form ?? null;
  } catch {
    // Silent fallback — a tablet on a flaky venue Wi-Fi still boots the demo
    // rather than a blank screen. Next reload will retry.
  }
}
