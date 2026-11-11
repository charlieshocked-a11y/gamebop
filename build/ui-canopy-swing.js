const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 640 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///home/claude/gamebop-site/games/canopy-swing.html');
  await p.evaluate(() => { localStorage.setItem('gamebop.canopy-swing.tutorial', 'true'); localStorage.setItem('gamebop.canopy-swing.save', JSON.stringify({ fruit: 640, lv: { '0-0': { b: 20, m: 3, i: [1, 0, 1] }, '0-1': { b: 30, m: 2, i: [0, 0, 0] }, '0-2': { b: 40, m: 1, i: [1, 1, 1] } }, ach: { swing: 1, perfect: 1, combo5: 1 } })); });
  await p.reload(); await p.waitForTimeout(600);
  await p.click('#bPlay'); await p.waitForTimeout(1300); await p.screenshot({ path: out + '/map.jpg', type: 'jpeg', quality: 70 });
  await p.click('#mShop'); await p.waitForTimeout(700); await p.screenshot({ path: out + '/shop.jpg', type: 'jpeg', quality: 70 });
  await p.click('#shop .tab[data-t="skin"]'); await p.waitForTimeout(300); await p.screenshot({ path: out + '/shop2.jpg', type: 'jpeg', quality: 70 });
  await p.click('#sClose'); await p.waitForTimeout(200); await p.click('#mAch'); await p.waitForTimeout(600); await p.screenshot({ path: out + '/ach.jpg', type: 'jpeg', quality: 70 });
  for (const [w, wait, name] of [[0, 9000, 'boss0'], [2, 9000, 'boss2'], [4, 9000, 'boss4']]) {
    await p.evaluate(w => { __cs.startLevel(w, 8); __cs.setBot(true); }, w); await p.waitForTimeout(wait);
    await p.evaluate(() => { const G = __cs.G; if (G.doom) { G.doom.x = G.P.x - 330; G.doom.wait = 0; } }); await p.waitForTimeout(250);
    await p.screenshot({ path: out + '/' + name + '.jpg', type: 'jpeg', quality: 70 }); }
  await b.close();
})();
