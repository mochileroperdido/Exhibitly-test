import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const outDir = 'scripts/.shots';
mkdirSync(outDir, { recursive: true });
const viewport = { width: 1194, height: 834 };

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('EXC:', e.message));

await page.goto('http://127.0.0.1:5173/');
await page.waitForSelector('model-viewer');
await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded, { timeout: 30000 });
await page.waitForTimeout(600);

// Wake -> overview should auto-show.
await page.click('model-viewer', { position: { x: viewport.width / 2, y: viewport.height / 2 } });
await page.waitForTimeout(500);
const overviewShown = await page.locator('[data-screen-label="Overview"]').count();
console.log('overview auto-shown on wake:', overviewShown === 1);
await page.screenshot({ path: `${outDir}/ux-1-overview.png` });

// Dismiss overview.
await page.getByText('Explore the drill').click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/ux-2-explore-dock.png` });

// Stats chip must be gone from visitor UI.
const chipGone = (await page.getByText(/LOADED IN|TRIS/i).count()) === 0;
console.log('stats chip absent from visitor UI:', chipGone);

// Dock: auto-spin toggle.
await page.getByRole('button', { name: 'Start auto-rotate' }).click();
await page.waitForTimeout(400);
const spinning = await page.getByRole('button', { name: 'Stop auto-rotate' }).count();
console.log('auto-spin toggles:', spinning === 1);
await page.getByRole('button', { name: 'Stop auto-rotate' }).click();

// Dock: zoom in twice, then reset.
await page.getByRole('button', { name: 'Zoom in' }).click();
await page.getByRole('button', { name: 'Zoom in' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/ux-3-zoomed.png` });
await page.getByRole('button', { name: 'Reset view' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${outDir}/ux-4-reset.png` });

// Media gallery.
await page.getByRole('button', { name: 'How-to videos' }).click();
await page.waitForTimeout(500);
const galleryShown = await page.locator('[data-screen-label="Media gallery"]').count();
console.log('media gallery opens:', galleryShown === 1);
await page.screenshot({ path: `${outDir}/ux-5-media-grid.png` });

// Play first video; confirm it is muted.
await page.getByText('Right-angle drilling in tight spaces').click();
await page.waitForTimeout(800);
const muted = await page.evaluate(() => document.querySelector('video[controls]')?.muted);
console.log('video plays muted:', muted === true);
await page.screenshot({ path: `${outDir}/ux-6-video.png` });

await browser.close();
console.log('done');
