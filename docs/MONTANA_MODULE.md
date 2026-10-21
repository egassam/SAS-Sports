# Montana school module

`src/schools/montana.mjs` reads gogriz.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from DePaul's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Montana was added to the app on October 21, 2026 in the Big Sky (9 sports: Basketball, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball). Pages: Nuxt SIDEARM (page data), read directly.

## Rules

- Cross country: the men's and women's pages each read their own TFRRS team page (`createTeamTfrrsMeetResults`), only meet that day when TFRRS names it differently.
- A cross country meet the women's page names by its host ("Washington State", Sep 11) takes its name from the story's address ("WSU Cougar Classic").
- Shared Big Sky rules (every module): an event named after a round, a conference or a tournament reads "at" ("Big Sky Conference Quarterfinals (Game 1)", "Big Sky Tournament"); bracket seeds ("(10v11)") and "(DH)" are not part of a name; a season used as a tournament ("2026 Fall Schedule", "Indoor Season") is no tournament; a department ("general-") story is no game's recap; a cross country meet named by its host takes its name from the story's address; TFRRS reads the only meet that day when it names a meet differently.

Each rule has a check in `tests/montana-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

NIL marketplace: INFLCR Exchange (`university-of-montana`). Every sport shows three athletes on the preview (Oct 21); see `athlete_profile_fallback_sports` in `tests/certified-schools.json` for the sports where official profile cards fill the remaining slots (the roster cards and profile pages publish fewer than three athlete Instagram accounts).

## Open

- Track & Field fills when 2026-27 is published (team pages show 2026).
- LC State Invite (Oct 17, cross country) reads "Completed" with its story: TFRRS has no results for it.
- First live cards not yet observed.
