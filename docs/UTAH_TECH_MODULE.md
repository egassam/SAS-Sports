# Utah Tech school module

`src/schools/utah-tech.mjs` reads utahtechtrailblazers.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from DePaul's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Utah Tech was added to the app on October 21, 2026 in the Big Sky (11 sports: Baseball, Basketball, Cross Country, Football, Golf, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball). Pages: older SIDEARM page with no game data, read through the private source.

## Rules

- Swimming days "... Day #1" / "Day #2" merge into one meet (shared); opponents "Utah Dual" read "Utah".
- Baseball and Tennis rosters publish no portraits: profile cards without a portrait fill the slots (`portraitlessProfileSports`).
- Shared Big Sky rules (every module): an event named after a round, a conference or a tournament reads "at" ("Big Sky Conference Quarterfinals (Game 1)", "Big Sky Tournament"); bracket seeds ("(10v11)") and "(DH)" are not part of a name; a season used as a tournament ("2026 Fall Schedule", "Indoor Season") is no tournament; a department ("general-") story is no game's recap; a cross country meet named by its host takes its name from the story's address; TFRRS reads the only meet that day when it names a meet differently.

Each rule has a check in `tests/utah-tech-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

NIL marketplace: none linked. Every sport shows three athletes on the preview (Oct 21); see `athlete_profile_fallback_sports` in `tests/certified-schools.json` for the sports where official profile cards fill the remaining slots (the roster cards and profile pages publish fewer than three athlete Instagram accounts).

## Open

- Track & Field fills when 2026-27 is published.
- Men's basketball exhibition vs Utah Valley (Oct 17) has no linked story.
- First live cards not yet observed.
