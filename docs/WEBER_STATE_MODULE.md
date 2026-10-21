# Weber State school module

`src/schools/weber-state.mjs` reads weberstatesports.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from DePaul's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Weber State was added to the app on October 21, 2026 in the Big Sky (9 sports: Basketball, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball). Pages: Nuxt SIDEARM, read through the private source.

## Rules

- Track & Field: the plain page is the women's (`teamLabels`), the men's has its own page.
- Exhibitions written "(exhibition)" read "(Exhibition)".
- Shared Big Sky rules (every module): an event named after a round, a conference or a tournament reads "at" ("Big Sky Conference Quarterfinals (Game 1)", "Big Sky Tournament"); bracket seeds ("(10v11)") and "(DH)" are not part of a name; a season used as a tournament ("2026 Fall Schedule", "Indoor Season") is no tournament; a department ("general-") story is no game's recap; a cross country meet named by its host takes its name from the story's address; TFRRS reads the only meet that day when it names a meet differently.

Each rule has a check in `tests/weber-state-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

NIL marketplace: INFLCR Exchange (`weber-state-university`). Every sport shows three athletes on the preview (Oct 21); see `athlete_profile_fallback_sports` in `tests/certified-schools.json` for the sports where official profile cards fill the remaining slots (the roster cards and profile pages publish fewer than three athlete Instagram accounts).

## Open

- Track & Field fills when 2026-27 is published.
- Tennis tournaments have no published story and are not listed.
- CSI Invitational (cross country, Oct 9, split squad) reads "Completed" with its story (TFRRS has no results).
- First live cards not yet observed.
