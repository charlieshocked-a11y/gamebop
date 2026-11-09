// Usage: node check.js <slug> [--play]
// Loads games/<slug>.html in headless Chromium, records console errors / page errors,
// clicks the centre and presses some keys for a few seconds, and writes:
//   thumbs/<slug>.jpg  (title screen, 640x400, used as the arcade tile)
//   tools/shots/<slug>-play.jpg (mid-play screenshot, for your own visual check)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const slug = process.argv[2];
  const root = path.resolve(__dirname, '..');
  const file = path.join(root, 'games', slug + '.html');
  if (!fs.existsSync(file)) { console.error('missing ' + file); process.exit(2); }
  fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) errors.push('external request: ' + u); });
  await page.goto('file://' + file);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(root, 'thumbs', slug + '.jpg'), type: 'jpeg', quality: 82 });
  // generic play attempt
  await page.mouse.click(320, 200);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await page.waitForTimeout(600);
  for (let i = 0; i < 25; i++) {
    const k = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'a', 'd', 'w', 's', 'e', 't', 'h'][i % 12];
    await page.keyboard.down(k); await page.waitForTimeout(60); await page.keyboard.up(k);
    await page.mouse.click(200 + (i * 37) % 260, 120 + (i * 53) % 200);
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(__dirname, 'shots', slug + '-play.jpg'), type: 'jpeg', quality: 70 });
  // mobile size check: no horizontal overflow, no errors
  await page.setViewportSize({ width: 390, height: 700 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'shots', slug + '-mobile.jpg'), type: 'jpeg', quality: 60 });
  await browser.close();
  if (errors.length) { console.log('ERRORS (' + errors.length + '):\n' + [...new Set(errors)].slice(0, 20).join('\n')); process.exit(1); }
  console.log('OK ' + slug + ' — no errors. Thumb: thumbs/' + slug + '.jpg  Shots: tools/shots/' + slug + '-play.jpg, -mobile.jpg');
})();
