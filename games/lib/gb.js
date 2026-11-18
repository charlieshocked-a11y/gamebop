/* Gamebop shared game helper: phone settings bar, master volume, movable touch controls.
 * Put this FIRST inside <head> of a game (before any game script):  <script src="lib/gb.js"></script>
 *
 * - Master volume: works automatically for any WebAudio / <audio> sound. No game changes needed.
 * - Touch controls: mark each on-screen control element with data-gbctl="name" (e.g. data-gbctl="joystick",
 *   data-gbctl="jump"). The bar then lets players swap sides, resize and drag them. Applied with the CSS
 *   `translate` and `scale` properties, so a game's own `transform` keeps working.
 * - Canvas-drawn controls: read GB.settings {vol, flip, size} and GB.offset(name) -> {x,y} (CSS px), and
 *   re-layout on GB.on(fn). Set GB.manual = true to stop the automatic DOM moving.
 * The bar shows only on touch screens (or with ?gbbar=1 in the URL).
 */
(function () {
  'use strict';
  if (window.GB) return;
  // \u2193\u2193 Paste the Firebase web config here ONCE (apiKey + projectId). Leaderboards (board.js) and play counts both use it.
  var FIREBASE = { apiKey: '', projectId: '' };
  // \u2191\u2191
  window.GB_FIREBASE = FIREBASE;
  var KEY = 'gamebop.settings';
  var slug = (location.pathname.split('/').pop() || 'game').replace(/\.html?$/, '') || 'game';
  var S = { vol: 0.8, mute: false, flip: false, size: 1, pos: {} };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && typeof saved === 'object') for (var k in saved) S[k] = saved[k]; } catch (e) {}
  if (typeof S.vol !== 'number' || !(S.vol >= 0 && S.vol <= 1)) S.vol = 0.8;
  if (typeof S.size !== 'number' || !(S.size >= 0.7 && S.size <= 1.6)) S.size = 1;
  if (!S.pos || typeof S.pos !== 'object') S.pos = {};
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var listeners = [];
  function emit() { for (var i = 0; i < listeners.length; i++) { try { listeners[i](S); } catch (e) {} } try { window.dispatchEvent(new CustomEvent('gbsettings', { detail: S })); } catch (e) {} }

  // ---------- master volume ----------
  var masters = [];
  function level() { return S.mute ? 0 : S.vol * S.vol; } // squared feels more natural on a slider
  function applyVol() {
    var v = level();
    for (var i = 0; i < masters.length; i++) { try { var g = masters[i], t = g.context.currentTime; g.gain.cancelScheduledValues(t); if (g.context.state === 'running') { g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(v, t + 0.04); } else g.gain.value = v; } catch (e) {} }
    var media = document.querySelectorAll('audio,video'); for (var j = 0; j < media.length; j++) setMedia(media[j]);
  }
  function setMedia(m) { try { if (m.__gbBase == null) m.__gbBase = m.volume; m.__gbSet = true; m.volume = Math.max(0, Math.min(1, m.__gbBase * level())); } catch (e) {} }
  if (window.AudioNode && AudioNode.prototype.connect && window.AudioDestinationNode) {
    var orig = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest) {
      if (dest instanceof AudioDestinationNode) {
        var ctx = dest.context, g = ctx.__gbMaster;
        if (!g) { g = ctx.createGain(); g.gain.value = level(); orig.call(g, dest); ctx.__gbMaster = g; masters.push(g); }
        var args = Array.prototype.slice.call(arguments); args[0] = g;
        return orig.apply(this, args);
      }
      return orig.apply(this, arguments);
    };
  }
  document.addEventListener('play', function (e) { if (e.target && e.target.tagName && /AUDIO|VIDEO/.test(e.target.tagName)) setMedia(e.target); }, true);

  // ---------- control layout ----------
  var isTouch = /[?&]gbbar=1/.test(location.search) || (window.matchMedia && matchMedia('(pointer:coarse)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  function myPos() { return S.pos[slug] || (S.pos[slug] = {}); }
  function offset(name) { var p = myPos()[name]; return p ? { x: p.x || 0, y: p.y || 0 } : { x: 0, y: 0 }; }
  var layoutQueued = false;
  function layout() {
    layoutQueued = false;
    if (GB.manual) return;
    var els = document.querySelectorAll('[data-gbctl]'), W = window.innerWidth;
    for (var i = 0; i < els.length; i++) { els[i].style.translate = ''; els[i].style.scale = ''; }
    for (var j = 0; j < els.length; j++) {
      var el = els[j], r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      var dx = 0; if (S.flip) { var cx = r.left + r.width / 2; dx = (W - cx) - cx; }
      var o = offset(el.getAttribute('data-gbctl'));
      el.style.translate = Math.round(dx + o.x) + 'px ' + Math.round(o.y) + 'px';
      if (S.size !== 1) el.style.scale = String(S.size);
    }
  }
  var lastLayout = 0;
  function queueLayout() {
    if (layoutQueued) return; layoutQueued = true;
    var wait = Math.max(0, 200 - (Date.now() - lastLayout));
    setTimeout(function () { requestAnimationFrame(function () { lastLayout = Date.now(); layout(); }); }, wait);
  }
  window.addEventListener('resize', queueLayout);
  window.addEventListener('orientationchange', function () { setTimeout(queueLayout, 250); });
  if (window.MutationObserver) new MutationObserver(function (ms) {
    if (!document.querySelector('[data-gbctl]')) return;
    for (var i = 0; i < ms.length; i++) { var m = ms[i]; if (m.type === 'attributes' && m.attributeName === 'style') continue; queueLayout(); return; }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-gbctl', 'hidden', 'class'] });

  // ---------- the bar ----------
  var css = '#gbbar,#gbbar *{box-sizing:border-box;letter-spacing:normal;text-transform:none;text-shadow:none}#gbbar{position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:2147482000;font:700 13px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#fff;user-select:none;-webkit-user-select:none;touch-action:manipulation;padding-top:env(safe-area-inset-top)}' +
    '#gbbar .gb-tab{display:block;margin:0 auto;border:0;border-radius:0 0 12px 12px;background:rgba(14,12,30,.55);color:#fff;font:inherit;padding:4px 14px 6px;opacity:.75;cursor:pointer;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}' +
    '#gbbar .gb-panel{display:none;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px;width:max-content;max-width:min(420px,calc(100vw - 12px));padding:8px 10px;margin-top:0;border-radius:0 0 16px 16px;background:rgba(18,15,38,.92);border:1px solid #ffffff22;border-top:0;box-shadow:0 10px 30px rgba(0,0,0,.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}' +
    '#gbbar.gb-open .gb-panel{display:flex}#gbbar.gb-open .gb-tab{display:none}' +
    '#gbbar button{font:inherit;color:#fff;background:#ffffff1c;border:1px solid #ffffff26;border-radius:10px;min-width:38px;height:38px;padding:0 9px;white-space:nowrap;cursor:pointer}#gbbar button.gb-on{background:#ffd23f;color:#1a1200;border-color:#ffd23f}' +
    '#gbbar .gb-grp{display:flex;align-items:center;gap:6px;background:#ffffff0d;border-radius:12px;padding:3px 6px}' +
    '#gbbar input[type=range]{width:96px;accent-color:#ffd23f;height:28px}#gbbar .gb-lbl{opacity:.75;font-size:12px;min-width:34px;text-align:center}' +
    '.gbedit [data-gbctl]{outline:2px dashed #ffd23f!important;outline-offset:3px;cursor:grab!important}' +
    '#gbedit{position:fixed;inset:0;z-index:2147481999;background:rgba(0,0,0,.25);touch-action:none}' +
    '#gbedit .gb-hint{position:fixed;left:50%;top:calc(12px + env(safe-area-inset-top));white-space:nowrap;transform:translateX(-50%);display:flex;gap:8px;align-items:center;background:rgba(18,15,38,.94);color:#fff;font:700 14px system-ui,sans-serif;padding:8px 8px 8px 14px;border-radius:999px;border:1px solid #ffffff2a}' +
    '#gbedit .gb-hint button{font:inherit;border:0;border-radius:999px;padding:9px 16px;background:#ffd23f;color:#1a1200}#gbedit .gb-hint button.gb-sec{background:#ffffff22;color:#fff}' +
    '#gbedit .gb-box{position:fixed;border:2px dashed #ffd23f;border-radius:14px;background:rgba(255,210,63,.12)}#gbedit .gb-box.gb-drag{background:rgba(255,210,63,.3)}';

  function stop(e) { e.stopPropagation(); }
  function build() {
    if (!isTouch || document.getElementById('gbbar')) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var bar = document.createElement('div'); bar.id = 'gbbar';
    bar.innerHTML = '<button class="gb-tab" aria-label="Game settings">⚙︎ ▾</button>' +
      '<div class="gb-panel">' +
      '<div class="gb-grp"><button class="gb-mute" aria-label="Mute">🔊</button><input class="gb-vol" type="range" min="0" max="100" aria-label="Volume"></div>' +
      '<button class="gb-flip" aria-label="Swap control sides">⇄ Swap</button>' +
      '<div class="gb-grp"><button class="gb-sm" aria-label="Smaller controls">−</button><span class="gb-lbl gb-sz"></span><button class="gb-lg" aria-label="Bigger controls">+</button></div>' +
      '<button class="gb-move" aria-label="Move controls">✥ Move</button>' +
      '<button class="gb-close" aria-label="Close settings">✕</button></div>';
    ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'keydown', 'keyup'].forEach(function (ev) { bar.addEventListener(ev, stop, { passive: ev.indexOf('touch') === 0 }); });
    document.body.appendChild(bar);
    var $ = function (s) { return bar.querySelector(s); };
    var hasCtl = function () { return !!document.querySelector('[data-gbctl]') || GB.manual; };
    function sync() {
      $('.gb-vol').value = Math.round(S.vol * 100);
      $('.gb-mute').textContent = S.mute || S.vol === 0 ? '🔇' : S.vol < 0.45 ? '🔉' : '🔊';
      $('.gb-flip').classList.toggle('gb-on', !!S.flip);
      $('.gb-sz').textContent = Math.round(S.size * 100) + '%';
      var show = hasCtl(); ['.gb-flip', '.gb-move'].forEach(function (s) { $(s).style.display = show ? '' : 'none'; }); $('.gb-sm').parentNode.style.display = show ? '' : 'none';
    }
    function change() { persist(); applyVol(); queueLayout(); sync(); emit(); }
    $('.gb-tab').onclick = function () { sync(); bar.classList.add('gb-open'); };
    $('.gb-close').onclick = function () { bar.classList.remove('gb-open'); };
    $('.gb-vol').oninput = function () { S.vol = this.value / 100; S.mute = false; change(); };
    $('.gb-mute').onclick = function () { S.mute = !S.mute; change(); };
    $('.gb-flip').onclick = function () { S.flip = !S.flip; change(); };
    $('.gb-sm').onclick = function () { S.size = Math.max(0.7, Math.round((S.size - 0.1) * 10) / 10); change(); };
    $('.gb-lg').onclick = function () { S.size = Math.min(1.6, Math.round((S.size + 0.1) * 10) / 10); change(); };
    $('.gb-move').onclick = function () { bar.classList.remove('gb-open'); editMode(change); };
    sync();
  }

  function editMode(done) {
    if (GB.manual && !document.querySelector('[data-gbctl]')) { emit(); return; }
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-gbctl]')).filter(function (e) { var r = e.getBoundingClientRect(); return r.width || r.height; });
    var ov = document.createElement('div'); ov.id = 'gbedit';
    ov.innerHTML = '<div class="gb-hint">Drag buttons to move <button class="gb-sec gb-reset">Reset</button><button class="gb-ok">Done</button></div>';
    document.documentElement.classList.add('gbedit');
    var boxes = els.map(function (el) { var b = document.createElement('div'); b.className = 'gb-box'; ov.appendChild(b); return { el: el, b: b }; });
    function place() { boxes.forEach(function (x) { var r = x.el.getBoundingClientRect(); var s = x.b.style; s.left = r.left - 4 + 'px'; s.top = r.top - 4 + 'px'; s.width = r.width + 8 + 'px'; s.height = r.height + 8 + 'px'; }); }
    place();
    boxes.forEach(function (x) {
      var name = x.el.getAttribute('data-gbctl'), start = null;
      x.b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); x.b.setPointerCapture(e.pointerId); var o = offset(name); start = { px: e.clientX, py: e.clientY, ox: o.x, oy: o.y }; x.b.classList.add('gb-drag'); });
      x.b.addEventListener('pointermove', function (e) {
        if (!start) return; e.preventDefault();
        var nx = start.ox + (e.clientX - start.px), ny = start.oy + (e.clientY - start.py);
        myPos()[name] = { x: Math.round(nx), y: Math.round(ny) }; layout(); place();
      });
      var end = function () { if (start) { start = null; x.b.classList.remove('gb-drag'); persist(); } };
      x.b.addEventListener('pointerup', end); x.b.addEventListener('pointercancel', end);
    });
    ['pointerdown', 'mousedown', 'touchstart', 'click', 'touchend', 'pointerup'].forEach(function (ev) { ov.addEventListener(ev, stop, { passive: ev.indexOf('touch') === 0 }); });
    ov.querySelector('.gb-reset').onclick = function () { S.pos[slug] = {}; S.size = 1; S.flip = false; layout(); place(); };
    ov.querySelector('.gb-ok').onclick = function () { ov.remove(); document.documentElement.classList.remove('gbedit'); done(); };
    document.body.appendChild(ov);
  }

  // ---------- anonymous play counter (for the weekly tune-up) ----------
  // One count per page load, only after 20s of visible play, only on the live site. No personal data:
  // just +1 on stats/<slug> (all time) and stats/<slug>~w<week> (this week).
  (function () {
    if (!FIREBASE.apiKey || !FIREBASE.projectId || !/\.github\.io$/.test(location.hostname)) return;
    var seen = 0, sent = false, last = Date.now();
    function send() {
      if (sent) return; sent = true;
      var week = 'w' + Math.floor((Date.now() / 864e5 + 3) / 7);
      var doc = 'projects/' + FIREBASE.projectId + '/databases/(default)/documents/stats/';
      var inc = { fieldPath: 'plays', increment: { integerValue: '1' } };
      try {
        fetch('https://firestore.googleapis.com/v1/projects/' + FIREBASE.projectId + '/databases/(default)/documents:commit?key=' + FIREBASE.apiKey, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
          body: JSON.stringify({ writes: [{ transform: { document: doc + slug, fieldTransforms: [inc] } }, { transform: { document: doc + slug + '~' + week, fieldTransforms: [inc] } }] })
        }).catch(function () {});
      } catch (e) {}
    }
    setInterval(function () {
      var now = Date.now();
      if (!document.hidden) seen += now - last;
      last = now;
      if (seen >= 20000) send();
    }, 2000);
  })();

  var GB = window.GB = {
    settings: S, isTouch: isTouch, manual: false,
    on: function (fn) { listeners.push(fn); },
    offset: offset,
    volume: function () { return level(); },
    refresh: queueLayout,
    openSettings: function () { build(); var b = document.getElementById('gbbar'); if (b) b.querySelector('.gb-tab').click(); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { build(); queueLayout(); }); else { build(); queueLayout(); }
  window.addEventListener('load', queueLayout);
})();
