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
await p.getByText('Rolling Tool Chest').click({ timeout: 5000 });
await p.waitForFunction(() => document.querySelector('model-viewer')?.src?.includes('tool-chest'), { timeout: 15000 });
await p.waitForFunction(() => document.querySelector('model-viewer')?.loaded, { timeout: 15000 });
await p.evaluate(() => { const mv=document.querySelector('model-viewer'); mv.autoRotate=false; mv.cameraOrbit='35deg 72deg auto'; });
await p.waitForTimeout(1200);
console.log('chest hotspots:', await p.locator('button[slot^="hotspot-"]').count());
await p.screenshot({ path: 'scripts/.shots/chest-final.png' });
// open a chest hotspot card
const cast = p.locator('button[aria-label="Locking Swivel Casters"]');
if (await cast.count()) { await cast.click({ force: true }); await p.waitForTimeout(400); }
await p.screenshot({ path: 'scripts/.shots/chest-card.png' });

// dashboard: product filter should list 2 real products
await p.evaluate(() => { location.hash = '#/insights'; });
await p.waitForTimeout(700);
const opts = await p.locator('select[aria-label="Product filter"] option').allTextContents();
console.log('product options:', JSON.stringify(opts));
console.log('by-product cards:', await p.locator('.ins-prodcard .pn').allTextContents());
await b.close(); console.log('done');
