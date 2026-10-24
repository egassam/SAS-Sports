# UT Rio Grande Valley school module

`src/schools/utrgv.mjs` reads goutrgv.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Southland Conference (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Cross Country, Football, Golf, Soccer, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- TFRRS still names the team `Texas_Pan_American` (set by hand; found on the 2025 Southland championship results).
- The pages write every score winner first ("L", 41-16 at UIW): the team's score is put after its result letter (Morehead State's rule).
- Women's swimming only (no Southland swimming: no conference record).
- "Men's Golf Claims Fourth" reads 4th (shared `golfStoryPlace`).
- Rankings written without "#" ("17/21 Mercer", "RV/RV UTRGV", "#4/2/2 Stephen F. Austin", "(RP) Houston Christian") are cut from opponent names (the page data's prefix, `withoutOpponentPrefix`).
- Volleyball matches before the last Friday of August are exhibitions (preseason scrimmages are not in the pages' records).
- A season used as a tournament title, with or without the sport's name ("Fall Golf", "Fall Tennis Schedule"), is no tournament: the event keeps its own name.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Southland Conference (2026-27: East Texas A&M, Houston Christian, Incarnate Word, Lamar, McNeese, LSU New Orleans, Nicholls, Northwestern State, Southeastern Louisiana, Stephen F. Austin, Texas A&M-Corpus Christi, UTRGV) sponsors football, basketball, baseball, softball, soccer, volleyball, beach volleyball, golf, tennis, cross country and track, but no swimming or fencing; the members' pages mark their league games, and opponents are matched by the names they write ("HCU", "UIW", "SFA", "NSU", "SLU", "UNO", "LSU New Orleans", "McNeese State", "Texas A&M - Corpus Christi").

Each rule has a check in `tests/utrgv-module.mjs` (generated page blocks) or `tests/southland-shared.mjs`. Game-sport records on the preview equal each live page's own (`compare-records`, Oct 24).

## Athletes

Roster cards, then official profiles, then the school's NIL marketplace where one is wired. Profile cards fill the remaining slots in Basketball, Cross Country, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
