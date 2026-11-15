# Open work (written 2026-11-14 by the Charlie session; next session: finish these, then tick them off here)

1. ✅ DONE 2026-11-14 (all 58 games). **Shared helpers in every game** (build/SHARED.md). Every games/*.html must load `lib/gb.js` first in <head>; games with a competitive score must also use `lib/board.js` (submit at run end + 🏆 button on menu and game over); touch controls get data-gbctl. Check with: `grep -L 'lib/gb.js' games/*.html`.
   - rude-cat: ONLY the gb.js script tag (Charlie replaces this file himself).
2. **Leaderboards online**: when Charlie pastes his Firebase web config, put apiKey + projectId into games/lib/board.js (FIREBASE = {...}). Firestore rules to give him (Console → Firestore → Rules):
   ```
   rules_version = '2';
   service cloud.firestore { match /databases/{db}/documents {
     match /boards/{board}/scores/{pid} {
       allow read: if true;
       allow create, update: if pid.matches('^[a-z0-9]{16}$')
         && request.resource.data.keys().hasOnly(['name','score','t'])
         && request.resource.data.name is string && request.resource.data.name.matches('^[A-Z0-9]{2,8}$')
         && request.resource.data.score is number && request.resource.data.score >= 0 && request.resource.data.score < 1000000000;
     } } }
   ```
3. **Fun pass on every game** — wave 1 DONE 2026-11-14: sky-hopper, neon-serpent, bounce-brigade, boing-voyage, canopy-swing, knuckle-comet, moto-hill, hoop-shot, bumpaloo, dash-ninja. Wave 2 started: ember-drift, asteroid-miner, orbit-defense, zombie-fort, tank-duel, kickflip-alley, slingstar, springflip-circus, pinquake, wreckaroo. Still to do after that: everything else (check git log for 'Fun pass'). (Charlie 2026-11-14: "please make the games more fun"). Only after item 1 is on main. Per game: a reviewer (not the fixer) plays it with Playwright following build/CHARLIE.md + SPEC.md "Fun review gate", lists the 3 biggest fun problems (slow hook, weak juice, too easy, samey levels, confusing controls), then a builder fixes them, max ~5 games per builder agent. Start with any games Charlie names as most boring. Keep saves, tutorial, Support link, gb.js and leaderboards working. Commit and push in batches with check.js OK.
4. Tell Charlie in one short message what got done (with the site link).
