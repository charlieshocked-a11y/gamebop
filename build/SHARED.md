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
- First time a player opens a board online they're asked for a 2–8 char tag (no real names). Until the Firebase config is pasted into board.js, boards show the device's own best runs.
