import type { ReactNode } from 'react';

// Shared empty state used by Products / Media / Forms lists. One icon, one
// heading, one line of body, one primary CTA. An optional `upsell` line
// (a plain hyperlink) is allowed only on Products because it drives revenue.
export function EmptyState({
  icon,
  title,
  body,
  cta,
  upsell,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  cta?: { label: string; hash: string; onClick?: () => void };
  upsell?: { label: string; href: string };
}) {
  return (
    <div className="ins-empty">
      <div className="ins-empty-icon" aria-hidden>{icon}</div>
      <h1 className="ins-empty-title">{title}</h1>
      <p className="ins-empty-body">{body}</p>
      {cta && (
        cta.onClick
          ? <button type="button" className="ins-btn primary" onClick={cta.onClick}>{cta.label}</button>
          : <a className="ins-btn primary" href={cta.hash}>{cta.label}</a>
      )}
      {upsell && (
        <p className="ins-empty-note">
          <a href={upsell.href}>{upsell.label} →</a>
        </p>
      )}
    </div>
  );
}
