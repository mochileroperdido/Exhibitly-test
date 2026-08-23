import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('scripts/.shots', { recursive: true });
const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('EXC:', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('ERR:', m.text()); });

// Kiosk: run a quick session so a live event stream is produced.
await p.goto('http://127.0.0.1:5173/');
await p.waitForFunction(() => document.querySelector('model-viewer')?.loaded, { timeout: 30000 });
await p.click('model-viewer', { position: { x: 640, y: 450 } }); // wake
await p.waitForTimeout(500);
await p.getByText('Explore the drill').click().catch(() => {});
await p.waitForTimeout(300);
const chuck = p.locator('button[aria-label="Keyless Chuck"]');
if (await chuck.count()) { await chuck.click({ force: true }); await p.waitForTimeout(700); }
console.log('insights button present:', await p.getByRole('button', { name: /Open Insights/ }).count());

// Go to dashboard
await p.getByRole('button', { name: /Open Insights/ }).click();
await p.waitForTimeout(700);
const sessions = await p.locator('.ins-hero .big').textContent();
console.log('engagement hero:', sessions);
console.log('has by-product panel:', await p.getByText('By product').count());
await p.screenshot({ path: 'scripts/.shots/ins-dark.png', fullPage: true });

// Toggle theme -> light
await p.getByRole('button', { name: 'Toggle theme' }).click();
await p.waitForTimeout(300);
await p.screenshot({ path: 'scripts/.shots/ins-light.png', fullPage: true });

// Date range: pick a day -> delta should appear
const dayBtns = p.locator('.ins-seg button');
console.log('date buttons:', await dayBtns.count());
await p.getByRole('button', { name: /Apr 15/ }).first().click().catch(() => {});
await p.waitForTimeout(300);
const deltaTxt = await p.locator('.ins-delta').count();
console.log('delta shown on day view:', deltaTxt);

// Product filter -> Impact Driver
await p.locator('select[aria-label="Product filter"]').selectOption({ label: 'Impact Driver' }).catch(() => {});
await p.waitForTimeout(300);
console.log('meta after product filter:', await p.locator('.ins-brand .meta').textContent());

// Generate report
await p.getByRole('button', { name: 'Generate report' }).click();
await p.waitForTimeout(400);
console.log('report open:', await p.locator('.ins-report').count());
await p.screenshot({ path: 'scripts/.shots/ins-report.png', fullPage: true });

await b.close();
console.log('done');
