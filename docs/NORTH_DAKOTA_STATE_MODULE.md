# North Dakota State school module

`src/schools/north-dakota-state.mjs` reads gobison.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Summit League (ported from McNeese's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Baseball, Basketball, Cross Country, Football, Golf, Soccer, Softball, Track & Field, Volleyball, Wrestling.

## Rules

- Football plays in the Mountain West (FBS) since 2026 ("first Mountain West victory", Air Force, Sep 12) and wrestling in the Big 12; the page data marks their league games.
- A home golf tournament's second round may drop a word of its name ("NDSU Fall Invitational", then "NDSU Invitational" with the place, Sep 8-9): a round the next day whose words are all in the round before's name is that tournament (1st of 3).
- Cross country and track read the gendered pages; no tennis (none on the menu).
- Volleyball matches before the last Friday of August are exhibitions; rankings written without "#" are cut from opponent names (both from the Southland port).
- Routes were set from the site's menu (`scripts/audit-routes.mjs`, `scripts/set-sport-routes.mjs`).
- Conference: the Summit League (2026-27: Kansas City, North Dakota, North Dakota State, Omaha, Oral Roberts, South Dakota, South Dakota State, St. Thomas; Oral Roberts and North Dakota are blocked, `docs/BLOCKED_SCHOOLS.md`; Denver left for the WCC) sponsors basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and swimming, but no football, wrestling or hockey; the members' pages mark their league games, and opponents are matched by the names they write ("UMKC", "UND", "NDSU", "Nebraska Omaha", "ORU", "USD", "SDSU", "St. Thomas (Minn.)").

Each rule has a check in `tests/north-dakota-state-module.mjs` (generated page blocks) or `tests/summit-shared.mjs`.

## Athletes

Roster cards, then official profiles, then the school's NIL marketplace where one is wired. Profile cards fill every sport's slots (the official sources publish no athlete Instagram; `athlete_profile_fallback_sports` in `tests/certified-schools.json`). Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Sports whose 2026-27 season is not yet published fill when it is (baseball and softball list no 2026-27 games yet).
- First live cards not yet observed.
