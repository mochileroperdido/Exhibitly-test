import type { CatalogEntry } from '../data/types';

/** Product intro shown once on entering explore (and re-openable via About),
 * so a visitor gets the pitch and key specs without tapping every hotspot. */
export function OverviewCard({ entry, onClose }: { entry: CatalogEntry; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
      data-screen-label="Overview"
      className="absolute inset-0 z-40 bg-black/45 flex items-center justify-center animate-[fade-in_0.25s_ease-out]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(480px,92vw)] max-h-[88vh] overflow-auto bg-mist text-graphite border border-black/8 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,.35)] px-6.5 pt-6.5 pb-6 animate-[card-in_0.28s_ease-out]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-display font-bold text-[30px] leading-[1.05] tracking-[0.02em] uppercase">
              {entry.label}
            </div>
            <div className="mt-1 text-[15px] font-medium" style={{ color: 'var(--accent)' }}>
              {entry.tagline}
            </div>
          </div>
          <button
            aria-label="Close overview"
            onClick={onClose}
            className="focus-ring flex-none w-11 h-11 -mt-2.5 -mr-3 bg-transparent border-none text-graphite/55 text-2xl leading-none cursor-pointer rounded-lg"
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
    </div>
  );
}
