# South Dakota school module

`src/schools/south-dakota.mjs` reads goyotes.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Summit League (ported from McNeese's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (11): Basketball, Cross Country, Football, Golf, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Triathlon, Volleyball.

## Rules

- Football plays in the Missouri Valley Football Conference; the page data marks its league games.
- Triathlon writes the team's place with its points ("5th: 208 points"): "5th · 208 pts", as a cross country team place reads. Two collegiate cups publish no team place ("Completed" with their stories).
- Cross country, swimming and track read one combined page each.
- Volleyball matches before the last Friday of August are exhibitions; rankings written without "#" are cut from opponent names (both from the Southland port).
- Routes were set from the site's menu (`scripts/audit-routes.mjs`, `scripts/set-sport-routes.mjs`).
- Conference: the Summit League (2026-27: Kansas City, North Dakota, North Dakota State, Omaha, Oral Roberts, South Dakota, South Dakota State, St. Thomas; Oral Roberts and North Dakota are blocked, `docs/BLOCKED_SCHOOLS.md`; Denver left for the WCC) sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and swimming, but no football, wrestling or hockey; the members' pages mark their league games, and opponents are matched by the names they write ("UMKC", "UND", "NDSU", "Nebraska Omaha", "ORU", "USD", "SDSU", "St. Thomas (Minn.)").

Each rule has a check in `tests/south-dakota-module.mjs` (generated page blocks) or `tests/summit-shared.mjs`.

## Athletes

Roster cards, then official profiles, then the school's NIL marketplace where one is wired. Profile cards fill every sport's slots (the official sources publish no athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
