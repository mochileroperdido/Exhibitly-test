import { chromium } from 'playwright';
const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const p = await b.newPage({ viewport: { width: 1194, height: 834 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('EXC:', e.message));
await p.goto('http://127.0.0.1:5173/');
await p.waitForFunction(() => document.querySelector('model-viewer')?.loaded, { timeout: 30000 });
await p.click('model-viewer', { position: { x: 597, y: 417 } });
await p.waitForTimeout(500);
await p.getByText('Explore the drill').click().catch(()=>{});
await p.waitForTimeout(300);
await p.getByText('Rolling Tool Chest').click({ timeout: 5000 }).catch(()=>{});
await p.waitForFunction(() => document.querySelector('model-viewer')?.src?.includes('tool-chest'), { timeout: 15000 });
await p.waitForFunction(() => document.querySelector('model-viewer')?.loaded, { timeout: 15000 });
// deterministic pose
await p.evaluate(() => { const mv = document.querySelector('model-viewer'); mv.autoRotate = false; mv.cameraOrbit = '35deg 72deg auto'; });
await p.waitForTimeout(1200);
await p.screenshot({ path: 'scripts/.shots/chest-pose.png' });

const targets = { casters: [520, 720], handle: [627, 297], tub: [600, 490], rim: [598, 205] };
const res = await p.evaluate((targets) => {
  const mv = document.querySelector('model-viewer');
  const rect = mv.getBoundingClientRect();
  const pick = (cx, cy) => {
    for (let r = 0; r <= 160; r += 5) for (let a = 0; a < 360; a += 25) {
      const x = cx + r * Math.cos(a*Math.PI/180), y = cy + r * Math.sin(a*Math.PI/180);
      const hit = mv.positionAndNormalFromPoint(rect.left + x, rect.top + y);
      if (hit) return { x: Math.round(x), y: Math.round(y),
        position: `${hit.position.x.toFixed(4)} ${hit.position.y.toFixed(4)} ${hit.position.z.toFixed(4)}`,
        normal: `${hit.normal.x.toFixed(4)} ${hit.normal.y.toFixed(4)} ${hit.normal.z.toFixed(4)}` };
    }
    return null;
  };
  const out = {};
  for (const [k, [x, y]] of Object.entries(targets)) out[k] = pick(x, y);
  return out;
}, targets);
console.log(JSON.stringify(res, null, 2));
await b.close();
