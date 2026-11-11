// Playwright checks for Canopy Swing: tutorial flow, support link, playing a level, save + Continue, endless run.
const { chromium } = require('playwright');
const URL = 'file:///home/claude/gamebop-site/games/canopy-swing.html';
const results = []; let failed = 0;
const ok = (name, cond, extra) => { results.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' (' + extra + ')' : '')); if (!cond) failed++; };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(700);
  const on = id => page.evaluate(id => document.getElementById(id).classList.contains('on'), id);
  const visible = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return !!e.offsetParent && r.width > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);

  // Support link on title
  const sup = await page.evaluate(() => { const a = document.getElementById('support'); return { href: a.getAttribute('href'), target: a.target, rel: a.rel, text: a.textContent }; });
  ok('support link href', sup.href === 'https://cash.app/$CharlieShocked', sup.href);
  ok('support link target/rel', sup.target === '_blank' && sup.rel.includes('noopener'));
  ok('support link visible on title', await visible('#support'));
  ok('title shows Play (no save)', (await page.textContent('#bPlay')).includes('Play'));

  // First play -> tutorial auto-appears
  await page.click('#bPlay'); await page.waitForTimeout(1000);
  ok('tutorial auto-appears on first play', await on('tut') && (await page.evaluate(() => __cs.G.kind)) === 'tut');
  ok('skip button visible', await visible('#tutSkip'));
  ok('support link hidden during gameplay', !(await visible('#support')));
  // try the first tutorial step for real: hold Space until roped
  await page.keyboard.down('Space'); await page.waitForTimeout(500);
  const roped = await page.evaluate(() => __cs.G.P.st === 'rope'); await page.keyboard.up('Space');
  ok('tutorial: holding grabs a branch', roped);
  await page.waitForTimeout(300);
  ok('tutorial advanced past step 1', (await page.evaluate(() => __cs.G.tutStep)) >= 1);
  // Skip
  await page.click('#tutSkip'); await page.waitForTimeout(1000);
  ok('skip ends tutorial', !(await on('tut')) && (await page.evaluate(() => __cs.G.kind)) === 'level');
  ok('tutorial completion stored', (await page.evaluate(() => localStorage.getItem('gamebop.canopy-swing.tutorial'))) === 'true');

  // Reload: Play should go straight to a level, no tutorial
  await page.reload(); await page.waitForTimeout(700);
  await page.click('#bPlay'); await page.waitForTimeout(1000);
  ok('tutorial does not reappear after reload', !(await on('tut')) && (await page.evaluate(() => __cs.G.kind)) === 'level');
  // Pause + quit back to title, then How to play replays tutorial
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok('Esc pauses', await on('pause'));
  await page.reload(); await page.waitForTimeout(700);
  await page.click('#bHow'); await page.waitForTimeout(1000);
  ok('How to play replays tutorial', await on('tut') && (await page.evaluate(() => __cs.G.kind)) === 'tut');
  await page.click('#tutSkip'); await page.waitForTimeout(1000);
  ok('skip from How to play returns to title', await on('title'));

  // Play level 1-1 for real with the autopilot bot (real time)
  await page.click('#bPlay'); await page.waitForTimeout(900);
  ok('level 1-1 started', (await page.evaluate(() => __cs.G.kind + __cs.G.w + __cs.G.l)) === 'level00');
  ok('HUD visible during play', await on('hud'));
  await page.evaluate(() => __cs.setBot(true));
  let done = false; const t0 = Date.now();
  while (Date.now() - t0 < 120000) { await page.waitForTimeout(1000); if (await on('results')) { done = true; break; } }
  ok('bot finished level 1-1 in real time', done, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  await page.screenshot({ path: '/home/claude/gamebop-site/build/shots/canopy-swing-results.jpg', type: 'jpeg', quality: 70 });
  const sv = await page.evaluate(() => JSON.parse(localStorage.getItem('gamebop.canopy-swing.save') || '{}'));
  ok('progress saved to localStorage', !!(sv.lv && sv.lv['0-0'] && sv.lv['0-0'].b > 0), JSON.stringify(sv.lv && sv.lv['0-0']));
  ok('fruit saved', sv.fruit > 0, 'fruit ' + sv.fruit);

  // Reload: Continue restores progress
  await page.reload(); await page.waitForTimeout(700);
  ok('title shows Continue', (await page.textContent('#bPlay')).includes('Continue'));
  await page.click('#bPlay'); await page.waitForTimeout(1000);
  ok('Continue opens the world map', await on('map'));
  const nodes = await page.evaluate(() => [...document.querySelectorAll('#nodes .node')].map(n => n.disabled));
  ok('Continue restores unlocks (level 2 open, level 3 locked)', nodes[0] === false && nodes[1] === false && nodes[2] === true, JSON.stringify(nodes.slice(0, 3)));
  ok('support link hidden on map', !(await visible('#support')));

  // Shop: buy something with saved fruit if affordable; tabs work
  await page.click('#mShop'); await page.waitForTimeout(400);
  ok('shop opens', await on('shop'));
  await page.click('#shop .tab[data-t="skin"]'); await page.waitForTimeout(200);
  ok('shop skin tab renders 7 cards', (await page.evaluate(() => document.querySelectorAll('#sGrid .card').length)) === 7);
  await page.click('#sClose'); await page.waitForTimeout(300);

  // Endless run: plays, dies eventually, records distance
  await page.evaluate(() => { __cs.goTitle(); }); await page.waitForTimeout(300);
  await page.click('#bRun'); await page.waitForTimeout(300); await page.click('#rGo'); await page.waitForTimeout(900);
  await page.evaluate(() => __cs.setBot(true)); await page.waitForTimeout(8000);
  const run = await page.evaluate(() => ({ kind: __cs.G.kind, dist: __cs.G.dist }));
  ok('endless run progresses', run.kind === 'run' && run.dist > 20, Math.round(run.dist) + ' m');
  await page.evaluate(() => { const G = __cs.G; G.bot = false; G.P.rope = null; G.P.shoot = null; G.P.st = 'air'; G.P.vy = 900; G.P.y = 780; }); await page.waitForTimeout(2200);
  ok('run ends with results + record saved', (await on('results')) && (await page.evaluate(() => JSON.parse(localStorage.getItem('gamebop.canopy-swing.save')).runBest)) > 0);

  // mute persists
  await page.click('#bMute'); ok('mute stored', (await page.evaluate(() => localStorage.getItem('gamebop.canopy-swing.mute'))) === 'true');

  // Mobile viewport: title fits, no horizontal scroll
  const m = await browser.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true }); const mp = await m.newPage();
  mp.on('pageerror', e => errors.push('mobile: ' + e.message));
  await mp.goto(URL); await mp.waitForTimeout(800);
  const ov = await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollHeight <= innerHeight + 1);
  ok('mobile: no page overflow', ov);
  await mp.screenshot({ path: '/home/claude/gamebop-site/build/shots/canopy-swing-mobile-title.jpg', type: 'jpeg', quality: 70 });
  await mp.tap('#bPlay'); await mp.waitForTimeout(1000);
  await mp.touchscreen.tap(200, 400); // quick tap
  const box = await mp.evaluate(() => __cs.G.kind); ok('mobile: tutorial via touch', box === 'tut');
  await mp.screenshot({ path: '/home/claude/gamebop-site/build/shots/canopy-swing-mobile-tut.jpg', type: 'jpeg', quality: 70 });

  ok('no page/console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n')); console.log(failed ? failed + ' FAILED' : 'ALL PASSED');
  await browser.close(); process.exit(failed ? 1 : 0);
})();
