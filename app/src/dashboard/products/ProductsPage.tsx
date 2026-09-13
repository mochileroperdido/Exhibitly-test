import { useEffect, useState } from 'react';
import type { Product, ProductStats } from '../shared/content';
import { listProducts, listProductStats } from '../shared/content';
import { loadWithSchemaGuard } from '../shared/schemaGuard';
import { EmptyState } from '../shared/EmptyState';
import { ProductEditor } from './ProductEditor';

const UPSELL_EMAIL = 'inquiries@meetlathe.com';
const ZERO_STATS: ProductStats = { hotspots: 0, media: 0, events: 0 };

function parseRoute(hash: string): { mode: 'list' } | { mode: 'edit'; id: string | null } {
  const m = /^#\/products(?:\/([^/?]+))?/.exec(hash);
  if (!m || !m[1]) return { mode: 'list' };
  if (m[1] === 'new') return { mode: 'edit', id: null };
  return { mode: 'edit', id: m[1] };
}

export function ProductsPage() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const [products, setProducts] = useState<Product[] | null>(null);
  const [stats, setStats] = useState<Map<string, ProductStats>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    if (route.mode !== 'list') return;
    loadWithSchemaGuard('products', () => listProducts(), [] as Product[])
      .then(setProducts)
      .catch((e) => setError(e.message ?? 'load failed'));
    loadWithSchemaGuard('products:stats', () => listProductStats(), new Map())
      .then(setStats)
      .catch(() => { /* stats optional — cards fall back to zeros */ });
  }, [route.mode]);

  if (route.mode === 'edit') {
    return <ProductEditor productId={route.id} onDone={() => { window.location.hash = '#/products'; }} />;
  }

  if (products === null) return <div className="ins-page">Loading…</div>;

  if (products.length === 0) {
    return (
      <EmptyState
        icon={
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
            <path d="M3 12.5 12 17l9-4.5M3 16.5 12 21l9-4.5" />
          </svg>
        }
        title="No products yet"
        body="Upload a 3D model, set the title, subtitle and specs, then place hotspots. Products you add here are reusable across every event."
        cta={{ label: 'Upload your first 3D model', hash: '#/products/new' }}
        upsell={{
          label: "Don't have a 3D model yet? We can build one",
          href: `mailto:${UPSELL_EMAIL}?subject=3D%20modeling%20service`,
        }}
      />
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
        {products.map((p) => {
          const s = stats.get(p.id) ?? ZERO_STATS;
          return (
            <a key={p.id} className="ins-card" href={`#/products/${p.id}`}>
              <div className="ins-card-top">
                <span className="ins-card-name">{p.label}</span>
                {p.model_url && <span className="ins-badge">3D</span>}
              </div>
              {p.subtitle && <div className="ins-card-dates">{p.subtitle}</div>}
              <div className="ins-card-stats">
                <span>
                  <span className="ins-num">{s.hotspots}</span>
                  <span className="ins-card-stat-l">Hotspots</span>
                </span>
                <span>
                  <span className="ins-num">{s.media}</span>
                  <span className="ins-card-stat-l">Media</span>
                </span>
                <span>
                  <span className="ins-num">{s.events}</span>
                  <span className="ins-card-stat-l">Event{s.events === 1 ? '' : 's'}</span>
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
