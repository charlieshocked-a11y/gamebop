// Autopilot balance run: node build/balance-gale-regatta.js "0-0,1-0" [boat] [uplevel]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 500 }, deviceScaleFactor: 1 });
  const logs = []; page.on('pageerror', e => logs.push(e.message)); page.on('console', m => { if (m.type() != 'log') logs.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'games', 'gale-regatta.html'));
  const boat = process.argv[3] || 'dinghy', up = +(process.argv[4] || 0);
  await page.evaluate(([boat, up]) => { localStorage.setItem('gamebop.gale-regatta.tutorial', 'true'); save.boat = boat; save.up = { sail: up, hull: up, rudder: up, keel: up }; }, [boat, up]);
  for (const k of (process.argv[2] || '0-0').split(',')) {
    const [v, r] = k.split('-').map(Number);
    await page.evaluate(([v, r]) => { __gr.auto = true; __gr.speed = 1; startRace('race', v, r); setTimeout(() => { G.player.ai = { skill: .9, f: .8, tack: 1, cool: 0, terr: 0, terrT: 0, up: false, dumb: false }; __gr.speed = 12; }, 400); }, [v, r]);
    let res = null;
    for (let i = 0; i < 160 && !res; i++) { await page.waitForTimeout(400); res = await page.evaluate(() => G.result ? { p: G.result.place, t: G.result.time.toFixed(1), caps: G.rs.caps, bumps: G.rs.bumps, rocks: G.rs.rocks, sling: G.rs.sling } : null); }
    const st = await page.evaluate(() => G.boats.map(b => b.name + ':' + b.mi + (b.fin ? 'F' + b.finT.toFixed(0) : '') + (b.cap > 0 ? 'C' : '')).join(' ') + ' rt=' + G.rt.toFixed(0));
    console.log(k, JSON.stringify(res), st);
    await page.evaluate(() => { __gr.speed = 1; });
  }
  console.log(logs.slice(0, 10).join('\n'));
  await browser.close();
})();
