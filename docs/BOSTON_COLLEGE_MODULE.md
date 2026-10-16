# Boston College school module

`src/schools/boston-college.mjs` owns Boston College's bceagles.com routes, program combinations, verified Instagram pins and its SIDEARM schedule reader (Oklahoma's handlers, `scripts/port-handlers.mjs`). The event/result contract, caching, display and generic parsing stay shared.

Boston College was added to the app on October 14, 2026 (17 sports, one PR with California). bceagles.com is SIDEARM (read directly from the sandbox).

## Status (`4.87.1-boston-college-california`)

| Sport | Pages | State |
| --- | --- | --- |
| Football | `football` | 5 finals with stories; 2-3 (ACC 0-2) as published. SMU (Oct 3) takes its story from the archive |
| Volleyball | `womens-volleyball` | 17 finals with stories; 10-7 (ACC 1-5) |
| Soccer | `womens-soccer`, `mens-soccer` | Labeled; 13 and 12 finals with stories; 9-3-1 (2-3-1) and 5-4-3 (1-4-1) |
| Field Hockey | `field-hockey` | 13 finals with stories; 6-7 (ACC 1-3) |
| Cross Country | `womens-cross-country`, `mens-cross-country` | One card per team (the generic `cross-country` page is SIDEARM's empty template); per-team TFRRS (`MA_college_f/m_Boston_College`): McNichols W 7th, New England Championships W 1st (TFRRS "2026 NEICAAA", the one meet that day), Maribel Sanchez Souther M 1st |
| Golf | `womens-golf`, `mens-golf` | Labeled; places with field size from the cards |
| Hockey | `mens-ice-hockey`, `womens-ice-hockey` | Labeled; exhibitions labeled; Hockey East games from the page data (women 2-1, Hockey East 1-1) |
| Swimming & Diving | `swimming-and-diving` | Rutgers Invitational with its story; the Maroon & Gold intrasquad (Sep 25) is not listed |
| Tennis | `womens-tennis`, `mens-tennis` | Labeled; tournaments with their stories |
| Fencing, Rowing, Basketball | | 2026-27 schedules upcoming |
| Baseball, Softball, Lacrosse, Skiing, Track & Field | | Pages still show last season: valid empty schedules until published |

## Boston College rules

- **Internal:** swimming's "Maroon & Gold" meet is an intrasquad.
- **Cross country:** per-team pages and TFRRS pages (Wisconsin's split), `onlyMeetThatDay` for TFRRS names that differ from the schedule.
- **Archive stories:** the "#ForBoston Files" video series (`skipStory`, shared kit option) is never a game story.
- **Conference games:** ACC membership; hockey is Hockey East (page-data flags).

Every rule was mutated and each mutation fails `node tests/boston-college-module.mjs`, except the per-team race filter (Wisconsin's, killed in its tests; Boston College has no meet both teams ran yet).

## Athletes

Three featured athletes per sport. Pinned from the profile pages (Oct 14): Baseball, Cross Country, Field Hockey, Golf, Soccer, Softball, Tennis, Track & Field, Volleyball (three each), Hockey (Will Moore), Rowing (Molly Smith). **Profile cards** (`athlete_profile_fallback_sports`): Fencing (0 of 39 profiles link Instagram), Hockey (1 of 51), Lacrosse (0 of 35), Rowing (1 of 56), Swimming & Diving (0 of 54).

## Open

- Baseball, Softball, Lacrosse, Skiing, Track & Field fill when 2026-27 is published.
- First live cards not yet observed.

## Athletes from the NIL marketplace (October 16, 2026)

Source: opendorse.com/bostoncollege-eagles, linked from the bceagles.com NIL page. On the preview (4.105.0), the sports that use profile cards: Fencing 0 of 3 with Instagram (0 from the marketplace); Hockey 1 of 3 with Instagram (0 from the marketplace); Lacrosse 1 of 3 with Instagram (1 from the marketplace); Rowing 3 of 3 with Instagram (2 from the marketplace); Swimming & Diving 3 of 3 with Instagram (3 from the marketplace). A slot still short keeps its official profile card, and the profile-card fallback stays listed (the athletes tried vary by day). Athletes connect these accounts themselves; the app uses one only for an athlete on the current official roster whose marketplace record names the same athlete and sport (`src/opendorse.mjs`, `src/inflcr.mjs`).
