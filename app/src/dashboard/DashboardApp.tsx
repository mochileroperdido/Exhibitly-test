import { useEffect, useState, type ReactNode } from 'react';
import './insights.css';
import type { Session } from '@supabase/supabase-js';
import { allEvents, PRODUCTS } from '../analytics';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase';
import { useInsights, fmtDay } from './events/useInsights';
import { Login } from './Login';
import { Sidebar, type DashSection } from './Sidebar';
import { TopBar } from './TopBar';
import { EventsHome } from './events/EventsHome';
import { EventDetail } from './events/EventDetail';
import { CommandDashboard } from './events/CommandDashboard';
import { ReportView } from './events/ReportView';
import { ProductsPage } from './products/ProductsPage';
import { MediaPage } from './media/MediaPage';
import { FormsPage } from './forms/FormsPage';
import { BrandPage } from './brand/BrandPage';

const HOME_HASH = '#/events';
const go = (h: string) => { window.location.hash = h; };

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export function DashboardApp() {
  const live = isSupabaseConfigured;
  const hash = useHash();

  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = useState<'dark' | 'light'>(prefersDark ? 'dark' : 'light');
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // Auth (live only). `undefined` = still resolving.
  const [session, setSession] = useState<Session | null | undefined>(live ? undefined : null);
  useEffect(() => {
    if (!live) return;
    const db = getSupabase();
    if (!db) return;
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [live]);

  // #/insights is kept as an alias to the old events home. Silent redirect so
  // any bookmarked link still lands people in the right place.
  useEffect(() => {
    if (hash.startsWith('#/insights')) go(HOME_HASH);
  }, [hash]);

  if (!live) return <DemoView theme={theme} onToggleTheme={toggleTheme} />;
  if (session === undefined) return <div className="ins" data-theme={theme} style={{ minHeight: '100vh' }} />;
  if (session === null) return <Login theme={theme} />;

  const eventMatch = /^#\/e\/([^/?]+)/.exec(hash);
  const section: DashSection = eventMatch
    ? 'events'
    : hash.startsWith('#/products') ? 'products'
    : hash.startsWith('#/media') ? 'media'
    : hash.startsWith('#/forms') ? 'forms'
    : hash.startsWith('#/brand') ? 'brand'
    : 'events';
  const email = session.user?.email;

  let page: ReactNode;
  if (eventMatch) page = <EventDetail showId={eventMatch[1]} onBack={() => go(HOME_HASH)} />;
  else if (section === 'products') page = <ProductsPage />;
  else if (section === 'media') page = <MediaPage />;
  else if (section === 'forms') page = <FormsPage />;
  else if (section === 'brand') page = <BrandPage />;
  else page = <EventsHome onOpen={(id) => go(`#/e/${id}`)} />;

  return (
    <div className="ins ins-shell" data-theme={theme}>
      <Sidebar
        section={section}
        email={email}
        theme={theme}
        onNav={(h) => go(h)}
        onHome={() => go(HOME_HASH)}
        onToggleTheme={toggleTheme}
        onSignOut={() => getSupabase()?.auth.signOut()}
      />
      <main className="ins-main">
        <div className="ins-wrap">{page}</div>
      </main>
    </div>
  );
}

// Local demo (no Supabase env): the seeded insights view, no events/tablets.
function DemoView({ theme, onToggleTheme }: { theme: 'dark' | 'light'; onToggleTheme: () => void }) {
  const [events] = useState(() => allEvents());
  const [productId, setProductId] = useState('');
  const [day, setDay] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const { days, agg, deltas, period } = useInsights(events, productId, day);
  const productIds = Object.keys(PRODUCTS);
  const productLabel = productId ? PRODUCTS[productId] : 'All products';

  return (
    <div className="ins" data-theme={theme}>
      <TopBar theme={theme} onToggleTheme={onToggleTheme} onHome={() => go('')} />
      <div className="ins-wrap">
        <div className="ins-detailhead">
          <nav className="ins-crumb"><span className="ins-crumb-cur">Demo · BuildTech Expo 2026</span></nav>
          <a className="ins-btn" href="#" onClick={(e) => { e.preventDefault(); go(''); }}>Back to display</a>
        </div>
        <div className="ins-filterbar">
          <div className="ins-filters">
            <span className="ins-label">Filters</span>
            <select className="ins-select" value={productId} onChange={(e) => setProductId(e.target.value)} aria-label="Product">
              <option value="">All products</option>
              {productIds.map((id) => <option key={id} value={id}>{PRODUCTS[id]}</option>)}
            </select>
            {days.length >= 2 && (
              <div className="ins-seg" role="group" aria-label="Date range">
                <button aria-pressed={day === ''} onClick={() => setDay('')}>Full event</button>
                {days.map((d) => <button key={d} aria-pressed={day === d} onClick={() => setDay(d)}>{fmtDay(d)}</button>)}
              </div>
            )}
          </div>
          <div className="ins-actions">
            <button className="ins-btn primary" onClick={() => setReportOpen(true)}>Generate report</button>
          </div>
        </div>
        <CommandDashboard agg={agg} deltas={deltas} />
      </div>
      {reportOpen && <ReportView agg={agg} showName="BuildTech Expo 2026" period={`${productLabel} · ${period}`} onClose={() => setReportOpen(false)} />}
      <div className="ins-tip" id="ins-tip" />
    </div>
  );
}
