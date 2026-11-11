// Functional test for gale-regatta: node build/test-gale-regatta.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.join(__dirname, '..', 'games', 'gale-regatta.html');
const shots = path.join(__dirname, 'shots');
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() == 'error' || m.type() == 'warning') errs.push(m.text()); });
  await page.goto(file); await page.waitForTimeout(900);
  const vis = id => page.evaluate(id => { const e = document.getElementById(id); if (!e) return false; const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility != 'hidden' && s.display != 'none' && !!e.offsetParent; }, id);
  // support link
  const sup = await page.evaluate(() => { const a = document.getElementById('support'); return { href: a.getAttribute('href'), t: a.target, rel: a.rel, txt: a.textContent }; });
  ok(sup.href == 'https://cash.app/$CharlieShocked' && sup.t == '_blank' && sup.rel.includes('noopener') && sup.txt.includes('Support'), 'support link href/target/rel');
  ok(await vis('support'), 'support link visible on title');
  // first play -> tutorial
  await page.click('#bPlay'); await page.waitForTimeout(700);
  ok(await vis('tutCap') && await vis('tutSkip'), 'tutorial auto-appears on first play with Skip');
  ok(!(await vis('support')), 'support hidden during tutorial');
  // try step 1: steer
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(1200); await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => G.tutStep) >= 1, 'tutorial advances by steering');
  await page.screenshot({ path: shots + '/gr-tut.png' });
  await page.click('#tutSkip'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => localStorage.getItem('gamebop.gale-regatta.tutorial')) == 'true', 'tutorial completion stored');
  ok(!(await vis('tutCap')) && await vis('hPause'), 'skip goes straight into first race');
  ok(!(await vis('support')), 'support link hidden during gameplay');
  ok(await page.evaluate(() => G.mode == 'race' && G.v == 0 && G.rIdx == 0), 'race 1 of Harbour running');
  // autopilot the race
  await page.evaluate(() => { __gr.auto = true; G.player.ai = { skill: 1, f: .8, tack: 1, cool: 0, terr: 0, terrT: 0, up: false, dumb: false }; __gr.speed = 8; });
  let done = false; for (let i = 0; i < 90 && !done; i++) { await page.waitForTimeout(500); done = await vis('resP'); }
  await page.evaluate(() => { __gr.speed = 1; });
  ok(done, 'race finished and results shown');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: shots + '/gr-results.png' });
  const sv = await page.evaluate(() => JSON.parse(localStorage.getItem('gamebop.gale-regatta.save') || '{}'));
  ok(sv.races && sv.races['0-0'] && sv.races['0-0'].best > 0, 'race result saved to localStorage (' + JSON.stringify(sv.races && sv.races['0-0']) + ', coins ' + sv.coins + ')');
  // reload -> continue
  await page.reload(); await page.waitForTimeout(900);
  ok((await page.textContent('#playLbl')).trim() == 'Continue', 'title shows Continue after reload');
  ok(await vis('support'), 'support link back on title');
  await page.click('#bPlay'); await page.waitForTimeout(800);
  ok(!(await vis('tutCap')), 'tutorial does not reappear after reload');
  ok(await vis('venues'), 'Continue opens the career map');
  const coinsShown = await page.evaluate(() => document.querySelector('#map .cv').textContent);
  ok(+coinsShown == sv.coins, 'map restores coins ' + coinsShown);
  const flag = await page.evaluate(() => document.querySelector('#races .race').textContent);
  ok(/\d:\d\d/.test(flag), 'map shows saved best time for race 1: ' + flag);
  await page.screenshot({ path: shots + '/gr-map.png' });
  // how to play replay
  await page.click('#mBack'); await page.waitForTimeout(700);
  await page.click('#bHow'); await page.waitForTimeout(800);
  ok(await vis('tutCap'), 'How to play replays the tutorial');
  await page.click('#tutSkip'); await page.waitForTimeout(800);
  ok(await vis('bPlay'), 'skipping replay returns to title');
  // dock
  await page.click('#bDock'); await page.waitForTimeout(900);
  await page.screenshot({ path: shots + '/gr-dock.png' });
  ok(await vis('dockBody'), 'dock opens');
  // pause during race
  await page.evaluate(() => startRace('race', 0, 0)); await page.waitForTimeout(800);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ok(await vis('pRes'), 'Esc pauses');
  await page.keyboard.press('Escape');
  // full tutorial playthrough in a fresh profile
  const tc = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const tp = await tc.newPage(); tp.on('pageerror', e => errs.push(e.message));
  await tp.goto(file); await tp.waitForTimeout(700); await tp.click('#bPlay'); await tp.waitForTimeout(700);
  await tp.keyboard.down('ArrowRight'); await tp.waitForTimeout(1000); await tp.keyboard.up('ArrowRight');
  const s1 = await tp.evaluate(() => G.tutStep);
  for (let i = 0; i < 40 && await tp.evaluate(() => G.tutStep) == 1; i++) { const d = await tp.evaluate(() => G.player.trim - G.player.ideal); const k = d > 0 ? 'w' : 's'; await tp.keyboard.down(k); await tp.waitForTimeout(Math.min(400, Math.abs(d) * 1300 + 20)); await tp.keyboard.up(k); await tp.waitForTimeout(250); }
  const s2 = await tp.evaluate(() => G.tutStep);
  await tp.keyboard.press('Space'); await tp.waitForTimeout(3500);
  const s3 = await tp.evaluate(() => G.tutStep);
  await tp.evaluate(() => { __gr.auto = true; G.player.ai = { skill: 1, f: .8, tack: 1, cool: 0, terr: 0, terrT: 0, up: false, dumb: false }; __gr.speed = 6; });
  for (let i = 0; i < 60 && await tp.evaluate(() => G.mode == 'tut'); i++) await tp.waitForTimeout(500);
  await tp.evaluate(() => { __gr.auto = false; __gr.speed = 1; });
  const endMode = await tp.evaluate(() => G.mode);
  ok(s1 >= 1 && s2 >= 2 && s3 >= 3 && endMode == 'race', `full tutorial completes by doing (steps ${s1},${s2},${s3} -> ${endMode})`);
  await tc.close();
  // mobile
  const m = await browser.newContext({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const mp = await m.newPage(); mp.on('pageerror', e => errs.push(e.message));
  await mp.goto(file); await mp.waitForTimeout(900); await mp.screenshot({ path: shots + '/gr-m-title.png' });
  await mp.tap('#bPlay'); await mp.waitForTimeout(900); await mp.screenshot({ path: shots + '/gr-m-tut.png' });
  await mp.tap('#tutSkip'); await mp.waitForTimeout(5000); await mp.screenshot({ path: shots + '/gr-m-race.png' });
  ok(await mp.evaluate(() => document.body.classList.contains('touch')), 'touch controls enabled on tap');
  const ov = await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth); ok(ov, 'no horizontal overflow on phone');
  ok(errs.length == 0, 'no errors/warnings ' + errs.slice(0, 5).join(' | '));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
