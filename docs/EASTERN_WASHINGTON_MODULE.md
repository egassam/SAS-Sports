# Eastern Washington school module

`src/schools/eastern-washington.mjs` reads goeags.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from DePaul's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Eastern Washington was added to the app on October 21, 2026 in the Big Sky (8 sports: Basketball, Cross Country, Football, Golf, Soccer, Tennis, Track & Field, Volleyball). Pages: older SIDEARM page with no game data (shared classic reader).

## Rules

- Men's tennis removed from the routes: its page is the 2024-25 schedule and the nav links only women's tennis.
- Golf events filed under "2026 Fall Schedule" blocks read by their own names (a season is no tournament).
- A department story ("general-the-flight-report", a podcast) linked as the Washington game's recap is not taken.
- Shared Big Sky rules (every module): an event named after a round, a conference or a tournament reads "at" ("Big Sky Conference Quarterfinals (Game 1)", "Big Sky Tournament"); bracket seeds ("(10v11)") and "(DH)" are not part of a name; a season used as a tournament ("2026 Fall Schedule", "Indoor Season") is no tournament; a department ("general-") story is no game's recap; a cross country meet named by its host takes its name from the story's address; TFRRS reads the only meet that day when it names a meet differently.

Each rule has a check in `tests/eastern-washington-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

NIL marketplace: Opendorse (`ewu-eagles`). Every sport shows three athletes on the preview (Oct 21); see `athlete_profile_fallback_sports` in `tests/certified-schools.json` for the sports where official profile cards fill the remaining slots (the roster cards and profile pages publish fewer than three athlete Instagram accounts).

## Open

- Frank Knott Classic (cross country) and soccer vs Weber State (Oct 4) have no linked story.
- First live cards not yet observed.
