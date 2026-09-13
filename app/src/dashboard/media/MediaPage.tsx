import { useEffect, useMemo, useState } from 'react';
import type { MediaAsset, Product } from '../shared/content';
import { listMedia, listProducts, createMedia, deleteMedia } from '../shared/content';
import { uploadAsset, validateFile, describeRules } from '../shared/upload';
import { loadWithSchemaGuard } from '../shared/schemaGuard';
import { EmptyState } from '../shared/EmptyState';
import { getSupabase } from '../../lib/supabase';

interface RowWithPreview extends MediaAsset {
  previewUrl?: string | null;
}

export function MediaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<RowWithPreview[] | null>(null);
  const [filterProduct, setFilterProduct] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [prods, media] = await Promise.all([
          loadWithSchemaGuard('media:products', () => listProducts(), [] as Product[]),
          loadWithSchemaGuard('media:media', () => listMedia(), [] as MediaAsset[]),
        ]);
        setProducts(prods);
        // Pre-sign preview URLs for the grid.
        const db = getSupabase();
        const signed = await Promise.all(media.map(async (m) => {
          if (!db || m.src.startsWith('http') || m.src.startsWith('/')) return { ...m, previewUrl: m.src } as RowWithPreview;
          const { data } = await db.storage.from('assets').createSignedUrl(m.src, 3600);
          return { ...m, previewUrl: data?.signedUrl ?? null } as RowWithPreview;
        }));
        setRows(signed);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'load failed');
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return null;
    if (!filterProduct) return rows;
    return rows.filter((r) => r.product_id === filterProduct);
  }, [rows, filterProduct]);

  async function handleFile(file: File, productId: string) {
    const v = validateFile('media', file);
    if (!v.ok) { setError(v.reason ?? 'unsupported'); return; }
    setError(null);
    setUploading(true);
    try {
      const { path } = await uploadAsset('media', file);
      const type: 'video' | 'image' = file.type.startsWith('video/') ? 'video' : 'image';
      const created = await createMedia({
        product_id: productId,
        type,
        src: path,
        title: file.name.replace(/\.[^.]+$/, '').slice(0, 60),
        sort_order: rows?.filter((r) => r.product_id === productId).length ?? 0,
      });
      const db = getSupabase();
      const { data } = db ? await db.storage.from('assets').createSignedUrl(path, 3600) : { data: null };
      setRows([...(rows ?? []), { ...created, previewUrl: data?.signedUrl ?? null }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this media asset? It will disappear from any product using it.')) return;
    await deleteMedia(id);
    setRows((rs) => (rs ?? []).filter((r) => r.id !== id));
  }

  if (rows === null) return <div className="ins-page">Loading…</div>;

  const rules = describeRules('media');
  const productLabel = (id: string) => products.find((p) => p.id === id)?.label ?? '—';

  if (products.length === 0) {
    return (
      <EmptyState
        icon={
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M10 9v6l5-3-5-3Z" fill="currentColor" stroke="none" />
          </svg>
        }
        title="No media yet"
        body="Add a product first — media attaches to products, not directly to events."
        cta={{ label: 'Add a product', hash: '#/products/new' }}
      />
    );
  }

  return (
    <div className="ins-page">
      <div className="ins-pagehead">
        <div>
          <h1 className="ins-h1">Media</h1>
          <p className="ins-sub">Short how-to videos and product images. Format: {rules.formats}. Max size: {rules.size}.</p>
        </div>
      </div>

      <section className="ins-panel">
        <h2 className="ins-h2">Upload</h2>
        <p className="ins-sub" style={{ marginTop: 4 }}>Pick a product, then choose a file. Uploads attach to the selected product.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select id="upload-product" className="ins-select" defaultValue="">
            <option value="" disabled>Pick a product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <label className="ins-btn primary">
            {uploading ? 'Uploading…' : 'Choose file'}
            <input
              type="file"
              accept=".mp4,.jpg,.jpeg,.png,.webp,video/mp4,image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                const productId = (document.getElementById('upload-product') as HTMLSelectElement | null)?.value;
                if (!f) return;
                if (!productId) { setError('Pick a product first.'); return; }
                handleFile(f, productId);
                e.target.value = '';
              }}
              disabled={uploading}
            />
          </label>
        </div>
        {error && <p className="ins-warn" style={{ marginTop: 8 }}>{error}</p>}
      </section>

      <section className="ins-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="ins-h2">Library</h2>
          <select className="ins-select" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
            <option value="">All products</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>

        {(filtered?.length ?? 0) === 0 ? (
          <p className="ins-sub" style={{ marginTop: 14 }}>No media yet{filterProduct ? ' for this product' : ''}.</p>
        ) : (
          <div className="ins-media-grid">
            {filtered!.map((m) => (
              <div key={m.id} className="ins-media-tile">
                {m.previewUrl ? (
                  m.type === 'video'
                    ? <video src={m.previewUrl} muted controls className="ins-media-thumb" />
                    : <img src={m.previewUrl} alt={m.title} className="ins-media-thumb" />
                ) : <div className="ins-media-thumb" />}
                <div className="ins-media-meta">
                  <div className="ins-media-title">{m.title}</div>
                  <div className="ins-sub">{productLabel(m.product_id)} · {m.type}</div>
                </div>
                <button className="ins-btn ghost" onClick={() => remove(m.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
