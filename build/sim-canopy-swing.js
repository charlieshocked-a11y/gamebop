const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 500 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///home/claude/gamebop-site/games/canopy-swing.html'); await p.waitForTimeout(500);
  const res = await p.evaluate(() => { const out = []; for (let w = 0; w < 6; w++) for (let l = 0; l < 9; l++) { const r = __cs.simLevel(w, l, 150); out.push(w + '-' + l + ' ' + JSON.stringify(r)); } return out; });
  console.log(res.join('\n')); await b.close();
})();
