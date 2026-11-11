// Bot solver: digs each level's planned route, opens gadgets, simulates, reports water use.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const which = process.argv[2]; // optional "b" or "b-i"
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../games/trickle-valley.html'));
  await page.waitForTimeout(500);
  const list = [];
  for (let b = 0; b < 6; b++) for (let i = 0; i <= 10; i++) {
    if (which && !(which === String(b) || which === b + '-' + i)) continue;
    list.push([b, i]);
  }
  const out = {};
  for (const [b, i] of list) {
    const r = await page.evaluate(([b, i, inf]) => window.__tv.bot(b, i, 110, inf), [b, i, process.argv[3] === 'inf']);
    out[b * 11 + i] = r.used;
    console.log(JSON.stringify(r));
  }
  console.log('USED=' + JSON.stringify(out));
  if (errs.length) console.log('ERRORS', errs.slice(0, 5));
  await browser.close();
})();
