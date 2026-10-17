# Pro sports module

Added October 15, 2026 (user: "Let's add some professional sports. Same three menu style, first menu is sports like football, auto racing, golf, etc... second menu if the first menu is football the second menu could be leagues and third menu could be teams. Let's add football, NFL, Pittsburgh Steelers and Kansas City Chiefs, and auto racing, NASCAR and races.").

Code: `src/pro-sports.mjs` (readers), `fetchPro` in `src/index.js`, catalog entries with `level: "pro"` in `src/schools.json`. Test: `tests/pro-sports-module.mjs` (real feeds of Oct 15 in `tests/fixtures/pro-sports/`).

## Menus

The level switch now reads **High School · College · Pro** (the order the handoff asked for once pro teams came). On Pro the three boxes are:

| Box | Field | Values |
| --- | --- | --- |
| Sport | `pro_sport` | Football, Soccer, Auto Racing |
| League | `league` | NFL, MLS, NASCAR, IMSA, Formula 1 |
| Team (Races for Auto Racing) | the entry | All 32 NFL teams, grouped by division (AFC East … NFC West); all 30 MLS clubs, grouped by conference; NASCAR Cup Series; IMSA WeatherTech SportsCar Championship and IMSA Michelin Pilot Challenge; Formula 1 World Championship |

**The whole NFL (October 16, 2026; user: "Add the entire NFL. Group them by division and update all live cards to show all the data").** All 32 teams are catalog entries with `conference` = division; the Team box always groups NFL teams under their division (`sectionOf`), in the catalog's order (AFC East, North, South, West, then NFC). Team colors come from ESPN's team list; the Raiders use Pacific time (`Nevada` in `STATE_TIME_ZONES`). `PRO_TEAMS` names each team's ESPN abbreviation, its three division rivals (the header's division record) and its official schedule page.

A new sport, league or team is a catalog entry (`level`, `pro_sport`, `league`, `conference` = division), a `PRO_TEAMS` entry, `sponsored-sports.json`, and the page's `SCHOOL_SPORTS`, `TEAM_THEMES` and `BOOTSTRAP_SCHOOLS`.

## Sources

| Entry | Schedule and results | Expanded final | Live |
| --- | --- | --- | --- |
| Steelers, Chiefs | ESPN team schedule `site.api.espn.com/.../football/nfl/teams/<pit|kc>/schedule` (postseason `?seasontype=3` read in Jan-Feb only) | ESPN game summary: line score, halftime, team leaders, total yards, turnovers, possession, first downs, every scoring play, ESPN recap link | The schedule's in-progress state (clock "5:12 - 3rd", score) |
| NASCAR Cup Series | NASCAR's own feeds `cf.nascar.com/cacher/<year>/1/race_list_basic.json` (every race, winner id, laps, cautions, lead changes) and the standings `racinginsights-points-feed.json` (winner names, car numbers) | The race's `weekend-feed.json`: full finishing order (car, team, status, laps led), winner's start, most laps led, stage winners, speed, race time, field size | `cf.nascar.com/live/feeds/live-feed.json`, read only on a race day: lap, caution/red flag, leader, top 10 |

Rules: K-State's — a past game or race without a published result is not listed; postponed/cancelled games are not listed. Header records: NFL overall record plus the division record (division opponents in the regular season: "Record 3-2 · AFC North 1-1"); playoff games are not in the record. Non-points NASCAR races (Clash, Duels, All-Star) are labeled "(non-points)". No featured athletes for pro entries (the three-athlete rule is for school rosters). ESPN team schedules are one read per refresh at most every 2 minutes (shared source cache), keeping ESPN volume low after the Oct 10 refusals.

## Formatting (4.96.0, user, October 15)

