# Northern Arizona school module

`src/schools/northern-arizona.mjs` reads nauathletics.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from DePaul's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Northern Arizona was added to the app on October 21, 2026 in the Big Sky (9 sports: Basketball, Cross Country, Football, Golf, Soccer, Swimming & Diving, Tennis, Track & Field, Volleyball). Pages: older SIDEARM page with no game data, read through the private source.

## Rules

- Golf places from final stories: "Lifts Lumberjacks to Seventh" (the first-round "tie for seventh" and a pars statistic are skipped), "placed them 12th" after the dateline "VAIL, Colo. (September 23, 2026) -".
- Swimming's "Pentathlon" (Sep 18) is internal and not listed.
- Shared Big Sky rules (every module): an event named after a round, a conference or a tournament reads "at" ("Big Sky Conference Quarterfinals (Game 1)", "Big Sky Tournament"); bracket seeds ("(10v11)") and "(DH)" are not part of a name; a season used as a tournament ("2026 Fall Schedule", "Indoor Season") is no tournament; a department ("general-") story is no game's recap; a cross country meet named by its host takes its name from the story's address; TFRRS reads the only meet that day when it names a meet differently.

Each rule has a check in `tests/northern-arizona-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

NIL marketplace: INFLCR Exchange (`northern-arizona-university`). Every sport shows three athletes on the preview (Oct 21); see `athlete_profile_fallback_sports` in `tests/certified-schools.json` for the sports where official profile cards fill the remaining slots (the roster cards and profile pages publish fewer than three athlete Instagram accounts).

## Open

- Track & Field fills when 2026-27 is published (page shows 2025-26).
- Women's tennis ITA All-American Championships has no story and is not listed.
- First live cards not yet observed.
