import { useRef } from 'react';
import { useKioskStore } from '../store/kioskStore';

/** Small fixed-corner Lathe wordmark, kept quiet so the kiosk stays the
 * client's stage (brand rule: on kiosk Lathe appears in ink or light only,
 * so the client colour can own the accent). Tapping it 5x within 2s opens
 * the hidden leads debug view — an unobtrusive way to reach it without
 * adding visible kiosk chrome. */
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
      aria-label="Lathe"
      onClick={onTap}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute left-3 bottom-2.5 pointer-events-auto bg-transparent border-none p-0 opacity-55"
    >
      <img
        src="/brand/logos/svg/lathe-wordmark-ink.svg"
        alt="Lathe"
        className="block h-3 w-auto"
      />
    </button>
  );
}
