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
    id: 'drill-reality-scan',
    label: 'Drill — Reality Scan',
    subtitle: 'High-res capture',
    modelUrl: '/models/drill-reality-scan.glb',
    source: 'RealityScan photogrammetry',
    fileSizeMB: 2.73,
    triangleCount: 612220,
    hotspots: withPositions({
      chuck: { position: '-18.9290 5.6589 -0.3156', normal: '0.8313 -0.0721 0.5511' },
      clutchRing: { position: '-16.7765 5.6980 0.0340', normal: '-0.3173 0.6386 0.7011' },
      trigger: { position: '-12.9658 2.9015 -0.5471', normal: '0.5276 0.6001 0.6013' },
      ledLight: { position: '-15.8574 7.7950 -2.0220', normal: '0.3868 0.6909 0.6107' },
      batteryPack: { position: '-7.0394 -6.3310 6.4682', normal: '-0.2457 -0.6982 0.6724' },
    }),
  },
  {
    id: 'drill-kiri',
    label: 'Drill — Kiri',
    subtitle: 'Optimized capture',
    modelUrl: '/models/drill-kiri.glb',
    source: 'Kiri Engine photogrammetry',
    fileSizeMB: 0.49,
    triangleCount: 80846,
    hotspots: withPositions({
      chuck: { position: '-0.2423 0.3415 -0.5145', normal: '-0.5242 0.6684 0.5277' },
      clutchRing: { position: '-0.1022 0.2694 -0.4594', normal: '-0.3761 0.1205 0.9187' },
      trigger: { position: '0.0166 0.0980 -0.4390', normal: '-0.3568 -0.2406 0.9027' },
      ledLight: { position: '0.0947 0.2152 -0.3855', normal: '-0.0151 0.1608 0.9869' },
      batteryPack: { position: '0.1226 -0.4134 -0.3085', normal: '0.1712 0.0800 0.9820' },
    }),
  },
];

export const defaultCameraOrbit = '0deg 75deg auto';
