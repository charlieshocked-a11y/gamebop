// Dev helper: records gameplay frames zoomed onto a species (for animation review).
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || '/tmp';
const sp = process.argv[3] || 'zebra', region = +(process.argv[4] || 0), tod = process.argv[5] || 'day', action = process.argv[6] || '';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '../games/wild-lens.html'));
  await page.waitForTimeout(200);
  await page.evaluate(([sp, region, tod]) => {
    const w = window.__wl; w.save.tools = { whistle: 1, fruit: 1, drone: 1, nv: 1, housing: 1, tele1: 1 }; w.G.nextWx = 'clear'; w.startSafari(region, tod, false);
    // force a group of the species right in front
    const G = w.G; G.animals.length = 0;
    const T = G.tour; const sg = T.segs[0];
    spawnGroup(T, sg, sp, 8, true);
    G.keys.brake = true;
  }, [sp, region, tod]);
  await page.waitForTimeout(600);
  const pos = await page.evaluate(() => { const a = window.__wl.G.animals[0]; return a.bb ? [(a.bb[0] + a.bb[2]) / 2, (a.bb[1] + a.bb[3]) / 2] : [480, 300]; });
  await page.mouse.move(pos[0], pos[1]);
  await page.evaluate(() => { window.__wl.cam.zt = 2.2; });
  await page.waitForTimeout(700);
  if (action === 'flee') await page.evaluate(() => { window.__wl.G.animals.forEach(a => a.alarm = 1.2); });
  if (action) await page.evaluate(a => { window.__wl.G.animals.forEach(x => { if (a !== 'flee' && x.def.beh[a] !== undefined) { setS(x, a, 4); x.rare = a; } }); }, action);
  for (let i = 0; i < 12; i++) { await page.screenshot({ path: OUT + '/f' + String(i).padStart(2, '0') + '.png' }); await page.waitForTimeout(90); }
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await browser.close();
})();
