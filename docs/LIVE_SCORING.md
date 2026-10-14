# Live scoring by schools (SAS Scorer)

Started October 14, 2026 (user: "an interface that is for the highschools that would 1 update their score boards and 2 broadcast out live results to the receiving app at the same time"). This is a test version on the branch preview; it is not in production yet.

## The three screens

| Screen | Address | Who |
| --- | --- | --- |
| Scorer app | `/score/` | School scorekeepers (sign-in: school, school code, username, password) |
| TV scoreboard | `/scoreboard/?game=<id>` or `/scoreboard/?school=<id>` | The computer or streaming stick that drives a TV or video board. School mode follows whichever game is live |
| Public app | `/` (school selected) | Everyone: a "Live from the field" card above the official feed |

One tap in the scorer app saves the game. The TV and the app read the new score within about 1 second (TV) and 3 seconds (app).

## Design

- `src/live-scoring/sports.mjs`: the rules per sport (Baseball and Softball: count, outs, bases, line score, R/H/E; Soccer: goals, running clock, halves, OT, PKs).
- `src/live-scoring/api.mjs`: `/api/score/*`. Storage is D1 `sas-sports-live-scoring` (binding `SCORE_DB`). The tables are created on first use.
- **Why not a Durable Object (WebSockets)?** Cloudflare does not build preview URLs for a Worker that implements one, and every school gate needs previews. Screens poll instead. Moving to push later means a separate Worker for the Durable Object.
- **Access:** only people the school allows. A school admin adds scorekeepers in `/score/`. The school code and passwords are stored only as PBKDF2 hashes, sessions are stored hashed, and 8 failed sign-ins lock that user (or IP) for 15 minutes. Each school sees and edits only its own games.
- Scorer taps queue on the device with no signal and retry. Each tap has an id, so a retry never counts twice. Undo steps back one action at a time.
- Branch previews and production share the same database.

## Turning a school on

`npm run score-setup -- --school=<id> --name="<name>"` prints the SQL plus a generated school code and admin password. Run the SQL against D1 (`npx wrangler d1 execute sas-sports-live-scoring --remote --file=...`, or the Cloudflare D1 console). Manhattan High (`manhattan-ks`) was set up for the owner's testing on October 14.

## Open items

- Traditional LED scoreboards (Daktronics, Fair-Play, Nevco) need a hardware bridge that reads the console's data output.
- More sports: tennis, golf, track & field, volleyball, basketball.
- Finals do not yet flow into the official results feed (they show on the live card for 6 hours).
- The TV colors are set only for Manhattan.
