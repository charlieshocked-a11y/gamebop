const { chromium } = require('playwright');
(async () => {
  const [w, l, T] = [+process.argv[2] || 0, +process.argv[3] || 0, +process.argv[4] || 8];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 500 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///home/claude/gamebop-site/games/canopy-swing.html'); await p.waitForTimeout(300);
  const res = await p.evaluate(([w, l, T]) => { const out = []; __cs.startLevel(w, l); const G = __cs.G; G.bot = true; G.silent = true;
    out.push('anchors ' + G.L.anchors.slice(0, 8).map(a => Math.round(a.x) + ',' + Math.round(a.y)).join(' '));
    let t = 0, last = ''; while (t < T) { const P = __cs.G.P; const s = P.st + (P.rope ? '@' + Math.round(P.rope.a.x) : '') + (P.shoot ? ' shoot' : '');
      if (Math.round(t * 10) % 2 === 0 || s !== last) out.push(t.toFixed(2) + ' ' + s + ' x' + Math.round(P.x) + ' y' + Math.round(P.y) + ' v' + Math.round(P.vx) + ',' + Math.round(P.vy) + ' tgt' + (__cs.G.target ? Math.round(__cs.G.target.x) : '-') + (P.cause ? ' cause:' + P.cause : ''));
      last = s; __cs.G.silent = true; window.__step(1 / 60); t += 1 / 60; } return out; }, [w, l, T]);
  console.log(res.join('\n')); await b.close();
})();
