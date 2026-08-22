import { chromium } from 'playwright';
const [file, out, w, h] = [process.argv[2], process.argv[3], +process.argv[4]||1300, +process.argv[5]||980];
const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('EXC:', e.message));
await p.goto('file://' + file);
await p.waitForTimeout(1300);
await p.screenshot({ path: out, fullPage: true });
await b.close(); console.log('shot', out);
