const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2]; const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  await p.goto('file:///home/claude/gamebop-site/games/canopy-swing.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { __cs.startLevel(0, 2); __cs.setBot(true); }); await p.waitForTimeout(2000);
  for (let i = 0; i < 8; i++) { const r = await p.evaluate(() => { const G = __cs.G, s = Math.min(innerHeight / 700, innerWidth / 620) * G.cam.z; return [innerWidth / 2 + (G.P.x - G.cam.x) * s, innerHeight / 2 + (G.P.y - G.cam.y) * s, G.P.st]; });
    await p.screenshot({ path: out + '/z' + i + '.png', clip: { x: Math.max(0, r[0] - 90), y: Math.max(0, r[1] - 110), width: 180, height: 180 } }); await p.waitForTimeout(140); }
  await b.close();
})();
