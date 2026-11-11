// Record gameplay frames (deviceScaleFactor 1) to review animation.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const [b, i] = (process.argv[2] || '0-2').split('-').map(Number);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(__dirname, '../games/trickle-valley.html'));
  await page.evaluate(() => localStorage.setItem('gamebop.trickle-valley.tutorial', '1'));
  await page.reload(); await page.waitForTimeout(400);
  await page.evaluate(([b, i]) => window.__tv.startLevel(b, i), [b, i]); await page.waitForTimeout(300);
  const segs = await page.evaluate(() => { const tv = window.__tv, G = tv.G; return G.lv.guides.map(g => g.map(([x, y]) => [tv.X(x + .5), tv.Y(y + .5)])); });
  for (const g of segs) { await page.mouse.move(g[0][0], g[0][1]); await page.mouse.down(); for (let j = 1; j < g.length; j++) for (let q = 1; q <= 10; q++) await page.mouse.move(g[j - 1][0] + (g[j][0] - g[j - 1][0]) * q / 10, g[j - 1][1] + (g[j][1] - g[j - 1][1]) * q / 10); await page.mouse.up(); }
  await page.evaluate(() => { for (const l of window.__tv.G.lenses) l.dir = l.sol; });
  await page.click('#flowBtn');
  const n = +(process.argv[3] || 8), gap = +(process.argv[4] || 350);
  for (let f = 0; f < n; f++) { await page.waitForTimeout(gap); await page.screenshot({ path: path.resolve(__dirname, `shots/tvf-${f}.jpg`), type: 'jpeg', quality: 75, clip: { x: 240, y: 90, width: 800, height: 450 } }); }
  await browser.close();
})();
