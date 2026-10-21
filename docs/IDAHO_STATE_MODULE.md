# Idaho State school module

`src/schools/idaho-state.mjs` reads isubengals.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from DePaul's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

Idaho State was added to the app on October 21, 2026 in the Big Sky (9 sports: Basketball, Cross Country, Football, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball). Pages: older SIDEARM page with no game data (rows read by the shared classic reader).

## Rules

- The homepage is a splash page; cross country and track read the men's and women's team pages (the generic cross country address answers with an unrelated page).
- TFRRS's Bengal Invitational names no team in its race titles ("8k", "5k"): the longer race is the men's (shared rule).
- Opponents "#RV Weber State", "the Pacific", "California State University at Fullerton" read "Weber State", "Pacific", "Cal State Fullerton" (shared).
- Shared Big Sky rules (every module): an event named after a round, a conference or a tournament reads "at" ("Big Sky Conference Quarterfinals (Game 1)", "Big Sky Tournament"); bracket seeds ("(10v11)") and "(DH)" are not part of a name; a season used as a tournament ("2026 Fall Schedule", "Indoor Season") is no tournament; a department ("general-") story is no game's recap; a cross country meet named by its host takes its name from the story's address; TFRRS reads the only meet that day when it names a meet differently.

Each rule has a check in `tests/idaho-state-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

NIL marketplace: none linked. Every sport shows three athletes on the preview (Oct 21); see `athlete_profile_fallback_sports` in `tests/certified-schools.json` for the sports where official profile cards fill the remaining slots (the roster cards and profile pages publish fewer than three athlete Instagram accounts).

## Open

- Tennis tournaments have no published story and are not listed (K-State's rule).
- Golf Iconic Invitational (Oct 12-13) has no result or story and is not listed.
- Softball fills when 2027 is published.
- First live cards not yet observed.
