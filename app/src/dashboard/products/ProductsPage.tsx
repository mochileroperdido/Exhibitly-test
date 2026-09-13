import { useEffect, useState } from 'react';
import type { Product } from '../shared/content';
import { listProducts } from '../shared/content';
import { ProductEditor } from './ProductEditor';

function parseRoute(hash: string): { mode: 'list' } | { mode: 'edit'; id: string | null } {
  const m = /^#\/products(?:\/([^/?]+))?/.exec(hash);
  if (!m || !m[1]) return { mode: 'list' };
  if (m[1] === 'new') return { mode: 'edit', id: null };
  return { mode: 'edit', id: m[1] };
}

export function ProductsPage() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    if (route.mode !== 'list') return;
    listProducts().then(setProducts).catch((e) => setError(e.message ?? 'load failed'));
  }, [route.mode]);

  if (route.mode === 'edit') {
    return <ProductEditor productId={route.id} onDone={() => { window.location.hash = '#/products'; }} />;
  }

  if (products === null) return <div className="ins-page">Loading…</div>;

  if (products.length === 0) {
    return (
      <div className="ins-empty">
        <h1 className="ins-empty-title">Products</h1>
        <p className="ins-empty-body">Upload a 3D model, set the title, subtitle and specs, then place hotspots on the model. Products you add here are reusable across every event.</p>
        <a className="ins-btn primary" href="#/products/new">Upload your first 3D model</a>
        <p className="ins-empty-note">Don't have a 3D model yet? <a href="mailto:hello@meetlathe.com?subject=3D%20modeling%20service">We can build one for you →</a></p>
      </div>
    );
  }

  return (
    <div className="ins-page">
      <div className="ins-pagehead">
        <div>
          <h1 className="ins-h1">Products</h1>
          <p className="ins-sub">{products.length} product{products.length === 1 ? '' : 's'} in your library. Reuse them across any event.</p>
        </div>
        <a className="ins-btn primary" href="#/products/new">New product</a>
      </div>
      {error && <p className="ins-warn">{error}</p>}
      <div className="ins-cards">
        {products.map((p) => (
          <a key={p.id} className="ins-card" href={`#/products/${p.id}`}>
            <div className="ins-card-top">
              <span className="ins-card-name">{p.label}</span>
              {p.model_url && <span className="ins-badge">3D</span>}
            </div>
            {p.subtitle && <div className="ins-card-dates">{p.subtitle}</div>}
            <div className="ins-card-stats">
              <span>
                <span className="ins-num">{p.model_bytes ? `${(p.model_bytes / 1024 / 1024).toFixed(1)} MB` : '—'}</span>
                <span className="ins-card-stat-l">Model</span>
              </span>
              <span>
                <span className="ins-num">{p.triangle_count ? p.triangle_count.toLocaleString() : '—'}</span>
                <span className="ins-card-stat-l">Triangles</span>
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
