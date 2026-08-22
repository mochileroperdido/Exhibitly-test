import { useEffect, useRef } from 'react';
import { catalog, defaultCameraOrbit } from '../data/catalog';
import { useKioskStore } from '../store/kioskStore';
import { useIdleTimer } from '../hooks/useIdleTimer';
import { useOrientation } from '../hooks/useOrientation';
import type { ModelViewerElement } from '../model-viewer';
import { AttractOverlay } from './AttractOverlay';
import { HotspotLayer } from './HotspotLayer';
import { FeatureCard } from './FeatureCard';
import { ProductSwitcher } from './ProductSwitcher';
import { ViewerDock } from './ViewerDock';
import { ActionRail } from './ActionRail';
import { OverviewCard } from './OverviewCard';
import { MediaGallery } from './MediaGallery';
import { LeadCapturePill, LeadCaptureForm } from './LeadCapture';
import { LeadsDebugView } from './LeadsDebugView';
import { Watermark } from './Watermark';

// Field-of-view bounds (degrees) for the zoom controls; reset returns to
// model-viewer's own auto framing.
const MIN_FOV = 12;
const MAX_FOV = 45;
const ZOOM_STEP = 6;
const DOUBLE_TAP_MS = 300;

export function Stage() {
  const mode = useKioskStore((s) => s.mode);
  const activeEntryId = useKioskStore((s) => s.activeEntryId);
  const activeHotspotId = useKioskStore((s) => s.activeHotspotId);
  const switcherOpen = useKioskStore((s) => s.switcherOpen);
  const autoSpin = useKioskStore((s) => s.autoSpin);
  const overviewOpen = useKioskStore((s) => s.overviewOpen);
  const mediaOpen = useKioskStore((s) => s.mediaOpen);
  const leadOpen = useKioskStore((s) => s.leadOpen);
  const leadsViewOpen = useKioskStore((s) => s.leadsViewOpen);
  const wake = useKioskStore((s) => s.wake);
  const selectEntry = useKioskStore((s) => s.selectEntry);
  const selectHotspot = useKioskStore((s) => s.selectHotspot);
  const toggleAutoSpin = useKioskStore((s) => s.toggleAutoSpin);
  const openOverview = useKioskStore((s) => s.openOverview);
  const closeOverview = useKioskStore((s) => s.closeOverview);
  const openMedia = useKioskStore((s) => s.openMedia);
  const openLead = useKioskStore((s) => s.openLead);
  const setLoadMs = useKioskStore((s) => s.setLoadMs);

  const orientation = useOrientation();
  const poke = useIdleTimer();

  const mvRef = useRef<ModelViewerElement | null>(null);
  const loadStartRef = useRef(0);
  const lastTapRef = useRef(0);

  const entry = catalog.find((e) => e.id === activeEntryId) ?? catalog[0];
  const active = activeHotspotId ? entry.hotspots.find((h) => h.id === activeHotspotId) ?? null : null;
  const explore = mode === 'explore';
  const multiProduct = catalog.length > 1;
  // Chrome is hidden while any modal is up so the model reads cleanly behind it.
  const chromeVisible = explore && !leadOpen && !overviewOpen && !mediaOpen;

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
    const onLoad = () => setLoadMs(Math.round(performance.now() - loadStartRef.current));
    el.addEventListener('load', onLoad);
    return () => el.removeEventListener('load', onLoad);
  }, [activeEntryId, setLoadMs]);

  const resetView = () => {
    const el = mvRef.current;
    if (!el) return;
    el.cameraOrbit = defaultCameraOrbit;
    el.fieldOfView = 'auto';
  };

  const zoomBy = (delta: number) => {
    const el = mvRef.current;
    if (!el) return;
    const cur = el.getFieldOfView?.() ?? 30;
    const next = Math.min(MAX_FOV, Math.max(MIN_FOV, cur + delta));
    el.fieldOfView = `${next}deg`;
  };

  const onStageClick = () => {
    if (mode === 'attract') {
      wake();
      return;
    }
    // Double-tap empty stage recenters. Hotspots stop propagation, so this only
    // fires on the model/background, never when tapping a dot.
    const now = performance.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      resetView();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    if (activeHotspotId != null) selectHotspot(null);
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
        autoRotate={mode === 'attract' || (explore && autoSpin)}
        autoRotateDelay={0}
        cameraOrbit={defaultCameraOrbit}
        minFieldOfView={`${MIN_FOV}deg`}
        maxFieldOfView={`${MAX_FOV}deg`}
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

      <ActionRail
        orientation={orientation}
        visible={chromeVisible}
        hasMedia={entry.media.length > 0}
        onAbout={openOverview}
        onMedia={openMedia}
      />

      <ViewerDock
        orientation={orientation}
        visible={chromeVisible}
        autoSpin={autoSpin}
        onToggleSpin={toggleAutoSpin}
        onZoomIn={() => zoomBy(-ZOOM_STEP)}
        onZoomOut={() => zoomBy(ZOOM_STEP)}
        onReset={resetView}
      />

      {multiProduct && (
        <ProductSwitcher
          entries={catalog}
          activeEntryId={activeEntryId}
          open={explore && switcherOpen}
          orientation={orientation}
          onSelect={selectEntry}
        />
      )}

      {active && <FeatureCard hotspot={active} orientation={orientation} onClose={() => selectHotspot(null)} />}

      {overviewOpen && explore && <OverviewCard entry={entry} onClose={closeOverview} />}
      <MediaGallery entry={entry} />

      <LeadCapturePill visible={chromeVisible} orientation={orientation} onOpen={openLead} />
      <LeadCaptureForm />
      {leadsViewOpen && <LeadsDebugView />}

      <Watermark />
    </div>
  );
}
