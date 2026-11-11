// Dev helper: bot plays a safari, screenshots periodically.
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || '/tmp', region = +(process.argv[3] || 0), tod = process.argv[4] || 'day';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '../games/wild-lens.html'));
  await page.waitForTimeout(300);
  await page.evaluate(([r, t]) => { const w = window.__wl; w.save.tools = { whistle: 1, fruit: 1, tele1: 1, nv: 1, housing: 1, drone: 1 }; w.startSafari(r, t, false); }, [region, tod]);
  let shot = 0;
  for (let k = 0; k < 70; k++) {
    const tgt = await page.evaluate(() => { const w = window.__wl; let b = null, bs = 0; for (const a of w.G.animals) { if (!a.bb || a.bbF !== w.G.frame) continue; const cx = (a.bb[0] + a.bb[2]) / 2, cy = (a.bb[1] + a.bb[3]) / 2, sz = a.bb[3] - a.bb[1] + (a.rare ? 200 : 0); if (cx > 100 && cx < 1180 && cy > 90 && cy < 640 && sz > bs) { bs = sz; b = [cx, cy, a.sp, a.rare, a.bb[3] - a.bb[1]]; } } return b; });
    if (tgt && (k % 3 === 0)) {
      await page.keyboard.down('KeyS'); await page.mouse.move(tgt[0] + 60, tgt[1] - 20); await page.waitForTimeout(200);
      const z = Math.min(4.5, Math.max(1, 230 / tgt[4]));
      await page.evaluate(z => { window.__wl.cam.zt = z; }, z); await page.waitForTimeout(500);
      await page.mouse.move(tgt[0] + 60, tgt[1] - 20); await page.waitForTimeout(250);
      await page.keyboard.press('Space'); await page.waitForTimeout(900);
      if (shot < 6) await page.screenshot({ path: OUT + '/p' + (shot++) + '.png' });
      await page.evaluate(() => { window.__wl.cam.zt = 1; }); await page.keyboard.up('KeyS');
    } else { await page.waitForTimeout(500); }
    if (k === 20) await page.keyboard.press('Digit1');
    if (k === 30) await page.keyboard.press('Digit3');
    const f = await page.evaluate(() => !document.getElementById('fork').classList.contains('hidden'));
    if (f) { await page.screenshot({ path: OUT + '/fork.png' }); await page.keyboard.press('KeyD'); }
    if (await page.evaluate(() => window.__wl.G.mode !== 'safari')) break;
    if (await page.evaluate(() => window.__wl.G.film <= 0)) { await page.evaluate(() => window.__wl.endTour()); break; }
  }
  await page.evaluate(() => { if (window.__wl.G.mode === 'safari') window.__wl.endTour(); });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: OUT + '/results.png' });
  console.log(await page.evaluate(() => JSON.stringify({ photos: window.__wl.G.photos.map(p => [p.X.sp, p.X.score, p.X.stars, p.X.tags.join('/')]), coins: window.__wl.save.coins })));
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await browser.close();
})();
