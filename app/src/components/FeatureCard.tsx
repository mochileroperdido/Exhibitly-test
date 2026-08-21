import type { Hotspot } from '../data/types';

export function FeatureCard({
  hotspot,
  orientation,
  onClose,
}: {
  hotspot: Hotspot;
  orientation: 'portrait' | 'landscape';
  onClose: () => void;
}) {
  const wrapClass =
    orientation === 'portrait'
      ? 'absolute left-4 right-4 bottom-[136px] flex justify-center pointer-events-none z-20'
      : 'absolute top-0 bottom-0 right-5 flex items-center pointer-events-none z-20';

  const cardClass =
    (orientation === 'portrait' ? 'w-full max-w-[440px]' : 'w-[348px]') +
    ' pointer-events-auto box-border bg-mist/85 backdrop-blur-md border border-black/10 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-5 animate-[card-in_0.25s_ease-out]';

  return (
    <div className={wrapClass}>
      <div onPointerDown={(e) => e.stopPropagation()} className={cardClass} data-screen-label="Feature card">
        <div className="flex items-start justify-between gap-3">
          <span className="font-display font-semibold text-[26px] leading-[1.1] tracking-[0.02em] uppercase text-graphite">
            {hotspot.title}
          </span>
          <button
            aria-label="Close feature"
            onClick={onClose}
            className="focus-ring flex-none w-11 h-11 -mt-2.5 -mr-3 bg-transparent border-none text-graphite/55 text-2xl leading-none cursor-pointer rounded-lg"
          >
            ×
          </button>
        </div>
        <p className="mt-2 text-base leading-relaxed text-graphite/72">{hotspot.description}</p>
      </div>
    </div>
  );
}
