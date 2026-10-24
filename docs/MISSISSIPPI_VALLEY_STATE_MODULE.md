# Mississippi Valley State school module

`src/schools/mississippi-valley-state.mjs` reads mvsusports.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the SWAC (ported from McNeese's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (8): Baseball, Basketball, Cross Country, Football, Softball, Tennis, Track & Field, Volleyball.

## Rules

- The homepage carries no menu; the routes were set from a sport page's menu (the scaffold's plain `basketball`, `cross-country`, `tennis`, `track-and-field` and `volleyball` pages answer 404).
- Cross country reads TFRRS (`MS_college_f_Mississippi_Valley`, found on the SWAC Championships page).
- No golf; women's flag football is not a sport the app lists. Softball's fall games read as listed (records leave fall ball out).
- Routes were set from the site's menu (`scripts/audit-routes.mjs`, `scripts/set-sport-routes.mjs`).
- Volleyball matches before the last Friday of August are exhibitions (from the Southland port).
- Conference: the SWAC (2026-27: Alabama A&M, Alabama State, Alcorn State, Bethune-Cookman, Florida A&M, Jackson State, Mississippi Valley State, Arkansas-Pine Bluff, Grambling State, Prairie View A&M, Southern, Texas Southern; Grambling State and Texas Southern are blocked, `docs/BLOCKED_SCHOOLS.md`) sponsors football, basketball, baseball, softball, volleyball, women's soccer, bowling, golf, tennis, cross country and track, but no swimming, wrestling, lacrosse or hockey; the members' pages mark their league games, and opponents are matched by the names they write ("AAMU", "Alcorn", "B-CU", "FAMU", "MVSU", "UAPB", "Arkansas - Pine Bluff", "Grambling", "Prairie View", "Southern (La.)"; "JSU" and "TSU" are not used, since they are also Jacksonville State and Tennessee State).

Each rule has a check in `tests/mississippi-valley-state-module.mjs` (generated page blocks) or `tests/swac-shared.mjs`.

## Athletes

ATHLETES_mississippi-valley-state

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
