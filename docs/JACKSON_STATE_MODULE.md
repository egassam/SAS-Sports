# Jackson State school module

`src/schools/jackson-state.mjs` reads gojsutigers.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the SWAC (ported from McNeese's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Bowling, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- The women's basketball page data dates its January-March games a year early ("2026-01-02" for the page's "Jan 2 (Sat)" at Alcorn State): an unplayed game dated before the season's first game is in the next year (module rule).
- The page names the league's tournament by the league alone ("SWAC" in the "SWAC Tournament"): it reads "at SWAC Tournament".
- Golf stories tell the places ("Jackson State won its first tournament", "the Tigers finished fourth overall", "pace the team to an 11th-place finish"); the men's HBCU Collegiate Classic story (rain-shortened, Sep 21-22) gives only the team's score and reads "Completed".
- Bowling lists each match of a tournament with its own score; two matches against one opponent stay two matches (shared `mergeMeetDays` with `matches`, Oct 24).
- Routes were set from the site's menu (`scripts/audit-routes.mjs`, `scripts/set-sport-routes.mjs`).
- Volleyball matches before the last Friday of August are exhibitions (from the Southland port).
- Conference: the SWAC (2026-27: Alabama A&M, Alabama State, Alcorn State, Bethune-Cookman, Florida A&M, Jackson State, Mississippi Valley State, Arkansas-Pine Bluff, Grambling State, Prairie View A&M, Southern, Texas Southern; Grambling State and Texas Southern are blocked, `docs/BLOCKED_SCHOOLS.md`) sponsors football, basketball, baseball, softball, volleyball, women's soccer, bowling, golf, tennis, cross country and track, but no swimming, wrestling, lacrosse or hockey; the members' pages mark their league games, and opponents are matched by the names they write ("AAMU", "Alcorn", "B-CU", "FAMU", "MVSU", "UAPB", "Arkansas - Pine Bluff", "Grambling", "Prairie View", "Southern (La.)"; "JSU" and "TSU" are not used, since they are also Jacksonville State and Tennessee State).

Each rule has a check in `tests/jackson-state-module.mjs` (generated page blocks) or `tests/swac-shared.mjs`.

## Athletes

Roster cards, then official profiles, then the school's NIL marketplace (Opendorse (`jacksonstate-tigers`)). Instagram pins from the official rosters fill Golf and Volleyball; profile cards fill the remaining slots in Baseball, Basketball, Bowling, Cross Country, Football, Soccer, Softball, Tennis, Track & Field (`athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
