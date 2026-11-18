/* Gamebop online layer (global GBNet): accounts, players list, leaderboard backend, multiplayer rooms.
 * Load after lib/gb.js (which holds the Firebase config):   <script src="lib/net.js"></script>
 * Backend: Firebase Realtime Database + Anonymous Auth, REST + EventSource only (no SDK).
 * With no config (or no network) everything still works locally: accounts live in this browser and
 * every multiplayer game is played against the game's own bots. Full API + example: build/SHARED.md section 3.
 *
 * ACCOUNT
 *   GBNet.online                       true when the database is configured
 *   GBNet.me()                         {uid, name, avatar, color, joined, hasAccount, online, display}
 *   GBNet.onMe(cb)                     cb(me) now and on every change; returns an unsubscribe fn
 *   GBNet.setProfile({name,avatar,color}) Promise<me>; rejects Error{code:'bad-name'|'taken'|'network'}
 *   GBNet.checkName(name)              '' if ok, else a short message for the player
 *   GBNet.profilePanel()               dark overlay to make/edit the account; Promise<me|null>
 *   GBNet.loginCode()                  Promise<{code, exp}> (8 chars, 10 min) to move the account to another device
 *   GBNet.useLoginCode(code)           Promise<me>: this device switches to that account
 *   GBNet.players()                    Promise<[{uid,name,avatar,color,joined,lastSeen,online}]>, recent first
 *   GBNet.avatarHTML(p, px)            HTML for a round avatar; GBNet.AVATARS, GBNet.COLORS
 * MULTIPLAYER (same API online and offline; offline rooms are local with bots)
 *   GBNet.lobby(game, {min,max,title}) overlay: quick match / private code / join / vs bots. Promise<room|null> once started
 *   GBNet.createRoom(game, {public,maxPlayers,local})  Promise<room> (you are host, status 'wait')
 *   GBNet.joinRoom(code)               Promise<room>; rejects Error{code:'not-found'|'full'|'bad-code'|'offline'}
 *   GBNet.quickMatch(game, {maxPlayers,wait,onUpdate}) Promise<room> once the match STARTS (bots fill after ~8 s)
 *   GBNet.start()                      host: status -> 'play' (lobby/quickMatch resolve on this)
 *   GBNet.leave()                      Promise; leaves (deletes the room if you were the last human)
 *   GBNet.onRoom(cb)                   cb(room|null) now and on every change; returns unsubscribe
 *   GBNet.room()                       latest room snapshot or null
 *   GBNet.setMyState(obj, {as})        throttled write of rooms/<CODE>/state/<uid> (as: a bot uid, host only)
 *   GBNet.setShared(obj)               host only: throttled write of rooms/<CODE>/shared
 *   GBNet.send(type, data, {as})       ordered event (everyone incl. you receives it via onEvent)
 *   GBNet.onEvent(cb)                  cb({id,type,data,from,t,mine,bot}); events before the first listener are queued
 *   GBNet.isHost(), GBNet.myId()       host runs the bots' AI (GBNet.myBots())
 *   GBNet.fillWithBots(n), GBNet.kick(uid), GBNet.setReady(bool), GBNet.whenStarted()
 *   GBNet.isOpen()                     true while a GBNet overlay is open (games should ignore input)
 */
