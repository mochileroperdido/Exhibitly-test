import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const outDir = 'scripts/.shots';
mkdirSync(outDir, { recursive: true });
const viewport = { width: 1194, height: 834 };

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERROR:', m.text()); });
page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', e.message));

await page.goto('http://127.0.0.1:5173/');
await page.waitForSelector('model-viewer');

const t0 = Date.now();
await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded, { timeout: 30000 });
console.log('model loaded in', Date.now() - t0, 'ms');

const src = await page.getAttribute('model-viewer', 'src');
console.log('model src:', src);

await page.waitForTimeout(1200);
await page.screenshot({ path: `${outDir}/new-1-attract.png` });

// Tap to wake into explore
await page.click('model-viewer', { position: { x: viewport.width / 2, y: viewport.height / 2 } });
await page.waitForTimeout(700);
await page.screenshot({ path: `${outDir}/new-2-explore.png` });

// Confirm hotspots are present in the DOM
const hotspotCount = await page.locator('button[slot^="hotspot-"]').count();
console.log('hotspot buttons rendered:', hotspotCount);

// Open a hotspot card
const chuck = page.locator('button[aria-label="Keyless Chuck"]');
if (await chuck.count()) {
  await chuck.click({ force: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/new-3-hotspot-card.png` });
}

await browser.close();
console.log('done');
