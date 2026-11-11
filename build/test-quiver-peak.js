// Playwright test for Quiver Peak: tutorial, support link, real drag shot, save/continue, full tournament.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const FILE = 'file://' + path.resolve(__dirname, '..', 'games', 'quiver-peak.html');
const OUT = path.join(__dirname, 'shots', 'qp');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
function ok(name, cond, extra) { results.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' (' + extra + ')' : '')); if (!cond) process.exitCode = 1; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitState(page, states, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const s = await page.evaluate(() => window.__qp.G.state); if (states.includes(s)) return s; await sleep(50); }
  return await page.evaluate(() => window.__qp.G.state);
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(FILE);
  await sleep(1300);
  // support link
  const sup = page.locator('#support');
  ok('support link visible on title', await sup.isVisible());
  ok('support href', (await sup.getAttribute('href')) === 'https://cash.app/$CharlieShocked');
  ok('support target/rel', (await sup.getAttribute('target')) === '_blank' && (await sup.getAttribute('rel')) === 'noopener');
  ok('first label is Play', (await page.locator('#bPlay').textContent()) === 'Play');
  // first play -> tutorial
  await page.click('#bPlay');
  await sleep(900);
  ok('tutorial auto-appears on first play', await page.locator('#tut').isVisible() && await page.locator('#tutSkip').isVisible(), await page.locator('#tutCap').textContent());
  ok('support hidden during gameplay', !(await sup.isVisible()));
  await waitState(page, ['ready']); await sleep(700);
  // real drag shot
  await page.mouse.move(700, 380); await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(700, 380 + i * 9); await sleep(30); }
  for (let i = 0; i < 30; i++) { if (await page.evaluate(() => window.__qp.G.locked)) break; await sleep(50); }
  ok('drag draws bow to full', await page.evaluate(() => window.__qp.G.locked && window.__qp.G.draw > .99));
  ok('tutorial advanced after draw', (await page.locator('#tutCap').textContent()).includes('aim'));
  // aim up a little (compensate) then release, recording frames
  await page.mouse.move(700, 470);
  await page.keyboard.down('Shift'); await sleep(700);
  ok('steady reduces sway', await page.evaluate(() => window.__qp.G.steadyAmt > .5));
  await page.screenshot({ path: path.join(OUT, 'drawn.jpg'), type: 'jpeg', quality: 80 });
  await page.mouse.up(); await page.keyboard.up('Shift');
  for (let i = 0; i < 14; i++) { await page.screenshot({ path: path.join(OUT, 'flight-' + String(i).padStart(2, '0') + '.jpg'), type: 'jpeg', quality: 70 }); await sleep(70); }
  const st = await waitState(page, ['impact', 'return', 'ready']);
  ok('arrow flew and landed', ['impact', 'return', 'ready'].includes(st), st);
  // skip tutorial
  await page.click('#tutSkip');
  await sleep(900);
  ok('skip ends tutorial', !(await page.locator('#tut').isVisible()));
  ok('tutorial flag saved', await page.evaluate(() => localStorage.getItem('gamebop.quiver-peak.tutorial') === '1'));
  ok('modes screen after tutorial', await page.locator('#scrModes').isVisible());
  // reload: no tutorial
  await page.reload(); await sleep(1200);
  await page.click('#bPlay'); await sleep(900);
  ok('tutorial does not reappear after reload', !(await page.locator('#tut').isVisible()) && await page.locator('#scrModes').isVisible());
  // How to play replays
  await page.click('#scrModes [data-back]'); await sleep(500);
  await page.click('#bHow'); await sleep(900);
  ok('How to play replays tutorial', await page.locator('#tut').isVisible());
  await page.click('#tutSkip'); await sleep(900);
  ok('replay skip returns to main', await page.locator('#scrMain').isVisible());
  // Career: Village Fair
  await page.click('#bPlay'); await sleep(700);
  await page.locator('#modeGrid .card').nth(0).click(); await sleep(500);
  await page.locator('#tourGrid .card').nth(0).click(); await sleep(900);
  ok('career started', await page.evaluate(() => window.__qp.SS.mode === 'career'));
  ok('HUD visible / support hidden', await page.locator('#hud').isVisible() && !(await sup.isVisible()));
  for (let shot = 0; shot < 4; shot++) {
    await waitState(page, ['ready']); await sleep(750);
    await page.evaluate(() => window.__qp.autoShot(0.05));
    if (shot === 0) for (let i = 0; i < 10; i++) { await page.screenshot({ path: path.join(OUT, 'career-' + i + '.jpg'), type: 'jpeg', quality: 70 }); await sleep(90); }
    const s = await waitState(page, ['round', 'ready', 'volley'], 10000);
    if (s === 'volley' || s === 'round') {
      await waitState(page, ['round'], 12000);
      await page.screenshot({ path: path.join(OUT, 'round.jpg'), type: 'jpeg', quality: 75 });
      await page.click('#bNextRound');
    }
  }
  await waitState(page, ['ready']); await sleep(400);
  const run = await page.evaluate(() => JSON.parse(localStorage.getItem('gamebop.quiver-peak.save')).run);
  ok('progress saved to localStorage', run && run.round === 1 && run.arrow === 1, JSON.stringify(run && { round: run.round, arrow: run.arrow }));
  const score = await page.evaluate(() => window.__qp.SS.score);
  await page.reload(); await sleep(1200);
  ok('title shows Continue', (await page.locator('#bPlay').textContent()) === 'Continue');
  await page.click('#bPlay'); await sleep(1000);
  const rs = await page.evaluate(() => ({ m: window.__qp.SS.mode, r: window.__qp.SS.round, a: window.__qp.SS.arrow, s: window.__qp.SS.score }));
  ok('Continue restores career progress', rs.m === 'career' && rs.r === 1 && rs.a === 1 && rs.s === score, JSON.stringify(rs));
  // finish the tournament
  for (let guard = 0; guard < 40; guard++) {
    const s = await waitState(page, ['ready', 'round', 'results'], 12000);
    if (s === 'results') break;
    if (s === 'round') { await sleep(200); await page.click('#bNextRound'); await sleep(300); continue; }
    await sleep(700); await page.evaluate(() => window.__qp.autoShot(0.02));
  }
  await sleep(2200);
  await page.screenshot({ path: path.join(OUT, 'results.jpg'), type: 'jpeg', quality: 75 });
  const sv = await page.evaluate(() => JSON.parse(localStorage.getItem('gamebop.quiver-peak.save')));
  ok('tournament completes with medal + coins', !!sv.medals.fair && sv.coins > 0 && !sv.run, 'medal=' + sv.medals.fair + ' coins=' + sv.coins);
  // a challenge & storm quick smoke
  await page.locator('#rsFoot .btn').last().click(); await sleep(900);
  await page.click('#scrCareer [data-back]'); await sleep(400);
  await page.locator('#modeGrid .card').nth(1).click(); await sleep(400);
  await page.locator('#chalGrid .card').nth(1).click(); await sleep(2500);
  await page.screenshot({ path: path.join(OUT, 'balloons.jpg'), type: 'jpeg', quality: 75 });
  ok('challenge runs', await page.evaluate(() => window.__qp.SS.mode === 'chal' && window.__qp.SS.objs.length > 0));
  await page.keyboard.press('Escape'); await sleep(400);
  ok('pause works', await page.locator('#scrPause').isVisible());
  await page.click('#bQuit'); await sleep(900);
  ok('no console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  // mobile
  const m = await browser.newContext({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const mp = await m.newPage(); const merr = [];
  mp.on('pageerror', e => merr.push(e.message));
  await mp.goto(FILE); await sleep(1200);
  await mp.screenshot({ path: path.join(OUT, 'm-title.jpg'), type: 'jpeg', quality: 70 });
  await mp.tap('#bPlay'); await sleep(1200);
  await mp.screenshot({ path: path.join(OUT, 'm-tut.jpg'), type: 'jpeg', quality: 70 });
  await mp.tap('#tutSkip'); await sleep(900);
  await mp.screenshot({ path: path.join(OUT, 'm-modes.jpg'), type: 'jpeg', quality: 70 });
  const hs = await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  ok('mobile no horizontal overflow', hs);
  ok('mobile no errors', merr.length === 0, merr.join('|'));
  await browser.close();
  console.log(results.join('\n'));
})();
