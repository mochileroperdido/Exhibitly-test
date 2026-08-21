import type { CatalogEntry } from '../data/types';

export function ProductSwitcher({
  entries,
  activeEntryId,
  open,
  orientation,
  loadMs,
  onSelect,
}: {
  entries: CatalogEntry[];
  activeEntryId: string;
  open: boolean;
  orientation: 'portrait' | 'landscape';
  loadMs: number | null;
  onSelect: (id: string) => void;
}) {
  const active = entries.find((e) => e.id === activeEntryId) ?? entries[0];

  const base =
    'absolute z-30 flex gap-1.5 p-2 bg-mist/78 backdrop-blur-md border border-black/12 rounded-[26px] transition-[transform,opacity] duration-300 ease-out';
  const posClass =
    orientation === 'portrait'
      ? 'left-1/2 bottom-4 flex-row ' +
        (open ? '-translate-x-1/2 opacity-100' : '-translate-x-1/2 translate-y-[140%] opacity-0 pointer-events-none')
      : 'left-[18px] top-1/2 flex-col ' +
        (open ? '-translate-y-1/2 opacity-100' : '-translate-y-1/2 -translate-x-[140%] opacity-0 pointer-events-none');

  return (
    <>
      <div className={`${base} ${posClass}`} onPointerDown={(e) => e.stopPropagation()}>
        {entries.map((entry) => {
          const isActive = entry.id === activeEntryId;
          return (
            <button
              key={entry.id}
              onClick={() => onSelect(entry.id)}
              className={
                'focus-ring flex flex-col items-start gap-0.5 min-w-[130px] min-h-[52px] px-4 py-2 rounded-full border-none cursor-pointer text-left transition-colors ' +
                (isActive ? 'text-graphite' : 'bg-transparent text-graphite/80')
              }
              style={isActive ? { background: 'var(--accent)' } : undefined}
            >
              <span className="flex items-center gap-2">
                {isActive && <span className="w-1.5 h-1.5 bg-current" />}
                <span className="font-display font-semibold text-[19px] tracking-[0.03em] uppercase">
                  {entry.label.replace('Drill — ', '')}
                </span>
              </span>
              <span className="font-mono text-[9px] tracking-[0.16em] uppercase opacity-70">{entry.subtitle}</span>
            </button>
          );
        })}
      </div>

      {/* Comparison stats chip — surfaces while the switcher is open, so the
          size-vs-experience tradeoff between captures is visible, not just implied. */}
      <div
        className={
          'absolute z-30 font-mono text-[10px] tracking-[0.12em] uppercase text-graphite/70 bg-mist/78 backdrop-blur-md border border-black/12 rounded-lg px-3 py-2 transition-opacity duration-300 ' +
          (orientation === 'portrait' ? 'left-1/2 -translate-x-1/2 bottom-[76px]' : 'left-[18px] top-[calc(50%+96px)]') +
          (open ? ' opacity-100' : ' opacity-0 pointer-events-none')
        }
      >
        <span>{active.source}</span>
        <span className="mx-1.5 opacity-40">·</span>
        <span>{active.fileSizeMB.toFixed(2)} MB</span>
        <span className="mx-1.5 opacity-40">·</span>
        <span>{active.triangleCount.toLocaleString()} tris</span>
        {loadMs != null && (
          <>
            <span className="mx-1.5 opacity-40">·</span>
            <span>loaded in {loadMs}ms</span>
          </>
        )}
      </div>
    </>
  );
}
