# Gamebop online setup (Firebase Realtime Database + Anonymous Auth)

Accounts, the Players tab, leaderboards, play counts and multiplayer all use ONE free Firebase project.
Until it is set up, the site still works: accounts are saved in the browser, leaderboards show your own
best runs and every multiplayer game is played against bots.

## Setup (about 10 minutes, free "Spark" plan)
1. Go to https://console.firebase.google.com → **Add project** → name it `gamebop` (Google Analytics: off) → Create.
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save.**
   Then **Authentication → Settings → Authorized domains → Add domain** → `charlieshocked-a11y.github.io`.
3. **Build → Realtime Database → Create database** → pick a location (United States is fine) → **Start in locked mode** → Enable.
4. In the Realtime Database page open the **Rules** tab, delete everything, paste the JSON below, click **Publish**.
5. **Project settings (gear icon) → General → Your apps → Web (`</>`)** → nickname `gamebop` → Register app (no Hosting).
   Copy `apiKey`, `projectId` and `databaseURL` from the config it shows.
6. Paste them into `games/lib/gb.js`, on the line that says `var FIREBASE = {...}`:
   ```js
   var FIREBASE = { apiKey: 'AIza...', projectId: 'gamebop-1234', databaseURL: 'https://gamebop-1234-default-rtdb.firebaseio.com' };
   ```
   That is the only place the config goes. Commit and push; the site is online a minute later.
7. Optional but smart: **Google Cloud console → APIs & Services → Credentials → the "Browser key"** → Application
   restrictions → Websites → add `https://charlieshocked-a11y.github.io/*`. (The apiKey is public by design; the rules
   below are what protect the data.)

Notes
- The apiKey is fine to commit; it only identifies the project.
- Anonymous accounts never expire. To move an account to another phone/computer use **Profile → Get login code**.
- To read play counts (weekly tune-up): `<databaseURL>/stats.json` (public, counts only).
- To remove a rude username: Realtime Database → Data → `players/<uid>` and `names/<name>` → delete.

## Data layout
| Path | What | Who can write |
|---|---|---|
| `players/<uid>` | `{name, avatar, color, joined, lastSeen}` | only that user |
| `names/<lowercase name>` | `uid` (makes usernames unique) | claim when free; release your own |
| `boards/<board>/<uid>` | `{name, score, t}` best score per player | only that user; name must be their username |
| `bests/<uid>/<board>` | your best per board (for your profile + renames) | only that user |
| `stats/<slug>/plays`, `stats/<slug>~w<N>/plays` | play counters | anyone, +1 only |
| `rooms/<CODE>` | multiplayer room (see below) | create: anyone signed in; parts: see rules |
| `lobby/<game>/<CODE>` | `{t, n, max, c}` open quick-match rooms | the room's host |
| `transfer/<CODE8>` | `{rt, uid, exp}` login code, 10 minutes | the user making it; anyone may delete |

Room: `{game, host, creator, created, maxPlayers, open, status:'wait'|'play'|'done', seats:{uid:{name,avatar,color,bot,ready,t,j}}, state:{uid:any}, shared:any, events:{pushId:{type,data,from,t}}}`.
Rooms can only be read by someone who knows the code (there is no list of rooms, so private codes stay private).
Quick match finds public rooms through `lobby/<game>` (indexed on `t`) instead of querying `rooms`.