- **Next game / next race** leads the page (All view, nothing live): title, time, track for a race, TV channel (`broadcast`), and a countdown in days/hours/minutes. It is not repeated in the upcoming list.
- **Race finals use the cross-country layout** (4.97.0; user: "NASCAR lay out should be similar to the cross country layout"). There is one row per driver, for example "Chase Briscoe (#19) · 1st · Joe Gibbs Racing · Toyota · 62 laps led". The car make was added in 4.97.2 (user: "put the type of car manufacturer in the results"). The card shows the top three and the expanded view shows the whole field. Every final reads its own weekend feed, kept 6 hours. If a read fails, the card shows the winner from the standings. The next-game spotlight is for football only.
- **No logos** (user: "Leave the logos out"). NFL team logos and NASCAR car-number art are the leagues' and teams' trademarks or artwork, and they are not licensed here. Teams are identified by name and team colors, as schools are. A logo license (data provider or league) would be needed first. Legal note given to the user: scores and schedules are facts (*NBA v. Motorola*). ESPN's unofficial feed is used against its commercial-use terms, as the college live scores already are. Have a lawyer review the sources and the "SAS" name before a commercial launch.

## Live cards (4.98.0, user, October 16: "update all live cards to show all the data")

- **NFL:** a game under way (or past its kickoff and not yet final on the team schedule) also reads ESPN's league scoreboard for that day (15 s, shared by all 32 teams) and the game summary (30 s). The live card shows the score board with the ball beside the team that has it, down and distance and red zone, then the score by quarter with both records, timeouts, win probability, TV, stadium, the last play and the drive, the game leaders, and folded "Team stats" (total, passing and rushing yards, first downs, 3rd/4th down, red zone, turnovers, sacks, penalties, time of possession) and "Scoring plays". A game that ends between team-schedule reads turns Final from the scoreboard. Shapes were read from Seattle at Denver live on Oct 15 (`tests/fixtures/pro-sports/live-*`).
- **College live boards** (every ESPN board the app reads) pass the same details through `espnLiveDetails` (score by period, records, last play, drive, timeouts, win probability, leaders, TV, venue) and the join onto the official card keeps them. Team stats and scoring plays are NFL only (they need a summary read per game; college volume stays as it was after the Oct 10 refusals).
- **NASCAR:** the live card shows the stage, laps to go, cautions, lead changes, and every car (top ten, the rest folded) with its gap to the leader (or laps down), make, laps led and last-lap speed, and "Pit road" when off track.
- Folded parts stay open across the 15 s refresh and do not open the event window.

## Expanded NFL final (4.98.1, user, October 16: "can we clean up the card please")

