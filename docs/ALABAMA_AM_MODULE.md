# Alabama A&M school module

`src/schools/alabama-am.mjs` reads aamusports.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the SWAC (ported from McNeese's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Bowling, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- The pages write every score winner first ("L", 31-24, football vs Howard, Aug 29): the team's score is put after its result letter (UTRGV's rule).
- Bowling is on the code page `/sports/bowl/` (the menu's link; the scaffold had no bowling).
- Track & Field is one page for both teams (`mens-track-and-field`, "2025-26 Track and Field"); the scaffold's women's page was 2022-23 and off the menu. Golf is men's only.
- Cross country reads TFRRS (`AL_college_f_Alabama_AM`).
- Bowling lists each match of a tournament with its own score; two matches against one opponent stay two matches (shared `mergeMeetDays` with `matches`, Oct 24). An invitational match against a SWAC member is no league match (the pages read "Conf 0-0"; shared `conference-games`).
- Routes were set from the site's menu (`scripts/audit-routes.mjs`, `scripts/set-sport-routes.mjs`).
- Volleyball matches before the last Friday of August are exhibitions (from the Southland port).
- Conference: the SWAC (2026-27: Alabama A&M, Alabama State, Alcorn State, Bethune-Cookman, Florida A&M, Jackson State, Mississippi Valley State, Arkansas-Pine Bluff, Grambling State, Prairie View A&M, Southern, Texas Southern; Grambling State and Texas Southern are blocked, `docs/BLOCKED_SCHOOLS.md`) sponsors football, basketball, baseball, softball, volleyball, women's soccer, bowling, golf, tennis, cross country and track, but no swimming, wrestling, lacrosse or hockey; the members' pages mark their league games, and opponents are matched by the names they write ("AAMU", "Alcorn", "B-CU", "FAMU", "MVSU", "UAPB", "Arkansas - Pine Bluff", "Grambling", "Prairie View", "Southern (La.)"; "JSU" and "TSU" are not used, since they are also Jacksonville State and Tennessee State).

Each rule has a check in `tests/alabama-am-module.mjs` (generated page blocks) or `tests/swac-shared.mjs`.

## Athletes

Roster cards, then official profiles, then the school's NIL marketplace (InFLCR (`alabama-am-university`)). Instagram pins from the official rosters fill Baseball, Basketball, Soccer, Softball and Volleyball; profile cards fill the remaining slots in Baseball, Bowling, Cross Country, Football, Golf, Softball, Tennis, Track & Field (`athlete_profile_fallback_sports` in `tests/certified-schools.json`). Baseball, Bowling and Softball rosters publish portraits for few athletes: those profiles fill with initials (`portraitlessProfileSports`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Volleyball's page header reads "Conf 8-2" (Oct 24); its rows show nine SWAC matches (7-2) and mark none as conference games, so the app reads 7-2 by membership. The page's header is the source's own count. Checked again Oct 25 (still 8-2 over the same rows); swac.org's standings refuse the request (403), so no official source settles it.

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
