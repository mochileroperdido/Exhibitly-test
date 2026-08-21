import { useRef } from 'react';
import { useKioskStore } from '../store/kioskStore';

/** Small fixed-corner mark, per the UI doc ("Exhibly appears only as an 8px
 * watermark"). Tapping it 5x within 2s opens the hidden leads debug view —
 * an unobtrusive way to reach it without adding visible kiosk chrome. */
export function Watermark() {
  const toggleLeadsView = useKioskStore((s) => s.toggleLeadsView);
  const taps = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onTap = () => {
    taps.current += 1;
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      taps.current = 0;
    }, 2000);
    if (taps.current >= 5) {
      taps.current = 0;
      toggleLeadsView();
    }
  };

  return (
    <button
      aria-label="Exhibly"
      onClick={onTap}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute left-3 bottom-2.5 font-mono text-[8px] tracking-[0.22em] text-graphite/35 pointer-events-auto bg-transparent border-none"
    >
      EXHIBLY
    </button>
  );
}
