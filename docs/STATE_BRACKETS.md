# State playoff brackets (KSHSAA)

User, November 18, 2026: "What unique things should we add now?", then "Start with 2 then work your way through the rest" (2 = state playoff brackets with the app's schools highlighted, scores filled in as they're posted, and the path to the title game).

## Source

KSHSAA's own site (`kshsaa.org/react`) reads its brackets from its public API, `kshsaa-api.kshsaa.org` (no robots.txt; `www.kshsaa.org/robots.txt` allows all with a 30 s crawl delay, and the app reads only the API):

| Read | What it gives |
| --- | --- |
| `/playoff-sites/state-sites/State/<Activity>/<ActivityID>` | The season's state sites, one per class (`ID` = the class's bracket id, `Class`, `GameDate`, `SiteName`). Football is `Football/1`; boys' soccer `Soccer/12`. |
| `/Brackets/GameInfo/GetByWeekID/<ID>` | The class's bracket (about 40 KB): every game in `GameData[0].BracketsGameScores` with `PlayoffLevel` (football: Week 9, Regional, Sectional, Sub-State, State), `Round` (soccer's state: 1 semifinals, 2 final), `BracketOrder`, `ThirdPlaceGame`, `Team1Info.School`/`Team2Info.School`, seeds (`3W`), scores, PKs, `StatusOfGame` (final when it equals the payload's `FinalGameStatus`: 7 football, 51 soccer), `ExtraStatus` (OT, PKs), `GameInfo` ("Fri, 11/20 @ Derby", "Sat, 11/28 @ Butler CC - 1:00 pm"). `PlayoffLevelDates` dates each level. |

The page link is `https://www.kshsaa.org/react/bracket/<ID>`. Team1 is the host (football's higher seed); a state game is at a neutral site.

## What the app does

`src/state-brackets.mjs` (parser), `stateBracketFor`/`withStateBracket` in `src/index.js`, `bracketBlock` in `public/index.html`, `tests/state-brackets.mjs` (fixtures of Nov 18 in `tests/fixtures/state-brackets/`).

- A Kansas high school's Football (and boys' Soccer) feed reads the state sites and every class bracket (kept 10 minutes, shared), its own class first, and finds the school by its own catalog name, short name or alias, exactly ("Manhattan High School" = "Manhattan HS"; "Blue Valley" is never "Overland Park-Blue Valley HS").
- The bracket is shown from a week before its first round until 60 days after its state game, and only for a school in it.
- **Playoffs** block (before Standings): the class's title, the team's status (Alive · next round, Out in the round, State champions, third/fourth place), its path game by game (round, date, opponent and seed, W/L and score, the next game's site), the rounds still ahead, the champion, and **Show full bracket**: a tab per round (the current round first), every game with seeds and scores, the school's own game outlined.
- **Schedule:** the school's bracket games join its schedule. A final the schedule has without a score takes KSHSAA's (`score_source` "KSHSAA (official bracket)"); a coming round named only by its kind takes its opponent; a round the schedule lacks is added once both teams are known (Manhattan's Nov 20 Sub-State at Derby was on no other source on Nov 18). A day the schedule already has another game on keeps that game. Rounds never reached are never listed.
- Nov 18, 2026: 89 of the catalog's 108 football high schools are in a 2026 bracket; the other 19 are in none (did not qualify, or play in no KSHSAA bracket: St. Mary's Academy, Christ Prep).

## Not yet

- Volleyball's state is pool play (no bracket games in the API); basketball (March), baseball, softball and girls' soccer (May) to be checked against the reader when their brackets are posted. Soccer's earlier rounds are on separate regional and sub-state brackets (only the state bracket is read).
- KSHSAA posts a final when the host enters it; no live scores (other statuses than scheduled and final have not been seen).
- The Manhattan reference (`tests/hs-reference.mjs`, sources of Nov 7) has no KSHSAA reads: they answer 404 in its replay until it is re-recorded.
