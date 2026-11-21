# Home: the week ahead

Added November 20, 2026 (`4.320.1-week-ahead`, PR #621); moved up and made into rows the same day (`4.321.0-week-rows`).

**User, November 20, 2026:** "I had a suggestion to make upcoming college and pro games more obvious so you know who's playing a weekend in advance." Asked whose games, they chose favorites first, then everything else: "Do number one but shouldn't it be M-Sunday because of Monday night and Thursday night football and all other sports on different days?" With a screenshot of ESPN's game card: "Can we also make them look like this?" Then "Can't we look elsewhere for upcoming schedules?", and asked about logos (their Oct 15 rule, "Leave the logos out") and other levels: **"No logos and all levels"**. After it went live: "how do we make the upcoming better than it is. Maybe add rows and move it higher?" They chose the top of Home with Today folded in, and compact rows.

## What Home shows

- **The week ahead (★ My Teams)** comes after Today. It lists every game, meet and race a favorite has after today, through next week's Sunday, at every level (middle school to pro), under "This week" and "Next week". It is read from the official schedules Home already loads (no extra reads). When ESPN's board has the same game (same team, sport, team label and day, give or take one), ESPN's card stands in for it and adds the line, total, rank, record and TV. A favorite's game that only ESPN lists is shown too. Two favorites playing each other show once. Each day has a large heading (Tomorrow, Sat, Nov 21) with an alerts bell that opens the Alerts panel. Each card is in ESPN's look, with no logos:
  - both teams, away on top (from the official title: "Manhattan at Hays" puts Manhattan on top), each with a badge (ESPN's abbreviation, or the name's initials: MHS, RCMS) where a logo would be; the favorite's name is gold; ranking and record where ESPN has them;
  - the line on the favored team's row and the total (`T:46.5`) on the other row, when ESPN has them;
  - the time (the viewer's own zone, or TBA) and a TV chip, plus ESPN's note (a tournament's name) and "Neutral site"; the tag names the sport, team and level (Girls Basketball · High school);
  - a meet or race is one row: its name and time.

  Tapping a card opens that team's sport. Home now reads a favorite sport whose next game is within 14 days (`HOME_AHEAD_DAYS`, was 7), so every sport playing through next Sunday is loaded.
- **The week ahead · Everywhere** comes after Live now · Everywhere. It lists every other college and pro game on ESPN's boards, one day at a time (a row of day buttons from today through next Sunday, with a count on each). Under each day the games are grouped by sport under their marquee sign. The featured games come first, up to 12 per sport, with "Show all N" for that day and sport. Featured means a pro game, a ranked team, or a national TV game (`WEEK_TV`).
- **Coming up** leaves out any game the week ahead already shows, so it holds each team's next game after next Sunday.
- The jump row gains "This week" and "Week everywhere". The Upcoming tab shows both sections; Live and Results do not.
- A team's own page with no sport chosen shows its own week ahead.

## Position and rows (November 20, `4.321.0-week-rows`)

- The week ahead now comes right after Live now, above the countdown box. Today is its first day: today's games not yet started are listed there, and the Today section keeps only today's finals. The jump row calls it "Upcoming".
- Each game is one slim row (about 49 px, against about 140 px for the earlier two-line card): the time, then the matchup ("19 Arizona at Kansas State", the favorite in gold), with the sport, the line on the favored team ("ARIZ -7.5"), the total ("O/U 51.5") and ESPN's note on the line below, and the TV on the right. A meet or race reads its name. Two rows sit side by side on wide screens. On a phone the TV moves to the second line, so the matchup gets the full width. Everywhere uses the same rows.

## Design B: spotlight and tiles, one combined list (November 21, `4.322.0-week-tiles`)

**User, November 20–21:** "I don't see how what you just did made it better. It's all list doesn't looking inviting at all. Very poor design." Shown three mockups (color matchup cards; spotlight and tiles; scoreboard cards in team colors), they chose B: "Let's do B. Can we combine the my teams and all others for the upcoming schedule to save space on the homepage. You could just highlight the teams that were the person's favorites?"

This design replaces the rows and the separate Everywhere section described above.
- **Spotlight:** the viewer's next game with a published time, in both teams' colors, with a live countdown (the page's existing `data-countdown-at` ticker), the time, the TV and the line. It stands in for the countdown box (`nextUpBox`), which shows only when there is no spotlight.
- **Day buttons:** today through next Sunday, each with its date, a gold ★ count of the viewer's games and the total.
- **Tiles**, two across on a phone, three from 760 px and four from 1100 px: a bar in both teams' colors, the sport (NFL, M Basketball, Girls Basketball · HS), a color badge with each team's abbreviation (no logos), the names with ranks, the time, the TV and the line. The viewer's games come first, with a gold border and a ★; then the other college and pro games, featured first, up to 12, then "Show all N games" for that day.
- **Colors:** ESPN's team color (`/live/week` now sends `color` and `alt`), else the catalog theme, else gray; near-black or near-white colors fall back. Badge text is dark on light colors.
- One section, "The week ahead" (no "★ My Teams" banner, since everyone's games are in it), right after Live now. The jump row's "Upcoming" counts the viewer's games.

## Sports under their marquee signs (November 21, `4.322.1-week-sports`)

**User:** "I'm liking this better but you took away the organization by sport with the marque design." Each day's tiles are now grouped by sport under the marquee signs Live uses (color, mark, a "★2 · 58 games" count), with a row of sport chips to jump between them. Sports the viewer's teams play that day come first, then A to Z. In each sport, the viewer's games come first (highlighted), then the featured others: 6, then "Show all N Football games". A tile repeats its sport only when the tag adds something (Football · HS, M Basketball, NFL).

## Sections by level (November 21, `4.322.2-week-levels`)

**User:** "Let's making sections by middle school, highschool, college, and pro as well." Each day is now split into level sections (College, Pro, High school, Middle school), each with its own colored banner, a "★1 · 243 games" count and a chip at the top to jump to it. Levels where the viewer's teams play that day come first, then the app's usual order: college, pro, high school, middle school. Inside a level, the sport signs work as above. Tile labels no longer add "HS" or "MS", since the banner says it.

## Source and cost

`/live/week?day=YYYY-MM-DD` (an Eastern date, from yesterday through 14 days ahead) reads each in-season college and pro board for that one day (`liveNowBoards`: the same boards Live now · Everywhere reads; about 17 in November). It returns the games that have not started and that include at least one catalog team, matched as push alerts and Live Everywhere match them (`boardTeamMatcher`).

ESPN's boards refuse a date range (HTTP 400 "Failed to get events endpoint", checked Nov 20), so the page asks for each day on its own: today through next Sunday (8 to 14 requests). No single request reads more than one day, which keeps each request well inside Cloudflare's subrequest and CPU limits.

Each board-day is kept 10 minutes for today and 3 hours for later days. Each day's answer is shared at each location for 10 minutes (today) or an hour. The page asks again after 10 minutes.

## Limits

- No logos (user, October 15 and November 20): `/live/week` sends none, and `tests/pro-sports-module.mjs` still checks the page shows none.
- Everywhere covers only ESPN's college and pro boards (reading every school's schedule for everyone would be hundreds of reads).
- Lines and totals come from ESPN (DraftKings) when it publishes them, usually for football and basketball.
- A favorite's game today stays in Today (its official schedule), not in the week ahead.

Tests: `tests/home-week.mjs`, with saved copies of ESPN's college football board for Nov 21 and the NFL board for Nov 26.

## Customize Home (November 21, `4.323.0-home-customize`)

**User:** "Can we set the home screen up so users can choose what they want to see? For example if the only want to see pro football and college basketball?" Asked, they chose: favorites always show, and a Customize panel.

- A bar at the top of Home reads "Showing: Everything" (or "your teams + Pro Football, College Basketball") with a **⚙ Customize** button. The panel has one row per level (Pro, College, High school, Middle school) with a chip for each sport that level's catalog teams play, plus "Show everything" and "Done".
- The choices are `level|sport` pairs saved on the device (`localStorage` key `sas-home-filter`). Nothing chosen shows everything.
- They trim everyone else's games: Live now everywhere, the week ahead's other games, and featured meets. A starred team's games always show, every sport. A team's own page is not filtered.
- Tests: `tests/home-customize.mjs`; the week test checks that the filter trims others and keeps favorites.
