import { useEffect, useState } from 'react';
import { CharInput } from '../shared/CharInput';
import { uploadAsset, validateFile, describeRules } from '../shared/upload';
import { createProduct, getProduct, updateProduct, listHotspots, upsertHotspots, deleteProduct } from '../shared/content';
import type { Product } from '../shared/content';
import { getSupabase } from '../../lib/supabase';
import { HotspotPicker, type DraftHotspot } from './HotspotPicker';

// Character budgets — see plan file.
const LABEL_MAX = 32;
const SUBTITLE_MAX = 48;
const TAGLINE_MAX = 80;
const OVERVIEW_MAX = 400;

type Step = 0 | 1 | 2;
const STEP_LABELS = ['Model', 'Details', 'Hotspots'] as const;
const UPSELL_EMAIL = 'inquiries@meetlathe.com';

export function ProductEditor({ productId, onDone }: { productId: string | null; onDone: () => void }) {
  const [step, setStep] = useState<Step>(0);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field state
  const [label, setLabel] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [overview, setOverview] = useState('');
  const [specs, setSpecs] = useState<{ label: string; value: string }[]>([]);
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [modelBytes, setModelBytes] = useState<number | null>(null);
  const [modelSignedUrl, setModelSignedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [hotspots, setHotspots] = useState<DraftHotspot[]>([]);

  useEffect(() => {
    if (!productId) return;
    (async () => {
      try {
        const p = await getProduct(productId);
        if (!p) { setError('Product not found'); return; }
        setProduct(p);
        setLabel(p.label);
        setSubtitle(p.subtitle ?? '');
        setTagline(p.tagline ?? '');
        setOverview(p.overview ?? '');
        setSpecs(p.specs ?? []);
        setModelPath(p.model_url);
        setModelBytes(p.model_bytes);
        const hs = await listHotspots(productId);
        setHotspots(hs.map((h) => ({ slug: h.slug, title: h.title, description: h.description, position: h.position, normal: h.normal })));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'load failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [productId]);

  // Sign the stored model_url on demand so the in-editor viewer can render it.
  useEffect(() => {
    if (!modelPath) { setModelSignedUrl(null); return; }
    if (modelPath.startsWith('http') || modelPath.startsWith('/')) { setModelSignedUrl(modelPath); return; }
    const db = getSupabase();
    if (!db) return;
    db.storage.from('assets').createSignedUrl(modelPath, 3600).then(({ data }) => {
      setModelSignedUrl(data?.signedUrl ?? null);
    });
  }, [modelPath]);

  async function handleModelFile(file: File) {
    const v = validateFile('models', file);
    if (!v.ok) { setError(v.reason ?? 'unsupported'); return; }
    setUploading(true);
    setError(null);
    try {
      const { path } = await uploadAsset('models', file);
      setModelPath(path);
      setModelBytes(file.size);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!label.trim()) { setError('Give the product a name.'); setStep(1); return; }
    setSaving(true);
    setError(null);
    try {
      let id = productId;
      if (!id) {
        const created = await createProduct({
          label: label.trim(),
          subtitle: subtitle || undefined,
          tagline: tagline || undefined,
          overview: overview || undefined,
          specs,
          model_url: modelPath,
          model_bytes: modelBytes,
        });
        id = created.id;
      } else {
        await updateProduct(id, {
          label: label.trim(),
          subtitle,
          tagline,
          overview,
          specs,
          model_url: modelPath,
          model_bytes: modelBytes,
        });
      }
      await upsertHotspots(id!, hotspots.map((h, i) => ({
        slug: h.slug, title: h.title, description: h.description, position: h.position, normal: h.normal, sort_order: i,
      })));
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!productId) return;
    if (!confirm(`Delete "${label}"? Events referencing it will lose it from their kiosks.`)) return;
    await deleteProduct(productId);
    onDone();
  }

  if (loading) return <div className="ins-page">Loading…</div>;

  const rules = describeRules('models');
  const sizeMB = modelBytes ? Math.round((modelBytes / (1024 * 1024)) * 100) / 100 : null;

  // Step completion is derived from the actual data, not "did the user
  // click Continue" — so on edit, past steps light up green immediately.
  const stepDone: [boolean, boolean, boolean] = [
    !!modelPath,
    label.trim().length > 0,
    hotspots.length > 0 && hotspots.every((h) => h.title && h.description),
  ];
  const canGoTo = (target: Step): boolean => {
    // In edit mode any step is jumpable. In create mode, a step is jumpable
    // if every earlier step is done, or if we're going backwards.
    if (productId) return true;
    if (target <= step) return true;
    for (let i = 0; i < target; i++) if (!stepDone[i]) return false;
    return true;
  };

  return (
    <div className="ins-page">
      <div className="ins-pagehead">
        <div>
          <nav className="ins-crumb">
            <a href="#/products">Products</a>
            <span className="ins-crumb-sep">/</span>
            <span className="ins-crumb-cur">{productId ? label || 'Edit product' : 'New product'}</span>
          </nav>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {productId && <button className="ins-btn ghost" onClick={remove}>Delete</button>}
          <button className="ins-btn ghost" onClick={onDone}>Cancel</button>
        </div>
      </div>

      <ol className="ins-stepper" aria-label="Product creation steps">
        {STEP_LABELS.map((lab, i) => {
          const done = stepDone[i];
          const active = step === i;
          const jumpable = canGoTo(i as Step);
          return (
            <li
              key={lab}
              className={
                'ins-stepper-item' +
                (active ? ' is-active' : '') +
                (done ? ' is-done' : '') +
                (jumpable ? '' : ' is-locked')
              }
            >
              <button
                type="button"
                className="ins-stepper-btn"
                onClick={() => jumpable && setStep(i as Step)}
                disabled={!jumpable}
                aria-current={active ? 'step' : undefined}
              >
                <span className="ins-stepper-circle" aria-hidden>
                  {done && !active
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                    : i + 1}
                </span>
                <span className="ins-stepper-label">{lab}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {step === 0 && (
        <section className="ins-panel">
          <h2 className="ins-h2">3D model</h2>
          <p className="ins-sub">Format: {rules.formats}. Max size: {rules.size}. For best kiosk performance target under 25 MB and around 30k triangles.</p>
          <div className="ins-dropzone" style={{ marginTop: 14 }}>
            {modelSignedUrl ? (
              <div style={{ height: 320 }}>
                <model-viewer src={modelSignedUrl} camera-controls exposure="1" shadow-intensity="0.4" style={{ width: '100%', height: '100%', background: 'var(--panel)' }} />
              </div>
            ) : <div>Drop a .glb here or</div>}
            <label className="ins-btn" style={{ marginTop: 10 }}>
              {modelPath ? 'Replace model' : 'Choose file'}
              <input
                type="file"
                accept=".glb,model/gltf-binary,application/octet-stream"
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleModelFile(f); }}
              />
            </label>
            {uploading && <p className="ins-sub" style={{ marginTop: 8 }}>Uploading…</p>}
            {sizeMB && <p className="ins-sub" style={{ marginTop: 8 }}>Uploaded: {sizeMB} MB</p>}
          </div>
          <p className="ins-sub" style={{ marginTop: 12 }}>
            Don't have a model yet? <a href={`mailto:${UPSELL_EMAIL}?subject=3D%20modeling%20service`}>We can build one for you →</a>
          </p>
        </section>
      )}

      {step === 1 && (
        <section className="ins-panel">
          <h2 className="ins-h2">Details</h2>
          <CharInput label="Product name" value={label} onChange={setLabel} max={LABEL_MAX} placeholder="e.g. Cordless Drill" />
          <div style={{ marginTop: 10 }}>
            <CharInput label="Subtitle" value={subtitle} onChange={setSubtitle} max={SUBTITLE_MAX} placeholder="One line under the name" />
          </div>
          <div style={{ marginTop: 10 }}>
            <CharInput label="Tagline" value={tagline} onChange={setTagline} max={TAGLINE_MAX} placeholder="One-line hook for the overview card" />
          </div>
          <div style={{ marginTop: 10 }}>
            <CharInput label="Overview" value={overview} onChange={setOverview} max={OVERVIEW_MAX} multiline rows={5} placeholder="2–3 sentences shown on the overview card." />
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="ins-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Specs</span>
              <button className="ins-btn" onClick={() => setSpecs([...specs, { label: '', value: '' }])}>Add spec</button>
            </div>
            {specs.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input className="ins-input" style={{ marginTop: 0, flex: 1 }} placeholder="Label" value={s.label} maxLength={30} onChange={(e) => setSpecs(specs.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} />
                <input className="ins-input" style={{ marginTop: 0, flex: 1 }} placeholder="Value" value={s.value} maxLength={40} onChange={(e) => setSpecs(specs.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x))} />
                <button className="ins-btn ghost" onClick={() => setSpecs(specs.filter((_, idx) => idx !== i))}>×</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="ins-panel">
          <h2 className="ins-h2">Hotspots <span className="ins-sub" style={{ fontSize: 13, fontWeight: 400 }}>· optional</span></h2>
          {modelSignedUrl
            ? <HotspotPicker modelUrl={modelSignedUrl} hotspots={hotspots} onChange={setHotspots} />
            : <p className="ins-sub">Upload a model first — hotspots need something to sit on.</p>
          }
        </section>
      )}

      <div className="ins-stepper-nav">
        <div>
          {step > 0 && (
            <button className="ins-btn" onClick={() => setStep((step - 1) as Step)}>← Back</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {step === 2 && hotspots.length === 0 && (
            <button className="ins-btn ghost" onClick={save} disabled={saving}>Save without hotspots</button>
          )}
          {step < 2 ? (
            <button
              className="ins-btn primary"
              onClick={() => setStep((step + 1) as Step)}
              disabled={!stepDone[step]}
              title={!stepDone[step] ? (step === 0 ? 'Upload a model first' : 'Add a product name first') : undefined}
            >
              Continue →
            </button>
          ) : (
            <button className="ins-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save product'}</button>
          )}
        </div>
      </div>

      {error && <p className="ins-warn" style={{ marginTop: 12 }}>{error}</p>}
      {product && <input type="hidden" value={product.id} />}
    </div>
  );
}
