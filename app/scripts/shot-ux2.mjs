import { chromium } from 'playwright';
const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const p = await b.newPage({ viewport: { width: 1194, height: 834 }, deviceScaleFactor: 2 });
await p.goto('http://127.0.0.1:5173/');
await p.waitForSelector('model-viewer');
await p.waitForFunction(() => document.querySelector('model-viewer')?.loaded, { timeout: 30000 });
await p.waitForTimeout(600);
await p.click('model-viewer', { position: { x: 597, y: 417 } }); // wake -> about drawer auto-shows
await p.waitForTimeout(700);
await p.screenshot({ path: 'scripts/.shots/ux2-about-drawer.png' });
// close about, show explore with wordmark + dock
await p.getByText('Explore the drill').click();
await p.waitForTimeout(500);
await p.screenshot({ path: 'scripts/.shots/ux2-explore.png' });
await b.close();
console.log('ok');
