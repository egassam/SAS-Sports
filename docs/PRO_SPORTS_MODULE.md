# Pro sports module

Added October 15, 2026 (user: "Let's add some professional sports. Same three menu style, first menu is sports like football, auto racing, golf, etc... second menu if the first menu is football the second menu could be leagues and third menu could be teams. Let's add football, NFL, Pittsburgh Steelers and Kansas City Chiefs, and auto racing, NASCAR and races.").

Code: `src/pro-sports.mjs` (readers), `fetchPro` in `src/index.js`, catalog entries with `level: "pro"` in `src/schools.json`. Test: `tests/pro-sports-module.mjs` (real feeds of Oct 15 in `tests/fixtures/pro-sports/`).

## Menus

The level switch now reads **High School · College · Pro** (the order the handoff asked for once pro teams came). On Pro the three boxes are:

| Box | Field | Values |
| --- | --- | --- |
| Sport | `pro_sport` | Football, Auto Racing |
| League | `league` | NFL, NASCAR |
| Team (Races for Auto Racing) | the entry | Pittsburgh Steelers, Kansas City Chiefs; NASCAR Cup Series |

A new sport, league or team is a catalog entry (`level`, `pro_sport`, `league`, `conference` = division), a `PRO_TEAMS` entry, `sponsored-sports.json`, and the page's `SCHOOL_SPORTS`, `TEAM_THEMES` and `BOOTSTRAP_SCHOOLS`.

## Sources

| Entry | Schedule and results | Expanded final | Live |
| --- | --- | --- | --- |
| Steelers, Chiefs | ESPN team schedule `site.api.espn.com/.../football/nfl/teams/<pit|kc>/schedule` (postseason `?seasontype=3` read in Jan-Feb only) | ESPN game summary: line score, halftime, team leaders, total yards, turnovers, possession, first downs, every scoring play, ESPN recap link | The schedule's in-progress state (clock "5:12 - 3rd", score) |
| NASCAR Cup Series | NASCAR's own feeds `cf.nascar.com/cacher/<year>/1/race_list_basic.json` (every race, winner id, laps, cautions, lead changes) and the standings `racinginsights-points-feed.json` (winner names, car numbers) | The race's `weekend-feed.json`: full finishing order (car, team, status, laps led), winner's start, most laps led, stage winners, speed, race time, field size | `cf.nascar.com/live/feeds/live-feed.json`, read only on a race day: lap, caution/red flag, leader, top 10 |

Rules: K-State's — a past game or race without a published result is not listed; postponed/cancelled games are not listed. Header records: NFL overall record plus the division record (division opponents in the regular season: "Record 3-2 · AFC North 1-1"); playoff games are not in the record. Non-points NASCAR races (Clash, Duels, All-Star) are labeled "(non-points)". No featured athletes for pro entries (the three-athlete rule is for school rosters). ESPN team schedules are one read per refresh at most every 2 minutes (shared source cache), keeping ESPN volume low after the Oct 10 refusals.

## Formatting (4.96.0, user, October 15)

- **Next game / next race** leads the page (All view, nothing live): title, time, track for a race, TV channel (`broadcast`), and a countdown in days/hours/minutes. It is not repeated in the upcoming list.
- **Race finals lead with the winner**: 🏁, car number, name and team, then 2nd and 3rd (`podium`). Only the five latest finals carry the top three (their weekend feeds, kept 6 hours); older finals show the winner and car number from the standings.
- **No logos** (user: "Leave the logos out"). NFL team logos and NASCAR car-number art are the leagues' and teams' trademarks or artwork, and they are not licensed here. Teams are identified by name and team colors, as schools are. A logo license (data provider or league) would be needed first. Legal note given to the user: scores and schedules are facts (*NBA v. Motorola*). ESPN's unofficial feed is used against its commercial-use terms, as the college live scores already are. Have a lawyer review the sources and the "SAS" name before a commercial launch.

## Limits

- Two 2026 race winners (Anduril 250, Brickyard 400: driver 4387, not in the standings) are named from their race's weekend feed (up to six such reads per build); the race reads "Final" if that read fails.
- NASCAR's live feed shape (vehicle fields) was read from an idle feed; the first live race (Phoenix, Oct 18) is the first live check.
- NFL live cards show score and clock; possession/down-and-distance is not read for pro games yet.
