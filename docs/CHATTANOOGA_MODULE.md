# Chattanooga school module

`src/schools/chattanooga.mjs` reads gomocs.com (SIDEARM, read through the private source), set up by `start-schools` on October 24, 2026 for the Southern Conference (ported from Evansville's handlers). The event/result contract, caching, display and generic parsing stay shared.

Sports (10): Basketball, Beach Volleyball, Cross Country, Football, Golf, Soccer, Softball, Tennis, Volleyball, Wrestling.

## Rules

- Golf reads the short-code team pages (`mglf`, `wglf`, labelled) and wrestling `wr`, from the menu; each golf round is its own card named after the tournament ("Visit Knoxville Collegiate - Day 1", "- Final Round"), so the rounds are one tournament under that name; the women's card gives the team place before the leading player ("15th (928, +76)"). Wrestling sessions ("Southern Scuffle Day 1", "... Finals") are one event; open tournaments read "at". A beach volleyball qualifier is a tournament ("Completed" with its story). Eastern time (Tennessee's default is Central).
- NIL marketplace: Opendorse `chattanooga-mocs` (team "Chattanooga Mocs"), linked from gomocs.com; its athletes come after official profiles.
- Routes were set from the site's menu (`scripts/set-sport-routes.mjs`).
- Conference: the Southern Conference (2026-27: Chattanooga, The Citadel, East Tennessee State, Furman, Mercer, Samford, UNC Greensboro, VMI, Western Carolina, Wofford) sponsors football, basketball, baseball, softball, soccer, volleyball, golf, tennis, cross country, track and wrestling, but no swimming, lacrosse, water polo or beach volleyball; the members' pages mark their league games.

Each rule has a check in `tests/chattanooga-module.mjs` (generated page blocks) or `tests/socon-shared.mjs`. Game-sport records on the preview equal each live page's own (`compare-records`, Oct 24).

## Athletes

Roster cards, then official profiles: three athletes with verified Instagram in every sport. Checked with `validate-schools --athletes-only` on the preview, Oct 24.

## Open

- Sports whose 2026-27 season is not yet published fill when it is.
- First live cards not yet observed.
