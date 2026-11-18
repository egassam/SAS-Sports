# Series history (rivalry)

User, November 18, 2026: item 3 of "What unique things should we add now?" ("rivalry pages: all-time series, last meetings, streak, next game"), then "Start with 2 then work your way through the rest".

## Source

The school's own SIDEARM **Opponent History** page, `/sports/<sport>/opponent-history` (next to its roster page). Its `__NUXT_DATA__` holds one record per opponent the program has played: `opponentName`, `allTotalRecords`, `currentStreak`, `lastTenGameRecords`, and every game (`results`: `gameDate`, `resultStatus`, `teamScore`, `opponentScore`, `gameLocationIndicator`).

Nov 18, 2026 (read through the Worker's `/api/source`; the sandbox was refused by Imperva after the roster reads): K-State football, 142 opponents and 1,489 games (Kansas: 124 games since 1902, Kansas leads 64-55-5, K-State has won 18 straight); Iowa State men's basketball, 293 opponents; Missouri women's basketball and Nebraska volleyball answered 404 (not every SIDEARM site publishes the page).

## In the app

- `src/series-history.mjs` (parser, exact-name opponent match, the school's-side summary), `attachSeries` in the Worker after the conference standings: a college sport's coming and live games carry `series` {record, streak, last10, games, since, last (5 meetings), source}. The page is read once a day per sport (`series:v1:<school>|<sport>` in KV, the stored copy holds only each opponent's summary and last five meetings); a site with no page keeps an empty copy for the day (no re-read).
- Opponent names: the card's opponent, plus the catalog school's names when the opponent is a college the app has; matched exactly after dropping "University (of)", "The" and punctuation ("Kansas" is never "Kansas State"; "Iowa St." is Iowa State).
- Basketball and soccer: the men's and women's pages by the game's team label.
- Page: a "Series" line on every coming card ("Kansas leads 64-55-5 · K-State has won 18 straight · Last 10: 10-0"); the next game's card adds the last five meetings and the source link.
- `tests/series-history.mjs` (K-State football fixture, `.nuxt.json.gz`: only the page data).

## Not yet

- Colleges whose site has no opponent history page (Missouri, Nebraska; WMT sites), high schools (no source), pro teams.
- A rivalry page of its own (all meetings): the card shows the last five.
