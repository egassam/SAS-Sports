# Omaha school module

`src/schools/omaha.mjs` reads omahamavs.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Summit League (ported from McNeese's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Baseball, Basketball, Cross Country, Golf, Hockey, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- Hockey plays in the NCHC; the page data marks its league games.
- Golf cards may write the score first ("911 (+47) / 1st", the Big O Classic; shared `golfCardPlace`), and stories call the team "the Mavs" ("The Mavs finished in 9th place as a team").
- Swimming reads the women's page and the men's code page (`/sports/mswim/`, labeled by `teamLabels`; the scaffold's `mens-swimming-diving` address was off the menu).
- Cross country and track are women's only.
- Volleyball matches before the last Friday of August are exhibitions; rankings written without "#" are cut from opponent names (both from the Southland port).
- Routes were set from the site's menu (`scripts/audit-routes.mjs`, `scripts/set-sport-routes.mjs`).
- Conference: the Summit League (2026-27: Kansas City, North Dakota, North Dakota State, Omaha, Oral Roberts, South Dakota, South Dakota State, St. Thomas; Oral Roberts and North Dakota are blocked, `docs/BLOCKED_SCHOOLS.md`; Denver left for the WCC) sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and swimming, but no football, wrestling or hockey; the members' pages mark their league games, and opponents are matched by the names they write ("UMKC", "UND", "NDSU", "Nebraska Omaha", "ORU", "USD", "SDSU", "St. Thomas (Minn.)").

Each rule has a check in `tests/omaha-module.mjs` (generated page blocks) or `tests/summit-shared.mjs`.

## Athletes

Roster cards, then official profiles, then the school's NIL marketplace where one is wired (Opendorse `uno-mavericks`). Instagram pins from the official rosters fill Basketball and Volleyball; profile cards fill the remaining slots in Baseball, Cross Country, Golf, Hockey, Soccer, Softball, Swimming & Diving, Tennis and Track & Field (`athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
- The men's golf card for the Wildcat Classic (Sep 14-15) reads 7th; its story says eighth. The card is the source of record.
