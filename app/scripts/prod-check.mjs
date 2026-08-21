import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1194, height: 834 } });
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE ERROR:', m.text()));
page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', e.message));

await page.goto('http://127.0.0.1:4173/');
await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded, { timeout: 30000 });
await page.waitForTimeout(500);

const swState = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.active?.state ?? 'registered-no-active' : 'not-registered';
});
console.log('service worker:', swState);

const fontsLoaded = await page.evaluate(() => document.fonts.check('16px "Saira Condensed"'));
console.log('Saira Condensed loaded:', fontsLoaded);

await page.screenshot({ path: 'scripts/.shots/prod-check.png' });
await browser.close();
console.log('ok');
