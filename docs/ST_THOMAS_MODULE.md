# St. Thomas school module

`src/schools/st-thomas.mjs` reads tommiesports.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Summit League (ported from McNeese's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (12): Baseball, Basketball, Cross Country, Football, Golf, Hockey, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball.

## Rules

- The site names team pages by code (`wcross`, `mhockey`, `msoc`): each page's team is in `teamLabels` (without them, both teams' lines read unlabeled and per-team cross country listed both teams' races on each).
- Football plays in the Pioneer Football League, men's hockey in the NCHC since 2026 ("first victory of NCHC era"), women's hockey in the WCHA; the page data marks their league games.
- Soccer reads both teams (the men's `msoc` page was missing from setup). Tennis is the women's team only (the men's page is 2020-21 and off the menu).
- Volleyball matches before the last Friday of August are exhibitions; rankings written without "#" are cut from opponent names (both from the Southland port).
- Routes were set from the site's menu (`scripts/audit-routes.mjs`, `scripts/set-sport-routes.mjs`).
- Conference: the Summit League (2026-27: Kansas City, North Dakota, North Dakota State, Omaha, Oral Roberts, South Dakota, South Dakota State, St. Thomas; Oral Roberts and North Dakota are blocked, `docs/BLOCKED_SCHOOLS.md`; Denver left for the WCC) sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and swimming, but no football, wrestling or hockey; the members' pages mark their league games, and opponents are matched by the names they write ("UMKC", "UND", "NDSU", "Nebraska Omaha", "ORU", "USD", "SDSU", "St. Thomas (Minn.)").

Each rule has a check in `tests/st-thomas-module.mjs` (generated page blocks) or `tests/summit-shared.mjs`.

## Athletes

Roster cards, then official profiles, then the school's NIL marketplace where one is wired. Instagram pins from the official rosters fill Baseball, Football and Soccer; profile cards fill the remaining slots in Basketball, Cross Country, Golf, Hockey, Softball, Swimming & Diving, Tennis, Track & Field and Volleyball (`athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
