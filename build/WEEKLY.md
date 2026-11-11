# Gamebop weekly drop — runbook (updated 2026-11-11)

The live site is GitHub Pages: https://charlieshocked-a11y.github.io/gamebop/ (repo charlieshocked-a11y/gamebop, branch main, served from the repo root).
Charlie's rule (2026-11-11): keep the same number of games each week, but quality must NOT drop because of quantity. Every single game must be fun, hooky and simple to control. Read build/CHARLIE.md and the "⚠ READ FIRST" section of build/SPEC.md before anything else, and pass build/CHARLIE.md to every builder and reviewer.

1. Attach the repo (add_repo charlieshocked-a11y/gamebop, access "push") and clone it to /home/claude/gamebop-site.
2. Write the prompts. Each prompt is built around ONE strong hook, the core action that's fun on its own. Say in one line how it is controlled (one or two buttons, auto-targeting), how levels escalate so you want to see the next one, and which surprise-and-delight moments it has. Progression and saves are mentioned briefly, and NO long feature lists (no "6 worlds, 6 classes, 40 species…"). Aim for 6-10 sentences. Don't reuse any title or concept already in build/meta.json. Mix the categories (at least 2 HARD typing games), use original names, and no branded games or characters.
3. Build: at most 2 games per builder agent, built one after the other (20 agents for 40 games, run in waves of about 10). Each game gets 3 rounds of build → play it for real with Playwright → improve. Briefing: read build/SPEC.md and write only your own games/<slug>.html files. `node build/check.js <slug>` must print OK. Look at the screenshots and recorded frames, and confirm with your own Playwright script that the tutorial (Skip and replay), the Support link, saves and Continue work. Reply with the spec's JSON metadata.
4. Fun review gate: one reviewer agent per 5 games, never the game's own builder, follows SPEC.md "Fun review gate". Games under 8 go back to their builder (SendMessage) with the reviewer's fixes, for up to 3 rounds. Anything still under 7 is dropped and isn't published.
5. Verify yourself: run check.js on every game and look at every thumbnail and play shot.
6. Append the metadata (with "added" set to today's date YYYY-MM-DD, plus "prompt" and "keywords") to build/meta.json, then run `node build/build-catalog.js`. Keep Rude Cat as the featured game.
7. Commit games/, thumbs/, catalog.js and build/meta.json (not build/shots or test scripts), then `git pull --rebase` and push to main. Check that the Pages deploy succeeds.
8. Send Charlie one short message: how many games were added, their names, and the site link.
