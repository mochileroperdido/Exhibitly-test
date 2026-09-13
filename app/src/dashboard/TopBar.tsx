// Global top bar for the dashboard: brand (→ events home) on the left, section
// nav in the middle, theme + account on the right. Deliberately holds no
// filters or feature actions — those live inside each view, so the top bar
// reads as pure navigation.

export type DashSection = 'events' | 'products' | 'media' | 'forms' | 'brand';

const SECTIONS: { id: DashSection; label: string; hash: string }[] = [
  { id: 'events', label: 'Events', hash: '#/events' },
  { id: 'products', label: 'Products', hash: '#/products' },
  { id: 'media', label: 'Media', hash: '#/media' },
  { id: 'forms', label: 'Forms', hash: '#/forms' },
  { id: 'brand', label: 'Brand', hash: '#/brand' },
];

export function TopBar({
  email,
  theme,
  section,
  onToggleTheme,
  onHome,
  onNav,
  onSignOut,
}: {
  email?: string | null;
  theme: 'dark' | 'light';
  section?: DashSection;
  onToggleTheme: () => void;
  onHome: () => void;
  onNav?: (hash: string) => void;
  onSignOut?: () => void;
}) {
  return (
    <header className="ins-topbar">
      <button className="ins-logo" onClick={onHome} aria-label="Lathe — all events">
        <img
          className="ins-wordmark"
          src={
            theme === 'dark'
              ? '/brand/logos/svg/lathe-wordmark-light.svg'
              : '/brand/logos/svg/lathe-wordmark-ink.svg'
          }
          alt="Lathe"
        />
      </button>
      {onNav && (
        <nav className="ins-topnav" aria-label="Sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={'ins-topnav-link' + (section === s.id ? ' is-current' : '')}
              onClick={() => onNav(s.hash)}
              aria-current={section === s.id ? 'page' : undefined}
            >
              {s.label}
            </button>
          ))}
        </nav>
      )}
      <div className="ins-topbar-right">
        <button className="ins-iconbtn" aria-label="Toggle theme" onClick={onToggleTheme}>
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" strokeLinecap="round" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinejoin="round" /></svg>
          )}
        </button>
        {onSignOut && (
          <div className="ins-account">
            {email && <span className="ins-account-email">{email}</span>}
            <button className="ins-btn ghost" onClick={onSignOut}>Sign out</button>
          </div>
        )}
      </div>
    </header>
  );
}
