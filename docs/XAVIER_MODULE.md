# Xavier school module

`src/schools/xavier.mjs` reads goxavier.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from NC State's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Xavier was added to the app on October 21, 2026 in the Big East (9 sports: Baseball, Basketball, Cross Country, Golf, Soccer, Swimming & Diving, Tennis, Track & Field, Volleyball). goxavier.com is read through the private source (Imperva answers the sandbox with 403).

## Rules

- Every fall event is filed under the tournament "Fall Season": a season is never read as a tournament (golf rounds merge by their own name).
- Golf: cards "6 of 11 (854, -10)" read; Golfweek Put Me In Coach, the Flyer Invitational and The Indy are individuals-only from their stories, Raider Individual from its name; a player who "paced the Musketeers" gives no team place (shared fixes). Two tournaments on the same days (Moraine and Raider Individual) merge round by round (shared `mergeTournamentRounds`).
- Golf combines the women's page and the men's plain `/sports/golf` page (`teamLabels`).
- Swimming: one page for both teams (not combined); "Alumni Meet" is internal; championship days "- Day 1..4" merge into one meet (shared `mergeMeetDays`).
- Lacrosse removed: the page is an empty template.
- Shared Big East rules (every module): bracket games named by round or "vs. TBD" read as their tournament and "at"; a multi-day event naming its host and its tournament reads as the tournament; a past swimming meet with no result line, story or TFRRS is not listed.

Each rule has a check in `tests/xavier-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

Every sport shows three athletes on the preview. No NIL marketplace linked. Profile cards fill the remaining slots in Baseball, Cross Country, Golf, Swimming & Diving, Tennis, Track & Field, Volleyball (the roster cards and profile pages publish fewer than three athlete Instagram accounts; `athlete_profile_fallback_sports`).

## Open

- Baseball and Track & Field fill when published.
- First live cards not yet observed.
