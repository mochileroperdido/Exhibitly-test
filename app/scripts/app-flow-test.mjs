import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const outDir = 'scripts/.shots';
mkdirSync(outDir, { recursive: true });

const viewport = process.argv[2] === 'portrait' ? { width: 834, height: 1194 } : { width: 1194, height: 834 };
const tag = process.argv[2] === 'portrait' ? 'portrait' : 'landscape';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport });
page.on('console', (m) => {
  if (m.type() === 'error') console.log('PAGE ERROR:', m.text());
});
page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', e.message));

await page.goto('http://127.0.0.1:5173/');
await page.waitForSelector('model-viewer');
await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded, { timeout: 30000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/flow-${tag}-1-attract.png` });

// Tap to wake
await page.click('model-viewer', { position: { x: viewport.width / 2, y: viewport.height / 2 } });
await page.waitForTimeout(600);
await page.screenshot({ path: `${outDir}/flow-${tag}-2-explore.png` });

// Tap a hotspot (chuck) — find by aria-label
const chuck = page.locator('button[aria-label="Keyless Chuck"]');
await chuck.waitFor({ state: 'visible', timeout: 5000 });
await chuck.click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/flow-${tag}-3-hotspot-card.png` });

// Close card
await page.locator('button[aria-label="Close feature"]').click();
await page.waitForTimeout(300);

// Open switcher (tap stage) then switch product
await page.click('model-viewer', { position: { x: 50, y: 50 } });
await page.waitForTimeout(300);
await page.getByText('Kiri', { exact: false }).first().click({ timeout: 5000 }).catch(() => {});
await page.waitForTimeout(800);
await page.screenshot({ path: `${outDir}/flow-${tag}-4-switched-product.png` });

// Open lead form
await page.getByText('Leave your details').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/flow-${tag}-5-lead-form.png` });

// Fill and submit
await page.locator('input').first().fill('Jane Visitor');
await page.locator('input[type="email"]').fill('jane@example.com');
await page.getByText('Pricing', { exact: true }).click();
await page.getByText('Send it over').click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/flow-${tag}-6-lead-success.png` });
await page.waitForTimeout(2200);

// Open leads debug view via watermark 5x tap
for (let i = 0; i < 5; i++) {
  await page.getByText('EXHIBLY').click();
}
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/flow-${tag}-7-leads-debug.png` });

await browser.close();
console.log('done:', tag);
