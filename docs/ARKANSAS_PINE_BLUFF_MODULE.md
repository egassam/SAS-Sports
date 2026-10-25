# Arkansas-Pine Bluff school module

`src/schools/arkansas-pine-bluff.mjs` reads uapblionsroar.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the SWAC (ported from McNeese's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (9): Baseball, Basketball, Cross Country, Football, Golf, Soccer, Softball, Track & Field, Volleyball.

## Rules

- The homepage carries no menu; routes from a sport page's menu. No tennis is on the menu.
- Golf's pages are still 2025-26: the 2026-27 season fills when it is published.
- Cross country reads TFRRS; its two-day meets (the Chile Pepper XC Festival, "October 2- 3, 2026", and the Watson Collegiate XC Classic, dated by its last day) attach since Oct 24 (shared `tfrrsDays`, `findTfrrsMeet` `end`). TFRRS publishes one runner as "Eric Eric".
- Routes were set from the site's menu (`scripts/audit-routes.mjs`, `scripts/set-sport-routes.mjs`).
- Volleyball matches before the last Friday of August are exhibitions (from the Southland port).
- Conference: the SWAC (2026-27: Alabama A&M, Alabama State, Alcorn State, Bethune-Cookman, Florida A&M, Jackson State, Mississippi Valley State, Arkansas-Pine Bluff, Grambling State, Prairie View A&M, Southern, Texas Southern; Grambling State and Texas Southern are blocked, `docs/BLOCKED_SCHOOLS.md`) sponsors football, basketball, baseball, softball, volleyball, women's soccer, bowling, golf, tennis, cross country and track, but no swimming, wrestling, lacrosse or hockey; the members' pages mark their league games, and opponents are matched by the names they write ("AAMU", "Alcorn", "B-CU", "FAMU", "MVSU", "UAPB", "Arkansas - Pine Bluff", "Grambling", "Prairie View", "Southern (La.)"; "JSU" and "TSU" are not used, since they are also Jacksonville State and Tennessee State).

Each rule has a check in `tests/arkansas-pine-bluff-module.mjs` (generated page blocks) or `tests/swac-shared.mjs`.

## Athletes

Roster cards, then official profiles (no NIL marketplace linked from the site). Instagram pins from the official rosters fill Softball and Volleyball; profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Football, Golf, Soccer, Track & Field, Volleyball (`athlete_profile_fallback_sports` in `tests/certified-schools.json`). The cross country rosters (2025) publish no portraits: profiles fill with initials (`portraitlessProfileSports`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
