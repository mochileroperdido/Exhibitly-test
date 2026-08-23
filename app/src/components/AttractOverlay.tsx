import type { CatalogEntry } from '../data/types';

/** Attract-screen catalog tray: a legibility scrim at the bottom holding the
 * product name, a swipeable carousel (dots + chevrons) to browse the catalog
 * before exploring, and the tap-to-explore CTA. The hero model behind swaps as
 * the selection changes. */
export function AttractOverlay({
  entries,
  activeEntryId,
  onSelect,
  onExplore,
}: {
  entries: CatalogEntry[];
  activeEntryId: string;
  onSelect: (id: string) => void;
  onExplore: () => void;
}) {
  const multi = entries.length > 1;
  const idx = Math.max(0, entries.findIndex((e) => e.id === activeEntryId));
  const entry = entries[idx] ?? entries[0];
  const step = (d: number) => onSelect(entries[(idx + d + entries.length) % entries.length].id);

  const chevron = (dir: 'left' | 'right') => (
    <button
      aria-label={dir === 'left' ? 'Previous product' : 'Next product'}
      onClick={() => step(dir === 'left' ? -1 : 1)}
      onPointerDown={(e) => e.stopPropagation()}
      className={
        'focus-ring pointer-events-auto absolute top-[46%] -translate-y-1/2 z-10 grid place-items-center w-14 h-14 rounded-full border border-black/10 bg-mist/80 backdrop-blur-md text-graphite cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.14)] ' +
        (dir === 'left' ? 'left-3' : 'right-3')
      }
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {dir === 'left' ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
      </svg>
    </button>
  );

  return (
    <div data-screen-label="Attract" className="absolute inset-0 animate-[fade-in_0.4s_ease-out] pointer-events-none">
      {/* Large edge arrows at the model's mid-height — the conventional carousel
          cue, so the catalog reads as browsable at a glance. */}
      {multi && chevron('left')}
      {multi && chevron('right')}

      <div
        className="absolute left-0 right-0 bottom-0 pt-28 pb-8 flex flex-col items-center gap-3"
        style={{
          background:
            'linear-gradient(to top, rgba(242,241,238,0.97) 0%, rgba(242,241,238,0.92) 42%, rgba(242,241,238,0) 100%)',
        }}
      >
        <button
          onClick={onExplore}
          onPointerDown={(e) => e.stopPropagation()}
          className="focus-ring pointer-events-auto flex items-center gap-2.5 bg-transparent border-none cursor-pointer font-mono text-sm tracking-[0.3em]"
          style={{ color: 'var(--accent)' }}
        >
          <span className="w-2.5 h-2.5 rounded-full animate-[pulse_1.8s_ease-in-out_infinite]" style={{ background: 'var(--accent)' }} />
          TAP TO EXPLORE
        </button>

        <div className="flex flex-col items-center">
          <span className="font-display font-bold uppercase leading-none tracking-[0.02em] text-graphite text-center text-[clamp(34px,7vw,78px)]">
            {entry.label}
          </span>
          <span className="mt-2 font-mono text-[11px] tracking-[0.2em] text-graphite/55 uppercase">{entry.subtitle}</span>
        </div>

      {multi && (
        <div className="flex items-center gap-2.5 pointer-events-auto mt-1">
          {entries.map((e) => (
            <button
              key={e.id}
              aria-label={`Show ${e.label}`}
              aria-current={e.id === activeEntryId}
              onClick={() => onSelect(e.id)}
              onPointerDown={(ev) => ev.stopPropagation()}
              className="focus-ring border-none cursor-pointer p-0 rounded-full transition-all"
              style={{
                width: e.id === activeEntryId ? 26 : 9,
                height: 9,
                background: e.id === activeEntryId ? 'var(--accent)' : 'rgba(28,30,34,0.25)',
              }}
            />
          ))}
        </div>
      )}

        {multi && (
          <span className="font-mono text-[10px] tracking-[0.22em] text-graphite/40 uppercase mt-0.5">
            Swipe to browse {entries.length} products
          </span>
        )}
      </div>
    </div>
  );
}
