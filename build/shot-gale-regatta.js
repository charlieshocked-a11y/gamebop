// Debug screenshots for gale-regatta: node build/shot-gale-regatta.js [v] [r] [w] [h]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [v = 0, r = 0, w = 1280, h = 720] = process.argv.slice(2).map(Number);
  const out = path.join(__dirname, 'shots');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', m => { if (m.type() !== 'log') logs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => logs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'games', 'gale-regatta.html'));
  await page.evaluate(() => localStorage.setItem('gamebop.gale-regatta.tutorial', 'true'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: out + '/gr-title.png' });
  await page.evaluate(([v, r]) => { startRace('race', v, r); }, [v, r]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '/gr-count.png' });
  await page.evaluate(() => { __gr.auto = true; G.player.ai = { skill: 1, f: .8, tack: 1, cool: 0, terr: 0, terrT: 0, up: false, dumb: false }; });
  await page.waitForTimeout(9000);
  await page.screenshot({ path: out + '/gr-race1.png' });
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(90); await page.screenshot({ path: out + '/gr-f' + i + '.png' }); }
  await page.evaluate(() => { __gr.speed = 6; });
  await page.waitForTimeout(8000);
  await page.evaluate(() => { __gr.speed = 1; });
  await page.screenshot({ path: out + '/gr-race2.png' });
  const st = await page.evaluate(() => ({ mi: G.player.mi, n: G.marks.length, rank: G.player.rank, t: G.rt, fin: G.finOrder.map(b => b.name) }));
  console.log(JSON.stringify(st));
  console.log(logs.slice(0, 15).join('\n'));
  await browser.close();
})();
