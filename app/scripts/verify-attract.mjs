import { chromium } from 'playwright';
const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const p = await b.newPage({ viewport: { width: 1194, height: 834 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('EXC:', e.message));
await p.goto('http://127.0.0.1:5173/');
await p.waitForFunction(() => document.querySelector('model-viewer')?.loaded, { timeout: 30000 });
await p.waitForTimeout(800);
const srcA = await p.evaluate(() => document.querySelector('model-viewer').src);
console.log('start model:', srcA.split('/').pop());
console.log('carousel hint:', await p.getByText(/Swipe to browse/).count());
await p.screenshot({ path: 'scripts/.shots/attract-1.png' });

// Chevron next -> model swaps to chest
await p.getByRole('button', { name: 'Next product' }).click();
await p.waitForFunction(() => document.querySelector('model-viewer')?.src?.includes('tool-chest'), { timeout: 15000 });
await p.waitForTimeout(1000);
console.log('after next:', (await p.evaluate(() => document.querySelector('model-viewer').src)).split('/').pop());
console.log('label now:', await p.locator('[data-screen-label="Attract"] .font-display').first().textContent());
await p.screenshot({ path: 'scripts/.shots/attract-2-chest.png' });

// Swipe (drag) left on the model area -> should go next/prev (back to drill via wrap)
const box = { x: 600, y: 300 };
await p.mouse.move(box.x + 120, box.y);
await p.mouse.down();
await p.mouse.move(box.x - 120, box.y, { steps: 8 });
await p.mouse.up();
await p.waitForTimeout(1000);
console.log('after swipe:', (await p.evaluate(() => document.querySelector('model-viewer').src)).split('/').pop());

// Tap to explore (dot -> select drill first, then tap center)
await p.getByRole('button', { name: /Show Cordless Drill/ }).click();
await p.waitForTimeout(600);
await p.mouse.click(597, 250); // tap upper model area (above tray)
await p.waitForTimeout(600);
const mode = await p.locator('[data-screen-label="Attract"]').count();
console.log('entered explore (attract gone):', mode === 0);
await b.close(); console.log('done');
