# Shared game helpers (required in every game from 2026-11-14)

## 1. Phone settings bar + master volume — games/lib/gb.js (EVERY game)
- First thing inside `<head>` (right after `<meta charset>` / viewport): `<script src="lib/gb.js"></script>`
- It adds a small ⚙ tab at the top centre on touch screens: volume slider + mute, ⇄ Swap (mirror controls left/right), control size − / +, ✥ Move (drag each control), plus Reset. Settings are shared across all Gamebop games.
- Volume works automatically for WebAudio and <audio>. Do not route around it (don't create a 2nd AudioContext after the page loads from an iframe of another origin, etc. — normal code is fine).
- On-screen touch controls made of DOM elements: add `data-gbctl="<name>"` (e.g. joystick, jump, boost, fire, left, right) to the OUTER element of each control (the element that is positioned). Its hit-testing must follow the element's real on-screen rect (e.g. use the element's own pointer events, or getBoundingClientRect() at touch time) so moved/flipped/scaled controls still work.
- Touch controls drawn on the canvas: set `GB.manual = true`, and when laying out controls read `GB.settings.flip` (mirror x: x' = W - x), `GB.settings.size` (scale radius), and `GB.offset(name)` → {x,y} CSS px to add; re-layout on `GB.on(fn)`. (The Move tool only works for DOM controls; canvas games get Swap + size.)
- Games with only "tap/click anywhere" controls: just include gb.js (the bar then shows volume only).
- Don't put essential HUD in the top-centre 140×40 px.

## 2. Leaderboards — games/lib/board.js (games with a score/time/distance/wave players compete on)
- `<script src="lib/board.js"></script>` right after gb.js.
- At the end of every run (game over, run finished, level-less endless modes) call `GBBoard.submit(boardId, value, {lower:false})`. It returns a Promise of `{best}`; use `best` to celebrate "NEW BEST" in your own UI. It keeps each player's best only and never throws.
- boardId: the game slug, or `slug:variant` for a separate board per mode/difficulty/track (max ~4 boards per game). Times where lower is better: `{lower:true}`.
- Add a 🏆 button on the game-over/results screen and on the main menu: `GBBoard.button(parentEl, boardId, {title:'Game Name', format:'int'|'time'|'float'|fn, lower:false, label:'Insane'})`, or call `GBBoard.show(boardId, sameOpts)` from your own styled button. While `GBBoard.isOpen()` the game must ignore input (the panel already stops events from reaching the page).
- Skip leaderboards for pure level/puzzle-progress and idle/management games where there's no comparable number.
- Names on boards are the player's Gamebop account username. With no account, a new best asks them once to "Make your account" (username + animal avatar, no real names). board.js loads lib/net.js by itself when the site is online. Until the Firebase config is pasted into lib/gb.js (see build/FIREBASE.md), boards show the device's own best runs. The public GBBoard API is unchanged.

## 3. Multiplayer + accounts — games/lib/net.js (global `GBNet`)
- Load after gb.js (and board.js if used): `<script src="lib/net.js"></script>`. In meta.json add `"multi": true` and `"players": 2` (max players; 2 shows a "👥 2P" tile flag, more shows "🌐 Online"); the portal's Multiplayer bubble lists these games.
- Same API online and offline. With no database config (or no network) rooms are LOCAL and filled with bots, so every multiplayer game must be fully playable vs bots. Bots must be smart (real strategy, not random), and run ONLY on the host: `if (GBNet.isHost()) for (const b of GBNet.myBots()) runBot(b.uid)`; a bot acts with `GBNet.send(type, data, {as: b.uid})` / `GBNet.setMyState(obj, {as: b.uid})`. Host can change mid-game (host migration), so check `isHost()` every tick, not once.
- No free-text chat, ever. Show players by `p.label` (bots are "BOT · Name") with `GBNet.avatarHTML(p, px)`.

| Call | What it does |
|---|---|
| `GBNet.lobby(game, {min, max, title})` | Overlay: Quick Match / Create private room (5-letter code + copy) / Join with code / Play vs bots. Resolves with the room when the match starts, or `null` if closed. |
| `GBNet.quickMatch(game, {maxPlayers, wait:8000, onUpdate})` | Joins an open public room for `game`, else makes one, waits ~8 s, fills empty seats with bots, starts. Resolves on start. |
| `GBNet.createRoom(game, {public, maxPlayers, local})` / `GBNet.joinRoom(code)` | Make / join a room (status `'wait'`). Errors have `.code`: `not-found`, `full`, `bad-code`, `offline`, `network`. |
| `GBNet.start()` · `GBNet.fillWithBots(n?)` · `GBNet.kick(uid)` | Host only. `fillWithBots()` with no n fills every empty seat. |
| `GBNet.leave()` | Leave (room is deleted when the last human leaves). Call when the game ends or the player quits to menu. |
| `GBNet.onRoom(cb)` → unsubscribe | `cb(room)` now and on every change; `cb(null)` when you leave / the room closes. |
| `GBNet.room()` | Latest snapshot (below) or null. |
| `GBNet.send(type, data, {as})` | Ordered event to everyone INCLUDING yourself (process your own move when it comes back, so all players apply events in the same order). Use for discrete actions (moves, shots, picks), not per-frame data. |
| `GBNet.onEvent(cb)` → unsubscribe | `cb({id, type, data, from, t, mine, bot})`. Events that arrive before the first listener are queued. |
| `GBNet.setMyState(obj, {as})` | Your continuous state (position, score…), written at most every `GBNet.stateInterval` ms (100). Everyone reads it at `room.state[uid]`. |
| `GBNet.setShared(obj)` | Host only: one host-owned object at `room.shared` (e.g. the authoritative board / round / RNG seed). |
| `GBNet.isHost()` · `GBNet.myId()` · `GBNet.myBots()` | Who runs the authority + the bots. |
| `GBNet.me()` · `GBNet.onMe(cb)` · `GBNet.profilePanel()` | Account: `{uid, name, avatar, color, hasAccount, display}` (`display` is the username or "Guest123"). |
| `GBNet.isOpen()` | A GBNet overlay is open: ignore game input. |

Room snapshot: `{code, game, local, online, status:'wait'|'play', isHost, host, me, maxPlayers, players:[{uid, name, label, avatar, color, bot, here, me, host, joined}], humans, bots, state:{uid: obj}, shared}`. `players` is sorted by join order (same on every screen, use it for seat/colour order). `here:false` = that person dropped (no heartbeat for 10 s); the game decides (usually the host's bot takes over that seat).
Data is plain JSON. Empty objects/arrays and `null` are dropped by the database, so don't rely on them.

Example (turn-based 2-player game):
```js
const room = await GBNet.lobby('hex-duel', { min: 2, max: 2, title: 'Hex Duel' });
if (!room) return showMenu();                       // closed the lobby
const order = room.players.map(p => p.uid);          // seat 0 moves first
let turn = 0;
GBNet.onEvent(e => {
  if (e.type !== 'move' || e.from !== order[turn % 2]) return;  // ignore out-of-turn
  applyMove(e.data.cell, turn % 2); turn++;
  if (gameOver()) { showResult(); GBNet.leave(); }
});
canvas.onclick = ev => { if (order[turn % 2] === GBNet.myId()) GBNet.send('move', { cell: cellAt(ev) }); };
setInterval(() => {                                  // host plays for bots (and for anyone who dropped)
  if (!GBNet.isHost()) return;
  const r = GBNet.room(), who = r.players.find(p => p.uid === order[turn % 2]);
  if (who && (who.bot || !who.here)) GBNet.send('move', { cell: smartBotMove() }, { as: who.uid });
}, 700);
```
Testing: everything works offline with bots. For online tests there is a mock Firebase (REST + streaming + rules) used by the platform tests; set `window.GB_FIREBASE = {apiKey:'t', projectId:'t', emulator:'http://localhost:9199'}` before gb.js loads (e.g. Playwright `addInitScript`). Never commit an emulator URL.

## 4. All-leaderboards page (index.html#boards) — keep build/meta.json "boards" up to date
Every game with a leaderboard must list its boards in build/meta.json so it shows on the site's 🏆 Leaderboards page:
`"boards": [{"id": "slug" or "slug:variant", "label": "Arcade", "fmt": "int|m|time|sec2|wpm|x|money|rounds|planets|lines|strokes", "lower": true (only if lower wins)}]`
Use exactly the board id the game passes to GBBoard.submit. For a daily board use `{day}` in the id (e.g. "gale-regatta:daily-{day}", day = UTC days since 1970). When you add, rename or change a board id, update this list too, then run `node build/build-catalog.js`.
