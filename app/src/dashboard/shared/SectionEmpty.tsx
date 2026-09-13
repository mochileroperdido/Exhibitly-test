// Placeholder empty state shared by every new dashboard section until its full
// UI ships. Renders inside the standard .ins-wrap so it inherits the dashboard
// page frame.
export function SectionEmpty({
  title,
  body,
  cta,
  note,
}: {
  title: string;
  body: string;
  cta?: { label: string; hash: string };
  note?: string;
}) {
  return (
    <div className="ins-empty">
      <h1 className="ins-empty-title">{title}</h1>
      <p className="ins-empty-body">{body}</p>
      {cta && (
        <a className="ins-btn primary" href={cta.hash}>
          {cta.label}
        </a>
      )}
      {note && <p className="ins-empty-note">{note}</p>}
    </div>
  );
}
