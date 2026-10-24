# Bethune-Cookman school module

`src/schools/bethune-cookman.mjs` reads bcuathletics.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the SWAC (ported from McNeese's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (9): Baseball, Basketball, Cross Country, Football, Golf, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Golf and Tennis are women's only: the men's pages are 2019-20 and off the menu.
- Cross country and track are one page each for both teams; golf stories may name the team "B-CU".
- Routes were set from the site's menu (`scripts/audit-routes.mjs`, `scripts/set-sport-routes.mjs`).
- Volleyball matches before the last Friday of August are exhibitions (from the Southland port).
- Conference: the SWAC (2026-27: Alabama A&M, Alabama State, Alcorn State, Bethune-Cookman, Florida A&M, Jackson State, Mississippi Valley State, Arkansas-Pine Bluff, Grambling State, Prairie View A&M, Southern, Texas Southern; Grambling State and Texas Southern are blocked, `docs/BLOCKED_SCHOOLS.md`) sponsors football, basketball, baseball, softball, volleyball, women's soccer, bowling, golf, tennis, cross country and track, but no swimming, wrestling, lacrosse or hockey; the members' pages mark their league games, and opponents are matched by the names they write ("AAMU", "Alcorn", "B-CU", "FAMU", "MVSU", "UAPB", "Arkansas - Pine Bluff", "Grambling", "Prairie View", "Southern (La.)"; "JSU" and "TSU" are not used, since they are also Jacksonville State and Tennessee State).

Each rule has a check in `tests/bethune-cookman-module.mjs` (generated page blocks) or `tests/swac-shared.mjs`.

## Athletes

ATHLETES_bethune-cookman

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
