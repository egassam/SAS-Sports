# UConn school module

`src/schools/uconn.mjs` reads uconnhuskies.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from NC State's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

UConn was added to the app on October 21, 2026 in the Big East (15 sports: Baseball, Basketball, Cross Country, Field Hockey, Football, Golf, Hockey, Lacrosse, Rowing, Soccer, Softball, Swimming & Diving, Tennis, Track & Field, Volleyball). uconnhuskies.com is read through the private source (Imperva answers the sandbox with 403).

## Rules

- Routes corrected from the scaffold's: cross country is `womens-cross-country` (the generic page was 2023's; no men's team), Track & Field reads both `womens-`/`mens-track-and-field` (the generic page was 2023-24), Tennis is women's only (men's page last published 2019-20).
- Hockey: both teams in Hockey East; "Friendship Four TBD" reads "at Friendship Four". Football is independent (no conference record).
- Swimming: Husky Diving Invite and the Villanova dual have no score, story or result and are not listed.
- Softball's fall exhibitions are listed as the page publishes them (records leave them out).
- Shared Big East rules (every module): bracket games named by round or "vs. TBD" read as their tournament and "at"; a multi-day event naming its host and its tournament reads as the tournament; a past swimming meet with no result line, story or TFRRS is not listed.

Each rule has a check in `tests/uconn-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

Every sport shows three athletes on the preview. Official NIL marketplace: Opendorse (`uconn-huskies`, team "UConn Huskies"). Three Instagram athletes in every sport.

## Open

- Baseball, Lacrosse (2026 page), Rowing and Track & Field (2025-26) fill when published.
- First live cards not yet observed.
