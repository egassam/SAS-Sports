# Montana State school module

`src/schools/montana-state.mjs` reads msubobcats.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from DePaul's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Montana State was added to the app on October 21, 2026 in the Big Sky (8 sports: Basketball, Cross Country, Football, Golf, Skiing, Tennis, Track & Field, Volleyball). Pages: Nuxt SIDEARM, read through the private source (the site loops the sandbox's redirects).

## Rules

- Skiing (`/sports/ski`, RMISA) added by hand (onboarding now reads `ski`): one entry per race is merged into one event per carnival run, Colorado's rule; a carnival's place only on its last run.
- Cross country and track read the men's and women's team pages (the generic pages are 2016-17 and 2017).
- Golf places from final stories: "Team Champions" headline (Yellowstone, 1st), superscript "12 th" (Route 66).
- Shared Big Sky rules (every module): an event named after a round, a conference or a tournament reads "at" ("Big Sky Conference Quarterfinals (Game 1)", "Big Sky Tournament"); bracket seeds ("(10v11)") and "(DH)" are not part of a name; a season used as a tournament ("2026 Fall Schedule", "Indoor Season") is no tournament; a department ("general-") story is no game's recap; a cross country meet named by its host takes its name from the story's address; TFRRS reads the only meet that day when it names a meet differently.

Each rule has a check in `tests/montana-state-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

NIL marketplace: INFLCR Exchange (`montana-state-university`). Every sport shows three athletes on the preview (Oct 21); see `athlete_profile_fallback_sports` in `tests/certified-schools.json` for the sports where official profile cards fill the remaining slots (the roster cards and profile pages publish fewer than three athlete Instagram accounts).

## Open

- Track & Field fills when 2026-27 is published (team pages show 2025-26).
- Football vs Northern Arizona (Sep 26) has no linked story.
- Rodeo (NIRA) is not an NCAA sport and is not in the app.
- First live cards not yet observed.
