# Gamebop game spec (every game must meet all of this)

Gamebop is a browser-game portal (like CrazyGames/Poki). Each game is ONE self-contained HTML file at
`/home/claude/gamebop-site/games/<slug>.html`, loaded inside an iframe that fills the play area.

## ⚠ READ FIRST — Charlie's verdict (2026-11-11) and the new bar
The full brief, in Charlie's own words, is in build/CHARLIE.md. Read ALL of it before building or reviewing anything.
Charlie played the games and said they are "simple, boring, they don't hook you, they're not good games". Polished menus and long feature lists did NOT make them fun. What went wrong, and the rules that fix it:
1. **One great hook, not a feature list.** Previous prompts asked for 6 worlds, 6 boat classes, 20 achievements, 40 species… and the builder spread itself thin, so every feature was shallow. Instead: find ONE core action that is a joy on its own (a swing, a flick, a slice, a spot, a merge) and spend most of the effort making it feel incredible and making it deepen over time. Extra modes/unlocks come only after the core is great. Good references for this quality bar (examples only, never copy them): Simon Willison's Claude-built games, e.g. his tree spot-the-difference game: one simple idea, beautiful, calm, and you want to see the next challenge; and the 2D swinging-ball games Charlie loves on CrazyGames: tiny controls, huge satisfaction.
2. **CONTROLS ARE DEAD SIMPLE and feel instant.** One or two buttons wherever possible. Never make the player click small targets during action. Auto-target the obvious thing: e.g. in a swinging game, Space (or tap anywhere) grabs the NEXT anchor ahead automatically; release lets go. Keyboard, mouse and touch must each be enough on their own. Be forgiving: coyote time, input buffering, generous hitboxes, aim assist, snap-to-target. Response on the same frame as the input. If a 9-year-old can't play it within 5 seconds without reading, the controls are wrong.
3. **"I want to see the next one."** Short, escalating challenges (levels/rounds of 20-90 s) where each one shows something new: a new twist, obstacle, creature or visual. Tease the next one on the results screen. Always a clear goal on screen.
4. **Surprise and delight, frequently.** Small unexpected moments every minute: a critter reacts, a secret, a funny animation, a rare event, a combo fanfare, an easter egg. This is what makes it feel crafted, not generated.
5. **Feel > features.** Springy physics, momentum, weight, hit-stop, screen shake, satisfying sounds. Tune numbers by playing, not by guessing.
6. **2D or 3D, whichever fits the game.** 2D canvas is great for most games. 3D is welcome when it makes the game better: use three.js ONLY as a local shared copy at `games/lib/three.min.js` loaded with a classic `<script src="lib/three.min.js">` (never a CDN). If that file is missing and you cannot download it, use 2D or hand-written WebGL / canvas pseudo-3D instead.
7. **Independent fun review is mandatory** (see "Fun review gate" at the end). A game that scores under 8/10 is improved; under 7 after 3 rounds is dropped.


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

## Simon Willison style (Charlie's reference)
Charlie wants games in the spirit of Simon Willison's Claude-built browser games (simonwillison.net): one self-contained page, made from one detailed prompt, playable instantly on desktop and phone, with procedural WebAudio sound and Playwright-tested at desktop and mobile sizes. Simon's own lesson is that fun comes from **playtesting and iterating**: his first versions were "playable but not fun" until he played them and fixed what was boring. So every builder must do at least three full rounds of playtest-then-improve, followed by the independent Fun review gate at the end of this file.

## NO walls of text
Never make a game that is mostly reading: no long dialogue boxes, no text-only cutscenes, no "talk to people and read" gameplay without animation. Tell the story through animation, level design, character expressions, icons, short barks (≤ 8 words) and sound. If a character speaks, it's a short, skippable speech bubble over an animated character.

## DEEP GAMES (the ★ Deep Games section)
Some games are flagged `"deep": true` in metadata. These are big adventures you spend hours in, like a monster-collecting RPG you don't beat in 10 minutes: a world to explore, many areas, lots of creatures/items/characters to collect and level, side goals, bosses, and a long main goal (aim for 2+ hours of play). Rules: still minimal reading (see above), constant animation and juice, autosave everywhere, a clear next goal always on screen. Build each Deep Game with one dedicated agent, and do **three rounds of build → play it for real → improve**. Size can go up to ~1 MB if needed.

