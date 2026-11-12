# WHAT CHARLIE WANTS (2026-11-11). Every builder and reviewer reads ALL of this.

## The problem we are fixing
Charlie played the earlier games and said: "They're not that good. They're kind of just boring. They don't hook you. They're not like good games. Your games, they're not that fun. They're kind of just simple, boring." Earlier runs produced games with polished title screens, nice menus and long feature lists (6 worlds, 6 boat classes, 20 achievements, 40 animal species, upgrade shops...), but actually PLAYING them was dull. The builders spread their effort over dozens of shallow features, so the moment-to-moment play felt flat, the controls were fiddly, and nothing pulled you forward. Menus, feature counts and achievement lists are NOT what makes a game fun. What happens under your thumb every second is what makes it fun. Make games Charlie genuinely can't put down, the kind he'd choose over the CrazyGames games he plays now.

## What a good game feels like (Charlie's own words)
"It was fun. It's engaging. You want to continue, and you want to see the more challenges."
- You are having fun within seconds of pressing Play.
- You keep wanting to press "next" because you're curious what the next level will throw at you.
- When you fail, you instantly want one more try because it was close and it was your fault, not the game's.
- When you succeed, it feels amazing: big satisfying feedback, a reward, and a glimpse of something new.

## Rule 1: One great hook, fun within 10 seconds
Build every game around ONE core action that is a joy all by itself, even with no goals, no score and no upgrades: swinging and releasing at the perfect moment, bouncing off a wall into a combo, flicking a shot that curves into a target, slicing through a stack, drifting around a corner, merging and watching a chain reaction, spotting the one thing that's different. Spend MOST of your effort making that one action feel incredible: timing, physics, sound, animation and feedback. Only then build modes, upgrades and unlocks around it, and everything you add must make the core action more interesting, not distract from it. A simple idea done brilliantly beats a big idea done shallowly.
In the first 10 seconds after pressing Play, the player is already doing the fun thing. No text, no intro, no shop. The first level is easy and gives an instant win with a burst of celebration.

## Rule 2: "I want to see the next challenge"
- Short levels or rounds, about 20-90 seconds each.
- EVERY new level shows something NEW: an obstacle, enemy, creature, mechanic, twist, place, weather, or a combination of earlier ideas. Introduce one idea at a time: show it safely, then test it, then combine it. Minute 20 must not feel like minute 2.
- Escalate with spikes (bosses, set pieces, speed rounds) and breathers (bonus or treasure levels).
- Always show a clear goal on screen.
- The results screen has stars or a medal, a count-up, and a TEASE of the next level, with the Next button where the thumb already is.
- Near-misses: "so close!" moments, ghost of your best run, a medal just out of reach.
- Restart is instant: one key or tap, no confirmation.
- Long-term pull (worlds that look different, skins, records, dailies) sits on top of a great core loop and never replaces it.

## Rule 3: Controls must be dead simple and feel instant
Charlie's exact complaint: in Canopy Swing "you have to click the bars for you to get on them. It should be like Space. You click Space to lock on the next one, or to go to the next one. You need to work on controls."
- One or two buttons wherever possible (Space / tap / hold, maybe left-right).
- Never make the player click small targets during action. Never require precise aiming at moving things unless aiming IS the game, and even then add aim assist.
- AUTO-TARGET the obvious thing: the next anchor ahead, the nearest enemy, the closest lane, the next platform.
- Be forgiving: coyote time, input buffering, generous player hitboxes, stingy hazard hitboxes, snap-to-target.
- The response happens on the SAME frame as the input.
- Keyboard alone, mouse alone and touch alone must EACH be enough. On a phone, a big tap/hold-anywhere zone beats tiny buttons.
- One tiny control hint with key icons that fades after use.
- Test: a 9-year-old figures it out in 5 seconds without reading. Fix the controls BEFORE anything else.
- Patterns that work: swing = hold Space/tap-hold to latch onto the next anchor automatically, release to let go. Platformer = left/right plus jump, with variable height, coyote time and buffer. Shooter = auto-aim, and the player only moves. Puzzle = tap/drag on big hit areas, with undo. Throwing/sports = one drag-release or timed press with an arc preview. Racing = steer only with auto-accelerate, and drift/boost as the second button.

