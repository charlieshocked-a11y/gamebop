/* Gamebop leaderboards \u2014 shared by every game. Usage (from a game page in /games/):
 *   <script src="lib/board.js"></script>
 *   GBBoard.submit('neon-serpent', 1234)                    // higher is better, call at game over
 *   GBBoard.submit('skybolt-roadster:insane', 95.2, {lower:false, label:'Insane'})
 *   GBBoard.submit('ice-run', 41.7, {lower:true})            // lower is better (times)
 *   GBBoard.show('neon-serpent', {title:'Neon Serpent', format:'score'|'time'|'int'|fn, lower:false})
 *   GBBoard.button(parentEl, 'neon-serpent', {...same opts as show})  // adds a small \uD83C\uDFC6 button
 * submit() returns a Promise and never throws. It keeps each player's best only.
 * Online data lives in the Firebase Realtime Database (boards/<board>/<uid>) via lib/net.js, which this file
 * loads by itself when the site is connected. Names come from the player's Gamebop account (username).
 * Until the Firebase config in lib/gb.js is filled in, boards show this device's own best runs.
 */
(function () {
  'use strict';
  var CFG = window.GB_FIREBASE || {};
  var ONLINE = !!(CFG.emulator || (CFG.apiKey && (CFG.databaseURL || CFG.projectId)));
  var LS = 'gamebop.board.';
  var NETSRC = ((document.currentScript && document.currentScript.src) || 'lib/board.js').replace(/board\.js(\?.*)?$/, 'net.js');

  function lsGet(k, d) { try { var v = localStorage.getItem(LS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) {} }
  function boardKey(b) { return String(b).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'x'; }
  function withTimeout(p, ms) { return Promise.race([p, new Promise(function (_, r) { setTimeout(function () { r(new Error('timeout')); }, ms); })]); }

  // lib/net.js (accounts + database) is loaded on demand, only when the site is online.
  var netP = null;
  function net() {
    if (window.GBNet) return Promise.resolve(window.GBNet);
    if (!ONLINE) return Promise.reject(new Error('offline'));
    if (!netP) netP = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = NETSRC; s.async = true;
      s.onload = function () { window.GBNet ? res(window.GBNet) : rej(new Error('no net')); };
      s.onerror = function () { netP = null; rej(new Error('net.js failed')); };
      (document.head || document.documentElement).appendChild(s);
    });
    return netP;
  }
  if (ONLINE) setTimeout(function () { net().catch(function () {}); }, 0);
  function tag() { var N = window.GBNet; return N && N.me().hasAccount ? N.me().name : ''; }
  // remembered per board so the home page profile can list your bests nicely
  function remember(b, o) {
    try {
      var k = boardKey(b), m = lsGet('meta.' + k, {}) || {}, ch = false;
      ['title', 'label', 'lower'].forEach(function (f) { if (o[f] != null && m[f] !== o[f]) { m[f] = f === 'lower' ? !!o[f] : String(o[f]).slice(0, 60); ch = true; } });
      if (typeof o.format === 'string' && m.format !== o.format) { m.format = o.format; ch = true; }
      if (ch) lsSet('meta.' + k, m);
    } catch (e) {}
  }

  // ---------- network ----------
  function fetchTop(b, lower, n) {
    if (!ONLINE) return Promise.resolve(null);
    return withTimeout(net().then(function (N) { return N.boards.top(b, lower, n || 50); }), 9000);
  }
  function putScore(b, score, lower) {
    if (!ONLINE) return Promise.resolve({ sent: false });
    return withTimeout(net().then(function (N) { return N.boards.put(b, score, lower); }), 12000);
  }

  // ---------- local bests ----------
  function better(a, b, lower) { return lower ? a < b : a > b; }
  function localBest(b) { return lsGet('best.' + boardKey(b), null); }
  function localRuns(b) { return lsGet('runs.' + boardKey(b), []); }
  function addLocal(b, score, lower) {
    var runs = localRuns(b); runs.push({ s: score, d: Date.now() });
    runs.sort(function (x, y) { return lower ? x.s - y.s : y.s - x.s; }); lsSet('runs.' + boardKey(b), runs.slice(0, 10));
    var best = localBest(b); if (best == null || better(score, best, lower)) { lsSet('best.' + boardKey(b), score); return true; }
    return false;
  }

  // ---------- UI ----------
  var css = '.gbb-wrap{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(6,6,18,.72);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);font:15px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#fff;animation:gbbIn .18s ease-out}' +
    '.gbb{width:min(380px,calc(100vw - 32px));max-height:min(560px,calc(100vh - 32px));display:flex;flex-direction:column;background:linear-gradient(180deg,#24204a,#15132c);border:1px solid #ffffff24;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.55);overflow:hidden;animation:gbbPop .28s cubic-bezier(.2,1.5,.4,1)}' +
    '.gbb h2{margin:0;padding:16px 18px 4px;font-size:20px;font-weight:900;letter-spacing:.3px;display:flex;align-items:center;gap:8px}.gbb h2 small{font-weight:700;font-size:12px;color:#ffd23f;margin-left:auto;text-transform:uppercase}' +
    '.gbb .sub{padding:0 18px 10px;color:#b9b4dc;font-size:12.5px}' +
    '.gbb ol{list-style:none;margin:0;padding:0 10px;overflow:auto;flex:1}.gbb li{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:6px;padding:7px 8px;border-radius:10px;font-weight:700}' +
    '.gbb li:nth-child(odd){background:#ffffff08}.gbb li.me{background:linear-gradient(90deg,#ffd23f33,#ffd23f10);outline:1px solid #ffd23f88}' +
    '.gbb li b{font-size:13px;color:#9c97c6;text-align:center}.gbb li:nth-child(1) b{font-size:17px}.gbb li:nth-child(2) b,.gbb li:nth-child(3) b{font-size:16px}' +
    '.gbb li span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:1px}.gbb li em{font-style:normal;font-variant-numeric:tabular-nums;color:#ffd23f}' +
    '.gbb .msg{padding:22px 18px;text-align:center;color:#b9b4dc}' +
    '.gbb .acct{display:flex;align-items:center;gap:6px;max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gbb .row{display:flex;gap:8px;padding:12px 14px 14px;border-top:1px solid #ffffff14}.gbb button{font:inherit;font-weight:800;border:0;border-radius:10px;padding:10px 14px;cursor:pointer;color:#fff;background:#ffffff1a}.gbb button.pri{flex:1;background:linear-gradient(90deg,#ff5a36,#ffb52e);color:#1a0d00}' +
    '.gbb .tagbox{padding:6px 18px 4px;display:flex;flex-direction:column;gap:8px}.gbb input{font:900 22px/1 ui-monospace,Menlo,monospace;letter-spacing:4px;text-transform:uppercase;text-align:center;padding:10px;border-radius:10px;border:2px solid #ffffff30;background:#0d0b1f;color:#fff;outline:none}.gbb input:focus{border-color:#ffd23f}.gbb .err{color:#ff7a8a;font-size:12.5px;min-height:16px;text-align:center}' +
    '.gbb .new{margin:0 18px 8px;padding:8px 10px;border-radius:10px;background:#3fe08a22;color:#7dffb5;font-weight:800;text-align:center}' +
    '.gbb-btn{font:800 13px/1 system-ui,sans-serif;border:1px solid #ffffff40;background:rgba(20,16,40,.7);color:#fff;border-radius:999px;padding:8px 12px;cursor:pointer;pointer-events:auto}.gbb-btn:hover{background:rgba(40,32,80,.85)}' +
    '@keyframes gbbIn{from{opacity:0}}@keyframes gbbPop{from{transform:scale(.9);opacity:0}}';
  function addCss() { if (document.getElementById('gbb-css')) return; var s = document.createElement('style'); s.id = 'gbb-css'; s.textContent = css; document.head.appendChild(s); }

  function fmt(v, f) {
    if (typeof f === 'function') return f(v);
    if (f === 'time') { var m = Math.floor(v / 60), s = v - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); }
    if (f === 'float') return (Math.round(v * 10) / 10).toString();
    return Math.round(v).toLocaleString();
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  var open = null;
  function close() { if (open) { open.remove(); open = null; document.removeEventListener('keydown', onKey, true); } }
  function onKey(e) { if (!open) return; if (window.GBNet && GBNet.isOpen()) return; e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); close(); } else if (e.key === 'Enter' && open.querySelector('.pri') && document.activeElement && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); open.querySelector('.pri').click(); } }
  function panel(html) {
    addCss(); close();
    var w = document.createElement('div'); w.className = 'gbb-wrap'; w.innerHTML = '<div class="gbb" role="dialog" aria-label="Leaderboard">' + html + '</div>';
    ['pointerdown', 'mousedown', 'touchstart', 'keyup', 'wheel'].forEach(function (ev) { w.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
    w.addEventListener('click', function (e) { e.stopPropagation(); if (e.target === w) close(); });
    document.body.appendChild(w); open = w; document.addEventListener('keydown', onKey, true);
    return w;
  }

  // "Make your account" (username + avatar). Resolves with the username, or '' if skipped. (Old name kept for games.)
  function askTag() {
    return net().then(function (N) {
      return N.profilePanel({ reason: 'Your username shows on every Gamebop leaderboard.' }).then(function (m) { return m && m.hasAccount ? m.name : ''; });
    }).catch(function () { return ''; });
  }

  function show(b, o) {
    o = o || {}; var lower = !!o.lower, f = o.format || 'int';
    remember(b, o);
    var title = esc(o.title || document.title || 'Leaderboard');
    var t = tag();
    var w = panel('<h2>\uD83C\uDFC6 ' + title + (o.label ? '<small>' + esc(o.label) + '</small>' : '') + '</h2><div class="sub">' + (ONLINE ? 'Top players everywhere' : 'Your best runs on this device') + '</div>' +
      (o.isNew ? '<div class="new">\u2605 NEW BEST: ' + esc(fmt(o.isNew, f)) + '</div>' : '') +
      '<ol><div class="msg">Loading\u2026</div></ol><div class="row">' + (ONLINE ? '<button class="tag acct">' + (t ? '\uD83D\uDC64 ' + esc(t) : '\u2728 Make account') + '</button>' : '') + '<button class="pri">' + esc(o.closeText || 'Close') + '</button></div>');
    var list = w.querySelector('ol');
    w.querySelector('.pri').onclick = function () { close(); if (o.onClose) o.onClose(); };
    var tb = w.querySelector('.tag'); if (tb) tb.onclick = function () { askTag().then(function (nm) { if (nm) { var lb = localBest(b); if (lb != null) return putScore(b, lb, lower).catch(function () {}); } }).then(function () { if (open === w) show(b, o); }); };
    function renderLocal() {
      var runs = localRuns(b);
      list.innerHTML = runs.length ? runs.map(function (r, i) { return '<li' + (i === 0 ? ' class="me"' : '') + '><b>' + (i < 3 ? ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'][i] : i + 1) + '</b><span>' + new Date(r.d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + '</span><em>' + esc(fmt(r.s, f)) + '</em></li>'; }).join('') : '<div class="msg">No scores yet. Go set one!</div>';
    }
    if (!ONLINE) { renderLocal(); return; }
    fetchTop(b, lower, 50).then(function (rows) {
      if (!open || open !== w) return;
      if (tb && tag() && !t) tb.textContent = '\uD83D\uDC64 ' + tag();
      var lb = localBest(b);
      if (!rows.length && lb == null) { list.innerHTML = '<div class="msg">No scores yet. Be the first!</div>'; return; }
      var meIn = false;
      list.innerHTML = rows.map(function (r, i) { if (r.me) meIn = true; return '<li' + (r.me ? ' class="me"' : '') + '><b>' + (i < 3 ? ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'][i] : i + 1) + '</b><span>' + esc(r.name) + '</span><em>' + esc(fmt(r.score, f)) + '</em></li>'; }).join('');
      if (!meIn && lb != null) list.insertAdjacentHTML('beforeend', '<li class="me"><b>\u2026</b><span>' + esc(tag() || 'YOU') + '</span><em>' + esc(fmt(lb, f)) + '</em></li>');
      var me = list.querySelector('li.me'); if (me && me.scrollIntoView) me.scrollIntoView({ block: 'nearest' });
    }).catch(function () { if (open === w) { renderLocal(); w.querySelector('.sub').textContent = 'Offline: showing your best runs'; } });
  }

  function submit(b, score, o) {
    o = o || {}; score = Number(score);
    if (!isFinite(score) || score < 0 || score > 1e9) return Promise.resolve({ best: false });
    var lower = !!o.lower; if (lower && score <= 0) return Promise.resolve({ best: false });
    remember(b, { lower: lower, label: o.label, title: o.title, format: o.format });
    var isBest = addLocal(b, score, lower);
    if (!ONLINE || !isBest) return Promise.resolve({ best: isBest });
    return putScore(b, score, lower).then(function (r) {
      return r && r.needsAccount ? { best: true, needsTag: true } : { best: true, sent: !!(r && r.sent) };
    }, function () { return { best: true, sent: false }; });
  }

  // Show the board after a run. If it's a new best and there's no account yet, asks to make one first (once).
  function after(b, score, o) {
    o = o || {};
    return submit(b, score, o).then(function (r) {
      if (!o.show) return r;
      var go = function () { show(b, Object.assign({}, o, { isNew: r.best ? score : 0 })); };
      if (r.needsTag && !lsGet('asked', false)) { lsSet('asked', true); return askTag().then(function (t) { if (t) return putScore(b, score, !!o.lower).catch(function () {}); }).then(function () { go(); return r; }); }
      go(); return r;
    });
  }

  function button(parent, b, o) {
    addCss(); remember(b, o || {}); var x = document.createElement('button'); x.type = 'button'; x.className = 'gbb-btn'; x.textContent = '\uD83C\uDFC6 ' + ((o && o.text) || 'Leaderboard');
    x.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); show(b, o); });
    ['pointerdown', 'mousedown', 'touchstart'].forEach(function (ev) { x.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
    if (parent) parent.appendChild(x); return x;
  }

  window.GBBoard = { submit: submit, after: after, show: show, button: button, close: close, isOpen: function () { return !!open || !!(window.GBNet && GBNet.isOpen()); }, online: ONLINE, best: localBest, tag: tag, askTag: askTag };
})();
