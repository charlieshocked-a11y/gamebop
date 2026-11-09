# Gamebop game spec (every game must meet all of this)

Gamebop is a browser-game portal (like CrazyGames/Poki). Each game is ONE self-contained HTML file at
`/home/claude/gamebop-site/games/<slug>.html`, loaded inside an iframe that fills the play area.


## FUN FIRST — the bar for every game (most important section)
Charlie's feedback: games must be deeper, more interactive and much more fun, with a strong hook, so people actually WANT to keep playing and they don't get boring quickly. A game that is technically correct but dull is a failure.
- **Hook in 10 seconds:** the first moment of play must already feel great: instant action, juicy feedback, no menus or reading in the way.
- **Core loop that feels good on its own:** the basic action (jump, shoot, merge, type, drift…) must be satisfying even with no goals. Tune feel: responsiveness, weight, impact, sound, screen shake, particles, slow-mo on big moments.
- **Constant new stuff:** introduce a new mechanic, enemy, item, zone or twist every few minutes. Nothing should feel the same at minute 20 as minute 2.
- **Real choices:** meaningful decisions (builds, upgrade paths, risk vs reward, routes, combos), not just "number goes up". Different runs/strategies should play differently.
- **"One more go" loop:** short sessions that end with progress (unlocks, currency, new record, a teaser of what's next). Near-misses and close calls. Daily/challenge modes where they fit.
- **Rich interactivity:** lots of things to interact with — destructible/reactive worlds, secrets, combos, chain reactions, physics, characters that react to the player.
- **Long-term goals:** visible unlock trees, collections, achievements (20+), bosses, mastery ratings, so there is always a next goal on screen.
- **Difficulty curve:** easy to start, steadily harder, with spikes (bosses) and breathers. Never stalls, never walls the player.
- **Builders must playtest for fun:** after building, play your own game for a while (by bot and by reasoning through the first 10 minutes) and ask "would a kid keep playing this?" If the answer is "it gets samey", add variety before reporting.
- Bigger is fine: prefer one rich, deep game (up to ~400 KB) over a thin one.

## Hard rules
- Single file, vanilla JS + CSS + canvas/DOM. NO external requests of any kind: no CDNs, no web fonts, no images by URL. Draw everything in code (canvas, SVG, CSS). Sounds are synthesized with WebAudio.
- Original game: no names, characters, logos or signature look of existing branded games.
- Must fill the viewport (100vw x 100vh), resize correctly, and look good at both 1280x720 and a 390x700 phone. No page scroll.
- Input: keyboard + mouse on desktop; touch must also work (on-screen buttons/gestures) unless the game is inherently keyboard-only (typing games).
- Start on a polished TITLE SCREEN: big stylized game title, a Play/Continue button, art or animated background. This title screen is screenshotted as the arcade thumbnail, so make it look great and colourful within the first second of loading (no click needed to render it).
- MINIMAL TEXT. The player hates reading. Use icons, short labels, one-line control hints (e.g. "← → move · Space jump"). No walls of tutorial text; teach by level design or tiny tooltips.
- DEEP & LONG: real progression — levels/worlds, upgrades, unlocks, rising difficulty, at least ~30+ minutes of content or a strong replay loop (roguelite meta-upgrades, endless with records). Not a toy demo.
- SAVEABLE PROGRESS: autosave to localStorage under keys prefixed `gamebop.<slug>.` (wrap every access in try/catch; game must still run if storage throws). Save unlocked levels, upgrades, currency, best scores, settings. Title screen shows Continue when a save exists.
- Juice: particles, easing, screen shake, hit feedback, satisfying sounds, a cohesive colour palette. It should feel like a finished, fun commercial web game.
- Mute toggle (remember it). Audio starts only after first user gesture.
- Pause with Esc/P and automatically when `document.hidden`.
- Use requestAnimationFrame with delta-time; cap dt so tab-switching doesn't break physics.
- Typing games must be HARD — aimed at people who already type well: capitals, punctuation, numbers, symbols, long words, speed pressure.
- `<title>` = the game name. Keep the file reasonably sized (aim < 150 KB).

## Test before you report
Run `node /home/claude/gamebop-site/build/check.js <slug>` — it must print OK (zero console errors, zero page errors, zero external requests).
Then Read the screenshots it made (`/home/claude/gamebop-site/thumbs/<slug>.jpg`, `/home/claude/gamebop-site/build/shots/<slug>-play.jpg`, `-mobile.jpg`) and fix anything ugly or broken (blank thumbnail, overlapping UI, cut-off title on mobile). Where the generic clicks don't really exercise the game, write your own quick Playwright script in /home/claude/gamebop-site/build/ to actually play a level, confirm progress saves to localStorage and Continue restores it.
Re-run check.js after the final edit so the thumbnail is current.

## Report back (exactly this JSON per game, in a ```json block)
{"slug":"...","title":"...","category":"one of: Action, Arcade, Puzzle, Strategy, Racing, Sports, Typing, Idle, Casual, Adventure, Music, Word","tags":["2-4 short tags"],"blurb":"max 12 words, punchy","controls":"short, e.g. Mouse · Arrows/WASD · Touch","prompt":"the prompt you built it from"}
