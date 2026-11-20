# Home: the week ahead

Added November 20, 2026 (`4.320.0-week-ahead`).

**User, November 20, 2026:** "I had a suggestion to make upcoming college and pro games more obvious so you know who's playing a weekend in advance." Asked whose games, they chose favorites first, then everything else: "Do number one but shouldn't it be M-Sunday because of Monday night and Thursday night football and all other sports on different days?" With a screenshot of ESPN's game card: "Can we also make them look like this?"

## What Home shows

- **The week ahead (★ My Teams)** comes after Today. It lists every college and pro game a favorite plays after today, through next week's Sunday, under "This week" and "Next week". Each day has a large heading (Tomorrow, Sat, Nov 21) with an alerts bell that opens the Alerts panel. Each game is a card in ESPN's look:
  - both teams, away on top, each with its logo, ranking (top 25) and record; the favorite's name is gold;
  - the line on the favored team's row and the total (`T:46.5`) on the other row;
  - the time (the viewer's own zone, or TBA) and a TV chip for each network, plus ESPN's note (a tournament's name) and "Neutral site".
  
  Tapping a card opens that team's sport.
- **The week ahead · Everywhere** comes after Live now · Everywhere. It lists every other college and pro game on ESPN's boards, one day at a time (a row of day buttons from today through next Sunday, with a count on each). Under each day the games are grouped by sport under their marquee sign. The featured games come first, up to 12 per sport, with "Show all N" for that day and sport. Featured means a pro game, a ranked team, or a national TV game (`WEEK_TV`).
- **Coming up** leaves out any game the week ahead already shows. It keeps high school and middle school games, meets and races, and anything ESPN's boards do not carry.
- The jump row gains "This week" and "Week everywhere". The Upcoming tab shows both sections; Live and Results do not.
- A college or pro team's own page with no sport chosen shows its own week ahead.

## Source and cost

`/live/week?day=YYYY-MM-DD` (an Eastern date, from yesterday through 14 days ahead) reads each in-season college and pro board for that one day (`liveNowBoards`: the same boards Live now · Everywhere reads; about 17 in November). It returns the games that have not started and that include at least one catalog team, matched as push alerts and Live Everywhere match them (`boardTeamMatcher`).

ESPN's boards refuse a date range (HTTP 400 "Failed to get events endpoint", checked Nov 20), so the page asks for each day on its own: today through next Sunday (8 to 14 requests). No single request reads more than one day, which keeps each request well inside Cloudflare's subrequest and CPU limits.

Each board-day is kept 10 minutes for today and 3 hours for later days. Each day's answer is shared at each location for 10 minutes (today) or an hour. The page asks again after 10 minutes.

## Limits

- Only games on ESPN's college and pro boards. Pro leagues without an ESPN board (KC Monarchs, ECHL, racing, golf) and high and middle schools stay in Coming up.
- Lines and totals come from ESPN (DraftKings) when it publishes them, usually for football and basketball.
- A favorite's game today stays in Today (its official schedule), not in the week ahead.

Tests: `tests/home-week.mjs`, with saved copies of ESPN's college football board for Nov 21 and the NFL board for Nov 26.
