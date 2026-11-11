const { chromium } = require('playwright');
(async () => {
  const lv = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 500 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///home/claude/gamebop-site/games/canopy-swing.html'); await p.waitForTimeout(300);
  const res = await p.evaluate(lv => lv.map(s => { const [w, l] = s.split('-').map(Number); const r = __cs.simLevel(w, l, 140); return s + ' ' + r.won + ' t' + r.t + ' d' + r.deaths + ' x' + r.x + ' | ' + r.dlog; }), lv);
  console.log(res.join('\n')); await b.close();
})();
