#!/usr/bin/env node
/**
 * Asset pipeline: turns the raw photogrammetry exports into tablet-friendly GLBs.
 *
 * For each source, prefers a native .glb (better PBR fidelity than an OBJ/MTL
 * round-trip) and falls back to obj2gltf conversion if no .glb is present yet.
 * Then runs gltf-transform's optimize pass (mesh simplification, texture
 * resize + WebP recompression, Draco geometry compression), and bakes in
 * a corrective rotation so each model's default pose is camera-ready.
 *
 * Re-run any time a new/updated source export is dropped in place:
 *   node scripts/optimize-models.mjs
 */
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicModels = join(root, 'public', 'models');
const tmp = join(root, '.pipeline-tmp');

const sources = [
  {
    id: 'drill-reality-scan',
    dir: 'E:/Photogrammetry_Extraction/RealityScan/Drill Test',
    glbName: 'Drill_High_Res_Reality_Scan.glb',
    objName: 'Drill_High_Res_Reality_Scan.obj',
    // Higher fidelity target: this is the "high-res" variant, kept
    // noticeably larger/more detailed than Kiri on purpose so the
    // size-vs-experience comparison in the app is real, not cosmetic.
    simplify: true,
    simplifyRatio: 0.15,
    simplifyError: 0.0006,
    textureSize: 4096,
    // Corrective rotation baked into the root node post-optimize, so the
    // asset's default pose is the tuned "grip down, chuck forward" hero
    // pose and no runtime `orientation` attribute is needed. Determined by
    // visual trial against THIS specific export (see scripts/orient-test.mjs
    // + scripts/bake-orientation.mjs) — a different/re-exported source may
    // need this re-tuned.
    correctionQuat: quatFromAxisAngle([0, 1, 0], -90), // -90deg around Y
  },
  {
    id: 'drill-kiri',
    dir: 'E:/Photogrammetry_Extraction/Kiri/Drill',
    glbName: null, // no native GLB export supplied for Kiri yet
    objName: '3DModel.obj',
    // Already a lightweight capture; skip simplification, just
    // compress texture/geometry.
    simplify: false,
    textureSize: 2048,
    correctionQuat: quatFromAxisAngle([0, 0, 1], -45), // -45deg around Z
  },
];

function quatFromAxisAngle([x, y, z], degrees) {
  const half = (degrees * Math.PI) / 180 / 2;
  const s = Math.sin(half);
  return [x * s, y * s, z * s, Math.cos(half)];
}

function quatMultiply([qx, qy, qz, qw], [x, y, z, w]) {
  return [
    qw * x + qx * w + qy * z - qz * y,
    qw * y - qx * z + qy * w + qz * x,
    qw * z + qx * y - qy * x + qz * w,
    qw * w - qx * x - qy * y - qz * z,
  ];
}

async function bakeOrientation(file, correctionQuat) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  });
  const doc = await io.read(file);
  for (const scene of doc.getRoot().listScenes()) {
    for (const node of scene.listChildren()) {
      node.setRotation(quatMultiply(correctionQuat, node.getRotation()));
    }
  }
  await io.write(file, doc);
}

function run(cmd, args) {
  console.log('▸', cmd, args.join(' '));
  // Build a manually-quoted command string rather than passing an argv
  // array through execFileSync: on Windows, npx resolves to npx.cmd, which
  // can only be spawned via a shell, and shell mode doesn't reliably
  // preserve an argv array's quoting for paths containing spaces (this repo
  // and the E:\ source paths both have them).
  const quotedArgs = args.map((a) => `"${String(a).replace(/"/g, '\\"')}"`).join(' ');
  execSync(`${cmd} ${quotedArgs}`, { stdio: 'inherit' });
}

mkdirSync(publicModels, { recursive: true });
mkdirSync(tmp, { recursive: true });

for (const src of sources) {
  console.log(`\n=== ${src.id} ===`);
  const nativeGlb = src.glbName ? join(src.dir, src.glbName) : null;
  let rawGlb;

  if (nativeGlb && existsSync(nativeGlb)) {
    console.log('Using native GLB export:', nativeGlb);
    rawGlb = nativeGlb;
  } else {
    const obj = join(src.dir, src.objName);
    if (!existsSync(obj)) {
      console.warn(`Skipping ${src.id}: no .glb or .obj found in ${src.dir}`);
      continue;
    }
    rawGlb = join(tmp, `${src.id}-raw.glb`);
    console.log('No native GLB found, converting from OBJ:', obj);
    run('npx', ['obj2gltf', '-i', obj, '-o', rawGlb]);
  }

  const out = join(publicModels, `${src.id}.glb`);
  const args = [
    'gltf-transform',
    'optimize',
    rawGlb,
    out,
    '--compress',
    // Draco, not meshopt: <model-viewer>'s bundled three.js GLTFLoader
    // throws ("setMeshoptDecoder must be called before loading compressed
    // files") unless you separately wire up the meshopt wasm decoder.
    // Draco works out of the box (its decoder is auto-fetched).
    'draco',
    '--texture-compress',
    'webp',
    '--texture-size',
    String(src.textureSize),
    '--simplify',
    String(!!src.simplify),
  ];
  if (src.simplify) {
    args.push('--simplify-ratio', String(src.simplifyRatio));
    args.push('--simplify-error', String(src.simplifyError));
  }
  run('npx', args);

  if (src.correctionQuat) {
    await bakeOrientation(out, src.correctionQuat);
    console.log('baked corrective orientation');
  }

  const { size } = statSync(out);
  console.log(`${src.id}.glb → ${(size / 1024 / 1024).toFixed(2)} MB`);
}

rmSync(tmp, { recursive: true, force: true });
console.log('\nDone. Run `npx gltf-transform inspect public/models/<file>.glb` for detailed stats.');
