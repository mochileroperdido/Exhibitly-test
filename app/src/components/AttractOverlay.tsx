import type { CatalogEntry } from '../data/types';

export function AttractOverlay({ entry }: { entry: CatalogEntry }) {
  return (
    <div
      className="absolute left-0 right-0 bottom-[9%] flex flex-col items-center gap-3.5 pointer-events-none animate-[fade-in_0.4s_ease-out]"
      data-screen-label="Attract"
    >
      <span className="flex items-center gap-2.5 font-mono text-sm tracking-[0.3em]" style={{ color: 'var(--accent)' }}>
        <span
          className="w-2.5 h-2.5 rounded-full animate-[pulse_1.8s_ease-in-out_infinite]"
          style={{ background: 'var(--accent)' }}
        />
        TAP TO EXPLORE
      </span>
      <span className="font-display font-bold uppercase leading-none tracking-[0.02em] text-graphite text-center text-[clamp(36px,7.5vw,84px)]">
        {entry.label}
      </span>
      <span className="font-mono text-[11px] tracking-[0.2em] text-graphite/55 uppercase">{entry.subtitle}</span>
    </div>
  );
}
