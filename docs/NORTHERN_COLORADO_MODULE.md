# Northern Colorado school module

`src/schools/northern-colorado.mjs` reads uncbears.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from DePaul's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Northern Colorado was added to the app on October 21, 2026 in the Big Sky (11 sports: Baseball, Basketball, Cross Country, Football, Golf, Soccer, Softball, Swimming & Diving, Track & Field, Volleyball, Wrestling). Pages: Nuxt SIDEARM, read directly.

## Rules

- Track & Field added by hand: the men's and women's indoor (2026-27) and outdoor pages (onboarding now reads them).
- Cross country reads the men's and women's team pages, each with its own TFRRS team page.
- Shared Big Sky rules (every module): an event named after a round, a conference or a tournament reads "at" ("Big Sky Conference Quarterfinals (Game 1)", "Big Sky Tournament"); bracket seeds ("(10v11)") and "(DH)" are not part of a name; a season used as a tournament ("2026 Fall Schedule", "Indoor Season") is no tournament; a department ("general-") story is no game's recap; a cross country meet named by its host takes its name from the story's address; TFRRS reads the only meet that day when it names a meet differently.

Each rule has a check in `tests/northern-colorado-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

NIL marketplace: INFLCR Exchange (`university-of-northern-colorado`). Every sport shows three athletes on the preview (Oct 21); see `athlete_profile_fallback_sports` in `tests/certified-schools.json` for the sports where official profile cards fill the remaining slots (the roster cards and profile pages publish fewer than three athlete Instagram accounts).

## Open

- Outdoor track, Baseball and Softball fill when published.
- MSU Denver Roadrunner Invite shows the page's place ("6th of 10"): TFRRS has no results.
- First live cards not yet observed.
