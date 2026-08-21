import { useEffect, useRef } from 'react';
import { useKioskStore } from '../store/kioskStore';

const IDLE_SECONDS = 30;
const SWITCHER_HIDE_SECONDS = 5;

/** Returns to the attract screen after inactivity; auto-hides the product
 * switcher a bit sooner. Call `poke()` on any visitor interaction. */
export function useIdleTimer() {
  const lastActive = useRef(Date.now());
  const mode = useKioskStore((s) => s.mode);
  const switcherOpen = useKioskStore((s) => s.switcherOpen);
  const leadOpen = useKioskStore((s) => s.leadOpen);
  const sleep = useKioskStore((s) => s.sleep);
  const setSwitcherOpen = useKioskStore((s) => s.setSwitcherOpen);
  const poke = useKioskStore((s) => s.poke);

  useEffect(() => {
    const id = setInterval(() => {
      if (mode !== 'explore' || leadOpen) return;
      const idleSec = (Date.now() - lastActive.current) / 1000;
      if (switcherOpen && idleSec > SWITCHER_HIDE_SECONDS) setSwitcherOpen(false);
      if (idleSec > IDLE_SECONDS) sleep();
    }, 1000);
    return () => clearInterval(id);
  }, [mode, switcherOpen, leadOpen, sleep, setSwitcherOpen]);

  return () => {
    lastActive.current = Date.now();
    poke();
  };
}
