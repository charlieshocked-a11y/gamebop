// Dev helper: renders large portraits of every species per region.
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || '/tmp';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 480 }, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '../games/wild-lens.html'));
  await page.waitForTimeout(300);
  for (let r = 0; r < 6; r++) {
    await page.evaluate(r => {
      let c = document.getElementById('insp'); if (!c) { c = document.createElement('canvas'); c.id = 'insp'; c.width = 1280; c.height = 480; c.style.cssText = 'position:fixed;left:0;top:0;z-index:999'; document.body.appendChild(c); }
      const g = c.getContext('2d'); g.fillStyle = '#333'; g.fillRect(0, 0, 1280, 480);
      const ks = Object.keys(window.__wl.SPEC).filter(k => window.__wl.SPEC[k].r === r);
      ks.forEach((k, i) => { const p = portrait(k, 316, 236); g.drawImage(p, (i % 4) * 320 + 2, Math.floor(i / 4) * 240 + 2); g.fillStyle = '#000'; g.font = '16px sans-serif'; g.fillText(k, (i % 4) * 320 + 8, Math.floor(i / 4) * 240 + 20); });
    }, r);
    await page.screenshot({ path: OUT + '/sp' + r + '.png' });
  }
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await browser.close();
})();