## ANIMATION must be better than "AI-looking"
Charlie says even Rude Cat's animation looks AI-made, so it is NOT the animation reference. Raise the bar:
- Characters are animated with real principles: anticipation, follow-through, squash & stretch, easing (never linear tweens), overlapping parts (ears, tails, hair, cloth lag behind the body), secondary motion and idle "breathing".
- Multi-frame or skeletal/procedural limb animation for walking, running, jumping, attacking, getting hit, celebrating. No sliding static sprites, no whole-image wobble standing in for animation.
- Hit-stop (a few frames' freeze) on impacts, camera ease/lead and gentle shake, particles with gravity and fade, dust on landings, trails on fast motion.
- UI animates too: buttons press down and bounce, numbers count up, panels slide with easing, rewards pop.
- Run at 60 fps with delta time; no jitter. Check animation by recording a few seconds of frames in Playwright and looking at them.

## LOOKS LIKE A REAL, QUALITY GAME (not "AI-made")
- Graphics must look like a polished commercial indie game: a deliberate art style (e.g. hand-drawn, cozy pixel art, clean vector, painterly, low-poly 2.5D), a cohesive palette, real lighting/shading, layered parallax backgrounds, animated characters with personality (idle/walk/hit/celebrate frames or procedural squash-and-stretch).
- Avoid the generic "AI look": no plain flat rectangles on a black screen, no default system fonts for titles, no random neon gradients on everything, no emoji as art, no walls of centered text, no identical rounded buttons everywhere. Draw custom UI that matches the game's world (wooden signs for a farm, holo panels for sci-fi…).
- "Realistic" where it fits: believable physics, weight, momentum, materials, animals and places that behave like the real thing, sounds that match actions.
- Animated, alive worlds: ambient motion (wind, water, critters, weather, day/night), reactive environments, smooth transitions between screens.
- Mobile and desktop both look good.

## Ideas Charlie likes (use these kinds of games, all original)
Card games / deckbuilders, ant colony builders (dig tunnels, manage castes, raids, queen), town / city builders with deep economies, daily word-guessing puzzles (Wordle-style, original name and twist), plus anything with real depth: progression, challenge, satisfying feedback, "just one more" pull.

## Metadata
Add a "keywords" string to each game's JSON: 8-15 plain topic words people might search for (e.g. "fishing fish ocean boat relaxing collection"), so topic search ("fishing game", "cars", "word game") finds it.

## Tutorial (required in every game)
- First time someone plays, run a short **interactive tutorial**: teach by doing (highlight the control, let the player try it, move on), with arrows, ghost hands, key icons and ≤ 8-word captions. No text walls.
- A clear **Skip** button is always visible during the tutorial.
- The main menu has a **How to play** button that replays the tutorial any time.
- Remember that it was completed (localStorage) so it doesn't auto-run again.

## Support link (required in every game)
- On the title / main menu screen only, put a tiny, low-key link in the **bottom-right corner** that says "Support ♥" and opens https://cash.app/$CharlieShocked in a new tab (`<a target="_blank" rel="noopener">`).
- Very small and unnoticeable: ~11-12px text, ~55% opacity (full on hover), no box or a very subtle one, respects safe-area insets, never overlaps buttons, and hidden during gameplay.

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
{"slug":"...","title":"...","keywords":"8-15 topic words","deep":false,"category":"one of: Action, Arcade, Puzzle, Strategy, Racing, Sports, Typing, Idle, Casual, Adventure, Music, Word","tags":["2-4 short tags"],"blurb":"max 12 words, punchy","controls":"short, e.g. Mouse · Arrows/WASD · Touch","prompt":"the prompt you built it from"}

## Fun review gate (mandatory, added 2026-11-11)
After the builder's own 3 rounds of build → play → improve, a SEPARATE reviewer agent (who did not build the game) plays it with Playwright: real inputs at 1280x720 and 390x700, plus recorded frames, at least 3 levels/rounds deep. It scores each 1-10, harshly, like Charlie would:
- **Hook**: is the first 10 seconds fun with zero reading?
- **Controls**: one or two simple inputs, instant, forgiving, no fiddly clicking?
- **Feel/juice**: does the core action feel satisfying (physics, sound, shake, particles)?
- **Want-more**: does each level/round show something new, so you want to see the next one?
- **Looks/animation**: does it look like a real indie game, with no AI-generated look?
- **Surprise**: are there delightful little moments?
Overall = the lowest of these, not the average. 8+ ships. Under 8: the reviewer lists the 3-5 most important concrete fixes, the builder applies them, and the reviewer re-checks. Still under 7 after 3 rounds: don't ship it (or drop it from the site).
The builder's own self-review counts for nothing. Only the independent score counts.
