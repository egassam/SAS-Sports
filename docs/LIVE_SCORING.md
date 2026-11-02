# Live scoring by schools (SAS Scorer)

Started October 14, 2026 (user: "an interface that is for the highschools that would 1 update their score boards and 2 broadcast out live results to the receiving app at the same time"). This is a test version on the branch preview; it is not in production yet.

## The three screens

| Screen | Address | Who |
| --- | --- | --- |
| Scorer app | `/score/` | School scorekeepers (sign-in: school, school code, username, password) |
| TV scoreboard | `/scoreboard/?game=<id>` or `/scoreboard/?school=<id>` | The computer or streaming stick that drives a TV or video board. School mode follows whichever game is live |
| Stream overlay | `/overlay/?school=<id>` or `/overlay/?game=<id>` | A transparent score bug for live streams: a Browser Source (1920×1080) in OBS, vMix, Streamlabs or Boxcast. Options: `position=bottom-left` (also bottom-right, top-left, top-right, bottom-center), `scale=0.5`–`2`, `hide_when_idle=0` to keep the final up. Added Oct 14 (4.82.0) |
| Public app | `/` (school selected) | Everyone: a "Live from the field" card above the official feed |

One tap in the scorer app saves the game. The TV and the app read the new score within about 1 second (TV) and 3 seconds (app).

## Design

- `src/live-scoring/sports.mjs`: the rules per sport (Baseball and Softball: count, outs, bases, line score, R/H/E; Soccer: goals, running clock, halves, OT, PKs).
- **Every other sport (October 21; user: "prepare all sports for live results")**, each sport also describing its display (`view`) and the scorer's buttons (`controls`), so the scorer app, TV, overlay and public card draw it with no sport-specific page code:
  - **Football:** touchdown, PAT, 2-point try, field goal, safety by side; quarters with a countdown clock (12 minutes; middle school sets its own); ball, down and distance; timeouts (3 per half, 1 per overtime); untimed Kansas overtime ("Final/OT").
  - **Basketball:** 1, 2 and 3 points; 8-minute quarters (6 in middle school), 4-minute overtimes; team fouls per quarter with the bonus from the fifth; possession arrow; timeouts.
  - **Volleyball:** rally points; a set ends at 25 by two (the deciding set at its own target: 25 in a best of 3, 15 in a best of 5); serving side; timeouts per set. The scorer posts the final.
  - **Wrestling and Tennis:** a dual (each bout's result gives team points: fall, forfeit, disqualification 6, tech fall 5, major 4, decision 3, team point deductions; each tennis flight's winner and score) or a tournament (a meet), chosen when the game is made.
  - **Meets:** Cross Country and Golf (low wins), Track & Field, Swimming & Diving, Bowling, and wrestling or tennis tournaments: team standings by points, strokes or pins (ties share a place), individual results as they post, a round or status line. The game's opponent field holds the meet's name and the school is the host side.
- `src/live-scoring/api.mjs`: `/api/score/*`. Storage is D1 `sas-sports-live-scoring` (binding `SCORE_DB`). The tables are created on first use.
- **Why not a Durable Object (WebSockets)?** Cloudflare does not build preview URLs for a Worker that implements one, and every school gate needs previews. Screens poll instead. Moving to push later means a separate Worker for the Durable Object.
- **Access:** only people the school allows. A school admin adds scorekeepers in `/score/`. The school code and passwords are stored only as PBKDF2 hashes, sessions are stored hashed, and 8 failed sign-ins lock that user (or IP) for 15 minutes. Each school sees and edits only its own games.
- Scorer taps queue on the device with no signal and retry. Each tap has an id, so a retry never counts twice. Undo steps back one action at a time.
- Branch previews and production share the same database.

## Turning a school on

`npm run score-setup -- --school=<id> --name="<name>"` prints the SQL plus a generated school code and admin password. Run the SQL against D1 (`npx wrangler d1 execute sas-sports-live-scoring --remote --file=...`, or the Cloudflare D1 console). Manhattan High (`manhattan-ks`) was set up for the owner's testing on October 14. Anthony Middle School (`anthony-ms-ks`) was set up on October 21 (user: "Add Anthony to live scorer"; the SQL applied to D1 through the Cloudflare connector; admin `owner`; the school code and password went to the user privately, never into the repository). Scope for now (user, October 21): "just for Riley county schools Manhattan high School/ Anthony Middle School".

## Open items

- Traditional LED scoreboards (Daktronics, Fair-Play, Nevco) need a hardware bridge that reads the console's data output.
- Every sport the Manhattan schools play can be scored (October 21). Cheer, dance and powerlifting are not scored.
- Finals do not yet flow into the official results feed (they show on the live card for 6 hours).
- The TV colors are set only for Manhattan.
