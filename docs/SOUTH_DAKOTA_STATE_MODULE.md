# South Dakota State school module

`src/schools/south-dakota-state.mjs` reads gojacks.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Summit League (ported from McNeese's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Cross Country, Equestrian, Football, Golf, Soccer, Softball, Swimming & Diving, Track & Field, Volleyball, Wrestling.

## Rules

- Football plays in the Missouri Valley Football Conference and wrestling in the Big 12; equestrian has no conference record; the page data marks league games.
- Cross country reads the gendered pages (the plain address is a 2024 women's page, off the menu). The only TFRRS meet that day is taken only when the schedule's place agrees (`onlyMeetThatDay:'checked'`): the women split on Sep 25, and the Augustana Invitational (not on TFRRS) had taken Gans Creek's 15th. A schedule place with points ("9th of 20 -- 249") reads "9th of 20 · 249 pts".
- A golf tournament played only as individuals ("one of four Jackrabbits competing individually", the USF Invitational) reads "No team score (individuals only)".
- Volleyball matches before the last Friday of August are exhibitions; rankings written without "#" are cut from opponent names (both from the Southland port).
- Routes were set from the site's menu (`scripts/audit-routes.mjs`, `scripts/set-sport-routes.mjs`).
- Conference: the Summit League (2026-27: Kansas City, North Dakota, North Dakota State, Omaha, Oral Roberts, South Dakota, South Dakota State, St. Thomas; Oral Roberts and North Dakota are blocked, `docs/BLOCKED_SCHOOLS.md`; Denver left for the WCC) sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and swimming, but no football, wrestling or hockey; the members' pages mark their league games, and opponents are matched by the names they write ("UMKC", "UND", "NDSU", "Nebraska Omaha", "ORU", "USD", "SDSU", "St. Thomas (Minn.)").

Each rule has a check in `tests/south-dakota-state-module.mjs` (generated page blocks) or `tests/summit-shared.mjs`.

## Athletes

Roster cards, then official profiles, then the school's NIL marketplace where one is wired (Opendorse `south-dakota-state-jackrabbits`). Instagram pins from the official rosters fill Golf and Volleyball; profile cards fill the remaining slots in Baseball, Basketball, Cross Country, Equestrian, Football, Soccer, Softball, Swimming & Diving, Track & Field and Wrestling (`athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
