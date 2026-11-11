// Screenshot each venue mid-race: node build/venues-gale-regatta.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const logs = []; page.on('pageerror', e => logs.push(e.message)); page.on('console', m => { if (m.type() != 'log') logs.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'games', 'gale-regatta.html'));
  await page.evaluate(() => localStorage.setItem('gamebop.gale-regatta.tutorial', 'true'));
  const list = (process.argv[2] || '0-3,1-1,2-2,3-4,4-0,5-1').split(',');
  for (const k of list) {
    const [v, r] = k.split('-').map(Number);
    await page.evaluate(([v, r]) => { __gr.auto = true; __gr.speed = 1; startRace('race', v, r); setTimeout(() => { G.player.ai = { skill: 1, f: .8, tack: 1, cool: 0, terr: 0, terrT: 0, up: false, dumb: false }; __gr.speed = 4; }, 400); }, [v, r]);
    await page.waitForTimeout(4500);
    await page.evaluate(() => { __gr.speed = 1; });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(__dirname, 'shots', `gr-v${v}-${r}.png`) });
  }
  console.log(logs.slice(0, 10).join('\n'));
  await browser.close();
})();
