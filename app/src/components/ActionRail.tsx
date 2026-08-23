/** Top-corner entry points to the product overview and the video gallery.
 * Kept as labeled pills (not bare icons) so their purpose reads at a glance. */
export function ActionRail({
  orientation,
  visible,
  hasMedia,
  onAbout,
  onMedia,
}: {
  orientation: 'portrait' | 'landscape';
  visible: boolean;
  hasMedia: boolean;
  onAbout: () => void;
  onMedia: () => void;
}) {
  const pos = orientation === 'portrait' ? 'top-4 left-4' : 'top-5 left-5';
  const pill =
    'focus-ring flex items-center gap-2 min-h-11 px-4 rounded-full border border-black/12 bg-mist/82 backdrop-blur-md text-graphite font-semibold text-[15px] cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.1)] transition-colors hover:bg-mist';

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className={
        'absolute z-30 flex gap-2 transition-opacity duration-300 ' +
        pos +
        (visible ? ' opacity-100' : ' opacity-0 pointer-events-none')
      }
    >
      <button onClick={onAbout} className={pill} aria-label="Product overview">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
        </svg>
        About
      </button>
      {hasMedia && (
        <button onClick={onMedia} className={pill} aria-label="How-to videos">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="M10 9.5v5l4-2.5z" fill="currentColor" stroke="none" />
          </svg>
          Videos
        </button>
      )}
    </div>
  );
}
