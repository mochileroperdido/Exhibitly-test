import type { CatalogEntry, Hotspot } from './types';

// Placeholder feature copy for the demo — invented, plausible content for a
// cordless drill/driver. Swap for real client copy once available; the
// hotspot wiring (3D position, progressive-disclosure card) is production-real.
const drillHotspots: Omit<Hotspot, 'position' | 'normal'>[] = [
  {
    id: 'chuck',
    title: 'Keyless Chuck',
    description: 'Swap bits by hand in seconds — no chuck key to lose. Grips down to hex and round shanks alike without slipping under load.',
  },
  {
    id: 'clutchRing',
    title: '24-Position Clutch',
    description: 'Dial in torque per material and screw size. Once the clutch reaches its set resistance it disengages the drive, so screws stop flush instead of stripping or sinking too deep.',
  },
  {
    id: 'trigger',
    title: 'Variable-Speed Trigger',
    description: 'Squeeze lightly for slow, controlled starts on delicate materials, or all the way for full drilling speed. Speed tracks trigger pressure the whole way through.',
  },
  {
    id: 'ledLight',
    title: 'LED Work Light',
    description: 'Switches on with the trigger to light up dim job sites, cabinets, and shelving — no separate switch to remember.',
  },
  {
    id: 'batteryPack',
    title: 'Compact Li-Ion Battery',
    description: 'Slides on and locks with one motion, and is shared across the rest of the tool line, so one charger covers the whole kit.',
  },
];

function withPositions(
  positions: Record<string, { position: string; normal: string }>,
): Hotspot[] {
  return drillHotspots.map((h) => ({ ...h, ...positions[h.id] }));
}

export const catalog: CatalogEntry[] = [
  {
    id: 'drill-new',
    label: 'Cordless Drill',
    subtitle: 'Polished 3D capture',
    modelUrl: '/models/drill-new.glb',
    source: 'Blender / photogrammetry (optimized)',
    fileSizeMB: 1.71,
    triangleCount: 28689,
    // Positions picked off the real mesh surface via model-viewer's
    // positionAndNormalFromPoint (see scripts/pick-hotspots.mjs), so every dot
    // sits on the tool. They approximate each feature's region on this generic
    // driver body; nudge if a client wants a dot on an exact component.
    hotspots: withPositions({
      chuck: { position: '-0.0673 0.1721 0.0271', normal: '-0.1492 -0.2267 0.9625' },
      clutchRing: { position: '-0.0594 0.1872 0.0265', normal: '0.0432 0.1357 0.9898' },
      trigger: { position: '-0.0775 0.1388 -0.0019', normal: '-0.6117 -0.7846 -0.1013' },
      ledLight: { position: '-0.0768 0.1490 0.0141', normal: '-0.7991 -0.2883 0.5276' },
      batteryPack: { position: '-0.0337 0.0550 -0.0064', normal: '-0.9126 -0.1461 -0.3817' },
    }),
  },
];

export const defaultCameraOrbit = '0deg 75deg auto';