## Rule 4: Satisfying feel and juice ("so fun and satisfying to play")
Charlie loves a 2D ball-swinging game on CrazyGames: tiny controls, HUGE satisfaction. That feeling is the target.
- Springy, believable physics with momentum and weight. Speed carries over, and good timing earns more speed.
- Squash and stretch on every bounce, landing and launch. Hit-stop (2-6 frames) on impacts. Screen shake scaled to the event. Slow-mo on huge moments.
- Particles with gravity and fade, trails, speed lines, dust on landings, sparks, confetti.
- Combo counters that pop and grow, with rising musical pitch on chained hits.
- A synthesized sound for EVERY action, with slight pitch variation.
- Tune by PLAYING. If the action doesn't make you grin by the 20th time, it isn't tuned yet.

## Rule 5: Surprise and delight, often
Every minute or so something small and unexpected happens: a critter reacts, a secret, a hidden collectible, a funny idle or fail animation, a rare golden event, a combo fanfare, an easter egg, a character who cheers or panics.

## Rule 6: Quality references (examples only, NEVER copy them)
- Simon Willison's Claude-built games, e.g. his tree spot-the-difference game: one simple idea, beautiful, calm and engaging, and you keep wanting to see the next pair. Charlie: "the Simon Willison game was just an example" of the quality and fun level.
- The 2D ball-swinging and ball-bouncing games on CrazyGames, for their feel.
- Original names, characters and art only.

## Rule 7: 2D or 3D, whichever fits each game
Charlie: "it depends on the game." Many of the most satisfying games are 2D. Use 3D only when it makes that game better. three.js only as the local games/lib/three.min.js (classic script tag, never a CDN). If it's missing, use 2D or hand-written WebGL / canvas pseudo-3D.

## Rule 8: Looks and moves like a real, quality game, not AI-made
- A deliberate art style, cohesive palette, lighting and shading, parallax layers, and an alive world (wind, water, critters, weather).
- Real animation principles: anticipation, follow-through, squash and stretch, easing, overlapping parts, idle breathing, expressive faces. Procedural or multi-frame limbs. No sliding static sprites. Clearly better than Rude Cat's.
- Custom UI that fits the world. Buttons press and bounce, numbers count up, panels ease in.
- No plain rectangles on black, emoji art, default title fonts, random neon gradients or identical rounded buttons.
- 60 fps with delta time. Check motion with recorded Playwright frames.

## Rule 9: Never mostly reading
No text walls, dialogue or text cutscenes. Use animation, icons, level design, and speech bubbles of 8 words or fewer.

## Rule 10: Still required (details in SPEC.md)
- A skippable interactive tutorial that teaches by doing.
- A "How to play" button in the menu that replays it.
- The tiny "Support ♥" link in the bottom-right of the menu only (https://cash.app/$CharlieShocked, new tab, hidden in play).
- Autosave under gamebop.<slug>. with Continue.
- A remembered mute toggle, and pause on Esc/P or when the tab is hidden.
- Works at 1280x720 and on a 390x700 phone.
- No external requests.

## What "boring" looks like (avoid all of these)
- The main action is the same at minute 1 and minute 10.
- Controls need clicking on small things, reading, or several buttons at once.
- Lots of menus, shops and text, but thin play.
- Levels that only change numbers instead of introducing new ideas.
- Weak feedback: things vanish with no sound, shake or particles.
- Waiting: long animations before you can act, slow restarts, unskippable screens.
- Losing feels random or unfair.

## Rule 11 (Charlie, 2026-11-11): too easy and too short is the most common failure
Charlie's feedback on Skybolt Roadster: he bought every upgrade fast, and even on the hardest mode he could outrun the cops easily. He said the other games aren't good enough either.
- **Long progression:** upgrades and unlocks should take hours, not minutes. Use many tiers (for example 10 or more levels per upgrade) with rising prices, plus late-game items, prestige or rare unlocks. Never let a player max everything in one session.
- **Hard means hard:** the top difficulty should beat a skilled player most of the time at first. Enemies must keep up with a fully upgraded player, so scale enemy speed and smarts to the player's upgrades or heat level. Late levels should need mastery, not just patience.
- **Playtest as a good player:** test with a fully upgraded save and a skilled bot or script. If the max-upgrade player still wins easily on the hardest setting, it is too easy, so tune it up.
- **Big world, real graphics:** a world should feel large and varied (several distinct areas and landmarks), with lighting, shadows or fake shadows, detail props and animation, not flat boxes.
