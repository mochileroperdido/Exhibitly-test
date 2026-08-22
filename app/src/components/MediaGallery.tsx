import { useKioskStore } from '../store/kioskStore';
import type { CatalogEntry } from '../data/types';

/** Per-product video gallery. Booth audio is already noisy and these are silent
 * how-to clips, so playback is muted with native controls — tap to play, never
 * autoplay sound. */
export function MediaGallery({ entry }: { entry: CatalogEntry }) {
  const mediaOpen = useKioskStore((s) => s.mediaOpen);
  const activeMediaId = useKioskStore((s) => s.activeMediaId);
  const selectMedia = useKioskStore((s) => s.selectMedia);
  const openMedia = useKioskStore((s) => s.openMedia);
  const closeMedia = useKioskStore((s) => s.closeMedia);

  if (!mediaOpen) return null;
  const active = activeMediaId ? entry.media.find((m) => m.id === activeMediaId) ?? null : null;

  return (
    <div
      onClick={closeMedia}
      onPointerDown={(e) => e.stopPropagation()}
      data-screen-label="Media gallery"
      className="absolute inset-0 z-50 bg-black/55 flex items-center justify-center animate-[fade-in_0.25s_ease-out]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(760px,94vw)] max-h-[92vh] overflow-auto bg-mist text-graphite border border-black/8 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,.35)] px-6 pt-5.5 pb-6 animate-[card-in_0.28s_ease-out]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="font-display font-bold text-[26px] tracking-[0.02em] uppercase">
            {active ? active.title : 'How-to videos'}
          </div>
          <button
            aria-label={active ? 'Back to videos' : 'Close videos'}
            onClick={active ? openMedia : closeMedia}
            className="focus-ring w-11 h-11 -mr-2 bg-transparent border-none text-graphite/55 text-2xl leading-none cursor-pointer rounded-lg"
          >
            {active ? '‹' : '×'}
          </button>
        </div>

        {active ? (
          <video
            key={active.id}
            src={active.src}
            poster={active.poster}
            controls
            muted
            autoPlay
            playsInline
            className="mt-4 w-full rounded-lg bg-black max-h-[70vh]"
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {entry.media.map((m) => (
              <button
                key={m.id}
                onClick={() => selectMedia(m.id)}
                className="focus-ring group text-left bg-white border border-line rounded-lg overflow-hidden cursor-pointer"
              >
                <div className="relative aspect-video bg-black">
                  {/* '#t=0.1' nudges the <video> to render a first frame as a
                      still thumbnail even without a generated poster. */}
                  <video
                    src={m.poster ? undefined : `${m.src}#t=0.1`}
                    poster={m.poster}
                    muted
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex items-center justify-center w-12 h-12 rounded-full shadow-[0_2px_10px_rgba(0,0,0,.4)]" style={{ background: 'var(--accent)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                        <path d="M8 5v14l11-7z" fill="#1c1e22" />
                      </svg>
                    </span>
                  </span>
                </div>
                <div className="px-3.5 py-3 font-sans text-[15px] font-medium text-graphite">{m.title}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
