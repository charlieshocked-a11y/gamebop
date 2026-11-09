# Gamebop weekly drop — runbook

The live site is GitHub Pages: https://charlieshocked-a11y.github.io/gamebop/ (repo charlieshocked-a11y/gamebop, branch main, served from the repo root).
Each week: invent 30 NEW original game prompts, build 30 games to build/SPEC.md, add them to the repo, push. Pages redeploys automatically.

1. Attach the repo (add_repo charlieshocked-a11y/gamebop, access "push") and clone it to /home/claude/gamebop-site.
2. Write 30 new prompts. Rules: no title or concept already in build/meta.json (check titles AND prompts); mix of categories (Action, Arcade, Puzzle, Strategy, Racing, Sports, Typing, Idle, Casual, Adventure, Music, Word, Platformer) with at least 2 HARD typing games; original names, no existing branded games or characters. Each prompt names concrete mechanics, a progression system (levels/upgrades/unlocks) and save data. Charlie likes deep, long games with saveable progress, hates lots of reading, wants typing games hard.
3. Build with 6 parallel builder agents, 5 games each. Brief: read build/SPEC.md, write only their 5 files to games/<slug>.html, build one at a time, test each with `node build/check.js <slug>` until OK, look at the screenshots (thumbs/<slug>.jpg, build/shots/), play it with their own Playwright script to confirm saves + Continue work, reply with the spec's JSON metadata array. (SPEC.md paths say /home/claude/gamebop/... — use /home/claude/gamebop-site/ and build/ instead of tools/.)
4. Verify yourself: run check.js on all 30, look at every thumbnail. Fix or drop anything broken.
5. Append metadata (with "added": today's date YYYY-MM-DD and "prompt") to build/meta.json, run `node build/build-catalog.js`.
6. Commit games/, thumbs/, catalog.js, build/meta.json (not build/shots or test scripts) and push to main. Check the site loads a minute later.
7. Send Charlie one short message: how many games were added, their names, and the site link.
