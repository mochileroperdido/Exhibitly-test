import { useEffect, useState } from 'react';
import { getBrand, saveBrand } from '../shared/content';
import { uploadAsset, validateFile } from '../shared/upload';

// Sanity-checks a "#rrggbb" (or "rrggbb") hex. Returns the normalized #rrggbb
// or null. Kept in the module so the picker can debounce feedback.
function normalizeHex(input: string): string | null {
  const s = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return `#${s.toLowerCase()}`;
}

// Simple luminance-based on-accent picker (matches what the kiosk does at
// runtime). Uses the sRGB relative-luminance formula.
function onAccentFor(hex: string): '#111111' | '#ffffff' {
  const c = hex.slice(1);
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? '#111111' : '#ffffff';
}

// Contrast ratio between two colors (both must be full #rrggbb).
function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = hex.slice(1);
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const bl = parseInt(c.slice(4, 6), 16) / 255;
    const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
  };
  const L1 = lum(a);
  const L2 = lum(b);
  const [lo, hi] = L1 < L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

export function BrandPage() {
  const [accent, setAccent] = useState<string>('#ef5f1c');
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    getBrand()
      .then((b) => {
        if (b.accentHex) setAccent(b.accentHex);
        if (b.logoUrl) {
          setLogoPath(b.logoUrl);
          // For a preview we can't sign here; if it's already a full URL
          // (rare) show it, otherwise the preview stays empty until saved
          // — the kiosk uses signed URLs at runtime.
          if (b.logoUrl.startsWith('http')) setLogoPreviewUrl(b.logoUrl);
        }
      })
      .catch(() => { /* first load may have no org row yet */ });
  }, []);

  const normalized = normalizeHex(accent);
  const onAccent = normalized ? onAccentFor(normalized) : '#111111';
  const contrast = normalized ? contrastRatio(normalized, onAccent) : 0;
  const contrastOK = contrast >= 4.5;

  async function handleLogoFile(file: File) {
    const v = validateFile('brand', file);
    if (!v.ok) {
      setStatus('error');
      setMessage(v.reason ?? 'unsupported file');
      return;
    }
    setStatus('saving');
    setMessage(null);
    try {
      const { path } = await uploadAsset('brand', file);
      setLogoPath(path);
      // Local preview while we wait for a signed URL after save.
      setLogoPreviewUrl(URL.createObjectURL(file));
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'upload failed');
    }
  }

  async function save() {
    if (!normalized) {
      setStatus('error');
      setMessage('Enter a valid hex like #ef5f1c.');
      return;
    }
    setStatus('saving');
    setMessage(null);
    try {
      await saveBrand({ accentHex: normalized, logoUrl: logoPath });
      setStatus('saved');
      setMessage('Saved. Next kiosk boot will pick these up.');
      setTimeout(() => setStatus('idle'), 2400);
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'save failed');
    }
  }

  return (
    <div className="ins-page">
      <div className="ins-pagehead">
        <div>
          <h1 className="ins-h1">Brand</h1>
          <p className="ins-sub">Your kiosk uses these instead of the default Lathe orange. One accent color and a logo — we derive hover and text-on-accent shades for you.</p>
        </div>
        <button className="ins-btn primary" onClick={save} disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="ins-brand-grid">
        <section className="ins-panel">
          <h2 className="ins-h2">Accent color</h2>
          <label className="ins-label" style={{ display: 'block', marginTop: 12 }}>
            Hex color
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
              <input
                type="color"
                value={normalized ?? '#ef5f1c'}
                onChange={(e) => setAccent(e.target.value)}
                className="ins-swatch"
                aria-label="Pick accent color"
              />
              <input
                type="text"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                placeholder="#ef5f1c"
                className="ins-input"
                style={{ flex: 1, marginTop: 0 }}
              />
            </div>
          </label>
          {normalized && !contrastOK && (
            <p className="ins-warn" style={{ marginTop: 10 }}>
              Contrast against auto-picked text ({onAccent}) is {contrast.toFixed(2)}:1 — below the WCAG AA target of 4.5:1. Consider a darker or lighter accent.
            </p>
          )}
          <div style={{ marginTop: 16 }}>
            <div className="ins-label" style={{ marginBottom: 6 }}>Preview</div>
            <div
              className="ins-brand-preview"
              style={{ background: normalized ?? '#ef5f1c', color: onAccent }}
            >
              <span>Leave your details</span>
            </div>
          </div>
        </section>

        <section className="ins-panel">
          <h2 className="ins-h2">Logo</h2>
          <p className="ins-sub" style={{ marginTop: 4 }}>SVG, PNG, JPG or WebP, up to 5&nbsp;MB. Shown on the kiosk's watermark and login screen.</p>
          <div
            className={'ins-dropzone' + (dragOver ? ' is-drag' : '')}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleLogoFile(f);
            }}
          >
            {logoPreviewUrl ? (
              <img src={logoPreviewUrl} alt="Logo preview" className="ins-logo-preview" />
            ) : (
              <div>Drop a logo here, or</div>
            )}
            <label className="ins-btn" style={{ marginTop: 10 }}>
              Choose file
              <input
                type="file"
                accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoFile(f);
                }}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </section>
      </div>

      {message && (
        <p className={status === 'error' ? 'ins-warn' : 'ins-ok'} style={{ marginTop: 12 }}>{message}</p>
      )}
    </div>
  );
}
