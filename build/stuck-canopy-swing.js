const { chromium } = require('playwright');
(async () => {
  const [w, l] = process.argv.slice(2).map(Number);
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file:///home/claude/gamebop-site/games/canopy-swing.html'); await p.waitForTimeout(300);
  const r = await p.evaluate(([w, l]) => { __cs.startLevel(w, l); const G = __cs.G; G.bot = true; G.silent = true; const out = []; for (let i = 0; i < 60 * 100; i++) { window.__step(1 / 60); if (i > 60 * 95 && i % 10 === 0) { const P = __cs.G.P; out.push(P.st + ' x' + Math.round(P.x) + ' y' + Math.round(P.y) + ' v' + Math.round(P.vx) + ',' + Math.round(P.vy) + (P.rope ? ' rope@' + Math.round(P.rope.a.x) + ',' + Math.round(P.rope.a.y) + ' t' + P.rope.t.toFixed(1) : '') + ' tgt' + (__cs.G.target ? Math.round(__cs.G.target.x) + ',' + Math.round(__cs.G.target.y) : '-')); } } return out; }, [w, l]);
  console.log(r.join('\n')); await b.close();
})();