The event window for a final reads: Full Team Results (Result, Week only), **Score by Quarter** (a table with each quarter, OT and the total; the winner's row brighter), Event Highlights, **Team Stats** (two columns, the same eleven rows as the live card), and **Scoring Plays** grouped under 1st Quarter … Overtime, with each play's team, the running score from the team's side, and the clock. Scoring plays were label/value rows that wrapped "Scoring" letter by letter on a phone, and overtime read "Q5". Saved expanded views of pro finals are rebuilt once (`|box` in the store key).

## Race results window (4.98.3, user, October 16: "NASCAR full results is still not showing car manufacturer and the layout is messy")

The phone showed a race window kept on the device from before 4.97.2. The rows read "1st Chase Briscoe | #19 · Joe Gibbs Racing · 62 laps led", with no make. Finals kept on the device now use `sas-final:v2:`, and the old copies are dropped, so every final is read again. The window now lists one row per car: the finish, the driver with the car number, a make tag (Toyota, Ford, Chevrolet), the team, and laps led. A car that fell out shows its status (Accident, Engine) in red. The podium rows are brighter. Source: `nascarFinishTable` (`race_table` on the event). The server's saved expanded views are rebuilt once (`|box2`).

## IMSA (4.99.1, user, October 16: "Let's add IMSA racing series under auto racing")

Two entries under Auto Racing → IMSA: `imsa-weathertech` (WeatherTech SportsCar Championship: GTP, LMP2, GTD PRO, GTD) and `imsa-pilot-challenge` (Michelin Pilot Challenge: GS, TCR). Code: the IMSA part of `src/pro-sports.mjs`, `fetchImsa` in `src/index.js`. Test: `tests/imsa-module.mjs` (real folders and classifications of Oct 16 in `tests/fixtures/pro-sports/imsa-*`).

- **Source: IMSA's official results**, `results.imsa.com`, which redirects to its timing provider's host `imsa.results.alkamelcloud.com`. The host serves plain folder listings: `Results/26_2026/` (events) → `21_Road Atlanta/` → `01_IMSA WeatherTech SportsCar Championship/` → `202610031210_Race/` (the track's local start) → `03_Results_Race_Official.JSON` (or Provisional, Unofficial, an `_Amended` copy first). An endurance race keeps its classification in its last `NN_Hour N` folder, with hourly standings (`04_Results by Hour_Race_Unofficial.JSON`) in each. robots.txt is empty. The older host `imsa.alkamelsystems.com` stops at April 2024.
- **Coming races** come from IMSA's 2027 calendars, announced on March 19, 2026, in `IMSA_CALENDARS` (weekend dates, race name where IMSA named it, length, classes). The card reads the weekend ("Jan 28-31"), Length, Classes and the Track. A race IMSA has not named takes the track as its title. A season's event folder appears only once its weekend starts. imsa.com answers automated reads with a Cloudflare bot challenge, which the app does not get around. Text read from the announcement as reprinted by midohio.com and speedsport.com. When a weekend's folder appears, its race replaces the calendar entry (it then carries the real start time).
- **Card:** one row per class winner (class tag, drivers, car number, team and car, "7th overall"). **Race window:** the whole field under class headings, with each car's class finish, make, team and car, and its overall finish and laps, or "Did not finish". The lines give the overall winner and margin, each class winner, and the fastest lap. Numbers: laps, race time, cars, classes, and the track (Wet).
- **While a race runs:** the hourly standings of an endurance race give the live card, "After Hour 3", with the leader and every car's class place and gap. A sprint race has no standings until its classification. It reads "Under way" for up to 26 hours after its start. A past race with no classification is not listed.
- Reads: one season listing, each event listing, then the championship, race and hour folders, and the classification. Folders more than 8 days old are kept 6 hours, and a race weekend's folders 2 minutes. Official classifications are kept 6 hours.

## Formula 1 (4.106.0, user, October 16: "Add formula one under auto racing")

One entry under Auto Racing → Formula 1: `formula-1` (Formula 1 World Championship), every Grand Prix and Sprint. Code: the Formula 1 part of `src/pro-sports.mjs`, `fetchF1` in `src/index.js`. Test: `tests/f1-module.mjs` (formula1.com pages and Jolpica/ESPN payloads of Oct 16 in `tests/fixtures/pro-sports/f1-*`, the pages trimmed to heading and table).

- **Results: formula1.com's official results pages** (robots.txt allows them). The season page (`/en/results/2026/races`) lists each Grand Prix run with its winner and link; the race's `race-result` page (and `sprint-results`) holds the classification: position (or NC), number, driver, team, laps, time or gap ("+7.335s", "+1 lap") or DNF/DNS/DSQ, points. A season row is matched to a calendar round by date, a day either way (Las Vegas starts Saturday night local, Sunday UTC).
- **Calendar: the Jolpica F1 database** (`api.jolpi.ca/ergast/f1/2026.json`, the open successor of Ergast): each round's race and sprint start in UTC, circuit and place. formula1.com's schedule shows times only in the browser. The entry is in Eastern time (`SCHOOL_TIME_ZONES`), as ESPN and US broadcasts list F1.
- **A race formula1.com has not listed yet** (its first hours; a sprint before Sunday, since the race link appears only with the Grand Prix result) takes Jolpica's results (`/2026/<round>/results.json`, `sprint.json`), read only in the week after the start. Jolpica names drivers in full ("Andrea Kimi Antonelli"); formula1.com's page replaces them once listed.
- **Card:** the top three in the race window's layout: finish, driver and number, the team as the tag, the time or gap, points. **Race window:** the whole field (DNF in red), the winner and margin, where the winner started and the pole sitter (`starting-grid`), the fastest lap (`fastest-laps`), who did not finish; numbers: laps, race time, cars, classified, fastest lap. Sprints have no grid or fastest-lap lines.
- **Coming races:** Circuit, Location, "Round 18 of 23" ("· Sprint weekend" when it has one).
- **Live:** from a session's start until its result (4 hours at most), ESPN's F1 board (`racing/f1/scoreboard?dates=<Eastern day>`, 30 s, only then) gives the lap and running order (`Race`, or `SR` for a sprint); each driver's team and number come from the latest classification. ESPN publishes no gaps. A past race with no result is not listed.
- Reads per build: the calendar and season page (10 min), one classification per final (6 hours), Jolpica only for unlisted races.

## MLS (4.107.0, user, October 17: "Let's add soccer to the pro section")

Pro → Soccer → MLS → all 30 clubs, under Eastern Conference and Western Conference (catalog `conference`; the Team box groups MLS like the NFL). Code: the `espn-team` reader shared with the NFL (`espnTeamGames`, `applyEspnLive`) plus the soccer parts of `src/pro-sports.mjs` (`espnSoccerHighlights`, `soccerGoals`, `SOCCER_STATS`). Test: `tests/mls-module.mjs` (ESPN payloads of Oct 17 in `tests/fixtures/pro-sports/mls-*`).

- **Source: ESPN's team schedule** `site.api.espn.com/.../soccer/usa.1/teams/<numeric id>/schedule` (results; the abbreviation answers 400) and the same with `?fixture=true` (coming matches). Playoff rounds come in the same lists as their own season types ("Eastern Conference Playoffs - Round One", "MLS Cup"): labeled as the round and kept out of the record. Each club's official schedule page (`<club site>/schedule/`, checked 200 for all 30 on Oct 17; Charlotte's is charlottefootballclub.com, Montréal's en.cfmontreal.com) is the source link. Colors from ESPN's team list (Vancouver's white primary swapped for its navy).
- **Card:** "Sporting KC vs Real Salt Lake", the result as W/L/T ("T 3-3"), TV (Apple TV) and stadium; the header record W-L-T from the finals (ESPN prints W-D-L, 6-4-19; the app 6-19-4). No conference record (MLS publishes none). A playoff draw settled on penalties reads "W 1-1 (4-3 PK)". MLS is in season February to December (`PRO_SEASONS`, pro entries only).
- **Expanded final:** the result line, the halftime score, the club's scorers with their minutes, red cards, a shootout; **Score by Half** (1st, 2nd, ET1, ET2), **Team Stats** (possession, shots, on target, corners, saves, fouls, cards, offsides, passes completed) and **Goals** by half with the scorer, assist, penalty or own goal, and the running score. The box keeps the NFL's layout; its headings come from `box_score.line_title`/`scoring_title`.
- **Live:** as the NFL — once a match is past kickoff the league scoreboard (15 s) and match summary (30 s) give the clock ("67'"), score, both records (converted to W-L-T), team stats and every goal. The live shape was read from the Oct 14 Nashville–SKC board turned "in"; the first live MLS card to observe is Oct 17 (14 matches, Real Salt Lake at Sporting KC 7:30 PM Central).
- Reads: two ESPN schedule reads per club per refresh at most every 2 minutes (shared cache); the board and summary only during a match.

## Limits

- MLS: league matches only (Leagues Cup, U.S. Open Cup and CONCACAF matches are in other ESPN leagues). No player headshots or club crests (not licensed). The first live MLS card is to be observed on Oct 17.

- Formula 1: live cards carry the running order only (ESPN publishes no gaps; F1's own live timing feed, `livetiming.formula1.com`, answers 401). The live card shape was read from a finished race's board turned "in"; the United States Grand Prix (Oct 25) is the first live check. Practice and qualifying are not listed. No driver headshots or team logos (formula1.com's images are not licensed here).
- IMSA: no live timing (Al Kamel's live timing is a Meteor app). Sprint races show no running order until they finish. The 2027 calendar is hand-entered from IMSA's announcement; check it against imsa.com if IMSA changes a date. Start times appear only when the weekend's folder does. Auto Racing's in-season window is February–November, so the Rolex 24 (late January) shows out of season. The VP Racing SportsCar Challenge and the single-make series in the same folders are not added (no 2027 calendar found).

- Two 2026 race winners (Anduril 250, Brickyard 400: driver 4387, not in the standings) are named from their race's weekend feed (up to six such reads per build); the race reads "Final" if that read fails.
- NASCAR's live feed shape (vehicle fields) was read from an idle feed; the first live race (Phoenix, Oct 18) is the first live check.
- NASCAR's live vehicle fields (`delta` negative for laps down, `laps_led` as lap ranges, `vehicle_manufacturer` codes) are read from the feed's known shape; the first live race (Phoenix, Oct 18) is the first live check.
- No team logos or player headshots on live cards (ESPN's payload carries them; not licensed here).
