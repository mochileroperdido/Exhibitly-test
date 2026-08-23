import type { CatalogEntry } from '../data/types';

/** Product intro shown once on entering explore (and re-openable via About).
 * A docked side sheet — right drawer in landscape, bottom sheet in portrait —
 * with no dimming backdrop, so the model stays live and interactive behind it. */
export function OverviewCard({
  entry,
  orientation,
  onClose,
}: {
  entry: CatalogEntry;
  orientation: 'portrait' | 'landscape';
  onClose: () => void;
}) {
  const sheet =
    orientation === 'landscape'
      ? 'top-0 right-0 h-full w-[min(380px,90vw)] border-l animate-[sheet-in-right_0.3s_ease-out]'
      : 'left-0 right-0 bottom-0 max-h-[80vh] rounded-t-2xl border-t animate-[sheet-in-up_0.3s_ease-out]';

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      data-screen-label="Overview"
      className={
        'absolute z-40 overflow-auto bg-mist/95 backdrop-blur-md text-graphite border-black/10 shadow-[0_8px_40px_rgba(0,0,0,0.18)] px-6 pt-6 pb-6 ' +
        sheet
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display font-bold text-[28px] leading-[1.05] tracking-[0.02em] uppercase">
            {entry.label}
          </div>
          <div className="mt-1 text-[15px] font-medium" style={{ color: 'var(--accent)' }}>
            {entry.tagline}
          </div>
        </div>
        <button
          aria-label="Close overview"
          onClick={onClose}
          className="focus-ring flex-none w-11 h-11 -mt-2.5 -mr-2.5 bg-transparent border-none text-graphite/55 text-2xl leading-none cursor-pointer rounded-lg"
        >
          ×
        </button>
      </div>

      <p className="mt-3.5 text-base leading-relaxed text-graphite/72">{entry.overview}</p>

      <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3">
        {entry.specs.map((spec) => (
          <div key={spec.label} className="border-t border-line pt-2">
            <div className="font-mono text-[10px] tracking-[0.16em] uppercase text-graphite/50">{spec.label}</div>
            <div className="mt-0.5 font-display font-semibold text-[19px] tracking-[0.02em]">{spec.value}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="focus-ring block w-full mt-6 py-3.5 border-none rounded-full text-graphite font-semibold text-base cursor-pointer"
        style={{ background: 'var(--accent)' }}
      >
        Explore the drill
      </button>
    </div>
  );
}
