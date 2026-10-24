# Southern school module

`src/schools/southern.mjs` reads gojagsports.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the SWAC (ported from McNeese's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Bowling, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Cross country is the combined page `combined-cross-country` (the scaffold had none) and reads TFRRS (`LA_college_f_Southern`, the SWAC Championships' Southern).
- Golf stories may say "the Jags"; "Southern" alone is not read where it starts or ends another school's name (Southern Miss, Texas Southern).
- Golf cards publish the places; the stories are not linked.
- Bowling lists each match of a tournament with its own score; two matches against one opponent stay two matches (shared `mergeMeetDays` with `matches`, Oct 24).
- Routes were set from the site's menu (`scripts/audit-routes.mjs`, `scripts/set-sport-routes.mjs`).
- Volleyball matches before the last Friday of August are exhibitions (from the Southland port).
- Conference: the SWAC (2026-27: Alabama A&M, Alabama State, Alcorn State, Bethune-Cookman, Florida A&M, Jackson State, Mississippi Valley State, Arkansas-Pine Bluff, Grambling State, Prairie View A&M, Southern, Texas Southern; Grambling State and Texas Southern are blocked, `docs/BLOCKED_SCHOOLS.md`) sponsors football, basketball, baseball, softball, volleyball, women's soccer, bowling, golf, tennis, cross country and track, but no swimming, wrestling, lacrosse or hockey; the members' pages mark their league games, and opponents are matched by the names they write ("AAMU", "Alcorn", "B-CU", "FAMU", "MVSU", "UAPB", "Arkansas - Pine Bluff", "Grambling", "Prairie View", "Southern (La.)"; "JSU" and "TSU" are not used, since they are also Jacksonville State and Tennessee State).
- The Birmingham Football Classic (Alabama State vs Southern, Aug 29) is outside the SWAC: both schools' records leave it out (Southern 1-2 in the SWAC, Oct 24).

Each rule has a check in `tests/southern-module.mjs` (generated page blocks) or `tests/swac-shared.mjs`.

## Athletes

Roster cards, then official profiles (no NIL marketplace linked from the site). Instagram pins from the official rosters fill Soccer, Softball and Volleyball; profile cards fill the remaining slots in Baseball, Basketball, Bowling, Cross Country, Football, Golf, Tennis (`athlete_profile_fallback_sports` in `tests/certified-schools.json`). The golf roster publishes portraits for few athletes (`portraitlessProfileSports`). Track & Field is off the athlete list: its 2027 roster lists no athletes yet (Oct 24; the 2026 roster has 60); it returns when they are published. Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
