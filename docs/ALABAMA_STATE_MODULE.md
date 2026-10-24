# Alabama State school module

`src/schools/alabama-state.mjs` reads bamastatesports.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the SWAC (ported from McNeese's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Bowling, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Golf stories may tell the team's place as "a 11th-place performance" (The Velvet, Sep 14-15; shared `golfStoryPlace`).
- Track & Field reads the men's and women's pages (the scaffold's plain page was 2023-24 and off the menu); Bowling is women's only (the men's page is a 2023-24 general schedule).
- Women's flag football is on the menu but is not a sport the app lists.
- Golf match play (the Motor City Matchup) reads as its result.
- Bowling lists each match of a tournament with its own score; two matches against one opponent stay two matches (shared `mergeMeetDays` with `matches`, Oct 24).
- Routes were set from the site's menu (`scripts/audit-routes.mjs`, `scripts/set-sport-routes.mjs`).
- Volleyball matches before the last Friday of August are exhibitions (from the Southland port).
- Conference: the SWAC (2026-27: Alabama A&M, Alabama State, Alcorn State, Bethune-Cookman, Florida A&M, Jackson State, Mississippi Valley State, Arkansas-Pine Bluff, Grambling State, Prairie View A&M, Southern, Texas Southern; Grambling State and Texas Southern are blocked, `docs/BLOCKED_SCHOOLS.md`) sponsors football, basketball, baseball, softball, volleyball, women's soccer, bowling, golf, tennis, cross country and track, but no swimming, wrestling, lacrosse or hockey; the members' pages mark their league games, and opponents are matched by the names they write ("AAMU", "Alcorn", "B-CU", "FAMU", "MVSU", "UAPB", "Arkansas - Pine Bluff", "Grambling", "Prairie View", "Southern (La.)"; "JSU" and "TSU" are not used, since they are also Jacksonville State and Tennessee State).

Each rule has a check in `tests/alabama-state-module.mjs` (generated page blocks) or `tests/swac-shared.mjs`.

## Athletes

ATHLETES_alabama-state

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
