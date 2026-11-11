const { chromium } = require('playwright');
(async () => {
  const lv = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file:///home/claude/gamebop-site/games/canopy-swing.html'); await p.waitForTimeout(300);
  const res = await p.evaluate(lv => lv.map(s => { const [w, l, x] = s.split('-').map(Number); const L = __cs.genLevel(w, l); const near = o => { const ox = o.x != null ? o.x : o.x1 != null ? o.x1 : o.hx; return ox > x - 700 && ox < x + 500; };
    const f = (k, fn) => L[k].filter(near).map(fn).join(' ');
    return s + '\n  A: ' + f('anchors', a => Math.round(a.x) + ',' + Math.round(a.y) + (a.rot ? 'R' : '') + (a.sw ? 'S' : '')) + '\n  B: ' + f('bouncers', b => b.k + Math.round(b.x)) + ' Z: ' + f('zips', z => Math.round(z.x1) + '-' + Math.round(z.x2)) + ' W: ' + f('winds', z => Math.round(z.x) + '+' + Math.round(z.w) + ':' + z.fy) + ' F: ' + f('falls', z => Math.round(z.x)) + ' T: ' + f('toucans', t => Math.round(t.hx)) + ' Th: ' + f('thorns', t => Math.round(t.x1) + '/' + Math.round(t.y2)) + ' P: ' + f('plats', p => Math.round(p.x) + '+' + p.w); }), lv);
  console.log(res.join('\n')); await b.close();
})();
