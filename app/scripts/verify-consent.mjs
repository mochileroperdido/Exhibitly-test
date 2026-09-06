import { chromium } from 'playwright';

const viewport = { width: 1194, height: 834 };
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('EXC:', e.message));

await page.goto('http://127.0.0.1:5173/');
await page.waitForSelector('model-viewer');
await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded, { timeout: 30000 });
await page.waitForTimeout(500);

// Wake into explore, dismiss overview.
await page.click('model-viewer', { position: { x: viewport.width / 2, y: viewport.height / 2 } });
await page.waitForTimeout(400);
await page.keyboard.press('Escape').catch(() => {});
await page.getByText('Explore the drill').click().catch(() => {});
await page.waitForTimeout(300);

// Open the lead form.
await page.getByRole('button', { name: 'Leave your details' }).click();
await page.waitForTimeout(300);

const consentBox = page.locator('input[type="checkbox"]');
console.log('consent checkbox present:', (await consentBox.count()) === 1);
console.log('privacy link present:', (await page.getByRole('link', { name: 'Privacy notice' }).count()) === 1);

// Fill name+email but leave consent unticked -> submit must be blocked with error.
await page.locator('input').first().fill('Test Visitor');
await page.locator('input[type="email"]').fill('test@example.com');
await page.getByRole('button', { name: 'Send it over' }).click();
await page.waitForTimeout(300);
const blocked = (await page.getByText(/agree to be contacted/i).count()) === 1;
const notDoneYet = (await page.getByText("you're in").count()) === 0;
console.log('submit blocked without consent:', blocked && notDoneYet);

// Tick consent, submit -> success.
await consentBox.check();
await page.getByRole('button', { name: 'Send it over' }).click();
await page.waitForTimeout(400);
const done = (await page.getByText("you're in").count()) === 1;
console.log('submit succeeds with consent:', done);

// Verify the stored lead carries consent fields.
const lead = await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('exhibly-kiosk') || '{}');
  const leads = raw?.state?.leads || [];
  return leads[leads.length - 1] || null;
});
console.log(
  'stored lead has consent fields:',
  !!lead && lead.consentGiven === true && !!lead.consentText && !!lead.consentVersion,
);
console.log('  ->', lead && { consentGiven: lead.consentGiven, consentVersion: lead.consentVersion });

await browser.close();
