# Kansas City school module

`src/schools/kansas-city.mjs` reads kcroos.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Summit League (ported from McNeese's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (8): Basketball, Cross Country, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball.

## Rules

- Golf is the men's team only and Tennis the women's only: the women's golf and men's tennis pages are 2019-20 and off the menu.
- Cross country and track read the one combined page each (men's and women's results on one card).
- Volleyball matches before the last Friday of August are exhibitions; rankings written without "#" are cut from opponent names (both from the Southland port).
- Routes were set from the site's menu (`scripts/audit-routes.mjs`, `scripts/set-sport-routes.mjs`).
- Conference: the Summit League (2026-27: Kansas City, North Dakota, North Dakota State, Omaha, Oral Roberts, South Dakota, South Dakota State, St. Thomas; Oral Roberts and North Dakota are blocked, `docs/BLOCKED_SCHOOLS.md`; Denver left for the WCC) sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and swimming, but no football, wrestling or hockey; the members' pages mark their league games, and opponents are matched by the names they write ("UMKC", "UND", "NDSU", "Nebraska Omaha", "ORU", "USD", "SDSU", "St. Thomas (Minn.)").

Each rule has a check in `tests/kansas-city-module.mjs` (generated page blocks) or `tests/summit-shared.mjs`.

## Athletes

Roster cards, then official profiles, then the school's NIL marketplace where one is wired. Instagram pins from the official rosters fill Cross Country, Tennis and Volleyball; profile cards fill the remaining slots in Basketball, Golf, Soccer, Softball and Track & Field (the official sources publish no further athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Sports whose 2026-27 season is not yet published fill when it is (softball and track list last season only).
- First live cards not yet observed.
- The women's tennis page dates one entry "Sep 25 (Fri) - Oct 26 (Mon)" at Omaha with no result or story (Omaha's own page lists its Omaha/Creighton Invite on Oct 24): the event reads as the official page dates it until the page is corrected.
