const { chromium } = require('playwright');
const out = process.argv[2]; const specs = process.argv.slice(3); // w-l-delayMs-count-interval
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('CERR', m.text()); });
  await p.goto('file:///home/claude/gamebop-site/games/canopy-swing.html'); await p.waitForTimeout(500);
  for (const s of specs) { const [w, l, d, n, iv] = s.split('-').map(Number);
    await p.evaluate(([w, l]) => { __cs.startLevel(w, l); __cs.setBot(true); }, [w, l]); await p.waitForTimeout(d);
    for (let i = 0; i < n; i++) { await p.screenshot({ path: out + '/f' + w + l + '_' + i + '.jpg', type: 'jpeg', quality: 70 }); await p.waitForTimeout(iv); } }
  await b.close();
})();
