// Functional test for Trickle Valley: tutorial, support link, real-input play, save & continue.
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../games/trickle-valley.html');
const results = []; const ok = (name, cond, extra) => { results.push([name, !!cond]); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' ' + extra : '')); };
const vis = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); const st = getComputedStyle(e); let p = e; while (p) { const cs = getComputedStyle(p); if (cs.display === 'none' || cs.visibility === 'hidden') return false; p = p.parentElement; } return r.width > 0 && r.height > 0 && st.opacity !== '0'; }, sel);
async function dragGuides(page, onlyFirst) {
  const segs = await page.evaluate(of => { const tv = window.__tv, G = tv.G; return (of ? [G.lv.guides[0]] : G.lv.guides).map(g => g.map(([x, y]) => [tv.X(x + .5), tv.Y(y + .5)])); }, onlyFirst);
  for (const g of segs) {
    await page.mouse.move(g[0][0], g[0][1]); await page.mouse.down();
    for (let j = 1; j < g.length; j++) { const [x0, y0] = g[j - 1], [x1, y1] = g[j], n = 12; for (let q = 1; q <= n; q++) await page.mouse.move(x0 + (x1 - x0) * q / n, y0 + (y1 - y0) * q / n); }
    await page.mouse.up(); await page.waitForTimeout(60);
  }
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) errs.push('external ' + u); });
  await page.goto(URL); await page.waitForTimeout(800);
  // support link
  const sup = await page.evaluate(() => { const a = document.getElementById('support'); return { href: a.href, target: a.target, rel: a.rel, text: a.textContent }; });
  ok('support link href/target/rel', sup.href === 'https://cash.app/$CharlieShocked' && sup.target === '_blank' && sup.rel.includes('noopener') && sup.text.includes('Support'), JSON.stringify(sup));
  ok('support link visible on title', await vis(page, '#support'));
  // first play -> tutorial auto-appears
  await page.click('#bPlay'); await page.waitForTimeout(500);
  ok('tutorial auto-appears on first play', await vis(page, '#tut .cap') && await page.evaluate(() => window.__tv.TUT.active));
  ok('skip button visible during tutorial', await vis(page, '#tutSkip'));
  ok('support link hidden during gameplay', !(await vis(page, '#support')));
  // tutorial teaches by doing: drag the channel advances the step
  await dragGuides(page, true); await page.waitForTimeout(400);
  ok('tutorial advances after digging', await page.evaluate(() => window.__tv.TUT.step) === 1);
  // skip
  await page.click('#tutSkip'); await page.waitForTimeout(300);
  ok('tutorial skipped (hidden)', !(await vis(page, '#tut .cap')) && !(await page.evaluate(() => window.__tv.TUT.active)));
  ok('tutorial completion stored', await page.evaluate(() => localStorage.getItem('gamebop.trickle-valley.tutorial')) === '1');
  // reload -> no auto tutorial
  await page.reload(); await page.waitForTimeout(700);
  await page.click('#bPlay'); await page.waitForTimeout(500);
  ok('tutorial does not reappear after reload', !(await vis(page, '#tut .cap')) && await page.evaluate(() => window.__tv.scene) === 'play');
  // back to title via pause -> map -> back, then How to play replays
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok('pause menu opens with Esc', await page.evaluate(() => window.__tv.modalOpen));
  await page.click('#pMap'); await page.waitForTimeout(400); await page.click('#mBack'); await page.waitForTimeout(500);
  ok('support link visible again on title', await vis(page, '#support'));
  await page.click('#bHow'); await page.waitForTimeout(500);
  ok('How to play replays tutorial', await vis(page, '#tut .cap') && await page.evaluate(() => window.__tv.TUT.active));
  // play the level for real with mouse input
  await dragGuides(page, false); await page.waitForTimeout(300);
  await page.click('#flowBtn'); await page.waitForTimeout(400);
  const flowing = await page.evaluate(() => window.__tv.G.sources.some(s => s.open));
  ok('flow button opens the spring', flowing);
  let won = false; for (let t = 0; t < 40 && !won; t++) { await page.waitForTimeout(500); won = await page.evaluate(() => window.__tv.G.won); }
  ok('level won by digging with the mouse', won);
  await page.waitForTimeout(2200);
  ok('win panel shown', await vis(page, '#pNext'));
  const sv = await page.evaluate(() => JSON.parse(localStorage.getItem('gamebop.trickle-valley.save') || '{}'));
  ok('progress saved to localStorage', sv.lv && sv.lv['0-0'] && sv.lv['0-0'].done === 1, JSON.stringify(sv.lv));
  await page.screenshot({ path: path.resolve(__dirname, 'shots/tv-win.png') });
  // continue restores progress
  await page.reload(); await page.waitForTimeout(700);
  ok('title shows Continue', (await page.textContent('#bPlay')).includes('Continue'));
  await page.click('#bPlay'); await page.waitForTimeout(600);
  const g = await page.evaluate(() => [window.__tv.G.b, window.__tv.G.i, window.__tv.scene]);
  ok('Continue resumes at next level (0-2 → index 1)', g[0] === 0 && g[1] === 1 && g[2] === 'play', JSON.stringify(g));
  // undo / restart keys
  const before = await page.evaluate(() => window.__tv.G.dug);
  await dragGuides(page, true); const mid = await page.evaluate(() => window.__tv.G.dug);
  await page.keyboard.press('z'); await page.waitForTimeout(100); const after = await page.evaluate(() => window.__tv.G.dug);
  ok('Z undoes last dig stroke', mid > before && after < mid, `${before}/${mid}/${after}`);
  await page.keyboard.press('r'); await page.waitForTimeout(300);
  ok('R restarts level', await page.evaluate(() => window.__tv.G.dug) === 0);
  // map screen & garden & awards & mobile
  await page.keyboard.press('Escape'); await page.click('#pMap'); await page.waitForTimeout(400);
  ok('map shows level stones', await page.evaluate(() => document.querySelectorAll('#lvgrid .lv').length) === 11);
  await page.click('#mBack'); await page.waitForTimeout(400); await page.click('#bGarden'); await page.waitForTimeout(400);
  ok('garden shop lists decorations', await page.evaluate(() => document.querySelectorAll('#shop .deco').length) >= 12);
  await page.click('#gBack'); await page.waitForTimeout(300); await page.click('#bAch'); await page.waitForTimeout(300);
  ok('20+ achievements listed', await page.evaluate(() => document.querySelectorAll('#achGrid .ach').length) >= 20);
  await page.setViewportSize({ width: 390, height: 700 }); await page.click('#aBack'); await page.waitForTimeout(500);
  ok('no horizontal overflow on phone', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: path.resolve(__dirname, 'shots/tv-phone-title.png') });
  await page.click('#bPlay'); await page.waitForTimeout(600);
  await page.screenshot({ path: path.resolve(__dirname, 'shots/tv-phone-play.png') });
  ok('no console/page errors or external requests', errs.length === 0, errs.slice(0, 3).join(' | '));
  await browser.close();
  const f = results.filter(r => !r[1]).length;
  console.log(f ? `${f} FAILED of ${results.length}` : `ALL ${results.length} PASSED`);
  process.exit(f ? 1 : 0);
})();
