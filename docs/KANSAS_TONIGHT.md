# Kansas tonight

User, November 18, 2026: item 7 of "What unique things should we add now?" ("one page with every high school game in the app tonight, grouped by county, filling in scores as they're posted"), then "Start with 2 then work your way through the rest".

## Endpoint

`/live/tonight?level=high-school|middle-school` (`src/kansas-tonight.mjs`): every in-season feed of the level's schools (`refreshFeeds(HIGH_SCHOOL_MODULES)`, the list the scheduled refresh rebuilds every 10 minutes), read from the saved copies only (`homeSavedFeed`: this location's copy, its last good copy or the shared KV copy; no source is read). A game is in it on the school's local today (a tournament on each of its days). Counties A to Z; within one, live games first, then by start, then finals. Answer: `{level, date, feeds, feeds_read, games, live, counties:[{county, live, games}]}`, kept two minutes at the edge.

## Page

A "Tonight" tab on the High School and Middle School levels: "Kansas tonight", the day, the number of games and live games, then a section per county (red label when one is live). Each row: the card title and sport, the start, live clock ("Q2 3:12") or final result, and the score. A row opens the school. The search box filters by school, county, sport or title. Read again every minute while the tab is open. Test: `tests/kansas-tonight.mjs`.

## Not yet

- A game between two app schools is listed under each school (each school's own card).
- Counties come from the catalog; a school with none is under "Other".
