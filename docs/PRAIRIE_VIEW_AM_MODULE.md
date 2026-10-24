# Prairie View A&M school module

`src/schools/prairie-view-am.mjs` reads pvpanthers.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the SWAC (ported from McNeese's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Bowling, Cross Country, Football, Golf, Soccer, Softball, Track & Field, Volleyball.

## Rules

- A neutral game named for a championship is "at" it, plural too ("SWAC Championships", men's basketball).
- The bowling page dates its Colonial Lanes Classic matches Oct 2-4 as away matches; the other schools' pages date them Oct 9-11 at a neutral site. Read as published.
- Golf stories for the Red Raider Invitational and the Bayou City Collegiate give no team place ("Completed"); three past women's tournaments (Bradley Coyote Classic, Big O Classic, Hawaii) have no result or story yet and are not listed.
- Bowling lists each match of a tournament with its own score; two matches against one opponent stay two matches (shared `mergeMeetDays` with `matches`, Oct 24). An invitational match against a SWAC member is no league match (the pages read "Conf 0-0"; shared `conference-games`).
- Routes were set from the site's menu (`scripts/audit-routes.mjs`, `scripts/set-sport-routes.mjs`).
- Volleyball matches before the last Friday of August are exhibitions (from the Southland port).
- Conference: the SWAC (2026-27: Alabama A&M, Alabama State, Alcorn State, Bethune-Cookman, Florida A&M, Jackson State, Mississippi Valley State, Arkansas-Pine Bluff, Grambling State, Prairie View A&M, Southern, Texas Southern; Grambling State and Texas Southern are blocked, `docs/BLOCKED_SCHOOLS.md`) sponsors football, basketball, baseball, softball, volleyball, women's soccer, bowling, golf, tennis, cross country and track, but no swimming, wrestling, lacrosse or hockey; the members' pages mark their league games, and opponents are matched by the names they write ("AAMU", "Alcorn", "B-CU", "FAMU", "MVSU", "UAPB", "Arkansas - Pine Bluff", "Grambling", "Prairie View", "Southern (La.)"; "JSU" and "TSU" are not used, since they are also Jacksonville State and Tennessee State).

Each rule has a check in `tests/prairie-view-am-module.mjs` (generated page blocks) or `tests/swac-shared.mjs`.

## Athletes

Roster cards, then official profiles (no NIL marketplace linked from the site). Instagram pins from the official rosters fill Basketball and Volleyball; profile cards fill the remaining slots in Baseball, Bowling, Cross Country, Football, Golf, Soccer, Softball, Track & Field (`athlete_profile_fallback_sports` in `tests/certified-schools.json`). The bowling roster publishes portraits for few athletes (`portraitlessProfileSports`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
