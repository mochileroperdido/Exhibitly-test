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

// Second demo product — a generic rolling tool chest (royalty-free model), so
// the kiosk shows product switching and the insights split across products.
// Copy is placeholder; hotspot positions are picked off the mesh (see below).
const chestHotspots: Omit<Hotspot, 'position' | 'normal'>[] = [
  {
    id: 'casters',
    title: 'Locking Swivel Casters',
    description: 'Heavy-duty casters roll the loaded cart across the shop, then lock solid so it stays put while you work.',
  },
  {
    id: 'handle',
    title: 'Side Push Handle',
    description: 'A chromed grip on the end gives you a solid hold to steer the loaded cart around benches and through doorways.',
  },
  {
    id: 'tub',
    title: 'Powder-Coated Steel Tub',
    description: 'A single deep welded tub takes knocks, spills, and heavy loads, and wipes clean at the end of the day.',
  },
  {
    id: 'rim',
    title: 'Reinforced Top Rim',
    description: 'A folded steel rim stiffens the open top and gives a lip to hang panel bags and organizers from.',
  },
];

function withChestPositions(
  positions: Record<string, { position: string; normal: string }>,
): Hotspot[] {
  return chestHotspots.map((h) => ({ ...h, ...positions[h.id] }));
}

export const catalog: CatalogEntry[] = [
  {
    id: 'drill-new',
    label: 'Cordless Drill',
    subtitle: 'Polished 3D capture',
    // Placeholder marketing copy for the demo — invented but plausible for a
    // 12V cordless drill/driver. Swap for real client copy before a live show.
    tagline: 'Compact 12V drill/driver built for all-day control.',
    overview:
      'A lightweight cordless drill/driver sized for cabinets, fixtures, and everyday assembly. A 24-position clutch and variable-speed trigger give you fine control on delicate work, while the keyless chuck and one-hand battery swap keep you moving between tasks.',
    specs: [
      { label: 'Voltage', value: '12V' },
      { label: 'Chuck', value: '10mm keyless' },
      { label: 'Clutch', value: '24 positions' },
      { label: 'Max torque', value: '30 N·m' },
      { label: 'No-load speed', value: '0–1,500 rpm' },
      { label: 'Weight', value: '1.1 kg' },
    ],
    media: [
      {
        id: 'right-angle',
        type: 'video',
        src: '/media/right-angle-drilling.mp4',
        title: 'Right-angle drilling in tight spaces',
      },
      {
        id: 'install-bit',
        type: 'video',
        src: '/media/install-drill-bit.mp4',
        title: 'Installing a drill bit',
      },
    ],
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
  {
    id: 'tool-chest',
    label: 'Rolling Tool Chest',
    subtitle: 'Royalty-free demo model',
    tagline: 'Roll your whole kit to the job and lock it down.',
    overview:
      'A mobile workshop chest with full-extension ball-bearing drawers, heavy-duty locking casters, and a single central lock. Built to move a full set of tools around the shop or site and keep them secured between jobs.',
    specs: [
      { label: 'Drawers', value: '7' },
      { label: 'Load rating', value: '450 kg' },
      { label: 'Casters', value: '2 locking' },
      { label: 'Lock', value: 'Central keyed' },
      { label: 'Height', value: '95 cm' },
      { label: 'Material', value: 'Powder-coated steel' },
    ],
    media: [],
    modelUrl: '/models/tool-chest.glb',
    source: 'Sketchfab (royalty-free), optimized',
    fileSizeMB: 1.47,
    triangleCount: 44000,
    // Picked off the mesh via scripts/pick-hotspots.mjs.
    hotspots: withChestPositions({
      casters: { position: '-0.7774 0.2000 2.0285', normal: '0.0000 0.9660 0.2587' },
      handle: { position: '0.0934 3.4491 2.4168', normal: '0.0000 0.5556 0.8315' },
      tub: { position: '-0.0870 2.0408 2.1469', normal: '0.0000 0.0000 1.0000' },
      rim: { position: '-0.1701 3.6663 0.3841', normal: '0.0000 1.0000 0.0000' },
    }),
  },
];

export const defaultCameraOrbit = '0deg 75deg auto';
