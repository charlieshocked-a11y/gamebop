# Weekly tune-up — make the weakest games better (Charlie, 2026-11-17)

Charlie's words: every week, "go through everything and weed out the ones that are kind of boring, not as fun, and not that many people are playing. Remake that thing and make it better, more fun and more enjoyable. Maybe give some games better titles and better descriptions." Make bad games BETTER (never worse, never delete them).

Live site: https://charlieshocked-a11y.github.io/gamebop/ — repo charlieshocked-a11y/gamebop, branch main.
Read first: build/CHARLIE.md (all rules, esp. 11 and 12), build/SPEC.md ("FUN FIRST", "Fun review gate"), build/SHARED.md.
Never remake Charlie's own games (meta.json "mine": true — rude-cat, scribble-wizard, skybolt-roadster) beyond bug fixes. Skip games added in the last 14 days (too new to judge). Don't touch games/lib/ or index.html.

## 1. Find the weakest games
A. **Play data** (only if the Firebase config in games/lib/gb.js is filled in). Read the counts with WebFetch (the shell can't reach Google):
   `<databaseURL>/stats.json` (Realtime Database, public read; databaseURL is in games/lib/gb.js)
   `stats/<slug>/plays` = all-time plays, `stats/<slug>~w<N>/plays` = plays in week N, where N = floor((unixDays + 3) / 7) (unixDays = ms since 1970 / 86400000). A play = someone stayed 20+ s. Use last week's and this week's counts. Games with few or no plays are candidates.
B. **Fun review** (always). Keep build/review-log.json = { slug: { reviewed: "YYYY-MM-DD", score: n, plays: n, notes: "..." } }. Each week, review the ~20 eligible games with the oldest "reviewed" date (never-reviewed first), plus every low-play candidate from A. Reviewer agents (about 5 games each, never the fixer) play each game for real with Playwright for ~3 minutes, desktop and phone size, and score it like SPEC.md's Fun review gate: Hook, Controls, Feel, Want-more, Looks/animation, Surprise, each 1–10; score = the LOWEST. Write the score and the 3 biggest problems into review-log.json.
C. Pick the **6–8 worst** (lowest score; plays break ties; a game with score ≥ 8 and decent plays is never picked).

## 2. Remake them
- Builder agents, max 2 games each, one after the other. Give each the reviewer's problems plus all of build/CHARLIE.md.
- Fix it properly: the hook in the first 10 seconds, controls (one or two buttons, auto-target), juice, escalation with something new every level, surprises, real difficulty (Rule 11), better art and animation. If the core idea is weak, it's OK to rebuild the core around a better hook in the same theme — a remake, not a polish.
- Keep: slug, save keys (old saves must load; migrate if needed), the tutorial + How to play, the Support ♥ link, lib/gb.js first in <head> with data-gbctl working, board ids in lib/board.js (if a board's scoring changes a lot, use a new board id like slug:v2 and stop using the old one).
- `node build/check.js <slug>` must print OK. Then a reviewer (not the builder) re-scores it. It must beat its old score by at least 2 and reach 8+; otherwise send it back once more; if it's still not better, revert to the old file (git checkout) and note it.

## 3. Better names and descriptions
For each remade game and any other game with a weak or AI-sounding title or a dull blurb: give it a better title (CHARLIE.md Rule 12) and a punchy one-line blurb. Update build/meta.json (title, blurb; keep old titles in "keywords" so search still finds them), the game's <title> and its title-screen logo, regenerate the thumb (check.js does it), then `node build/build-catalog.js`. Max ~5 renames a week so the site doesn't feel unfamiliar.

## 4. Ship
Commit only the changed games/<slug>.html, thumbs/<slug>.jpg, build/meta.json, catalog.js and build/review-log.json; `git pull --rebase`; push to main. Never push a broken game. Then send Charlie ONE short plain message: which games got remade (new names if renamed) and one line each on what's better, plus the site link.
