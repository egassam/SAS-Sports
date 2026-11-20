# Home: the week ahead

Added November 20, 2026 (`4.320.0-week-ahead`).

**User, November 20, 2026:** "I had a suggestion to make upcoming college and pro games more obvious so you know who's playing a weekend in advance." Asked whose games, they chose favorites first, then everything else: "Do number one but shouldn't it be M-Sunday because of Monday night and Thursday night football and all other sports on different days?" With a screenshot of ESPN's game card: "Can we also make them look like this?" Then "Can't we look elsewhere for upcoming schedules?", and asked about logos (their Oct 15 rule, "Leave the logos out") and other levels: **"No logos and all levels"**.

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
