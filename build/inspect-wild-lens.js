// Dev helper: screenshots journal (all species) and region cards for visual inspection.
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || '/tmp';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../games/wild-lens.html'));
  await page.evaluate(() => { const s = window.__wl.save; for (const k in window.__wl.SPEC) s.journal[k] = { best: 500, stars: 3, n: 1 }; s.started = true; s.tools = { nv: 1, housing: 1 }; });
  await page.waitForTimeout(300);
  for (let t = 0; t < 6; t++) {
    await page.evaluate(t => { document.querySelector('#bJourT').click(); }, t);
    await page.waitForTimeout(100);
    await page.evaluate(t => { document.querySelectorAll('.tab')[t].click(); }, t);
    await page.waitForTimeout(500);
    await page.screenshot({ path: OUT + '/journal' + t + '.png' });
    await page.evaluate(() => document.getElementById('modal').classList.add('hidden'));
  }
  await page.evaluate(() => window.__wl.goCamp());
  await page.waitForTimeout(800);
  await page.screenshot({ path: OUT + '/camp.png' });
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await browser.close();
})();
