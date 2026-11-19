# Kansas tonight

User, November 18, 2026: item 7 of "What unique things should we add now?" ("one page with every high school game in the app tonight, grouped by county, filling in scores as they're posted"), then "Start with 2 then work your way through the rest".

## The day's list

`tonightDoc` (KV `tonight:v1:<host>:<level>`, two days): every middle or high school feed with a game on the school's local today (a tournament on each of its days), found once a day from the saved copies (`homeSavedFeed` over every in-season feed of the level, `refreshFeeds(HIGH_SCHOOL_MODULES)`; no source read). The scheduled refresh rebuilds each feed only about once a day (8 of 1,292 feeds every 10 minutes, Nov 19), so the 10-minute cron also runs `refreshTonight`: the feeds whose games today still lack a result are rebuilt (at most six a level a run, longest unread first) and the list updated. High school score alerts read the same list (`docs/PWA.md`).

A first request answered from 724 saved copies took 8.6 s (and one failed) on the preview: the endpoint now reads only the list.

## Endpoint

`/live/tonight?level=high-school|middle-school`: the list's games by county, A to Z; within one, live games first, then by start, then finals. `{level, date, feeds, feeds_with_games, games, live, counties:[{county, live, games}], built, refreshed}`, kept one minute at the edge. Previews run no cron: there the list is found once a day and not refreshed.

## Page

A "Tonight" tab on the High School and Middle School levels: "Kansas tonight", the day, the number of games and live games, then a section per county (red label when one is live). Each row: the card title and sport, the start, live clock ("Q2 3:12") or final result, and the score. A row opens the school. The search box filters by school, county, sport or title. Read again every minute while the tab is open. Test: `tests/kansas-tonight.mjs`.

## Not yet

- A game between two app schools is listed under each school (each school's own card).
- Counties come from the catalog; a school with none is under "Other".
