// Dev helper: gameplay screenshots per region/time of day.
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || '/tmp';
const list = (process.argv[3] || '0:day,1:day,2:day,3:day,4:day,5:day,0:golden,1:night').split(',');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../games/wild-lens.html'));
  await page.waitForTimeout(300);
  for (const it of list) {
    const [r, tod, wx] = it.split(':');
    await page.evaluate(([r, tod, wx]) => { const w = window.__wl; w.save.tools = { nv: 1, housing: 1, whistle: 1, fruit: 1, drone: 1 }; w.G.nextWx = wx || 'clear'; w.startSafari(+r, tod, false); }, [r, tod, wx]);
    await page.mouse.move(640, 400);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: OUT + '/g' + r + tod + (wx || '') + '.png' });
  }
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await browser.close();
})();
