// Bot playtest for Quiver Peak: plays challenges + storm range, captures frames.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const FILE = 'file://' + path.resolve(__dirname, '..', 'games', 'quiver-peak.html');
const OUT = path.join(__dirname, 'shots', 'qp');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('gamebop.quiver-peak.tutorial', '1'); localStorage.setItem('gamebop.quiver-peak.save', JSON.stringify({ played: true, coins: 5000, medals: { fair: 'gold', pinewood: 'gold', lakeside: 'silver', glacier: 'bronze', thunder: 'gold' } })) } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(FILE); await sleep(1000);
  const st = () => page.evaluate(() => window.__qp.G.state);
  async function playMode(mode, arg, shots, err, tag, shotAt) {
    await page.evaluate(([m, a]) => { window.startMode(m, a) }, [mode, arg]);
    await sleep(900);
    const log = [];
    for (let i = 0; i < shots; i++) {
      let s; for (let k = 0; k < 200; k++) { s = await st(); if (s === 'ready' && await page.evaluate(() => window.__qp.G.loaded)) break; if (s === 'results' || s === 'round') break; await sleep(50); }
      if (s === 'results') break;
      if (s === 'round') { await page.click('#bNextRound'); await sleep(500); i--; continue; }
      await sleep(600);
      await page.evaluate(e => window.__qp.autoShot(e), err);
      if (shotAt && shotAt.includes(i)) for (let f = 0; f < 8; f++) { await page.screenshot({ path: path.join(OUT, tag + '-' + i + '-' + f + '.jpg'), type: 'jpeg', quality: 65 }); await sleep(110); }
      await sleep(300);
      log.push(await page.evaluate(() => window.__qp.SS.score+':'+window.__qp.G.state)); process.stdout.write('.');
    }
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT, tag + '-end.jpg'), type: 'jpeg', quality: 70 });
    console.log(tag, 'scores', log.join(','), 'state', await st());
  }
  await page.evaluate(() => { window.startMode = startMode; });
  if(process.argv[2]){const a=JSON.parse(process.argv[2]);await playMode(...a);console.log('errors',errors);await browser.close();return}
  await playMode('chal', 4, 10, 0.1, 'clays', [2]);
  await playMode('chal', 3, 8, 0.15, 'gongs', [1]);
  await playMode('chal', 6, 6, 0.05, 'hoops', [0]);
  await playMode('chal', 5, 6, 0.0, 'split', [0, 1]);
  await playMode('chal', 0, 8, 0.05, 'apples', [0]);
  await playMode('storm', 0, 16, 0.12, 'storm', [12, 14]);
  await playMode('career', 5, 14, 0.15, 'summit', [9, 10]);
  console.log('errors', errors.length, errors.slice(0, 5).join(' | '));
  await browser.close();
})();
