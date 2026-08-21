import type { Hotspot } from '../data/types';

/** Rendered as light-DOM children of <model-viewer>; each button is picked
 * up via its `slot="hotspot-*"` and positioned in 3D by model-viewer itself
 * using data-position/data-normal, so hotspots track the real geometry
 * through rotate/zoom instead of a flat 2D overlay. */
export function HotspotLayer({
  hotspots,
  activeHotspotId,
  onTap,
  visible,
}: {
  hotspots: Hotspot[];
  activeHotspotId: string | null;
  onTap: (id: string) => void;
  visible: boolean;
}) {
  return (
    <>
      {hotspots.map((h) => {
        const active = h.id === activeHotspotId;
        return (
          <button
            key={h.id}
            slot={`hotspot-${h.id}`}
            data-position={h.position}
            data-normal={h.normal}
            aria-label={h.title}
            onClick={() => onTap(h.id)}
            onPointerDown={(e) => e.stopPropagation()}
            className="focus-ring flex items-center justify-center w-11 h-11 -m-5.5 bg-transparent border-none cursor-pointer p-0"
            style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', transition: 'opacity .3s' }}
          >
            <span
              className="block rounded-full border-2"
              style={{
                width: 16,
                height: 16,
                background: 'var(--accent)',
                borderColor: 'rgba(240,239,236,.9)',
                transform: active ? 'scale(1.15)' : undefined,
                boxShadow: active
                  ? '0 0 0 9px color-mix(in srgb, var(--accent) 22%, transparent), 0 0 0 2px var(--accent)'
                  : '0 1px 4px rgba(0,0,0,.4)',
                transition: 'box-shadow .25s ease-out, transform .25s ease-out',
              }}
            />
          </button>
        );
      })}
    </>
  );
}
