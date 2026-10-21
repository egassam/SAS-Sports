# Portland State school module

`src/schools/portland-state.mjs` reads goviks.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from DePaul's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Portland State was added to the app on October 21, 2026 in the Big Sky (9 sports: Basketball, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball). Pages: older SIDEARM page with no game data (season in an h1, opponents in an h3).

## Rules

- Golf places from final stories (stories are named `WGOLF_<date>`): "finished seventh out of 10 teams", "finish tied for 16th", and a place told late (Sun Mountain, about 2,100 characters in).
- Basketball bracket games read without their seeds and "at" ("at First Round").
- Shared Big Sky rules (every module): an event named after a round, a conference or a tournament reads "at" ("Big Sky Conference Quarterfinals (Game 1)", "Big Sky Tournament"); bracket seeds ("(10v11)") and "(DH)" are not part of a name; a season used as a tournament ("2026 Fall Schedule", "Indoor Season") is no tournament; a department ("general-") story is no game's recap; a cross country meet named by its host takes its name from the story's address; TFRRS reads the only meet that day when it names a meet differently.

Each rule has a check in `tests/portland-state-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

NIL marketplace: INFLCR Exchange (`portland-state-university`). Every sport shows three athletes on the preview (Oct 21); see `athlete_profile_fallback_sports` in `tests/certified-schools.json` for the sports where official profile cards fill the remaining slots (the roster cards and profile pages publish fewer than three athlete Instagram accounts).

## Open

- Track & Field fills when 2026-27 is published.
- Volleyball at DePaul (Sep 2) and soccer at California Baptist (Aug 20) have no linked story.
- First live cards not yet observed.
