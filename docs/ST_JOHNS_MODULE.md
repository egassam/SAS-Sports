# St. John's school module

`src/schools/st-johns.mjs` reads redstormsports.com with the shared SIDEARM kit (`src/sidearm-school-kit.mjs`), ported from NC State's handlers by `start-schools`. The event/result contract, caching, display and generic parsing stay shared.

St. John's was added to the app on October 21, 2026 in the Big East (11 sports: Baseball, Basketball, Cross Country, Fencing, Golf, Lacrosse, Soccer, Softball, Tennis, Track & Field, Volleyball). redstormsports.com is read directly (Imperva answers some sandbox reads with 403).

## Rules

- Cross country (women only): "4th out 6 Teams (96 points)" and "3rd place, (77 points)" read; TFRRS team page `NY_college_f_St_Johns_NY` (found by hand; the address finder missed the "NY" suffix).
- Golf "4th (9 Teams)" read by the shared `golfPlacing`; the Charge at Quail Valley story headline "Fourth-Place Finish" read by the shared story reader.
- Football and Swimming & Diving removed: both pages are empty "@season @sport" templates (no program). Men's cross country page is a template too.
- The school's name has an apostrophe: `port-handlers` and the scaffold's test template now escape it (the first onboarding run broke every later step).
- Shared Big East rules (every module): bracket games named by round or "vs. TBD" read as their tournament and "at"; a multi-day event naming its host and its tournament reads as the tournament; a past swimming meet with no result line, story or TFRRS is not listed.

Each rule has a check in `tests/st-johns-module.mjs` (generated page blocks plus hand checks); each new rule was mutated and its test failed.

## Athletes

Every sport shows three athletes on the preview. Official NIL marketplace: Opendorse (`stjohns-red-storm`, team "St Johns Red Storm"). Profile cards fill the remaining slots in Baseball, Cross Country, Fencing, Golf, Lacrosse, Track & Field (the roster cards and profile pages publish fewer than three athlete Instagram accounts; `athlete_profile_fallback_sports`).

## Open

- Baseball, Softball, Lacrosse (2026 pages), Fencing and Track & Field (2025-26) fill when published.
- First live cards not yet observed.
