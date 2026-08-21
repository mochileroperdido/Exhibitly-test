import { useEffect, useRef, useState } from 'react';
import { catalog, defaultCameraOrbit } from '../data/catalog';
import { useKioskStore } from '../store/kioskStore';
import { useIdleTimer } from '../hooks/useIdleTimer';
import { useOrientation } from '../hooks/useOrientation';
import type { ModelViewerElement } from '../model-viewer';
import { AttractOverlay } from './AttractOverlay';
import { HotspotLayer } from './HotspotLayer';
import { FeatureCard } from './FeatureCard';
import { ProductSwitcher } from './ProductSwitcher';
import { LeadCapturePill, LeadCaptureForm } from './LeadCapture';
import { LeadsDebugView } from './LeadsDebugView';
import { Watermark } from './Watermark';

export function Stage() {
  const mode = useKioskStore((s) => s.mode);
  const activeEntryId = useKioskStore((s) => s.activeEntryId);
  const activeHotspotId = useKioskStore((s) => s.activeHotspotId);
  const switcherOpen = useKioskStore((s) => s.switcherOpen);
  const leadOpen = useKioskStore((s) => s.leadOpen);
  const leadsViewOpen = useKioskStore((s) => s.leadsViewOpen);
  const wake = useKioskStore((s) => s.wake);
  const selectEntry = useKioskStore((s) => s.selectEntry);
  const selectHotspot = useKioskStore((s) => s.selectHotspot);
  const openLead = useKioskStore((s) => s.openLead);

  const orientation = useOrientation();
  const poke = useIdleTimer();

  const mvRef = useRef<ModelViewerElement | null>(null);
  const loadStartRef = useRef(0);
  const [loadMs, setLoadMs] = useState<number | null>(null);

  const entry = catalog.find((e) => e.id === activeEntryId) ?? catalog[0];
  const active = activeHotspotId ? entry.hotspots.find((h) => h.id === activeHotspotId) ?? null : null;
  const explore = mode === 'explore';

  // Reset to the tuned hero camera angle whenever the product changes or the
  // kiosk returns to attract — camera-orbit is intentionally NOT bound as a
  // continuous prop, since that would fight model-viewer's own live camera
  // state during auto-rotate/user drag.
  useEffect(() => {
    if (mvRef.current) mvRef.current.cameraOrbit = defaultCameraOrbit;
  }, [activeEntryId, mode]);

  useEffect(() => {
    const el = mvRef.current;
    if (!el) return;
    loadStartRef.current = performance.now();
    setLoadMs(null);
    const onLoad = () => setLoadMs(Math.round(performance.now() - loadStartRef.current));
    el.addEventListener('load', onLoad);
    return () => el.removeEventListener('load', onLoad);
  }, [activeEntryId]);

  const onStageClick = () => {
    if (mode === 'attract') wake();
    else if (activeHotspotId != null) selectHotspot(null);
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden touch-none"
      style={{ background: 'radial-gradient(ellipse at 50% 42%, #ffffff 0%, #f2f1ee 62%, #e7e5e0 100%)' }}
      onPointerDownCapture={poke}
    >
      <model-viewer
        ref={mvRef}
        src={entry.modelUrl}
        alt={entry.label}
        cameraControls
        autoRotate={mode === 'attract'}
        autoRotateDelay={0}
        cameraOrbit={defaultCameraOrbit}
        exposure={1}
        shadowIntensity={0}
        environmentImage="neutral"
        interactionPrompt="none"
        interpolationDecay={200}
        onClick={onStageClick}
        style={{ width: '100%', height: '100%' }}
      >
        <HotspotLayer
          hotspots={entry.hotspots}
          activeHotspotId={activeHotspotId}
          onTap={selectHotspot}
          visible={explore}
        />
      </model-viewer>

      {mode === 'attract' && <AttractOverlay entry={entry} />}

      <div
        className="absolute left-0 right-0 bottom-[22px] flex justify-center pointer-events-none transition-opacity duration-300"
        style={{ opacity: explore && switcherOpen && !leadOpen ? 1 : 0 }}
      >
        <span className="font-mono text-[11px] tracking-[0.18em] text-graphite/45">DRAG TO SPIN · SCROLL TO ZOOM</span>
      </div>

      <ProductSwitcher
        entries={catalog}
        activeEntryId={activeEntryId}
        open={explore && switcherOpen}
        orientation={orientation}
        loadMs={loadMs}
        onSelect={selectEntry}
      />

      {active && <FeatureCard hotspot={active} orientation={orientation} onClose={() => selectHotspot(null)} />}

      <LeadCapturePill visible={explore || mode === 'attract'} orientation={orientation} onOpen={openLead} />
      <LeadCaptureForm />
      {leadsViewOpen && <LeadsDebugView />}

      <Watermark />
    </div>
  );
}
