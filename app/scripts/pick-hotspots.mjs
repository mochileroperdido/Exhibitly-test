import { chromium } from 'playwright';

const viewport = { width: 1194, height: 834 };
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport });
page.on('pageerror', (e) => console.log('EXC:', e.message));

await page.goto('http://127.0.0.1:5173/');
await page.waitForSelector('model-viewer');
await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded, { timeout: 30000 });
// Enter explore so the camera is at the deterministic default pose.
await page.click('model-viewer', { position: { x: viewport.width / 2, y: viewport.height / 2 } });
await page.waitForTimeout(800);

// Best-estimate CSS-pixel locations of each feature in the default (0deg 75deg) pose.
const targets = {
  chuck: [648, 248],
  clutchRing: [663, 203],
  trigger: [556, 360],
  ledLight: [603, 311],
  batteryPack: [575, 520],
};

const result = await page.evaluate((targets) => {
  const mv = document.querySelector('model-viewer');
  const rect = mv.getBoundingClientRect();
  // Spiral-search outward from the target until we hit the mesh.
  const pick = (cx, cy) => {
    for (let r = 0; r <= 140; r += 4) {
      for (let a = 0; a < 360; a += 30) {
        const x = cx + r * Math.cos((a * Math.PI) / 180);
        const y = cy + r * Math.sin((a * Math.PI) / 180);
        const hit = mv.positionAndNormalFromPoint(rect.left + x, rect.top + y);
        if (hit) return { x: Math.round(x), y: Math.round(y), ...hit };
      }
    }
    return null;
  };
  const out = {};
  for (const [id, [x, y]] of Object.entries(targets)) {
    const hit = pick(x, y);
    out[id] = hit
      ? {
          position: `${hit.position.x.toFixed(4)} ${hit.position.y.toFixed(4)} ${hit.position.z.toFixed(4)}`,
          normal: `${hit.normal.x.toFixed(4)} ${hit.normal.y.toFixed(4)} ${hit.normal.z.toFixed(4)}`,
          pickedAt: [hit.x, hit.y],
        }
      : null;
  }
  return out;
}, targets);

console.log(JSON.stringify(result, null, 2));
await browser.close();