## Rules (paste into Realtime Database → Rules)
```json
{
  "rules": {
    "players": {
      ".read": true,
      ".indexOn": ["lastSeen"],
      "$uid": {
        ".write": "auth != null && auth.uid === $uid",
        ".validate": "newData.hasChildren(['name', 'avatar', 'color', 'joined', 'lastSeen'])",
        "name": { ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9_]{3,12}$/) && root.child('names').child(newData.val().toLowerCase()).val() === auth.uid" },
        "avatar": { ".validate": "newData.isString() && newData.val().matches(/^[a-z]{2,12}$/)" },
        "color": { ".validate": "newData.isString() && newData.val().matches(/^#[0-9a-f]{6}$/)" },
        "joined": { ".validate": "newData.isNumber() && ((data.exists() && newData.val() === data.val()) || (!data.exists() && newData.val() <= now))" },
        "lastSeen": { ".validate": "newData.isNumber() && newData.val() <= now" },
        "$other": { ".validate": false }
      }
    },
    "names": {
      "$name": {
        ".read": true,
        ".write": "auth != null && ((!data.exists() && newData.val() === auth.uid) || (data.val() === auth.uid && (!newData.exists() || newData.val() === auth.uid)))",
        ".validate": "newData.isString() && $name.matches(/^[a-z0-9_]{3,12}$/)"
      }
    },
    "boards": {
      "$board": {
        ".read": true,
        ".indexOn": ["score"],
        "$uid": {
          ".write": "auth != null && auth.uid === $uid",
          ".validate": "$board.matches(/^[a-z0-9-]{1,60}$/) && newData.hasChildren(['name', 'score', 't']) && newData.child('name').val() === root.child('players').child($uid).child('name').val()",
          "name": { ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9_]{3,12}$/)" },
          "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000000" },
          "t": { ".validate": "newData.isNumber() && newData.val() <= now" },
          "$other": { ".validate": false }
        }
      }
    },
    "bests": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid",
        "$board": { ".validate": "$board.matches(/^[a-z0-9-]{1,60}$/) && newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000000" }
      }
    },
    "stats": {
      ".read": true,
      "$key": {
        ".validate": "$key.matches(/^[a-z0-9-]{1,60}(~w[0-9]{1,6})?$/)",
        "plays": {
          ".write": true,
          ".validate": "newData.isNumber() && ((data.exists() && newData.val() === data.val() + 1) || (!data.exists() && newData.val() === 1))"
        },
        "$other": { ".validate": false }
      }
    },
    "rooms": {
      "$code": {
        ".read": "auth != null",
        ".write": "auth != null && (((!data.exists() || data.child('created').val() < now - 7200000) && newData.child('host').val() === auth.uid && newData.child('creator').val() === auth.uid) || (!newData.exists() && (data.child('creator').val() === auth.uid || data.child('host').val() === auth.uid || data.child('created').val() < now - 7200000)))",
        ".validate": "$code.matches(/^[A-HJKMNP-Z]{5}$/) && newData.hasChildren(['game', 'host', 'creator', 'created', 'maxPlayers', 'status'])",
        "game": { ".validate": "newData.isString() && newData.val().matches(/^[a-z0-9-]{1,40}$/)" },
        "host": {
          ".write": "auth != null && newData.val() === auth.uid && data.parent().child('seats').child(auth.uid).exists() && data.parent().child('seats').child(auth.uid).child('bot').val() === false && (data.val() === auth.uid || !data.parent().child('seats').child(data.val()).exists() || data.parent().child('seats').child(data.val()).child('t').val() < now - 10000)",
          ".validate": "newData.isString()"
        },
        "creator": { ".validate": "newData.isString()" },
        "created": { ".validate": "newData.isNumber() && newData.val() <= now" },
        "maxPlayers": { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 8" },
        "open": {
          ".write": "auth != null && data.parent().child('host').val() === auth.uid",
          ".validate": "newData.isBoolean()"
        },
        "status": {
          ".write": "auth != null && data.parent().child('host').val() === auth.uid",
          ".validate": "newData.isString() && newData.val().matches(/^(wait|play|done)$/)"
        },
        "seats": {
          "$sid": {
            ".write": "auth != null && data.parent().parent().exists() && (auth.uid === $sid || (data.parent().parent().child('host').val() === auth.uid && (newData.child('bot').val() === true || data.child('bot').val() === true || !newData.exists())))",
            ".validate": "newData.hasChildren(['name', 'avatar', 'color', 'bot', 't']) && ((newData.child('bot').val() === false && ($sid === auth.uid || data.exists())) || (newData.child('bot').val() === true && $sid.matches(/^bot_[a-z0-9]{4,12}$/)))",
            "name": { ".validate": "newData.isString() && ((newData.parent().child('bot').val() === true && newData.val().matches(/^[A-Za-z0-9 ]{1,20}$/)) || newData.val().matches(/^[A-Za-z0-9_]{3,12}$/))" },
            "avatar": { ".validate": "newData.isString() && newData.val().matches(/^[a-z]{2,12}$/)" },
            "color": { ".validate": "newData.isString() && newData.val().matches(/^#[0-9a-f]{6}$/)" },
            "bot": { ".validate": "newData.isBoolean()" },
            "ready": { ".validate": "newData.isBoolean()" },
            "t": { ".validate": "newData.isNumber() && newData.val() <= now" },
            "j": { ".validate": "newData.isNumber() && newData.val() <= now" },
            "$other": { ".validate": false }
          }
        },
        "state": {
          "$sid": {
            ".write": "auth != null && (auth.uid === $sid || (data.parent().parent().child('host').val() === auth.uid && (data.parent().parent().child('seats').child($sid).child('bot').val() === true || data.parent().parent().child('seats').child($sid).child('t').val() < now - 10000 || !newData.exists())))"
          }
        },
        "shared": {
          ".write": "auth != null && data.parent().child('host').val() === auth.uid"
        },
        "events": {
          "$eid": {
            ".write": "auth != null && !data.exists() && data.parent().parent().child('seats').child(auth.uid).exists()",
            ".validate": "newData.hasChildren(['type', 'from', 't']) && (newData.child('from').val() === auth.uid || (data.parent().parent().child('host').val() === auth.uid && (data.parent().parent().child('seats').child(newData.child('from').val()).child('bot').val() === true || data.parent().parent().child('seats').child(newData.child('from').val()).child('t').val() < now - 10000)))",
            "type": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 32" },
            "from": { ".validate": "newData.isString()" },
            "t": { ".validate": "newData.isNumber() && newData.val() <= now" },
            "data": { ".validate": true },
            "$other": { ".validate": false }
          }
        },
        "$other": { ".validate": false }
      }
    },
    "lobby": {
      "$game": {
        ".read": "auth != null",
        ".indexOn": ["t"],
        "$code": {
          ".write": "auth != null && (root.child('rooms').child($code).child('host').val() === auth.uid || (!newData.exists() && (!root.child('rooms').child($code).exists() || data.child('t').val() < now - 30000)))",
          ".validate": "newData.hasChildren(['t', 'n', 'max', 'c']) && newData.child('t').isNumber() && newData.child('t').val() <= now && newData.child('n').isNumber() && newData.child('max').isNumber() && newData.child('c').isNumber()"
        }
      }
    },
    "transfer": {
      "$code": {
        ".read": "data.child('exp').val() > now",
        ".write": "(auth != null && !data.exists() && newData.child('uid').val() === auth.uid) || (data.exists() && !newData.exists())",
        ".validate": "$code.matches(/^[A-HJKMNP-Z2-9]{8}$/) && newData.hasChildren(['rt', 'uid', 'exp']) && newData.child('rt').isString() && newData.child('rt').val().length < 4000 && newData.child('exp').isNumber() && newData.child('exp').val() > now && newData.child('exp').val() <= now + 900000"
      }
    }
  }
}
```

What the rules enforce
- Signed-in (anonymous) users can only write their own `players/<uid>`, `boards/*/<uid>`, `bests/<uid>`, room seat and room state.
  The room host may also add/remove bot seats and write state/events for bots and for players who dropped (silent 10 s+).
- Usernames: 3–12 letters/numbers/_, unique (`names/<lowercase>` can be claimed only when free), and a
  player's `name` must be the name they own. Leaderboard names must equal the player's username. Scores 0–1e9.
- Play counters can only go up by exactly 1.
- Rooms are readable by signed-in users who know the code; stale rooms (2 h+) can be overwritten or deleted by anyone.
- Host migration: a seated human may take `host` only when the current host's seat is gone or silent for 10 s.