(function () {
  'use strict';
  if (window.GBNet) return;
  var CFG = window.GB_FIREBASE || {};
  var EMU = String(CFG.emulator || '').replace(/\/+$/, '');
  var DBURL = EMU || String(CFG.databaseURL || (CFG.projectId ? 'https://' + CFG.projectId + '-default-rtdb.firebaseio.com' : '')).replace(/\/+$/, '');
  var ONLINE = !!(EMU || (CFG.apiKey && DBURL));
  var KEY = CFG.apiKey || 'emulator';
  var SIGNUP = (EMU ? EMU + '/' : 'https://') + 'identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + encodeURIComponent(KEY);
  var REFRESH = (EMU ? EMU + '/' : 'https://') + 'securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(KEY);
  var SV = { '.sv': 'timestamp' };
  var NAME_RE = /^[A-Za-z0-9_]{3,12}$/;
  var CODE_AB = 'ABCDEFGHJKMNPQRSTUVWXYZ';          // room codes: 5 letters, no I L O
  var LOGIN_AB = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  // login codes: 8 chars, no 0 1 I L O
  var GONE_MS = 10000, HEARTBEAT_MS = 3000, ROOM_TTL = 7200000, SEEN_EVERY = 120000;

  var AVATARS = [['dog', '🐶'], ['cat', '🐱'], ['fox', '🦊'], ['panda', '🐼'], ['frog', '🐸'], ['monkey', '🐵'], ['tiger', '🐯'], ['lion', '🦁'],
    ['koala', '🐨'], ['bunny', '🐰'], ['pig', '🐷'], ['cow', '🐮'], ['octopus', '🐙'], ['unicorn', '🦄'], ['dragon', '🐲'], ['penguin', '🐧']];
  var FACE = {}; AVATARS.forEach(function (a) { FACE[a[0]] = a[1]; }); FACE.robot = '🤖';
  var COLORS = ['#49c5ff', '#ff5fa2', '#ffcf1a', '#38d98a', '#8b6cff', '#ff8a3d', '#ff5252', '#2ec4b6', '#b5e550', '#c084fc', '#f4a261', '#94a3b8'];
  var BOT_NAMES = ['Beep Boop', 'Turbo Toaster', 'Sir Bolts', 'Captain Chip', 'Robo Rex', 'Professor Gear', 'Waffle Iron', 'Sparky', 'Mega Byte',
    'Nugget 3000', 'Rusty', 'Clank', 'Dr Widget', 'Pixel Pete', 'Gizmo', 'Tin Can Tim', 'Bleep Bloop', 'Socket', 'Noodle Bot', 'Zap Zap'];

  // ---------- small helpers ----------
  var LS = 'gamebop.net.';
  function lsGet(k, d) { try { var v = localStorage.getItem(LS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(LS + k); else localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) {} }
  function fail(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
  function rnd(ab, n) { var s = ''; for (var i = 0; i < n; i++) s += ab[Math.floor(Math.random() * ab.length)]; return s; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clone(v) { return v === undefined ? null : JSON.parse(JSON.stringify(v)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function timed(p, ms) { return Promise.race([p, new Promise(function (_, r) { setTimeout(function () { r(fail('network', 'timeout')); }, ms); })]); }
  function boardKey(b) { return String(b).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'x'; }
  var skew = 0; // server clock - local clock (ms), learned from server timestamps
  function serverNow() { return Date.now() + skew; }
  function learn(t0, serverT) { if (typeof serverT === 'number') skew = serverT - (t0 + Date.now()) / 2; }

  // rude-word filter (same list as the old leaderboard tags; checked on a squashed copy)
  var BAD = ['ZnVjaw', 'c2hpdA', 'Yml0Y2g', 'ZGljaw', 'Y29jaw', 'cHVzcw', 'Y3VudA', 'bmlnZw', 'ZmFn', 'c2V4', 'cG9ybg', 'cmFwZQ', 'aGl0bGVy', 'bmF6aQ', 'cGVuaXM', 'Ym9vYg', 'd2hvcmU', 'c2x1dA', 'cmV0YXJk', 'cGlzcw', 'a2tr'];
  var badList = null;
  function rude(t) {
    if (!badList) { badList = []; for (var i = 0; i < BAD.length; i++) { try { badList.push(atob(BAD[i] + '==='.slice((BAD[i].length + 3) % 4)).toUpperCase()); } catch (e) {} } }
    t = String(t).toUpperCase().replace(/[^A-Z0-9]/g, '');
    var s = t.replace(/0/g, 'O').replace(/1/g, 'I').replace(/3/g, 'E').replace(/4/g, 'A').replace(/5/g, 'S').replace(/7/g, 'T').replace(/8/g, 'B');
    for (var j = 0; j < badList.length; j++) if (badList[j] && (s.indexOf(badList[j]) >= 0 || t.indexOf(badList[j]) >= 0)) return true;
    return false;
  }
  function checkName(n) {
    n = String(n || '').trim();
    if (!NAME_RE.test(n)) return '3 to 12 letters, numbers or _ (no spaces)';
    if (rude(n)) return 'Try a different name';
    return '';
  }

  // ---------- auth (anonymous) ----------
  var uid = lsGet('uid', null), tok = lsGet('tok', null), tokP = null;
  function saveAuth(id, rt, t, expSec) {
    var changed = id !== uid; uid = id; tok = { t: t, exp: Date.now() + (Number(expSec) || 3600) * 1000 };
    lsSet('uid', id); lsSet('rt', rt); lsSet('tok', tok);
    if (changed) { P = loadProfile(); emitMe(); }
    return t;
  }
  function authPost(url, body, form) {
    return timed(fetch(url, { method: 'POST', headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' }, body: body }), 10000)
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { var m = (j && j.error && j.error.message) || ('http ' + r.status); var e = fail(/TOKEN|USER|INVALID|EXPIRED/.test(m) ? 'auth' : 'network', m); throw e; }
          return j;
        });
      }, function () { throw fail('network', 'offline'); });
  }
  function refresh(rt) {
    return authPost(REFRESH, 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(rt), true)
      .then(function (j) { return saveAuth(j.user_id, j.refresh_token || rt, j.id_token, j.expires_in); });
  }
  function signUp() {
    return authPost(SIGNUP, JSON.stringify({ returnSecureToken: true }))
      .then(function (j) { return saveAuth(j.localId, j.refreshToken, j.idToken, j.expiresIn); });
  }
  // Promise<idToken>. Signs up anonymously the first time it is needed. Shared across tabs/iframes via localStorage.
  function token() {
    if (!ONLINE) return Promise.reject(fail('offline'));
    var lt = lsGet('tok', null); if (lt && lt.t) tok = lt;
    var lu = lsGet('uid', null); if (lu && lu !== uid) { uid = lu; P = loadProfile(); emitMe(); }
    if (tok && tok.t && tok.exp - 120000 > Date.now()) return Promise.resolve(tok.t);
    if (tokP) return tokP;
    tokP = new Promise(function (res) {
      // another frame may be signing up right now: wait for its result instead of making a 2nd account
      var lock = lsGet('lock', 0);
      if (!lsGet('rt', null) && lock && Date.now() - lock < 6000) setTimeout(res, 1200); else res();
    }).then(function () {
      var rt = lsGet('rt', null);
      if (rt) return refresh(rt).catch(function (e) { if (e.code === 'auth') { lsSet('rt', null); lsSet('uid', null); return signUp(); } throw e; });
      lsSet('lock', Date.now());
      return signUp().then(function (t) { lsSet('lock', null); return t; });
    });
    tokP.then(function () { tokP = null; }, function () { tokP = null; });
    return tokP;
  }

  // ---------- database REST ----------
  var QJSON = { orderBy: 1, equalTo: 1, startAt: 1, endAt: 1 };
  function req(method, path, body, query, o) {
    o = o || {};
    if (!ONLINE) return Promise.reject(fail('offline'));
    var tp = o.auth === false ? Promise.resolve('') : (o.auth === 'if' && !lsGet('rt', null)) ? Promise.resolve('') : token();
    return tp.then(function (t) {
      var q = [];
      if (t) q.push('auth=' + encodeURIComponent(t));
      for (var k in (query || {})) if (query[k] != null) q.push(k + '=' + encodeURIComponent(QJSON[k] ? JSON.stringify(query[k]) : query[k]));
      var url = DBURL + '/' + String(path).replace(/^\/+|\/+$/g, '').split('/').map(encodeURIComponent).join('/') + '.json' + (q.length ? '?' + q.join('&') : '');
      var init = { method: method, keepalive: !!o.keepalive };
      if (body !== undefined) { init.body = JSON.stringify(body); init.headers = { 'Content-Type': 'application/json' }; }
      return timed(fetch(url, init), o.timeout || 10000).catch(function (e) { throw e.code ? e : fail('network', 'offline'); });
    }).then(function (r) {
      return r.text().then(function (tx) {
        var j = null; try { j = tx ? JSON.parse(tx) : null; } catch (e) {}
        if (r.ok) return j;
        var msg = (j && j.error) || ('http ' + r.status);
        if (r.status === 401 && /expired|invalid.*token|token.*invalid/i.test(msg) && !o.retried) { tok = null; lsSet('tok', null); return req(method, path, body, query, Object.assign({}, o, { retried: true })); }
        var e = fail(r.status === 401 || r.status === 403 ? 'denied' : 'http', msg); e.status = r.status; throw e;
      });
    });
  }
  var db = {
    get: function (p, q, o) { return req('GET', p, undefined, q, o); },
    put: function (p, v, o) { return req('PUT', p, v, null, o); },
    patch: function (p, v, o) { return req('PATCH', p, v, null, o); },
    post: function (p, v, o) { return req('POST', p, v, null, o); },
    del: function (p, o) { return req('DELETE', p, undefined, null, o); }
  };

  // ---------- profile ----------
  function loadProfile() {
    var p = lsGet('profile', null);
    if (!p || typeof p !== 'object' || (p.uid && uid && p.uid !== uid)) p = { avatar: pick(AVATARS)[0], color: pick(COLORS) };
    if (!FACE[p.avatar] || p.avatar === 'robot') p.avatar = AVATARS[0][0];
    if (COLORS.indexOf(p.color) < 0) p.color = COLORS[0];
    return p;
  }
  var P = loadProfile();
  function saveProfile() { P.uid = uid || null; lsSet('profile', P); emitMe(); }
  function guestName() { var g = lsGet('guest', ''); if (!/^Guest\d{3}$/.test(g)) { g = 'Guest' + (100 + Math.floor(Math.random() * 900)); lsSet('guest', g); } return g; }
  function hasAccount() { return !!P.name && (!ONLINE || !!P.synced); }
  function me() {
    return { uid: uid || null, name: hasAccount() ? P.name : '', avatar: P.avatar, color: P.color, joined: P.joined || 0, hasAccount: hasAccount(),
      online: ONLINE, display: hasAccount() ? P.name : guestName(), pendingName: !hasAccount() && P.name ? P.name : '', taken: !!P.taken };
  }
  var meCbs = [];
  var meQueued = false;
  function emitMe() { if (meQueued) return; meQueued = true; setTimeout(function () { meQueued = false; var m = me(); meCbs.slice().forEach(function (cb) { try { cb(m); } catch (e) { console.warn(e); } }); }, 0); }
  function onMe(cb) { meCbs.push(cb); try { cb(me()); } catch (e) { console.warn(e); } return function () { var i = meCbs.indexOf(cb); if (i >= 0) meCbs.splice(i, 1); }; }
  window.addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf(LS) !== 0) return;
    if (/\.(profile|uid)$/.test(e.key)) { uid = lsGet('uid', null); P = loadProfile(); emitMe(); }
    if (/\.tok$/.test(e.key)) tok = lsGet('tok', null);
  });

  var playerCache = null; // last players/<uid> we read
  function fetchMine() { return db.get('players/' + uid).then(function (v) { playerCache = v; return v; }); }

  function setProfile(o) {
    o = o || {};
    var name = String(o.name != null ? o.name : (P.name || '')).trim();
    var avatar = FACE[o.avatar] && o.avatar !== 'robot' ? o.avatar : P.avatar;
    var color = COLORS.indexOf(o.color) >= 0 ? o.color : P.color;
    var bad = checkName(name);
    if (bad) return Promise.reject(fail('bad-name', bad));
    if (!ONLINE) { P.name = name; P.avatar = avatar; P.color = color; P.joined = P.joined || Date.now(); saveProfile(); return Promise.resolve(me()); }
    var oldKey = P.synced && P.name ? P.name.toLowerCase() : null, newKey = name.toLowerCase(), first = !P.synced, renamed = P.synced && P.name !== name;
    var t0;
    return token().then(function () {
      if (newKey === oldKey) return;
      return db.get('names/' + newKey).then(function (owner) {
        if (owner && owner !== uid) throw fail('taken', 'That name is taken. Try another!');
        if (!owner) return db.put('names/' + newKey, uid);
      }).catch(function (e) {
        if (e.code === 'taken') throw e;
        if (e.code !== 'denied') throw e;
        return db.get('names/' + newKey).then(function (owner) { if (owner !== uid) throw fail('taken', 'That name is taken. Try another!'); });
      });
    }).then(fetchMine).then(function (cur) {
      t0 = Date.now();
      if (cur && cur.joined) return db.patch('players/' + uid, { name: name, avatar: avatar, color: color, lastSeen: SV });
      return db.put('players/' + uid, { name: name, avatar: avatar, color: color, joined: SV, lastSeen: SV });
    }).then(function (w) {
      learn(t0, w && w.lastSeen);
      playerCache = Object.assign({}, playerCache || {}, w || {});
      // releases the old name (and cleans up a name we claimed before but never used)
      if (oldKey && oldKey !== newKey) db.del('names/' + oldKey).catch(function () {});
      if (P.claimed && P.claimed !== newKey && P.claimed !== oldKey) db.del('names/' + P.claimed).catch(function () {});
      P.name = name; P.avatar = avatar; P.color = color; P.synced = true; P.taken = false; P.claimed = newKey;
      P.joined = (playerCache && playerCache.joined) || P.joined || Date.now(); lsSet('seen', Date.now());
      saveProfile();
      if (renamed) renameBoards(name);
      if (first) flushLocalBests();
      return me();
    }).catch(function (e) {
      if (e.code === 'taken' || e.code === 'bad-name') throw e;
      if (e.code === 'denied') throw fail('bad-name', 'That name is not allowed. Try another!');
      throw fail('network', 'Could not reach the Gamebop server. Try again in a bit.');
    });
  }

  // lastSeen: at most every 2 minutes while a Gamebop page is open (shared across tabs/iframes)
  function touch() {
    if (!ONLINE || !hasAccount() || document.hidden) return;
    if (Date.now() - lsGet('seen', 0) < SEEN_EVERY) return;
    lsSet('seen', Date.now());
    db.patch('players/' + uid, { lastSeen: SV }).catch(function () {});
  }
  function init() {
    if (!ONLINE) return;
    if (uid && lsGet('rt', null)) {
      fetchMine().then(function (v) {
        if (v && v.name) { P.name = v.name; P.avatar = FACE[v.avatar] ? v.avatar : P.avatar; P.color = COLORS.indexOf(v.color) >= 0 ? v.color : P.color; P.joined = v.joined; P.synced = true; P.taken = false; saveProfile(); }
        else if (P.synced) { P.synced = false; saveProfile(); }
        syncPending();
      }).catch(function () {});
    } else syncPending();
    setInterval(touch, 30000); setTimeout(touch, 2000);
  }
  // a name made while the site was offline gets uploaded once the database is connected
  function syncPending() {
    if (!P.name || P.synced || P.taken) return;
    setProfile({}).catch(function (e) { if (e.code === 'taken' || e.code === 'bad-name') { P.taken = true; saveProfile(); } });
  }

  // ---------- login code (move account to another device) ----------
  function loginCode() {
    if (!ONLINE) return Promise.reject(fail('offline', 'Login codes turn on once the site’s database is connected.'));
    var code = rnd(LOGIN_AB, 8), exp = Math.round(serverNow()) + 600000;
    return token().then(function () { return db.put('transfer/' + code, { rt: lsGet('rt', ''), uid: uid, exp: exp }); })
      .then(function () { return { code: code, exp: Date.now() + 600000 }; }, function (e) { throw e.code === 'offline' ? e : fail('network', 'Could not make a code right now. Try again.'); });
  }
  function useLoginCode(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!ONLINE) return Promise.reject(fail('offline', 'Login codes turn on once the site’s database is connected.'));
    if (!/^[A-HJKMNP-Z2-9]{8}$/.test(code)) return Promise.reject(fail('bad-code', 'Codes are 8 letters and numbers.'));
    return db.get('transfer/' + code, null, { auth: false }).catch(function (e) { throw e.code === 'denied' ? fail('bad-code', 'That code expired. Get a new one.') : e; }).then(function (v) {
      if (!v || !v.rt) throw fail('bad-code', 'That code doesn’t work. Check it or get a new one.');
      tok = null; lsSet('tok', null);
      return refresh(v.rt).then(function () {
        db.del('transfer/' + code).catch(function () {});
        P = { avatar: P.avatar, color: P.color }; lsSet('seen', 0); saveProfile();
        return fetchMine().then(function (pl) {
          if (pl && pl.name) { P.name = pl.name; P.avatar = FACE[pl.avatar] ? pl.avatar : P.avatar; P.color = COLORS.indexOf(pl.color) >= 0 ? pl.color : P.color; P.joined = pl.joined; P.synced = true; P.claimed = pl.name.toLowerCase(); }
          saveProfile(); touch(); return me();
        });
      });
    }).catch(function (e) { throw e.code === 'bad-code' ? e : fail('network', 'Could not reach the Gamebop server. Try again.'); });
  }

  // ---------- players ----------
  function players() {
    var mine = function () { return hasAccount() ? [{ uid: uid || 'me', name: P.name, avatar: P.avatar, color: P.color, joined: P.joined || Date.now(), lastSeen: Date.now(), online: true, me: true }] : []; };
    if (!ONLINE) return Promise.resolve(mine());
    return db.get('players', { orderBy: 'lastSeen', limitToLast: 1000 }, { auth: 'if' }).then(function (o) {
      var now = serverNow(), out = [];
      for (var k in (o || {})) { var p = o[k]; if (!p || !p.name) continue; out.push({ uid: k, name: p.name, avatar: FACE[p.avatar] ? p.avatar : 'dog', color: p.color || COLORS[0], joined: p.joined || 0, lastSeen: p.lastSeen || 0, online: now - (p.lastSeen || 0) < 300000, me: k === uid }); }
      return out.sort(function (a, b) { return b.lastSeen - a.lastSeen; });
    });
  }

  // ---------- leaderboards backend (board.js uses these) ----------
  function bmeta(k) { try { return JSON.parse(localStorage.getItem('gamebop.board.meta.' + k) || 'null') || {}; } catch (e) { return {}; } }
  var boards = {
    key: boardKey,
    // top n entries, best first: [{uid,name,score,t,me}]
    top: function (b, lower, n) {
      var q = { orderBy: 'score' }; q[lower ? 'limitToFirst' : 'limitToLast'] = n || 50;
      return db.get('boards/' + boardKey(b), q, { auth: 'if' }).then(function (o) {
        var out = []; for (var k in (o || {})) if (o[k] && typeof o[k].score === 'number') out.push({ uid: k, name: o[k].name || '???', score: o[k].score, t: o[k].t || 0, me: k === uid });
        return out.sort(function (a, b2) { return lower ? a.score - b2.score : b2.score - a.score; });
      });
    },
    // keeps the best only; {sent} / {needsAccount}
    put: function (b, score, lower) {
      var k = boardKey(b);
      if (!ONLINE) return Promise.resolve({ sent: false });
      if (!hasAccount()) return Promise.resolve({ sent: false, needsAccount: true });
      return token().then(function () { return db.get('boards/' + k + '/' + uid); }).then(function (cur) {
        if (cur && typeof cur.score === 'number' && !(lower ? score < cur.score : score > cur.score)) {
          if (cur.name !== P.name) db.patch('boards/' + k + '/' + uid, { name: P.name }).catch(function () {});
          return { sent: false, kept: true, best: cur.score };
        }
        return db.put('boards/' + k + '/' + uid, { name: P.name, score: score, t: SV }).then(function () {
          db.put('bests/' + uid + '/' + k, score).catch(function () {}); return { sent: true };
        });
      });
    },
    // your bests (this device + your account): [{board, score, lower, title, label, format}]
    mine: function () {
      var local = {};
      try { for (var i = 0; i < localStorage.length; i++) { var lk = localStorage.key(i); if (lk && lk.indexOf('gamebop.board.best.') === 0) { var v = Number(localStorage.getItem(lk)); if (isFinite(v)) local[lk.slice(19)] = v; } } } catch (e) {}
      var merge = function (online) {
        var all = Object.assign({}, online || {});
        for (var k in local) { var m = bmeta(k); if (all[k] == null || (m.lower ? local[k] < all[k] : local[k] > all[k])) all[k] = local[k]; }
        return Object.keys(all).map(function (k) { var m = bmeta(k); return { board: k, score: all[k], lower: !!m.lower, title: m.title || '', label: m.label || '', format: m.format || '' }; });
      };
      if (!ONLINE || !hasAccount()) return Promise.resolve(merge(null));
      return db.get('bests/' + uid).then(merge, function () { return merge(null); });
    }
  };
  function flushLocalBests() {
    boards.mine().then(function (list) { list.forEach(function (x) { boards.put(x.board, x.score, x.lower).catch(function () {}); }); });
  }
  function renameBoards(name) {
    db.get('bests/' + uid).then(function (o) { for (var k in (o || {})) db.patch('boards/' + k + '/' + uid, { name: name }).catch(function () {}); }).catch(function () {});
  }

  // =====================================================================
  // MULTIPLAYER
  // =====================================================================
  var cur = null;           // current room context
  var roomCbs = [], evCbs = [];
  var qm = null;            // active quick match
  var pushN = 0;
  function pushId() { return '-L' + Date.now().toString(36) + ('000' + (pushN++ % 1679616).toString(36)).slice(-4) + rnd('abcdefghijklmnopqrstuvwxyz', 4); }
  function myId() { return uid || 'me'; }
  function setPath(obj, segs, val) {
    if (!segs.length) return val == null ? null : val;
    var o = obj && typeof obj === 'object' ? obj : {}, stack = [o];
    var n = o;
    for (var i = 0; i < segs.length - 1; i++) { if (!n[segs[i]] || typeof n[segs[i]] !== 'object') n[segs[i]] = {}; n = n[segs[i]]; stack.push(n); }
    if (val == null) delete n[segs[segs.length - 1]]; else n[segs[segs.length - 1]] = val;
    for (var j = stack.length - 1; j > 0; j--) if (!Object.keys(stack[j]).length) delete stack[j - 1][segs[j - 1]];
    return o;
  }
  function resolveSV(v, old) {
    if (v && typeof v === 'object') {
      if (v['.sv'] === 'timestamp') return Date.now();
      if (v['.sv'] && v['.sv'].increment != null) return (typeof old === 'number' ? old : 0) + v['.sv'].increment;
      var o = Array.isArray(v) ? [] : {}; for (var k in v) o[k] = resolveSV(v[k], old && old[k]); return o;
    }
    return v;
  }
  function seatFor(o) {
    var m = me();
    return { name: m.display, avatar: m.avatar, color: m.color, bot: false, ready: !!(o && o.ready), t: SV, j: SV };
  }
  function newCtx(code, local, game) { return { code: code, local: local, game: game, raw: null, es: null, seen: Object.create(null), queue: [], loaded: false, joinedAt: serverNow(), th: {}, timers: [], closed: false, listed: false, waiters: [] }; }

  // ----- room snapshot handed to games -----
  function snapshot() {
    if (!cur || !cur.raw) return null;
    var r = cur.raw, seats = r.seats || {}, now = serverNow(), id = myId();
    var ps = Object.keys(seats).map(function (k) {
      var s = seats[k] || {};
      var here = !!s.bot || cur.local || k === id || now - (s.t || 0) < GONE_MS;
      return { uid: k, name: s.name || '?', label: s.bot ? 'BOT · ' + (s.name || 'Bot') : (s.name || '?'), avatar: s.avatar || 'dog', color: s.color || COLORS[0], bot: !!s.bot, ready: !!s.ready, joined: s.j || 0, here: here, me: k === id, host: k === r.host };
    }).sort(function (a, b) { return a.joined - b.joined || (a.uid < b.uid ? -1 : 1); });
    return {
      code: cur.code, game: r.game, local: cur.local, online: !cur.local, host: r.host, isHost: r.host === id, me: id,
      status: r.status || 'wait', open: !!r.open, maxPlayers: r.maxPlayers || 2, created: r.created || 0,
      players: ps, humans: ps.filter(function (p) { return !p.bot && p.here; }), bots: ps.filter(function (p) { return p.bot; }),
      state: r.state || {}, shared: r.shared == null ? null : r.shared, botsIn: qm && qm.deadline && r.host === id && (r.status || 'wait') === 'wait' ? Math.max(0, qm.deadline - Date.now()) : null
    };
  }
  var emitQueued = false;
  function emitRoom() {
    if (emitQueued) return; emitQueued = true;
    setTimeout(function () {
      emitQueued = false;
      var s = snapshot();
      roomCbs.slice().forEach(function (cb) { try { cb(s); } catch (e) { console.warn(e); } });
      deliverEvents();
      if (s && s.status === 'play' && cur) { var w = cur.waiters; cur.waiters = []; w.forEach(function (f) { f(s); }); }
      if (qm) { if (s && s.status === 'play') { var q = qm; qm = null; q.resolve(s); } else if (qm.onUpdate) try { qm.onUpdate(s); } catch (e) { console.warn(e); } }
    }, 0);
  }
  function deliverEvents() {
    if (!cur || !evCbs.length || !cur.queue.length) return;
    var q = cur.queue; cur.queue = [];
    q.forEach(function (ev) { evCbs.slice().forEach(function (cb) { try { cb(ev); } catch (e) { console.warn(e); } }); });
  }
  function scanEvents(c) {
    var evs = (c.raw && c.raw.events) || {}, ids = Object.keys(evs).sort(), seats = (c.raw && c.raw.seats) || {}, id = myId();
    for (var i = 0; i < ids.length; i++) {
      var k = ids[i]; if (c.seen[k]) continue; c.seen[k] = 1;
      var e = evs[k] || {};
      if (!c.loaded && e.from !== id && (e.t || 0) < c.joinedAt - 2000) continue; // history from before we joined
      c.queue.push({ id: k, type: e.type, data: e.data == null ? null : e.data, from: e.from, t: e.t || 0, mine: e.from === id, bot: !!(seats[e.from] && seats[e.from].bot) });
      if (c.queue.length > 1000) c.queue.shift();
    }
  }
  function applyAt(c, path, data, merge) {
    if (c.closed) return;
    var segs = String(path || '/').split('/').filter(Boolean);
    if (merge) { for (var k in (data || {})) c.raw = setPath(c.raw, segs.concat(k.split('/').filter(Boolean)), clone(data[k])); }
    else c.raw = setPath(c.raw, segs, clone(data));
    if (c.raw && !Object.keys(c.raw).length) c.raw = null;
    if (!c.raw) { if (c.loaded || !c.local) { closeCtx(c, 'closed'); return; } }
    scanEvents(c);
    c.loaded = true;
    if (c.onLoad) { var f = c.onLoad; c.onLoad = null; f(); }
    if (c === cur) emitRoom();
  }

  // ----- streaming -----
  function openStream(c) {
    if (c.closed) return;
    token().then(function (t) {
      if (c.closed) return;
      var es = new EventSource(DBURL + '/rooms/' + c.code + '.json?auth=' + encodeURIComponent(t));
      c.es = es;
      var again = function (drop) {
        try { es.close(); } catch (e) {}
        if (c.es !== es) return; c.es = null;
        if (drop) { tok = null; lsSet('tok', null); }
        if (!c.closed) { c.retry = Math.min((c.retry || 400) * 2, 8000); setTimeout(function () { openStream(c); }, c.retry); }
      };
      es.addEventListener('put', function (e) { try { var m = JSON.parse(e.data); applyAt(c, m.path, m.data, false); } catch (x) { console.warn(x); } });
      es.addEventListener('patch', function (e) { try { var m = JSON.parse(e.data); applyAt(c, m.path, m.data, true); } catch (x) { console.warn(x); } });
      es.addEventListener('auth_revoked', function () { again(true); });
      es.addEventListener('cancel', function () { again(true); });
      es.onopen = function () { c.retry = 0; };
      es.onerror = function () { again(false); };
    }).catch(function () { if (!c.closed) setTimeout(function () { openStream(c); }, 3000); });
  }

  // ----- entering / leaving -----
  function enter(c, raw) {
    if (cur && cur !== c) closeCtx(cur, 'left');
    cur = c; c.raw = raw || c.raw;
    if (c.local) { c.loaded = true; scanEvents(c); emitRoom(); return Promise.resolve(snapshot()); }
    if (c.raw) scanEvents(c);
    var ready = new Promise(function (res) { c.onLoad = res; setTimeout(res, 6000); });
    openStream(c);
    var hb = setInterval(function () { tick(c); }, HEARTBEAT_MS); c.timers.push(hb);
    c.timers.push(setInterval(function () { if (c === cur) emitRoom(); }, 1000)); // presence/"bots in" countdown refresh
    return ready.then(function () { if (c.closed) throw fail('closed', 'The room closed.'); tick(c); return snapshot(); });
  }
  function closeCtx(c, why) {
    if (c.closed) return; c.closed = true;
    try { if (c.es) c.es.close(); } catch (e) {}
    c.es = null; c.timers.forEach(clearInterval); c.timers = [];
    for (var k in c.th) clearTimeout(c.th[k].timer);
    if (cur === c) {
      cur = null;
      roomCbs.slice().forEach(function (cb) { try { cb(null, why); } catch (e) { console.warn(e); } });
      if (qm && why === 'closed') { var q = qm; qm = null; q.reject(fail('closed', 'The room closed.')); }
    }
  }
  function roomPath(c, rel) { return 'rooms/' + c.code + (rel ? '/' + rel : ''); }
  function write(c, method, rel, value) {
    if (c.local) {
      var segs = String(rel || '').split('/').filter(Boolean);
      if (method === 'PATCH') { var old = segs.reduce(function (o, s) { return o && o[s]; }, c.raw); for (var k in value) applyAt(c, segs.concat(k.split('/')).join('/'), resolveSV(value[k], old && old[k]), false); }
      else if (method === 'POST') { var id = pushId(); applyAt(c, segs.concat(id).join('/'), resolveSV(value), false); return Promise.resolve({ name: id }); }
      else applyAt(c, segs.join('/'), method === 'DELETE' ? null : resolveSV(value), false);
      return Promise.resolve(value);
    }
    return req(method, roomPath(c, rel), method === 'DELETE' ? undefined : value);
  }
  function tick(c) {
    if (c.closed || c.local) return;
    var t0 = Date.now(), id = myId(), r = c.raw || {};
    if (r.seats && r.seats[id]) db.patch(roomPath(c, 'seats/' + id), { t: SV }).then(function (w) { learn(t0, w && w.t); }).catch(function () {});
    else if (c.loaded && (r.status || 'wait') === 'wait' && !c.rejoining) { c.rejoining = true; db.put(roomPath(c, 'seats/' + id), seatFor()).then(function () { c.rejoining = false; }, function () { c.rejoining = false; }); }
    migrate(c);
    if (r.host === id) hostDuties(c);
  }
  function hostDuties(c) {
    var r = c.raw || {}, s = snapshot(); if (!s || c !== cur) return;
    var space = s.players.filter(function (p) { return p.here; }).length < s.maxPlayers;
    var lp = 'lobby/' + r.game + '/' + c.code;
    if (r.open && s.status === 'wait' && space) { c.listed = true; db.put(lp, { t: SV, n: s.players.length, max: s.maxPlayers, c: r.created || 0 }).catch(function () {}); }
    else if (c.listed) { c.listed = false; db.del(lp).catch(function () {}); }
    if (s.status === 'wait') s.players.forEach(function (p) { if (!p.here && !p.bot && serverNow() - ((r.seats[p.uid] || {}).t || 0) > GONE_MS + 5000) db.del(roomPath(c, 'seats/' + p.uid)).catch(function () {}); });
  }
  // host left? the lowest remaining uid takes over (and runs the bots)
  function migrate(c) {
    var s = snapshot(); if (!s || c.local || c.claiming) return;
    var host = s.players.filter(function (p) { return p.host; })[0];
    if (host && host.here) return;
    var cands = s.humans.slice().sort(function (a, b) { return a.uid < b.uid ? -1 : 1; });
    if (!cands.length || cands[0].uid !== myId()) return;
    c.claiming = true;
    db.put(roomPath(c, 'host'), myId()).then(function () { c.claiming = false; c.raw.host = myId(); emitRoom(); }, function () { c.claiming = false; });
  }
  function leaveCtx(c) {
    if (!c || c.closed) return Promise.resolve();
    var r = c.raw || {}, id = myId(), s = c === cur ? snapshot() : null;
    closeCtx(c, 'left');
    if (c.local) return Promise.resolve();
    var others = s ? s.humans.filter(function (p) { return !p.me; }) : [];
    var jobs = [];
    if (r.host === id && r.game) jobs.push(db.del('lobby/' + r.game + '/' + c.code).catch(function () {}));
    return Promise.all(jobs).then(function () {
      if (!others.length && (r.creator === id || r.host === id)) return db.del(roomPath(c)).catch(function () {});
      return Promise.all([db.del(roomPath(c, 'state/' + id)).catch(function () {}), db.del(roomPath(c, 'seats/' + id)).catch(function () {})]);
    });
  }
  window.addEventListener('pagehide', function () {
    if (!cur || cur.local || !tok) return;
    var c = cur, s = snapshot(), id = myId(), q = '.json?auth=' + encodeURIComponent(tok.t);
    try {
      var alone = s && !s.humans.filter(function (p) { return !p.me; }).length && (c.raw.creator === id || c.raw.host === id);
      if (c.raw.host === id) fetch(DBURL + '/lobby/' + c.raw.game + '/' + c.code + q, { method: 'DELETE', keepalive: true }).catch(function () {});
      fetch(DBURL + '/' + roomPath(c, alone ? '' : 'seats/' + id) + q, { method: 'DELETE', keepalive: true }).catch(function () {});
    } catch (e) {}
  });

  // ----- public room API -----
  function normGame(g) { return String(g || 'game').toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 40) || 'game'; }
  function clampMax(n) { n = Math.round(Number(n) || 2); return Math.max(1, Math.min(8, n)); }
  function localRoom(game, o) {
    var id = myId(), c = newCtx('LOCAL', true, game), seats = {};
    seats[id] = resolveSV(seatFor({ ready: true }));
    c.raw = { game: game, host: id, creator: id, created: Date.now(), maxPlayers: clampMax(o.maxPlayers), open: false, status: 'wait', seats: seats };
    return enter(c, c.raw);
  }
  function createRoom(game, o) {
    o = o || {}; game = normGame(game);
    if (qm && !o._qm) cancelQM();
    var go = function () { return leaveCtx(cur); };
    if (!ONLINE || o.local) return go().then(function () { return localRoom(game, o); });
    return go().then(token).then(function () {
      var tries = 0;
      var attempt = function () {
        var code = rnd(CODE_AB, 5), seats = {}, t0 = Date.now();
        seats[myId()] = seatFor({ ready: true });
        var raw = { game: game, host: myId(), creator: myId(), created: SV, maxPlayers: clampMax(o.maxPlayers), open: !!o.public, status: 'wait', seats: seats };
        return db.put('rooms/' + code, raw).then(function (w) {
          learn(t0, w && w.created);
          var c = newCtx(code, false, game);
          return enter(c, w || resolveSV(raw)).then(function (s) { hostDuties(c); return s; });
        }, function (e) { if (e.code === 'denied' && ++tries < 6) return attempt(); throw e; });
      };
      return attempt();
    });
  }
  function joinRoom(code, o) {
    o = o || {};
    code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (!ONLINE) return Promise.reject(fail('offline', 'Online rooms turn on once the site’s database is connected.'));
    if (!/^[A-HJKMNP-Z]{5}$/.test(code)) return Promise.reject(fail('bad-code', 'Room codes are 5 letters.'));
    if (qm && !o._qm) cancelQM();
    if (cur && cur.code === code && !cur.closed) return Promise.resolve(snapshot());
    var t0;
    return leaveCtx(cur).then(token).then(function () { return db.get('rooms/' + code); }).then(function (raw) {
      if (!raw || !raw.seats || serverNow() - (raw.created || 0) > ROOM_TTL) throw fail('not-found', 'No room with that code. Check the letters!');
      if (o.game && raw.game !== o.game) throw fail('not-found', 'That room is for a different game.');
      var now = serverNow(), n = 0;
      for (var k in raw.seats) if (raw.seats[k].bot || now - (raw.seats[k].t || 0) < GONE_MS) n++;
      if (!raw.seats[myId()] && n >= (raw.maxPlayers || 2)) throw fail('full', 'That room is full.');
      t0 = Date.now();
      return db.put('rooms/' + code + '/seats/' + myId(), seatFor()).then(function (w) {
        learn(t0, w && w.t);
        var c = newCtx(code, false, raw.game); c.joinedAt = serverNow();
        return enter(c, null).then(function (s) {
          var mine = s.players.filter(function (p) { return p.me; })[0];
          var ahead = s.players.filter(function (p) { return p.here && (!mine || p.joined < mine.joined || (p.joined === mine.joined && p.uid < mine.uid) || p.me); });
          if (s.players.filter(function (p) { return p.here; }).length > s.maxPlayers && ahead.length > s.maxPlayers) { return leaveCtx(c).then(function () { throw fail('full', 'That room just filled up.'); }); }
          return s;
        });
      });
    }).catch(function (e) { if (!e.code || e.code === 'http') throw fail('network', 'Could not reach the Gamebop server.'); if (e.code === 'denied') throw fail('not-found', 'Could not join that room.'); throw e; });
  }
  function start() {
    var c = cur; if (!c) return Promise.reject(fail('no-room'));
    if (c.raw.host !== myId()) return Promise.reject(fail('not-host'));
    if (c.local) { c.raw.status = 'play'; c.raw.open = false; emitRoom(); return Promise.resolve(snapshot()); }
    c.raw.status = 'play'; emitRoom();
    return db.patch(roomPath(c), { status: 'play', open: false }).then(function () {
      if (c.listed) { c.listed = false; db.del('lobby/' + c.raw.game + '/' + c.code).catch(function () {}); }
      return snapshot();
    });
  }
  function whenStarted() { return new Promise(function (res, rej) { var s = snapshot(); if (!s) return rej(fail('no-room')); if (s.status === 'play') return res(s); cur.waiters.push(res); }); }
  function fillWithBots(n) {
    var c = cur; if (!c) return Promise.reject(fail('no-room'));
    if (c.raw.host !== myId()) return Promise.reject(fail('not-host'));
    var s = snapshot(), room = s.maxPlayers - s.players.filter(function (p) { return p.here; }).length;
    n = n == null ? room : Math.min(room, Math.max(0, Math.round(n)));
    if (n <= 0) return Promise.resolve(s);
    var used = s.players.map(function (p) { return p.name; }), add = {};
    for (var i = 0; i < n; i++) {
      var nm = pick(BOT_NAMES.filter(function (x) { return used.indexOf(x) < 0; })) || ('Bot ' + (i + 1)); used.push(nm);
      add['bot_' + rnd('abcdefghijkmnpqrstuvwxyz23456789', 8)] = { name: nm, avatar: 'robot', color: pick(COLORS), bot: true, ready: true, t: SV, j: SV };
    }
    return write(c, 'PATCH', 'seats', add).then(function () { if (c.local) return snapshot(); return new Promise(function (r) { setTimeout(function () { r(snapshot()); }, 50); }); });
  }
  function kick(id) {
    var c = cur; if (!c || c.raw.host !== myId() || id === myId()) return Promise.resolve();
    return Promise.all([write(c, 'DELETE', 'seats/' + id), write(c, 'DELETE', 'state/' + id)]).then(function () {}, function () {});
  }
  function setReady(v) { var c = cur; if (!c) return Promise.resolve(); return write(c, 'PATCH', 'seats/' + myId(), { ready: !!v }).catch(function () {}); }
  function throttled(c, rel, value) {
    value = clone(value);
    c.raw = setPath(c.raw, rel.split('/'), value); emitRoom();
    if (c.local) return;
    var th = c.th[rel] || (c.th[rel] = { last: 0, timer: 0 });
    th.val = value;
    if (th.timer) return;
    th.timer = setTimeout(function () {
      th.timer = 0; th.last = Date.now(); if (c.closed) return;
      req(th.val == null ? 'DELETE' : 'PUT', roomPath(c, rel), th.val == null ? undefined : th.val).catch(function () {});
    }, Math.max(0, th.last + GBNet.stateInterval - Date.now()));
  }
  function setMyState(obj, o) {
    var c = cur; if (!c) return;
    var id = (o && o.as) || myId();
    if (id !== myId() && c.raw.host !== myId()) return;
    throttled(c, 'state/' + id, obj);
  }
  function setShared(obj) { var c = cur; if (!c || c.raw.host !== myId()) return; throttled(c, 'shared', obj); }
  function send(type, data, o) {
    var c = cur; if (!c) return Promise.reject(fail('no-room'));
    var from = (o && o.as) || myId();
    if (from !== myId() && c.raw.host !== myId()) return Promise.reject(fail('not-host'));
    var ev = { type: String(type).slice(0, 32), from: from, t: SV };
    if (data !== undefined && data !== null) ev.data = clone(data);
    if (c.local) return write(c, 'POST', 'events', ev).then(function (r) { return r && r.name; });
    // one at a time, so a player's own events always reach the server in the order they were sent
    var p = (c.sendQ || Promise.resolve()).then(function () { return c.closed ? null : write(c, 'POST', 'events', ev); }).then(function (r) { return r && r.name; });
    c.sendQ = p.catch(function () {});
    return p;
  }
  function onRoom(cb) { roomCbs.push(cb); var s = snapshot(); if (s) try { cb(s); } catch (e) { console.warn(e); } return function () { var i = roomCbs.indexOf(cb); if (i >= 0) roomCbs.splice(i, 1); }; }
  function onEvent(cb) { evCbs.push(cb); setTimeout(deliverEvents, 0); return function () { var i = evCbs.indexOf(cb); if (i >= 0) evCbs.splice(i, 1); }; }
  function leave() { cancelQM(); return leaveCtx(cur); }
  function isHost() { return !!(cur && cur.raw && cur.raw.host === myId()); }
  function myBots() { var s = snapshot(); return s && s.isHost ? s.bots : []; }

  // ----- quick match -----
  var qmTimer = 0;
  function cancelQM() { if (qm) { var q = qm; qm = null; q.resolve(null); } clearInterval(qmTimer); qmTimer = 0; }
  function findOpen(game, notCode) {
    return db.get('lobby/' + game, { orderBy: 't', startAt: serverNow() - 15000 }).then(function (o) {
      var list = []; for (var k in (o || {})) if (k !== notCode && o[k] && o[k].n < o[k].max) list.push({ code: k, c: o[k].c || 0, n: o[k].n });
      return list.sort(function (a, b) { return a.c - b.c || (a.code < b.code ? -1 : 1); });
    });
  }
  function quickMatch(game, o) {
    o = o || {}; game = normGame(game);
    cancelQM();
    var max = clampMax(o.maxPlayers || 2);
    return new Promise(function (resolve, reject) {
      var q = qm = { game: game, max: max, wait: o.wait == null ? 8000 : o.wait, deadline: 0, lastScan: Date.now(), onUpdate: o.onUpdate, resolve: resolve, reject: reject, busy: false };
      var local = function () {
        if (qm !== q) return;
        return localRoom(game, { maxPlayers: max }).then(function () { return fillWithBots(); }).then(function () { return start(); });
      };
      var tryJoin = function (list) {
        if (qm !== q) return null;
        if (!list.length) return null;
        return joinRoom(list[0].code, { _qm: true, game: game }).catch(function () { return tryJoin(list.slice(1)); });
      };
      var p = !ONLINE ? local() : token().then(function () { return findOpen(game); }).then(tryJoin).then(function (s) {
        if (qm !== q) return;
        if (s) return s;
        return createRoom(game, { public: true, maxPlayers: max, _qm: true });
      }).catch(function () { return leaveCtx(cur).then(local); });
      Promise.resolve(p).then(function () {
        if (qm !== q) return;
        clearInterval(qmTimer); qmTimer = setInterval(qmTick, 400); qmTick();
      }).catch(function (e) { if (qm === q) { qm = null; reject(e); } });
    });
  }
  function qmTick() {
    var q = qm; if (!q) { clearInterval(qmTimer); qmTimer = 0; return; }
    var s = snapshot(); if (!s || q.busy || s.status === 'play') return;
    if (!s.isHost) { q.deadline = 0; return; }
    if (!q.deadline) { q.deadline = Date.now() + q.wait; emitRoom(); }
    var n = s.players.filter(function (p) { return p.here; }).length;
    if (n >= s.maxPlayers) { q.busy = true; start().then(function () { q.busy = false; }, function () { q.busy = false; }); return; }
    if (Date.now() >= q.deadline) { q.busy = true; fillWithBots().then(start).then(function () { q.busy = false; }, function () { q.busy = false; }); return; }
    // two people pressed Quick Match at once and both made a room: the newer room moves into the older one
    if (!s.local && s.humans.length === 1 && Date.now() - q.lastScan > 1500) {
      q.lastScan = Date.now(); q.busy = true;
      findOpen(q.game, s.code).then(function (list) {
        var older = list.filter(function (x) { return x.c < s.created || (x.c === s.created && x.code < s.code); })[0];
        var now = snapshot();
        if (!older || qm !== q || !now || now.humans.length !== 1 || now.status !== 'wait') { q.busy = false; return; }
        return leaveCtx(cur).then(function () { return joinRoom(older.code, { _qm: true, game: q.game }); }).then(function () { q.busy = false; q.deadline = 0; },
          function () { return createRoom(q.game, { public: true, maxPlayers: q.max, _qm: true }).then(function () { q.busy = false; }); });
      }).catch(function () { q.busy = false; });
    }
  }

  // =====================================================================
  // UI (dark game style, matches lib/gb.js + lib/board.js)
  // =====================================================================
  function avatarHTML(p, px) {
    px = px || 40; p = p || me();
    var f = FACE[p.avatar] || FACE.dog;
    return '<span class="gbn-av" aria-hidden="true" style="width:' + px + 'px;height:' + px + 'px;font-size:' + Math.round(px * 0.6) + 'px;background:' + esc(p.color || COLORS[0]) + '">' + f + '</span>';
  }
  var css = '.gbn-wrap{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(6,6,18,.72);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);font:15px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#fff;animation:gbnIn .18s ease-out;letter-spacing:normal;text-transform:none;text-align:left}' +
    '.gbn-wrap *{box-sizing:border-box}.gbn-wrap.gbn-top{z-index:2147483200}' +
    '.gbn{width:min(420px,100%);max-height:100%;overflow:auto;background:linear-gradient(180deg,#24204a,#15132c);border:1px solid #ffffff24;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.55);padding:14px 16px 16px;animation:gbnPop .28s cubic-bezier(.2,1.5,.4,1)}' +
    '.gbn h2{margin:0 0 12px;font-size:21px;font-weight:900;display:flex;align-items:center;gap:8px;line-height:1.15}.gbn h2 span{flex:1;min-width:0}' +
    '.gbn button{font:inherit;font-weight:800;border:0;border-radius:12px;padding:11px 14px;cursor:pointer;color:#fff;background:#ffffff1a;transition:transform .08s,filter .15s}.gbn button:hover:not(:disabled){filter:brightness(1.12)}.gbn button:active:not(:disabled){transform:translateY(2px)}' +
    '.gbn button:disabled{opacity:.42;cursor:default}.gbn button:focus-visible,.gbn input:focus-visible{outline:3px solid #ffd23f;outline-offset:2px}' +
    '.gbn .gbn-pri{background:linear-gradient(90deg,#ff5a36,#ffb52e);color:#1a0d00}.gbn .gbn-alt{background:linear-gradient(90deg,#6d4dff,#b26bff)}.gbn .gbn-go{background:linear-gradient(90deg,#1fbf5b,#7ee36b);color:#05290f}' +
    '.gbn .gbn-x{width:40px;height:40px;padding:0;border-radius:50%;flex:none;font-size:18px}' +
    '.gbn-me{display:flex;align-items:center;gap:10px;background:#ffffff0f;border-radius:14px;padding:8px 8px 8px 10px;margin-bottom:12px}.gbn-me div{flex:1;min-width:0}.gbn-me b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:16px}.gbn-me small{display:block;font-weight:600;color:#b9b4dc;font-size:12px}.gbn-me button{padding:9px 12px;font-size:13px}' +
    '.gbn-av{display:inline-grid;place-items:center;flex:none;border-radius:50%;line-height:1;box-shadow:inset 0 -3px 0 rgba(0,0,0,.2);font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif}' +
    '.gbn-col{display:flex;flex-direction:column;gap:9px}.gbn-big{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 14px;font-size:17px}.gbn-big i{font-style:normal;font-size:26px;line-height:1;width:30px;text-align:center}.gbn-big span{flex:1}.gbn-big small{display:block;font-weight:600;font-size:12.5px;opacity:.82}' +
    '.gbn-join{display:flex;gap:8px}.gbn input{min-width:0;flex:1;width:100%;font:900 20px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:4px;text-transform:uppercase;text-align:center;padding:11px 8px;border-radius:12px;border:2px solid #ffffff30;background:#0d0b1f;color:#fff;outline:none}.gbn input:focus{border-color:#ffd23f}.gbn input::placeholder{color:#ffffff40}' +
    '.gbn-note{font-size:12.5px;color:#b9b4dc;text-align:center;margin:10px 0 0}.gbn-err{color:#ff8a98;font-size:13px;min-height:18px;text-align:center;font-weight:700;margin-top:6px}' +
    '.gbn-code{display:flex;align-items:center;justify-content:center;gap:10px;margin:2px 0}.gbn-code b{font:900 40px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:8px;color:#ffd23f;background:#0d0b1f;border-radius:14px;padding:12px 6px 12px 16px;user-select:all}' +
    '.gbn-seats{list-style:none;margin:12px 0;padding:0;display:flex;flex-direction:column;gap:7px}.gbn-seats li{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:12px;background:#ffffff0f;font-weight:800;min-height:52px}.gbn-seats li.gbn-in{animation:gbnPop .25s}' +
    '.gbn-seats li.gbn-empty{background:none;border:2px dashed #ffffff24;color:#9c97c6;font-weight:700}.gbn-seats li.gbn-gone{opacity:.45}.gbn-nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.gbn-tag{font-size:11px;font-weight:900;padding:4px 7px;border-radius:7px;background:#ffffff1f;letter-spacing:.4px;white-space:nowrap}.gbn-tag.bot{background:#5eead42b;color:#86f7e5}.gbn-tag.host{background:#ffd23f30;color:#ffd23f}.gbn-tag.you{background:#ff5fa22e;color:#ffa3cb}' +
    '.gbn-seats .gbn-kick{padding:6px 9px;font-size:12px;border-radius:9px}' +
    '.gbn-row{display:flex;gap:8px;margin-top:6px}.gbn-row>*{flex:1}.gbn-bar{height:8px;border-radius:99px;background:#ffffff14;overflow:hidden;margin:10px 0 2px}.gbn-bar i{display:block;height:100%;background:linear-gradient(90deg,#ff5a36,#ffb52e);transition:width .4s linear}' +
    '.gbn-wait{display:flex;align-items:center;justify-content:center;gap:10px;color:#d6d2f5;font-weight:800;margin:4px 0}.gbn-spin{width:18px;height:18px;border:3px solid #ffffff30;border-top-color:#ffd23f;border-radius:50%;animation:gbnSpin .8s linear infinite;flex:none}' +
    '.gbn-sec{font-size:11.5px;text-transform:uppercase;letter-spacing:1px;color:#9c97c6;font-weight:900;margin:14px 0 7px}.gbn-hint{font-size:12.5px;color:#b9b4dc;margin-top:6px}' +
    '.gbn-avs{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}.gbn-avs button{padding:0;aspect-ratio:1;border-radius:50%;font-size:22px;background:#ffffff12;display:grid;place-items:center;font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif}.gbn-avs button[aria-pressed=true]{background:#ffd23f40;box-shadow:0 0 0 3px #ffd23f}' +
    '.gbn-cols{display:flex;flex-wrap:wrap;gap:8px}.gbn-cols button{width:32px;height:32px;padding:0;border-radius:50%}.gbn-cols button[aria-pressed=true]{box-shadow:0 0 0 3px #15132c,0 0 0 6px #fff}' +
    '.gbn-name{display:flex;align-items:center;gap:12px}.gbn-name input{text-transform:none;letter-spacing:.5px;font:800 20px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:left;padding-left:14px}' +
    '@keyframes gbnIn{from{opacity:0}}@keyframes gbnPop{from{transform:scale(.92);opacity:0}}@keyframes gbnSpin{to{transform:rotate(360deg)}}' +
    '@media (max-width:380px){.gbn-avs{grid-template-columns:repeat(6,1fr)}.gbn-code b{font-size:32px;letter-spacing:5px}.gbn-big{font-size:16px}}' +
    '@media (prefers-reduced-motion:reduce){.gbn,.gbn-wrap,.gbn-seats li{animation:none}}';
  function addCss() { if (document.getElementById('gbn-css')) return; var s = document.createElement('style'); s.id = 'gbn-css'; s.textContent = css; (document.head || document.documentElement).appendChild(s); }
  var overlays = [];
  function overlay(label, top) {
    addCss();
    var w = document.createElement('div'); w.className = 'gbn-wrap' + (top ? ' gbn-top' : '');
    w.innerHTML = '<div class="gbn" role="dialog" aria-modal="true" aria-label="' + esc(label) + '"></div>';
    ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'keydown', 'keyup', 'wheel', 'click'].forEach(function (ev) { w.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: ev === 'wheel' || ev.indexOf('touch') === 0 }); });
    var prevFocus = document.activeElement;
    var keys = function (e) {
      if (overlays[overlays.length - 1] !== w) return;
      if (!w.contains(e.target)) e.stopPropagation(); // inside the overlay the wrap stops it after inputs see it
      if (e.key === 'Escape') { e.preventDefault(); if (w.onEsc) w.onEsc(); }
      else if (e.key === 'Tab') { // keep focus inside
        var f = Array.prototype.filter.call(w.querySelectorAll('button,input'), function (x) { return !x.disabled && x.offsetParent !== null; });
        if (!f.length) return; var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', keys, true);
    w.close = function () { document.removeEventListener('keydown', keys, true); w.remove(); var i = overlays.indexOf(w); if (i >= 0) overlays.splice(i, 1); try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) {} };
    w.card = w.firstChild;
    (document.body || document.documentElement).appendChild(w); overlays.push(w);
    return w;
  }
  function focusFirst(el) { setTimeout(function () { var f = el.querySelector('[data-focus]') || el.querySelector('button:not(:disabled),input'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }, 30); }

  // ----- account panel -----
  function profilePanel(o) {
    o = o || {};
    return new Promise(function (resolve) {
      var w = overlay('Your Gamebop account', true), m = me(), sel = { avatar: m.avatar, color: m.color };
      var title = m.hasAccount ? 'Your account' : 'Make your account';
      w.card.innerHTML = '<h2><span>' + (m.hasAccount ? '👤 ' : '✨ ') + title + '</span><button class="gbn-x" aria-label="Close">✕</button></h2>' +
        (o.reason ? '<div class="gbn-hint" style="margin:-6px 0 10px">' + esc(o.reason) + '</div>' : '') +
        '<div class="gbn-name"><span class="gbn-prev"></span><input maxlength="12" placeholder="Username" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Username" data-focus value="' + esc(m.name || m.pendingName) + '"></div>' +
        '<div class="gbn-hint">No real names! Make up a gamer name: 3–12 letters, numbers or _</div><div class="gbn-err" role="alert"></div>' +
        '<div class="gbn-sec">Pick your animal</div><div class="gbn-avs" role="group" aria-label="Avatar">' + AVATARS.map(function (a) { return '<button type="button" data-av="' + a[0] + '" aria-label="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '</div>' +
        '<div class="gbn-sec">Colour</div><div class="gbn-cols" role="group" aria-label="Colour">' + COLORS.map(function (c, i) { return '<button type="button" data-col="' + c + '" aria-label="Colour ' + (i + 1) + '" style="background:' + c + '"></button>'; }).join('') + '</div>' +
        '<div class="gbn-row" style="margin-top:16px"><button class="gbn-cancel">Cancel</button><button class="gbn-pri gbn-save">Save</button></div>' +
        (ONLINE ? '<div class="gbn-note">Using another device? Get a login code from your profile on the Gamebop home page.</div>' : '<div class="gbn-note">Saved in this browser. Leaderboards and the players list turn on once the site’s database is connected.</div>');
      var inp = w.card.querySelector('input'), err = w.card.querySelector('.gbn-err'), save = w.card.querySelector('.gbn-save');
      function paint() {
        w.card.querySelector('.gbn-prev').innerHTML = avatarHTML(sel, 52);
        Array.prototype.forEach.call(w.card.querySelectorAll('[data-av]'), function (b) { b.setAttribute('aria-pressed', b.dataset.av === sel.avatar); b.style.background = b.dataset.av === sel.avatar ? sel.color : ''; });
        Array.prototype.forEach.call(w.card.querySelectorAll('[data-col]'), function (b) { b.setAttribute('aria-pressed', b.dataset.col === sel.color); });
      }
      paint();
      w.card.addEventListener('click', function (e) {
        var a = e.target.closest('[data-av]'), c = e.target.closest('[data-col]');
        if (a) { sel.avatar = a.dataset.av; paint(); } if (c) { sel.color = c.dataset.col; paint(); }
      });
      inp.addEventListener('input', function () { var v = inp.value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 12); if (v !== inp.value) inp.value = v; err.textContent = ''; });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); save.click(); } });
      var done = function (v) { w.close(); resolve(v); };
      w.onEsc = function () { done(null); };
      w.card.querySelector('.gbn-x').onclick = w.card.querySelector('.gbn-cancel').onclick = function () { done(null); };
      save.onclick = function () {
        var bad = checkName(inp.value); if (bad) { err.textContent = bad; inp.focus(); return; }
        save.disabled = true; save.textContent = 'Saving…';
        setProfile({ name: inp.value, avatar: sel.avatar, color: sel.color }).then(function (r) { done(r); }, function (e) { err.textContent = e.message; save.disabled = false; save.textContent = 'Save'; });
      };
      focusFirst(w.card);
    });
  }

  // ----- lobby -----
  function lobby(game, o) {
    o = o || {}; game = normGame(game);
    var max = clampMax(o.max || o.maxPlayers || 2), min = Math.max(1, Math.min(max, Math.round(o.min || 2)));
    var title = o.title || document.title || 'Multiplayer';
    return new Promise(function (resolve) {
      var w = overlay(title + ' multiplayer'), unsubRoom = null, unsubMe = null, screen = 'home', busy = false, lastErr = '', shown = {}, lastHTML = '';
      var card = w.card;
      function finish(s) { if (unsubRoom) unsubRoom(); if (unsubMe) unsubMe(); w.close(); resolve(s); }
      function head(sub) { return '<h2><span>⚔️ ' + esc(title) + (sub ? '<small style="display:block;font-size:13px;color:#b9b4dc;font-weight:700;margin-top:2px">' + esc(sub) + '</small>' : '') + '</span><button class="gbn-x" aria-label="Close">✕</button></h2>'; }
      function meRow() {
        var m = me();
        return '<div class="gbn-me">' + avatarHTML(m, 44) + '<div><b>' + esc(m.display) + '</b><small>' + (m.hasAccount ? 'Your username' : 'Playing as a guest') + '</small></div>' +
          '<button class="' + (m.hasAccount ? '' : 'gbn-go ') + 'gbn-acct">' + (m.hasAccount ? 'Edit' : 'Make account') + '</button></div>';
      }
      function home() {
        screen = 'home'; shown = {}; lastHTML = '';
        card.innerHTML = head(max > 1 ? (min === max ? max + ' players' : min + '–' + max + ' players') : '') + meRow() +
          '<div class="gbn-col">' +
          '<button class="gbn-big gbn-pri gbn-qm" data-focus><i>⚡</i><span>Quick Match<small>' + (ONLINE ? 'Play with whoever’s online. Bots fill empty seats.' : 'Jump in right now vs smart bots') + '</small></span></button>' +
          '<button class="gbn-big gbn-alt gbn-create"' + (ONLINE ? '' : ' disabled') + '><i>🔒</i><span>Create private room<small>Get a code to share with a friend</small></span></button>' +
          '<div class="gbn-join"><input class="gbn-code-in" maxlength="5" placeholder="CODE" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Room code"' + (ONLINE ? '' : ' disabled') + '><button class="gbn-go gbn-joinb"' + (ONLINE ? '' : ' disabled') + '>Join</button></div>' +
          '<button class="gbn-big gbn-bots"><i>🤖</i><span>Play vs bots<small>Smart bots, no waiting</small></span></button></div>' +
          '<div class="gbn-err" role="alert">' + esc(lastErr) + '</div>' +
          (ONLINE ? '' : '<div class="gbn-note">Private rooms and playing with real people turn on once the site’s database is connected. Bots are ready now!</div>');
        lastErr = '';
        var ci = card.querySelector('.gbn-code-in');
        ci.addEventListener('input', function () { var v = ci.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5); if (v !== ci.value) ci.value = v; card.querySelector('.gbn-err').textContent = ''; });
        ci.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); card.querySelector('.gbn-joinb').click(); } });
        focusFirst(card);
      }
      function seatList(s) {
        var h = '<ul class="gbn-seats">';
        s.players.forEach(function (p) {
          var fresh = !shown[p.uid]; shown[p.uid] = 1;
          h += '<li class="' + (p.here ? '' : 'gbn-gone') + (fresh ? ' gbn-in' : '') + '">' + avatarHTML(p, 38) + '<span class="gbn-nm">' + esc(p.label) + '</span>' +
            (p.bot ? '<span class="gbn-tag bot">🤖 BOT</span>' : '') + (p.host ? '<span class="gbn-tag host">👑 HOST</span>' : '') + (p.me ? '<span class="gbn-tag you">YOU</span>' : '') +
            (!p.here ? '<span class="gbn-tag">left</span>' : '') +
            (s.isHost && !p.me && screen === 'room' ? '<button class="gbn-kick" data-kick="' + esc(p.uid) + '" aria-label="Remove ' + esc(p.label) + '">✕</button>' : '') + '</li>';
        });
        for (var i = s.players.length; i < s.maxPlayers; i++) h += '<li class="gbn-empty"><span class="gbn-spin"></span>Waiting for a player…</li>';
        return h + '</ul>';
      }
      function renderRoom(s) {
        if (!s) return;
        if (s.status === 'play') return finish(s);
        var focusCls = document.activeElement && document.activeElement.className;
        var here = s.players.filter(function (p) { return p.here; }).length;
        var h;
        if (screen === 'qm') {
          var left = s.botsIn == null ? null : Math.ceil(s.botsIn / 1000);
          h = head('Quick Match') + '<div class="gbn-wait"><span class="gbn-spin"></span>' + (s.isHost ? 'Finding players…' : 'Joined! Starting soon…') + '</div>' +
            (s.isHost && left != null ? '<div class="gbn-bar"><i style="width:' + Math.max(0, 100 - (s.botsIn / ((qm && qm.wait) || 8000)) * 100) + '%"></i></div><div class="gbn-note" style="margin-top:4px">' + (left > 0 ? 'Bots join in ' + left + 's' : 'Adding bots…') + '</div>' : '') +
            seatList(s) + '<div class="gbn-row"><button class="gbn-leave">Cancel</button>' + (s.isHost ? '<button class="gbn-go gbn-now">🤖 Start with bots</button>' : '') + '</div>';
        } else {
          h = head(s.local ? 'Vs bots' : 'Private room') +
            (!s.local ? '<div class="gbn-note" style="margin:0 0 6px">Tell your friend this code</div><div class="gbn-code"><b aria-label="Room code ' + s.code.split('').join(' ') + '">' + esc(s.code) + '</b><button class="gbn-copy" aria-label="Copy code">📋 Copy</button></div>' : '') +
            seatList(s) +
            (s.isHost
              ? '<div class="gbn-row"><button class="gbn-leave">Leave</button><button class="gbn-addbot"' + (here >= s.maxPlayers ? ' disabled' : '') + '>+ 🤖 Bot</button><button class="gbn-pri gbn-start"' + (here < min ? ' disabled' : '') + ' data-focus>Start</button></div>' +
                (here < min ? '<div class="gbn-note">Need ' + min + ' players to start. Wait for a friend or add a bot.</div>' : '')
              : '<div class="gbn-wait"><span class="gbn-spin"></span>Waiting for the host to start…</div><div class="gbn-row"><button class="gbn-leave">Leave</button></div>');
        }
        h += '<div class="gbn-err" role="alert"></div>';
        var key = h.replace(/ gbn-in/g, '');
        if (key === lastHTML && card.querySelector('.gbn-seats')) return; // nothing changed: keep the DOM (and focus) as is
        lastHTML = key;
        card.innerHTML = h;
        var again = focusCls && card.querySelector('.' + String(focusCls).split(' ').filter(function (c) { return /^gbn-(start|addbot|leave|copy|now)$/.test(c); })[0]);
        if (again) again.focus({ preventScroll: true }); else if (!card.contains(document.activeElement)) focusFirst(card);
      }
      function toRoom(kind) {
        screen = kind;
        if (unsubRoom) unsubRoom();
        unsubRoom = onRoom(function (s, why) {
          if (!s) { if (screen !== 'home') { lastErr = why === 'closed' ? 'The room closed.' : ''; if (unsubRoom) { unsubRoom(); unsubRoom = null; } home(); } return; }
          renderRoom(s);
        });
      }
      function act(p, label) {
        if (busy) return; busy = true;
        var errEl = card.querySelector('.gbn-err'); if (errEl) errEl.textContent = label || '';
        return p.then(function (v) { busy = false; return v; }, function (e) { busy = false; var el = card.querySelector('.gbn-err'); if (el) el.textContent = e.message || 'Something went wrong.'; throw e; });
      }
      card.addEventListener('click', function (e) {
        var t = e.target.closest('button'); if (!t || t.disabled) return;
        var c = t.classList;
        if (c.contains('gbn-x')) return w.onEsc();
        if (c.contains('gbn-acct')) return profilePanel().then(function () { if (screen === 'home') home(); });
        if (c.contains('gbn-qm')) {
          screen = 'qm'; card.innerHTML = head('Quick Match') + '<div class="gbn-wait" style="margin:30px 0"><span class="gbn-spin"></span>Looking for a game…</div><div class="gbn-row"><button class="gbn-leave" data-focus>Cancel</button></div>';
          focusFirst(card); toRoom('qm');
          quickMatch(game, { maxPlayers: max }).then(function (s) { if (s) finish(s); }, function (er) { lastErr = er.message || 'Could not find a match.'; leave(); home(); });
          return;
        }
        if (c.contains('gbn-create')) return act(createRoom(game, { public: false, maxPlayers: max }), 'Making a room…').then(function () { toRoom('room'); }, function () {});
        if (c.contains('gbn-joinb')) {
          var v = card.querySelector('.gbn-code-in').value;
          if (!/^[A-Z]{5}$/.test(v)) { card.querySelector('.gbn-err').textContent = 'Type the 5-letter code'; card.querySelector('.gbn-code-in').focus(); return; }
          return act(joinRoom(v, { game: game }), 'Joining…').then(function () { toRoom('room'); }, function () {});
        }
        if (c.contains('gbn-bots')) return act(createRoom(game, { local: true, maxPlayers: max }).then(function () { return fillWithBots(); }).then(start)).then(finish, function () {});
        if (c.contains('gbn-start')) return act(start()).catch(function () {});
        if (c.contains('gbn-now')) { if (qm) qm.deadline = Date.now(); return; }
        if (c.contains('gbn-addbot')) return act(fillWithBots(1)).catch(function () {});
        if (t.dataset.kick) return kick(t.dataset.kick);
        if (c.contains('gbn-copy')) {
          var code = (snapshot() || {}).code || '';
          var ok = function () { t.textContent = '✔ Copied'; setTimeout(function () { if (t.isConnected) t.textContent = '📋 Copy'; }, 1500); };
          try { navigator.clipboard.writeText(code).then(ok, function () { fallbackCopy(code); ok(); }); } catch (x) { fallbackCopy(code); ok(); }
          return;
        }
        if (c.contains('gbn-leave')) { if (unsubRoom) { unsubRoom(); unsubRoom = null; } leave(); home(); }
      });
      w.onEsc = function () { if (screen === 'home') { finish(null); } else { if (unsubRoom) { unsubRoom(); unsubRoom = null; } leave(); home(); } };
      unsubMe = onMe(function () { if (screen === 'home' && card.querySelector('.gbn-me')) { var x = document.createElement('div'); x.innerHTML = meRow(); card.querySelector('.gbn-me').replaceWith(x.firstChild); } });
      if (cur && cur.game === game && snapshot().status === 'wait') toRoom(qm ? 'qm' : 'room'); else home();
    });
  }
  function fallbackCopy(t) { try { var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } catch (e) {} }

  var GBNet = window.GBNet = {
    online: ONLINE, AVATARS: AVATARS.map(function (a) { return { id: a[0], face: a[1] }; }), COLORS: COLORS.slice(), FACE: FACE,
    me: me, onMe: onMe, setProfile: setProfile, checkName: checkName, isRude: rude, profilePanel: profilePanel,
    loginCode: loginCode, useLoginCode: useLoginCode, players: players, avatarHTML: avatarHTML,
    boards: boards, db: db, token: token, serverNow: serverNow,
    createRoom: createRoom, joinRoom: joinRoom, quickMatch: quickMatch, leave: leave, start: start, whenStarted: whenStarted,
    onRoom: onRoom, room: snapshot, setMyState: setMyState, setShared: setShared, send: send, onEvent: onEvent,
    isHost: isHost, myId: myId, myBots: myBots, fillWithBots: fillWithBots, kick: kick, setReady: setReady,
    lobby: lobby, isOpen: function () { return overlays.length > 0; },
    stateInterval: 100
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0);
})();
