// Wild Lens end-to-end test: tutorial, support link, play a safari, save + continue.
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../games/wild-lens.html');
const results = []; const ok = (name, cond, extra) => { results.push([name, !!cond]); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };
const vis = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('.hidden'); }, sel);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) errs.push('external ' + u); });
  await page.goto(FILE); await page.waitForTimeout(800);
  // support link
  const sup = await page.evaluate(() => { const a = document.getElementById('support'); return { href: a.getAttribute('href'), target: a.target, rel: a.rel, text: a.textContent }; });
  ok('support link href/target/rel', sup.href === 'https://cash.app/$CharlieShocked' && sup.target === '_blank' && /noopener/.test(sup.rel) && /Support/.test(sup.text), JSON.stringify(sup));
  ok('support link visible on title', await vis(page, '#support'));
  ok('title shows Play for new player', (await page.textContent('#bPlay')).trim() === 'Play');
  // first play -> tutorial auto
  await page.click('#bPlay'); await page.waitForTimeout(700);
  ok('tutorial auto-appears on first play', await vis(page, '#tutCap') && (await page.textContent('#tutCap')).length > 3);
  ok('skip button visible during tutorial', await vis(page, '#tutSkip'));
  ok('support link hidden during gameplay', !(await vis(page, '#support')));
  // interactive: aim moves step forward
  for (let i = 0; i < 8; i++) await page.mouse.move(300 + i * 90, 380 + (i % 2) * 40);
  await page.waitForTimeout(400);
  ok('tutorial advances when aiming', await page.evaluate(() => window.__wl.G.tutStep >= 1));
  await page.click('#tutSkip'); await page.waitForTimeout(300);
  ok('tutorial skipped (hidden)', !(await vis(page, '#tutCap')));
  ok('tutorial completion stored', await page.evaluate(() => localStorage.getItem('gamebop.wild-lens.tutorial') === 'true'));
  // play the safari: aim at animals and snap
  let shots = 0, best = 0;
  for (let k = 0; k < 40 && shots < 6; k++) {
    const tgt = await page.evaluate(() => { const w = window.__wl; let b = null; for (const a of w.G.animals) { if (!a.bb || a.bbF !== w.G.frame) continue; const cx = (a.bb[0] + a.bb[2]) / 2, cy = (a.bb[1] + a.bb[3]) / 2; if (cx > 80 && cx < 1200 && cy > 80 && cy < 650) { b = [cx, cy]; break; } } return b; });
    if (tgt) {
      await page.keyboard.down('KeyS'); await page.mouse.move(tgt[0], tgt[1]); await page.waitForTimeout(250);
      await page.mouse.wheel(0, -300); await page.waitForTimeout(500);
      await page.mouse.click(tgt[0], tgt[1]); shots++; await page.waitForTimeout(450);
      await page.mouse.wheel(0, 600); await page.keyboard.up('KeyS');
    } else { await page.keyboard.down('KeyW'); await page.waitForTimeout(700); await page.keyboard.up('KeyW'); }
    const f = await page.evaluate(() => !document.getElementById('fork').classList.contains('hidden'));
    if (f) { await page.keyboard.press('KeyA'); await page.waitForTimeout(200); }
  }
  const st = await page.evaluate(() => ({ film: window.__wl.G.film, photos: window.__wl.G.photos.map(p => p.X.score), coins: window.__wl.save.coins }));
  ok('photos taken and scored', st.photos.length >= 3 && st.photos.some(s => s > 0), JSON.stringify(st));
  // drive to the end of the route
  await page.evaluate(() => { const w = window.__wl; w.G.tour.forks.forEach((f, i) => { if (!f.chosen) { if (!f.opts) f.opts = ['plains', 'kopje']; w.chooseFork(i, 0); } }); w.view.camX = w.G.tour.endX - 6; });
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__wl.G.mode === 'results')) break; await page.waitForTimeout(250); }
  await page.keyboard.up('KeyW'); await page.waitForTimeout(300);
  const rs = await page.evaluate(() => ({ mode: window.__wl.G.mode, n: document.querySelectorAll('#album .pr').length, hid: document.getElementById('results').className, tours: window.__wl.save.stats.tours, camX: window.__wl.view.camX, end: window.__wl.G.tour.endX }));
  ok('safari ends with results album', await vis(page, '#results') && rs.n >= 3, JSON.stringify(rs));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gamebop.wild-lens.save')));
  ok('progress saved to localStorage', saved && saved.started && Object.keys(saved.journal).length > 0 && saved.coins > 0 && saved.stats.tours === 1, saved && ('coins=' + saved.coins + ' species=' + Object.keys(saved.journal).length));
  await page.click('#bResOk'); await page.waitForTimeout(600);
  ok('back to camp', await vis(page, '#regions'));
  // reload -> continue
  await page.reload(); await page.waitForTimeout(800);
  ok('title shows Continue after save', (await page.textContent('#bPlay')).trim() === 'Continue');
  await page.click('#bPlay'); await page.waitForTimeout(800);
  ok('tutorial does not reappear after reload', !(await vis(page, '#tutCap')));
  const camp = await page.evaluate(() => ({ coins: +document.getElementById('cCoinN').textContent, sp: document.getElementById('cSpN').textContent }));
  ok('Continue restores coins + journal', camp.coins === saved.coins && camp.sp.startsWith(String(Object.keys(saved.journal).length)), JSON.stringify(camp));
  // How to play replays tutorial (camp and title)
  await page.click('#bHow2'); await page.waitForTimeout(600);
  ok('How to play (camp) replays tutorial', await vis(page, '#tutCap') && await vis(page, '#tutSkip'));
  await page.click('#tutSkip'); await page.keyboard.press('Escape'); await page.waitForTimeout(200); await page.click('#bQuit'); await page.waitForTimeout(400); await page.click('#bResOk'); await page.waitForTimeout(400); await page.click('#bBack'); await page.waitForTimeout(400);
  await page.click('#bHow'); await page.waitForTimeout(600);
  ok('How to play (title) replays tutorial', await vis(page, '#tutCap'));
  // pause
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ok('Esc pauses', await vis(page, '#pause'));
  // mobile layout
  await page.setViewportSize({ width: 390, height: 700 }); await page.waitForTimeout(400);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  ok('no horizontal overflow on phone', ov);
  ok('no console/page errors or external requests', errs.length === 0, errs.slice(0, 5).join(' | '));
  await browser.close();
  const fails = results.filter(r => !r[1]).length;
  console.log(fails ? fails + ' FAILED' : 'ALL ' + results.length + ' PASSED');
  process.exit(fails ? 1 : 0);
})();
