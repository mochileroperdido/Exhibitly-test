import { useEffect, useState, type ReactElement } from 'react';

export type DashSection = 'events' | 'products' | 'media' | 'forms' | 'brand';

interface SectionDef {
  id: DashSection;
  label: string;
  hash: string;
  icon: (props: { size: number }) => ReactElement;
}

// Inline SVG icons — no font/glyph dependency, works in both themes via
// currentColor. Each icon reads at 18px in the sidebar; a stroke width of 1.6
// keeps them crisp at 60px collapsed width without needing an icon font.
const Icon = {
  events: ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" />
    </svg>
  ),
  products: ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
      <path d="M3 12.5 12 17l9-4.5M3 16.5 12 21l9-4.5" />
    </svg>
  ),
  media: ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M10 9v6l5-3-5-3Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  forms: ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  ),
  brand: ({ size }: { size: number }) => (
    // Color-palette / swatch. Three overlapping rounded rectangles suggest
    // stackable brand swatches — reads as "brand / palette", not "prohibited".
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3a9 9 0 1 0 8.94 10.1c.2-1.34-.94-2.1-2.14-2.1H16a2 2 0 0 1-2-2V7.14c0-1.2-.76-2.34-2.1-2.14A9.03 9.03 0 0 0 12 3Z" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
};

const SECTIONS: SectionDef[] = [
  { id: 'events',   label: 'Events',   hash: '#/events',   icon: Icon.events },
  { id: 'products', label: 'Products', hash: '#/products', icon: Icon.products },
  { id: 'media',    label: 'Media',    hash: '#/media',    icon: Icon.media },
  { id: 'forms',    label: 'Forms',    hash: '#/forms',    icon: Icon.forms },
  { id: 'brand',    label: 'Brand',    hash: '#/brand',    icon: Icon.brand },
];

const STORE_KEY = 'lathe-sidebar-collapsed';

function readInitialCollapsed(): boolean {
  try {
    return localStorage.getItem(STORE_KEY) === '1';
  } catch {
    return false;
  }
}

export function Sidebar({
  section,
  email,
  theme,
  onNav,
  onHome,
  onToggleTheme,
  onSignOut,
}: {
  section: DashSection;
  email?: string | null;
  theme: 'dark' | 'light';
  onNav: (hash: string) => void;
  onHome: () => void;
  onToggleTheme: () => void;
  onSignOut?: () => void;
}) {
  const [collapsed, setCollapsed] = useState<boolean>(readInitialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [collapsed]);

  // Alt+1..5 jumps sections. Doesn't fire while typing in an input; the
  // Alt modifier keeps it out of the way of browser and OS shortcuts.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const active = document.activeElement;
      const tag = active?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < SECTIONS.length) {
        e.preventDefault();
        onNav(SECTIONS[idx].hash);
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onNav]);

  // Close the mobile drawer on nav.
  const navigate = (hash: string) => {
    onNav(hash);
    setMobileOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="ins-mobiletoggle"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {mobileOpen && <div className="ins-sidebar-scrim" onClick={() => setMobileOpen(false)} />}

      <aside
        className={
          'ins-sidebar' +
          (collapsed ? ' is-collapsed' : '') +
          (mobileOpen ? ' is-mobile-open' : '')
        }
        aria-label="Main navigation"
      >
        <button className="ins-sidebar-brand" onClick={onHome} aria-label="Lathe — all events">
          {collapsed ? (
            // Real brand glyph — the same stylized "L" the favicon uses.
            // currentColor lets it inherit ink so it reads correctly in both
            // themes without an orange placeholder pill.
            <img
              className="ins-sidebar-monogram"
              src="/brand/logos/svg/lathe-favicon-l.svg"
              alt="Lathe"
            />
          ) : (
            <img
              className="ins-wordmark"
              src={theme === 'dark' ? '/brand/logos/svg/lathe-wordmark-light.svg' : '/brand/logos/svg/lathe-wordmark-ink.svg'}
              alt="Lathe"
            />
          )}
        </button>

        <nav className="ins-sidebar-nav">
          {SECTIONS.map((s) => {
            const Ico = s.icon;
            const isCurrent = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={'ins-sidebar-link' + (isCurrent ? ' is-current' : '')}
                aria-current={isCurrent ? 'page' : undefined}
                title={collapsed ? s.label : undefined}
                onClick={() => navigate(s.hash)}
              >
                <span className="ins-sidebar-icon"><Ico size={18} /></span>
                <span className="ins-sidebar-label">{s.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="ins-sidebar-foot">
          {email && (
            <div className="ins-sidebar-account" title={collapsed ? email : undefined}>
              <span className="ins-sidebar-avatar">{(email[0] ?? '?').toUpperCase()}</span>
              <span className="ins-sidebar-email">{email}</span>
            </div>
          )}

          <div className="ins-sidebar-footrow">
            {onSignOut && (
              <button
                type="button"
                className="ins-sidebar-iconbtn"
                onClick={onSignOut}
                aria-label="Sign out"
                title="Sign out"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 17l5-5-5-5M20 12H9M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="ins-sidebar-iconbtn"
              onClick={onToggleTheme}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
              )}
            </button>
            <button
              type="button"
              className="ins-sidebar-iconbtn"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
