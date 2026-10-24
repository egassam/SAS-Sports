# Southeastern Louisiana school module

`src/schools/southeastern-louisiana.mjs` reads lionsports.net (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Southland Conference (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- TFRRS `LA_college_f_SE_Louisiana` (setup now tries "SE"/"NW" for a leading compass word).
- The Coconut Beach Pairs Qualifier (beach volleyball, no result or story) is not listed; the Aug 13 and 19 volleyball matches are exhibitions (out of the page's 11-11).
- Men's golf only; track reads the combined page.
- Rankings written without "#" ("17/21 Mercer", "RV/RV UTRGV", "#4/2/2 Stephen F. Austin", "(RP) Houston Christian") are cut from opponent names (the page data's prefix, `withoutOpponentPrefix`).
- Volleyball matches before the last Friday of August are exhibitions (preseason scrimmages are not in the pages' records).
- A season used as a tournament title, with or without the sport's name ("Fall Golf", "Fall Tennis Schedule"), is no tournament: the event keeps its own name.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Southland Conference (2026-27: East Texas A&M, Houston Christian, Incarnate Word, Lamar, McNeese, LSU New Orleans, Nicholls, Northwestern State, Southeastern Louisiana, Stephen F. Austin, Texas A&M-Corpus Christi, UTRGV) sponsors football, basketball, baseball, softball, soccer, volleyball, beach volleyball, golf, tennis, cross country and track, but no swimming or fencing; the members' pages mark their league games, and opponents are matched by the names they write ("HCU", "UIW", "SFA", "NSU", "SLU", "UNO", "LSU New Orleans", "McNeese State", "Texas A&M - Corpus Christi").

Each rule has a check in `tests/southeastern-louisiana-module.mjs` (generated page blocks) or `tests/southland-shared.mjs`. Game-sport records on the preview equal each live page's own (`compare-records`, Oct 24; volleyball after the exhibition rule).

## Athletes

Roster cards, then official profiles, then the school's NIL marketplace where one is wired. Profile cards fill the remaining slots in Baseball, Basketball, Beach Volleyball, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
