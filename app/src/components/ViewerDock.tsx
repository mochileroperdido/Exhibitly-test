/** Always-visible viewer controls for walk-up users: start/stop the spin,
 * zoom, and reset the framing — so rotation never leaves someone stuck.
 * Purely presentational; Stage owns the model-viewer camera actions. */
export function ViewerDock({
  orientation,
  visible,
  autoSpin,
  onToggleSpin,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  orientation: 'portrait' | 'landscape';
  visible: boolean;
  autoSpin: boolean;
  onToggleSpin: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  const pos = orientation === 'portrait' ? 'left-1/2 -translate-x-1/2 bottom-4' : 'left-1/2 -translate-x-1/2 bottom-5';
  const btn =
    'focus-ring flex items-center justify-center w-12 h-12 rounded-full border-none bg-transparent text-graphite cursor-pointer transition-colors hover:bg-black/5 active:bg-black/10';

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className={
        'absolute z-30 flex items-center gap-1 p-1.5 bg-mist/82 backdrop-blur-md border border-black/12 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-opacity duration-300 ' +
        pos +
        (visible ? ' opacity-100' : ' opacity-0 pointer-events-none')
      }
    >
      <button
        onClick={onToggleSpin}
        aria-label={autoSpin ? 'Stop auto-rotate' : 'Start auto-rotate'}
        aria-pressed={autoSpin}
        className={btn}
        style={autoSpin ? { background: 'var(--accent)' } : undefined}
      >
        {autoSpin ? <PauseIcon /> : <SpinIcon />}
      </button>
      <span className="w-px h-6 bg-black/10" />
      <button onClick={onZoomOut} aria-label="Zoom out" className={btn}>
        <MinusIcon />
      </button>
      <button onClick={onZoomIn} aria-label="Zoom in" className={btn}>
        <PlusIcon />
      </button>
      <span className="w-px h-6 bg-black/10" />
      <button onClick={onReset} aria-label="Reset view" className={btn}>
        <ResetIcon />
      </button>
    </div>
  );
}

const S = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function SpinIcon() {
  return (
    <svg {...S} aria-hidden>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v4h-4" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg {...S} aria-hidden>
      <rect x="7" y="6" width="3.5" height="12" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.5" y="6" width="3.5" height="12" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg {...S} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function MinusIcon() {
  return (
    <svg {...S} aria-hidden>
      <path d="M5 12h14" />
    </svg>
  );
}
function ResetIcon() {
  // Crosshair/recenter target — deliberately distinct from the circular
  // auto-rotate arrow so the two controls don't read alike.
  return (
    <svg {...S} aria-hidden>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3.5M12 18v3.5M2.5 12h3.5M18 12h3.5" />
    </svg>
  );
}
